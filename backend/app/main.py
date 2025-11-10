from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import uuid, subprocess, whisper

from app.supabase_client import supabase
from app.auth import get_current_user_id

app = FastAPI(title="Meeting Notes API")

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
        supabase.storage.from_("meeting-audios").upload(
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
