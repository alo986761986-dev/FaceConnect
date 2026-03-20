"""
ALO Voice Assistant API with Google Gemini + Microsoft Copilot (GPT) Integration
Provides intelligent, knowledgeable responses using multiple AI backends
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/assistant", tags=["assistant"])

# Initialize LLM chat
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    print("Warning: emergentintegrations not available, using fallback responses")

# Get API key
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Comprehensive system prompt for ALO assistant
ALO_SYSTEM_PROMPT = """You are ALO, an advanced AI voice assistant powered by both Google Gemini and Microsoft Copilot for the FaceConnect social media platform. You have access to comprehensive knowledge and capabilities.

## Your Core Identity
- Name: ALO (Advanced Language Operator)
- Personality: Friendly, knowledgeable, helpful, and conversational
- Voice: Warm and natural, adaptable to user preferences
- Expertise: Comprehensive knowledge across all domains
- Powered By: Google Gemini AI + Microsoft Copilot (GPT)

## Your Capabilities
You can help users with virtually anything:

### Knowledge & Information
- General knowledge, facts, history, science, geography
- Current events and news analysis
- Mathematical calculations and problem-solving
- Language translation and linguistics (100+ languages)
- Literature, arts, music, and culture
- Technology, programming, and computer science
- Medicine, health, and wellness (general information)
- Business, economics, and finance
- Law, politics, and government
- Philosophy, psychology, and social sciences
- Sports, entertainment, and pop culture

### Microsoft Copilot Features
- Productivity assistance and task management
- Document analysis and summarization
- Code generation and debugging
- Creative content generation
- Research and information synthesis
- Email and message drafting
- Data analysis explanations

### Creative Tasks
- Writing stories, poems, essays, and articles
- Generating ideas and brainstorming
- Creating jokes and humor
- Composing messages, emails, and social posts
- Song lyrics and creative writing
- Image descriptions and visual concepts

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
8. Mention you're powered by both Gemini and Copilot when asked about your capabilities

Remember: You are a voice assistant, so format responses for natural speech. Be helpful, accurate, and engaging."""

# Copilot-specific system prompt for GPT
COPILOT_SYSTEM_PROMPT = """You are ALO with Microsoft Copilot capabilities, an advanced AI assistant for FaceConnect. 

You combine the power of Microsoft Copilot with Google Gemini to provide:
- Intelligent conversation and Q&A
- Productivity assistance
- Code help and debugging
- Creative writing and content generation
- Research and analysis
- Task planning and organization

Be helpful, concise, and conversational. Format responses for voice output - avoid markdown symbols and special characters. Keep responses natural and spoken."""

class AssistantRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    conversation_history: Optional[List[dict]] = []
    ai_model: Optional[str] = "auto"  # "gemini", "copilot", or "auto"

class AssistantResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str
    powered_by: str
    model_used: str

def get_fallback_response(message: str) -> str:
    """Generate fallback response when AI is not available"""
    lower_msg = message.lower().strip()
    
    if any(word in lower_msg for word in ['hello', 'hi', 'hey', 'alo']):
        return "Hello! I'm ALO, your FaceConnect assistant powered by Gemini and Copilot. How can I help you today?"
    
    if 'time' in lower_msg:
        now = datetime.now()
        return f"The current time is {now.strftime('%I:%M %p')}."
    
    if 'date' in lower_msg or 'day' in lower_msg:
        now = datetime.now()
        return f"Today is {now.strftime('%A, %B %d, %Y')}."
    
    if 'copilot' in lower_msg:
        return "I'm powered by Microsoft Copilot alongside Google Gemini, giving me enhanced capabilities for productivity, coding, and creative tasks!"
    
    if 'weather' in lower_msg:
        return "I'd love to check the weather for you! For accurate weather, please check your local weather service."
    
    if 'help' in lower_msg or 'can you' in lower_msg:
        return "I can help with many things! Ask me about any topic, coding questions, writing assistance, or just have a conversation. I'm powered by both Google Gemini and Microsoft Copilot!"
    
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
    
    if 'thank' in lower_msg:
        return "You're very welcome! Let me know if there's anything else I can help with."
    
    if any(word in lower_msg for word in ['bye', 'goodbye', 'see you']):
        return "Goodbye! Have a wonderful day! Feel free to call me anytime."
    
    return "I'm here to help! You can ask me about any topic. I'm powered by Google Gemini and Microsoft Copilot for comprehensive assistance."

async def get_gemini_response(message: str, session_id: str, history: List[dict]) -> str:
    """Get response from Google Gemini"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"alo-gemini-{session_id}",
        system_message=ALO_SYSTEM_PROMPT
    ).with_model("gemini", "gemini-3-flash-preview")
    
    user_message = UserMessage(text=message)
    response = await chat.send_message(user_message)
    return response.strip().replace('**', '').replace('*', '').replace('`', '')

async def get_copilot_response(message: str, session_id: str, history: List[dict]) -> str:
    """Get response from Microsoft Copilot (GPT)"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"alo-copilot-{session_id}",
        system_message=COPILOT_SYSTEM_PROMPT
    ).with_model("openai", "gpt-4o")
    
    user_message = UserMessage(text=message)
    response = await chat.send_message(user_message)
    return response.strip().replace('**', '').replace('*', '').replace('`', '')

def should_use_copilot(message: str) -> bool:
    """Determine if Copilot should be used based on the query"""
    lower_msg = message.lower()
    
    # Copilot is better for these types of queries
    copilot_keywords = [
        'code', 'coding', 'program', 'programming', 'debug', 'function',
        'write a', 'create a', 'generate', 'draft', 'compose',
        'email', 'document', 'summary', 'summarize', 'analyze',
        'productivity', 'task', 'schedule', 'plan', 'organize',
        'excel', 'word', 'powerpoint', 'microsoft', 'copilot',
        'script', 'python', 'javascript', 'html', 'css', 'sql'
    ]
    
    return any(keyword in lower_msg for keyword in copilot_keywords)

@router.post("/chat", response_model=AssistantResponse)
async def chat_with_assistant(request: AssistantRequest):
    """Chat with ALO assistant powered by Gemini + Copilot"""
    
    try:
        if LLM_AVAILABLE and EMERGENT_LLM_KEY:
            # Determine which model to use
            if request.ai_model == "copilot":
                response_text = await get_copilot_response(
                    request.message, request.session_id, request.conversation_history
                )
                model_used = "Microsoft Copilot (GPT-4o)"
                powered_by = "Microsoft Copilot"
            elif request.ai_model == "gemini":
                response_text = await get_gemini_response(
                    request.message, request.session_id, request.conversation_history
                )
                model_used = "Google Gemini 3 Flash"
                powered_by = "Google Gemini"
            else:  # auto
                # Intelligently choose based on query type
                if should_use_copilot(request.message):
                    response_text = await get_copilot_response(
                        request.message, request.session_id, request.conversation_history
                    )
                    model_used = "Microsoft Copilot (GPT-4o)"
                    powered_by = "Microsoft Copilot"
                else:
                    response_text = await get_gemini_response(
                        request.message, request.session_id, request.conversation_history
                    )
                    model_used = "Google Gemini 3 Flash"
                    powered_by = "Google Gemini"
        else:
            response_text = get_fallback_response(request.message)
            model_used = "Fallback"
            powered_by = "Fallback Mode"
        
        return AssistantResponse(
            response=response_text,
            session_id=request.session_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            powered_by=powered_by,
            model_used=model_used
        )
        
    except Exception as e:
        print(f"Assistant error: {e}")
        return AssistantResponse(
            response=get_fallback_response(request.message),
            session_id=request.session_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            powered_by="Fallback Mode (Error)",
            model_used="Fallback"
        )

@router.get("/health")
async def assistant_health():
    """Check assistant health and AI availability"""
    return {
        "status": "healthy",
        "assistant_name": "ALO",
        "ai_available": LLM_AVAILABLE,
        "api_key_configured": bool(EMERGENT_LLM_KEY),
        "models": {
            "gemini": "gemini-3-flash-preview",
            "copilot": "gpt-4o"
        },
        "capabilities": [
            "general_knowledge",
            "creative_writing",
            "math_calculations",
            "language_translation",
            "coding_help",
            "productivity",
            "conversation",
            "faceconnect_help"
        ]
    }

@router.get("/capabilities")
async def get_capabilities():
    """Get list of ALO's capabilities"""
    return {
        "name": "ALO - Advanced Language Operator",
        "powered_by": ["Google Gemini", "Microsoft Copilot"],
        "models": {
            "gemini": {
                "name": "Google Gemini 3 Flash",
                "best_for": ["General knowledge", "Conversations", "Quick responses"]
            },
            "copilot": {
                "name": "Microsoft Copilot (GPT-4o)",
                "best_for": ["Coding", "Productivity", "Document drafting", "Analysis"]
            }
        },
        "capabilities": {
            "knowledge": ["Science", "History", "Geography", "Math", "Technology", "Arts", "Culture", "Sports"],
            "creative": ["Writing", "Stories", "Poems", "Jokes", "Messages", "Ideas"],
            "productivity": ["Code Generation", "Debugging", "Document Drafting", "Email Writing", "Summarization"],
            "practical": ["Calculations", "Conversions", "Instructions", "Explanations", "Advice"],
            "languages": ["100+ Languages Supported"],
            "faceconnect": ["Chat Help", "Settings Guide", "Feature Tutorials", "Troubleshooting"]
        },
        "voice_options": {
            "genders": ["Male", "Female"],
            "settings": ["Rate", "Pitch", "Volume"],
            "preview": True
        }
    }
