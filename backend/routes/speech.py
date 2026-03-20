"""
Speech-to-Text route using OpenAI Whisper
Provides audio transcription functionality
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from pydantic import BaseModel
from emergentintegrations.llm.openai import OpenAISpeechToText
import os
from dotenv import load_dotenv
import tempfile

load_dotenv()

router = APIRouter(prefix="/speech", tags=["Speech"])

EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")

class TranscriptionResponse(BaseModel):
    text: str
    language: str = None
    duration: float = None

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form(default=None)
):
    """
    Transcribe audio file to text using OpenAI Whisper.
    Supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
    Max file size: 25MB
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Speech API not configured")
    
    # Validate file type
    allowed_types = ['audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/mpga', 
                     'audio/m4a', 'audio/wav', 'audio/webm', 'audio/x-m4a',
                     'audio/ogg', 'video/webm']
    
    content_type = file.content_type or ''
    file_ext = file.filename.split('.')[-1].lower() if file.filename else ''
    
    # Accept if content type matches or file extension is valid
    allowed_extensions = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg']
    if content_type not in allowed_types and file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Supported: mp3, mp4, mpeg, m4a, wav, webm. Got: {content_type}, ext: {file_ext}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size (25MB limit)
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 25MB allowed.")
    
    try:
        # Save to temp file (Whisper API needs a file object)
        suffix = f".{file_ext}" if file_ext else ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        # Transcribe using OpenAI Whisper
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        
        with open(tmp_path, "rb") as audio_file:
            transcribe_params = {
                "file": audio_file,
                "model": "whisper-1",
                "response_format": "verbose_json"
            }
            
            # Add language if specified
            if language:
                transcribe_params["language"] = language
            
            response = await stt.transcribe(**transcribe_params)
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        return TranscriptionResponse(
            text=response.text.strip(),
            language=getattr(response, 'language', language),
            duration=getattr(response, 'duration', None)
        )
        
    except Exception as e:
        # Clean up on error
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
        
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
