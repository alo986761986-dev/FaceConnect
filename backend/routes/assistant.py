"""
ALO Voice Assistant API with Google Gemini Integration
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/assistant", tags=["assistant"])

# Initialize Gemini chat
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Warning: emergentintegrations not available, using fallback responses")

# Get API key
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# System prompt for ALO assistant
ALO_SYSTEM_PROMPT = """You are ALO, a friendly and intelligent AI assistant for FaceConnect - a social media communication platform. 

Your personality traits:
- Warm, helpful, and conversational
- Tech-savvy and knowledgeable about social media, messaging, and technology
- Enthusiastic but not overwhelming
- Concise in responses (keep them under 3 sentences unless more detail is needed)

You can help users with:
- Using FaceConnect features (chat, calls, stories, groups, etc.)
- General questions and conversations
- Tech support and troubleshooting
- Fun facts and casual conversation
- Setting reminders and taking notes (simulate this)

When greeting users, be warm and personable. Use occasional emojis sparingly.
Always maintain a helpful, friendly tone like a personal assistant would."""

class AssistantRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    conversation_history: Optional[List[dict]] = []

class AssistantResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str

# Store for conversation sessions (in production, use database)
sessions = {}

def get_fallback_response(message: str) -> str:
    """Generate fallback response when Gemini is not available"""
    lower_msg = message.lower().strip()
    
    # Greetings
    if any(word in lower_msg for word in ['hello', 'hi', 'hey', 'alo']):
        return "Hello! I'm ALO, your FaceConnect assistant. How can I help you today?"
    
    # Time
    if 'time' in lower_msg:
        now = datetime.now()
        return f"The current time is {now.strftime('%I:%M %p')}."
    
    # Date
    if 'date' in lower_msg or 'day' in lower_msg:
        now = datetime.now()
        return f"Today is {now.strftime('%A, %B %d, %Y')}."
    
    # Weather (simulated)
    if 'weather' in lower_msg:
        return "I'd love to check the weather for you! For accurate weather, please check your local weather service."
    
    # Help
    if 'help' in lower_msg or 'can you' in lower_msg:
        return "I can help you with FaceConnect features, answer questions, tell jokes, and have friendly conversations. What would you like to know?"
    
    # Jokes
    if 'joke' in lower_msg:
        jokes = [
            "Why don't scientists trust atoms? Because they make up everything!",
            "What do you call a fake noodle? An impasta!",
            "Why did the scarecrow win an award? He was outstanding in his field!",
        ]
        import random
        return random.choice(jokes)
    
    # Thanks
    if 'thank' in lower_msg:
        return "You're welcome! Let me know if there's anything else I can help with."
    
    # Goodbye
    if any(word in lower_msg for word in ['bye', 'goodbye', 'see you']):
        return "Goodbye! Have a great day! Feel free to call me anytime you need help."
    
    # Default
    return "I'm here to help! You can ask me about FaceConnect features, the time, or just have a chat. What's on your mind?"

@router.post("/chat", response_model=AssistantResponse)
async def chat_with_assistant(request: AssistantRequest):
    """Chat with ALO assistant powered by Gemini"""
    
    try:
        if GEMINI_AVAILABLE and EMERGENT_LLM_KEY:
            # Use Gemini for response
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=request.session_id,
                system_message=ALO_SYSTEM_PROMPT
            ).with_model("gemini", "gemini-3-flash-preview")
            
            # Create user message
            user_message = UserMessage(text=request.message)
            
            # Get response
            response_text = await chat.send_message(user_message)
            
        else:
            # Use fallback responses
            response_text = get_fallback_response(request.message)
        
        return AssistantResponse(
            response=response_text,
            session_id=request.session_id,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except Exception as e:
        print(f"Assistant error: {e}")
        # Fallback to basic response on error
        return AssistantResponse(
            response=get_fallback_response(request.message),
            session_id=request.session_id,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

@router.get("/health")
async def assistant_health():
    """Check assistant health and Gemini availability"""
    return {
        "status": "healthy",
        "gemini_available": GEMINI_AVAILABLE,
        "api_key_configured": bool(EMERGENT_LLM_KEY)
    }
