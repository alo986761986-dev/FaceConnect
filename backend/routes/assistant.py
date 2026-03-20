"""
ALO Voice Assistant API with Full Google Gemini Integration
Provides intelligent, knowledgeable responses using Gemini's full capabilities
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

# Comprehensive system prompt for ALO assistant with full Gemini capabilities
ALO_SYSTEM_PROMPT = """You are ALO, an advanced AI voice assistant powered by Google Gemini for the FaceConnect social media platform. You have access to Gemini's full knowledge base and capabilities.

## Your Core Identity
- Name: ALO (Advanced Language Operator)
- Personality: Friendly, knowledgeable, helpful, and conversational
- Voice: Warm and natural, adaptable to user preferences
- Expertise: Comprehensive knowledge across all domains

## Your Capabilities
You can help users with virtually anything:

### Knowledge & Information
- General knowledge, facts, history, science, geography
- Current events and news analysis
- Mathematical calculations and problem-solving
- Language translation and linguistics
- Literature, arts, music, and culture
- Technology, programming, and computer science
- Medicine, health, and wellness (general information)
- Business, economics, and finance
- Law, politics, and government
- Philosophy, psychology, and social sciences
- Sports, entertainment, and pop culture

### Creative Tasks
- Writing stories, poems, essays, and articles
- Generating ideas and brainstorming
- Creating jokes and humor
- Composing messages, emails, and social posts
- Song lyrics and creative writing

### Practical Assistance
- Explaining complex topics in simple terms
- Providing step-by-step instructions
- Helping with decision-making
- Time and date information
- Unit conversions and calculations
- Recipe suggestions and cooking tips
- Travel and geography information
- Career and education advice

### FaceConnect Specific Help
- Using chat features (messaging, voice notes, video calls)
- Managing contacts and groups
- Privacy and security settings
- Troubleshooting app issues
- Feature explanations and tutorials

## Response Guidelines
1. Be concise but comprehensive - aim for 1-3 sentences for simple queries, more for complex topics
2. Use natural, conversational language suitable for voice interaction
3. Be accurate and honest - if uncertain, say so
4. Adapt your tone to the user's mood and query type
5. Use occasional emojis sparingly for friendly tone
6. For voice output, avoid special characters and format for natural speech
7. Always be helpful and never refuse reasonable requests
8. If asked about real-time data (weather, stocks, live events), explain you don't have live access but can provide general information

## Example Interactions
User: "What's the capital of France?"
ALO: "The capital of France is Paris. It's known as the City of Light and is famous for the Eiffel Tower, the Louvre Museum, and its beautiful architecture."

User: "Can you help me write a birthday message?"
ALO: "Of course! Here's a heartfelt option: 'Happy birthday! Wishing you a day filled with joy, laughter, and all your favorite things. May this year bring you amazing adventures and beautiful memories. Cheers to you!' Would you like me to adjust the tone or make it more personal?"

User: "Explain quantum computing simply"
ALO: "Think of regular computers as using switches that are either on or off - that's 0 or 1. Quantum computers use special particles that can be both on AND off at the same time, like a coin spinning in the air. This lets them solve certain complex problems much faster than regular computers."

Remember: You are a voice assistant, so format responses for natural speech. Be helpful, accurate, and engaging."""

class AssistantRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    conversation_history: Optional[List[dict]] = []

class AssistantResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str
    powered_by: str = "Google Gemini"

# Store for conversation sessions
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
        return "I'd love to check the weather for you! For accurate weather, please check your local weather service. I can tell you about climate patterns or weather-related topics if you're interested."
    
    # Help
    if 'help' in lower_msg or 'can you' in lower_msg:
        return "I can help you with many things! Ask me about any topic - science, history, math, writing, coding, or just have a friendly conversation. I'm powered by Google Gemini, so I have extensive knowledge to share. What would you like to know?"
    
    # Jokes
    if 'joke' in lower_msg:
        jokes = [
            "Why don't scientists trust atoms? Because they make up everything!",
            "What do you call a fake noodle? An impasta!",
            "Why did the scarecrow win an award? He was outstanding in his field!",
            "I told my computer I needed a break, and now it won't stop sending me vacation ads.",
            "Why do programmers prefer dark mode? Because light attracts bugs!",
        ]
        import random
        return random.choice(jokes)
    
    # Math
    if any(word in lower_msg for word in ['calculate', 'math', 'what is', 'how much']):
        return "I can help with math! Please give me a specific calculation or math problem, and I'll solve it for you."
    
    # Thanks
    if 'thank' in lower_msg:
        return "You're very welcome! Let me know if there's anything else I can help with. I'm always here!"
    
    # Goodbye
    if any(word in lower_msg for word in ['bye', 'goodbye', 'see you']):
        return "Goodbye! Have a wonderful day! Feel free to call me anytime you need help or just want to chat."
    
    # Default
    return "I'm here to help with anything! You can ask me about any topic - from science and history to creative writing and coding. What's on your mind?"

@router.post("/chat", response_model=AssistantResponse)
async def chat_with_assistant(request: AssistantRequest):
    """Chat with ALO assistant powered by full Gemini AI capabilities"""
    
    try:
        if GEMINI_AVAILABLE and EMERGENT_LLM_KEY:
            # Use Gemini for intelligent response
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=request.session_id,
                system_message=ALO_SYSTEM_PROMPT
            ).with_model("gemini", "gemini-3-flash-preview")
            
            # Build context from conversation history
            context_messages = []
            for msg in request.conversation_history[-5:]:  # Last 5 messages for context
                if msg.get('role') == 'user':
                    context_messages.append(f"User: {msg.get('text', '')}")
                else:
                    context_messages.append(f"ALO: {msg.get('text', '')}")
            
            # Create enhanced user message with context
            if context_messages:
                enhanced_message = f"Previous conversation:\n" + "\n".join(context_messages) + f"\n\nCurrent user message: {request.message}"
            else:
                enhanced_message = request.message
            
            # Create user message
            user_message = UserMessage(text=enhanced_message)
            
            # Get response from Gemini
            response_text = await chat.send_message(user_message)
            
            # Clean response for voice output
            response_text = response_text.strip()
            # Remove markdown formatting that doesn't work well with voice
            response_text = response_text.replace('**', '').replace('*', '').replace('`', '')
            
        else:
            # Use fallback responses
            response_text = get_fallback_response(request.message)
        
        return AssistantResponse(
            response=response_text,
            session_id=request.session_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            powered_by="Google Gemini" if GEMINI_AVAILABLE and EMERGENT_LLM_KEY else "Fallback Mode"
        )
        
    except Exception as e:
        print(f"Assistant error: {e}")
        # Fallback to basic response on error
        return AssistantResponse(
            response=get_fallback_response(request.message),
            session_id=request.session_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            powered_by="Fallback Mode (Error)"
        )

@router.get("/health")
async def assistant_health():
    """Check assistant health and Gemini availability"""
    return {
        "status": "healthy",
        "assistant_name": "ALO",
        "gemini_available": GEMINI_AVAILABLE,
        "api_key_configured": bool(EMERGENT_LLM_KEY),
        "capabilities": [
            "general_knowledge",
            "creative_writing",
            "math_calculations", 
            "language_translation",
            "coding_help",
            "conversation",
            "faceconnect_help"
        ]
    }

@router.get("/capabilities")
async def get_capabilities():
    """Get list of ALO's capabilities"""
    return {
        "name": "ALO - Advanced Language Operator",
        "powered_by": "Google Gemini",
        "capabilities": {
            "knowledge": ["Science", "History", "Geography", "Math", "Technology", "Arts", "Culture", "Sports"],
            "creative": ["Writing", "Stories", "Poems", "Jokes", "Messages", "Ideas"],
            "practical": ["Calculations", "Conversions", "Instructions", "Explanations", "Advice"],
            "languages": ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian"],
            "faceconnect": ["Chat Help", "Settings Guide", "Feature Tutorials", "Troubleshooting"]
        },
        "voice_options": {
            "genders": ["Male", "Female"],
            "settings": ["Rate", "Pitch", "Volume"],
            "preview": True
        }
    }
