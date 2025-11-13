from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import uuid, subprocess, whisper, time
from typing import Optional

from app.supabase_client import supabase
from app.auth import get_current_user_id
from app.summarize import summarize
from openai import OpenAI
import os

app = FastAPI(title="Meeting Notes API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class SummarizeRequest(BaseModel):
    meeting_id: str
    format: str = "structured"  # structured, bullet_points, paragraph, action_items
    language: str = "en"  # en, fr, etc.
    detail_level: str = "medium"  # brief, medium, detailed
    include_timestamps: bool = True

class UserPreferences(BaseModel):
    default_format: str = "structured"
    default_language: str = "en"
    default_detail_level: str = "medium"
    auto_generate_summary: bool = True
    include_timestamps: bool = True
    include_action_items: bool = True
    include_decisions: bool = True

class RefineSummaryRequest(BaseModel):
    summary_id: str
    user_message: str
    chat_history: list = []  # List of {"role": "user"|"assistant", "content": str}

# Load Whisper model - 'base' for best speed/accuracy trade-off
# Options: tiny, base, small, medium, large
# 'base' is fastest while maintaining good accuracy (runs locally, no cost)
MODEL = whisper.load_model("base")

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

def to_wav(input_path: Path) -> Path:
    out = input_path.with_suffix(".wav")
    cmd = ["ffmpeg", "-y", "-i", str(input_path), "-ar", "16000", "-ac", "1", str(out)]
    subprocess.run(cmd, check=True, capture_output=True)
    return out


@app.get("/")
def home():
    return {"message": "🚀 API is running!"}


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    try:
        file_id = uuid.uuid4().hex
        raw_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
        content = await file.read()

        with raw_path.open("wb") as f:
            f.write(content)

        meeting_title = file.filename.rsplit(".", 1)[0]

        # Créer le meeting en base
        meeting_res = supabase.table("meetings").insert({
            "user_id": user_id,
            "title": meeting_title,
            "status": "processing"
        }).execute()
        meeting_id = meeting_res.data[0]["id"]

        # Upload audio dans Storage
        storage_path = f"{user_id}/{meeting_id}/{file.filename}"
        supabase.storage.from_("meetings-audios").upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type, "upsert": False},
        )

        # Conversion et transcription
        wav_path = to_wav(raw_path)
        result = MODEL.transcribe(str(wav_path), fp16=False, word_timestamps=False)

        # Mise à jour du meeting
        supabase.table("meetings").update({
            "audio_path": storage_path,
            "language": result.get("language"),
            "status": "done"
        }).eq("id", meeting_id).execute()

        # Insertion de la transcription globale
        transcript_res = supabase.table("transcripts").insert({
            "meeting_id": meeting_id,
            "model": "whisper-base",
            "text": result.get("text"),
            "language": result.get("language")
        }).execute()
        transcript_id = transcript_res.data[0]["id"]

        # Segments
        segments_payload = [
            {
                "transcript_id": transcript_id,
                "start_seconds": seg["start"],
                "end_seconds": seg["end"],
                "speaker_label": None,
                "text": seg["text"],
            }
            for seg in result.get("segments", [])
        ]
        if segments_payload:
            supabase.table("segments").insert(segments_payload).execute()

        return JSONResponse({
            "meeting_id": meeting_id,
            "transcript_id": transcript_id,
            "language": result.get("language"),
            "text": result.get("text"),
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize")
async def generate_summary(
    request: SummarizeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Generate a summary for a meeting transcript with user preferences."""
    try:
        start_time = time.time()

        # Get the meeting and verify ownership
        meeting_res = supabase.table("meetings").select("*").eq("id", request.meeting_id).execute()
        if not meeting_res.data:
            raise HTTPException(status_code=404, detail="Meeting not found")

        meeting = meeting_res.data[0]
        if meeting["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this meeting")

        # Get the transcript
        transcript_res = supabase.table("transcripts").select("id").eq("meeting_id", request.meeting_id).execute()
        if not transcript_res.data:
            raise HTTPException(status_code=404, detail="Transcript not found")

        transcript_id = transcript_res.data[0]["id"]

        # Get the segments
        segments_res = supabase.table("segments").select("*").eq("transcript_id", transcript_id).order("start_seconds").execute()
        if not segments_res.data:
            raise HTTPException(status_code=404, detail="No segments found")

        # Generate summary using the summarize function
        summary_text = summarize(
            segments=segments_res.data,
            format=request.format,
            language=request.language,
            detail_level=request.detail_level,
            include_timestamps=request.include_timestamps
        )

        generation_time = time.time() - start_time

        # Save summary to database
        summary_res = supabase.table("summaries").insert({
            "meeting_id": request.meeting_id,
            "user_id": user_id,
            "transcript_id": transcript_id,
            "title": meeting["title"],
            "summary_text": summary_text,
            "format": request.format,
            "language": request.language,
            "detail_level": request.detail_level,
            "model_used": "gpt-4o-mini",
            "generation_time_seconds": generation_time
        }).execute()

        summary_id = summary_res.data[0]["id"]

        return JSONResponse({
            "summary_id": summary_id,
            "meeting_id": request.meeting_id,
            "summary_text": summary_text,
            "generation_time_seconds": generation_time
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/summaries")
async def get_summaries(
    user_id: str = Depends(get_current_user_id),
):
    """Get all summaries for the current user."""
    try:
        summaries_res = supabase.table("summaries").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()

        return JSONResponse({
            "summaries": summaries_res.data
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/summaries/{summary_id}")
async def get_summary(
    summary_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get a specific summary by ID."""
    try:
        summary_res = supabase.table("summaries").select("*").eq("id", summary_id).eq("user_id", user_id).execute()

        if not summary_res.data:
            raise HTTPException(status_code=404, detail="Summary not found")

        return JSONResponse(summary_res.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/summaries/{summary_id}")
async def delete_summary(
    summary_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Delete a specific summary by ID."""
    try:
        # First verify the summary exists and belongs to the user
        summary_res = supabase.table("summaries").select("id").eq("id", summary_id).eq("user_id", user_id).execute()

        if not summary_res.data:
            raise HTTPException(status_code=404, detail="Summary not found")

        # Delete the summary
        supabase.table("summaries").delete().eq("id", summary_id).eq("user_id", user_id).execute()

        return JSONResponse({
            "message": "Summary deleted successfully",
            "summary_id": summary_id
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/preferences")
async def get_preferences(
    user_id: str = Depends(get_current_user_id),
):
    """Get user preferences, creating default if not exists."""
    try:
        prefs_res = supabase.table("user_preferences").select("*").eq("user_id", user_id).execute()

        if not prefs_res.data:
            # Create default preferences
            default_prefs = {
                "user_id": user_id,
                "default_format": "structured",
                "default_language": "en",
                "default_detail_level": "medium",
                "auto_generate_summary": True,
                "include_timestamps": True,
                "include_action_items": True,
                "include_decisions": True
            }
            prefs_res = supabase.table("user_preferences").insert(default_prefs).execute()

        return JSONResponse(prefs_res.data[0])

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/preferences")
async def update_preferences(
    preferences: UserPreferences,
    user_id: str = Depends(get_current_user_id),
):
    """Update user preferences."""
    try:
        # Check if preferences exist
        prefs_res = supabase.table("user_preferences").select("id").eq("user_id", user_id).execute()

        prefs_data = {
            "user_id": user_id,
            "default_format": preferences.default_format,
            "default_language": preferences.default_language,
            "default_detail_level": preferences.default_detail_level,
            "auto_generate_summary": preferences.auto_generate_summary,
            "include_timestamps": preferences.include_timestamps,
            "include_action_items": preferences.include_action_items,
            "include_decisions": preferences.include_decisions
        }

        if prefs_res.data:
            # Update existing
            result = supabase.table("user_preferences").update(prefs_data).eq("user_id", user_id).execute()
        else:
            # Insert new
            result = supabase.table("user_preferences").insert(prefs_data).execute()

        return JSONResponse(result.data[0])

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/refine-summary")
async def refine_summary(
    request: RefineSummaryRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Refine a summary through conversational chat with the LLM."""
    try:
        # Get the summary and verify ownership
        summary_res = supabase.table("summaries").select("*").eq("id", request.summary_id).eq("user_id", user_id).execute()

        if not summary_res.data:
            raise HTTPException(status_code=404, detail="Summary not found")

        summary = summary_res.data[0]

        # Get the original transcript segments
        transcript_res = supabase.table("segments").select("*").eq("transcript_id", summary["transcript_id"]).order("start_seconds").execute()

        if not transcript_res.data:
            raise HTTPException(status_code=404, detail="Transcript not found")

        # Build context for the LLM
        segments_text = "\n".join([
            f"[{seg['start_seconds']:.1f}s-{seg['end_seconds']:.1f}s] {seg['text']}"
            for seg in transcript_res.data[:100]  # Limit to first 100 segments to avoid token limits
        ])

        # Prepare the conversation with context
        system_prompt = f"""You are an expert assistant helping to refine a meeting summary.

You have access to:
1. The original transcript (partial, for reference)
2. The current summary
3. User's refinement requests

CRITICAL INSTRUCTIONS:
- When the user asks for changes, respond in ONE of TWO ways:
  1. If asking clarifying questions: Respond conversationally (e.g., "What specific aspects should I focus on?")
  2. If providing a refined summary: Return ONLY the pure summary content with NO meta-commentary

- NEVER include phrases like:
  - "Here's the refined version..."
  - "I've made the following changes..."
  - "I've updated the summary to..."
  - "Based on your request, I..."

- When providing a refined summary:
  - Start directly with the summary content
  - Use the same markdown structure
  - Include NO explanations or commentary about what you changed
  - The output should be indistinguishable from an original summary

Language: {'English' if summary['language'] == 'en' else 'French'}
Current format: {summary['format']}
Detail level: {summary['detail_level']}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "assistant", "content": f"I have the current summary and original transcript ready. What would you like me to adjust?\n\nCurrent summary:\n{summary['summary_text'][:500]}...\n\n(I can see the full summary and transcript)"},
        ]

        # Add chat history
        for msg in request.chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add new user message
        messages.append({"role": "user", "content": request.user_message})

        # Get LLM response
        client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.3,
            max_tokens=3000,
        )

        assistant_message = response.choices[0].message.content

        # Detect if this is a refined summary vs. a conversational response
        # A refined summary should:
        # 1. Contain markdown headings (##)
        # 2. Be substantial in length (>300 chars)
        # 3. NOT contain meta-commentary phrases

        meta_phrases = [
            "here's the", "i've made", "i've updated", "based on your request",
            "i have", "let me", "i can", "would you like", "here is the"
        ]

        has_markdown = "##" in assistant_message
        is_substantial = len(assistant_message) > 300
        has_meta_commentary = any(phrase in assistant_message.lower()[:200] for phrase in meta_phrases)

        # It's a refined summary if it has markdown, is substantial, and doesn't have meta-commentary
        is_refined_summary = has_markdown and is_substantial and not has_meta_commentary

        # If it's a refined summary, update the database
        if is_refined_summary:
            # Strip any potential meta-commentary from the beginning
            cleaned_summary = assistant_message

            # Remove common meta-commentary patterns if they exist
            for phrase in ["Here's the refined version:", "Here is the refined version:", "Here's the updated summary:"]:
                if cleaned_summary.startswith(phrase):
                    cleaned_summary = cleaned_summary[len(phrase):].strip()

            supabase.table("summaries").update({
                "summary_text": cleaned_summary,
                "updated_at": "now()"
            }).eq("id", request.summary_id).execute()

            return JSONResponse({
                "assistant_message": cleaned_summary,
                "is_summary_updated": True,
                "updated_summary": cleaned_summary
            })
        else:
            # It's a conversational response
            return JSONResponse({
                "assistant_message": assistant_message,
                "is_summary_updated": False,
                "updated_summary": summary['summary_text']
            })

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error refining summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
