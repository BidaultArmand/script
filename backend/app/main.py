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
