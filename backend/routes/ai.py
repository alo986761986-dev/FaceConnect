"""
AI routes for FaceConnect.
Handles AI-powered content generation, chat, image generation, and more.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from pathlib import Path
import uuid
import os
import base64
import logging
import aiofiles

from .shared import db, get_current_user, get_user_by_id, UPLOAD_DIR

router = APIRouter(prefix="/ai", tags=["AI"])


# ============== MODELS ==============
class AITextGenerateRequest(BaseModel):
    prompt_type: str  # caption, story_idea, bio, hashtags, comment_reply
    context: Optional[str] = None
    tone: Optional[str] = "friendly"  # friendly, professional, funny, inspiring


class AIImageGenerateRequest(BaseModel):
    prompt: str
    style: Optional[str] = "realistic"  # realistic, artistic, cartoon, abstract


class AIChatRequest(BaseModel):
    message: str
    persona: str = "assistant"
    context: Optional[str] = None


class AIQuickReplyRequest(BaseModel):
    last_message: str
    context: str = "general"


class AITextSuggestRequest(BaseModel):
    partial_text: str
    context: str = "chat"


class AISummarizeRequest(BaseModel):
    conversation_id: str


class AIImageGenRequest(BaseModel):
    prompt: str
    style: str = "realistic"


class AICaptionRequest(BaseModel):
    context: str
    mood: str = "casual"
    include_hashtags: bool = True


class AISearchRequest(BaseModel):
    query: str
    content_type: str = "all"


class AIEmotionalRequest(BaseModel):
    message: str


# ============== ROUTES ==============
@router.post("/generate-text")
async def generate_ai_text(request: AITextGenerateRequest, token: str):
    """Generate AI text content."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Build prompt based on type
        prompts = {
            "caption": f"Generate a creative and engaging social media caption. Context: {request.context or 'general post'}. Tone: {request.tone}. Keep it under 280 characters. Don't use hashtags in the caption.",
            "story_idea": f"Suggest 3 creative story ideas for social media. Context: {request.context or 'daily life'}. Each idea should be one sentence.",
            "bio": f"Generate a catchy social media bio. Context: {request.context or 'personal profile'}. Tone: {request.tone}. Keep it under 150 characters.",
            "hashtags": f"Generate 5-10 relevant hashtags for: {request.context or 'social media post'}. Return only hashtags separated by spaces.",
            "comment_reply": f"Generate a friendly reply to this comment: {request.context}. Tone: {request.tone}. Keep it natural and under 100 characters."
        }
        
        if request.prompt_type not in prompts:
            raise HTTPException(status_code=400, detail="Invalid prompt type")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai-gen-{user['id']}-{uuid.uuid4()}",
            system_message="You are a creative social media content assistant. Generate engaging, original content. Be concise and impactful."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompts[request.prompt_type])
        response = await chat.send_message(user_message)
        
        return {
            "type": request.prompt_type,
            "content": response,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except ImportError:
        raise HTTPException(status_code=500, detail="AI service not available")
    except Exception as e:
        logging.error(f"AI text generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate content: {str(e)}")


@router.post("/enhance-content")
async def enhance_content(token: str, content: str, enhancement_type: str = "improve"):
    """Enhance existing content with AI."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        enhancement_prompts = {
            "improve": f"Improve this social media content while keeping the same meaning. Make it more engaging: {content}",
            "shorten": f"Make this content shorter and more impactful while keeping the key message: {content}",
            "expand": f"Expand this content with more details and make it more descriptive: {content}",
            "professional": f"Rewrite this content in a more professional tone: {content}",
            "casual": f"Rewrite this content in a more casual, friendly tone: {content}"
        }
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai-enhance-{user['id']}-{uuid.uuid4()}",
            system_message="You are a content editor. Enhance and improve content while preserving the original intent."
        ).with_model("openai", "gpt-5.2")
        
        prompt = enhancement_prompts.get(enhancement_type, enhancement_prompts["improve"])
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "original": content,
            "enhanced": response,
            "enhancement_type": enhancement_type,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"AI enhancement error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to enhance content: {str(e)}")


@router.post("/chat")
async def ai_chat(request: AIChatRequest, token: str):
    """Chat with AI assistant."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from services.ai_service import ai_service
        
        result = await ai_service.chat(
            user_id=user['id'],
            message=request.message,
            persona=request.persona
        )
        
        # Store AI interaction in database
        await db.ai_interactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user['id'],
            "type": "chat",
            "persona": request.persona,
            "message": request.message,
            "response": result['response'],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return result
    except Exception as e:
        logging.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI chat failed: {str(e)}")


@router.get("/personas")
async def get_ai_personas(token: str):
    """Get available AI personas."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from services.ai_service import AI_PERSONAS
        
        personas = []
        for key, config in AI_PERSONAS.items():
            personas.append({
                "id": key,
                "name": config["name"],
                "description": config["system_message"][:100] + "..."
            })
        
        return {"personas": personas}
    except Exception as e:
        logging.error(f"Get personas error: {e}")
        return {"personas": []}


@router.post("/quick-replies")
async def get_quick_replies(request: AIQuickReplyRequest, token: str):
    """Generate quick reply suggestions."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from services.ai_service import ai_service
        
        replies = await ai_service.generate_quick_replies(
            context=request.context,
            last_message=request.last_message
        )
        return {"replies": replies}
    except Exception as e:
        logging.error(f"Quick reply error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate replies: {str(e)}")


@router.post("/text-suggest")
async def get_text_suggestions(request: AITextSuggestRequest, token: str):
    """Generate smart text completion suggestions."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from services.ai_service import ai_service
        
        suggestions = await ai_service.generate_text_suggestions(
            partial_text=request.partial_text,
            context=request.context
        )
        return {"suggestions": suggestions}
    except Exception as e:
        logging.error(f"Text suggest error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")


@router.post("/summarize")
async def summarize_conversation(request: AISummarizeRequest, token: str):
    """Summarize a conversation."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get conversation messages
    conversation = await db.conversations.find_one(
        {"id": request.conversation_id, "participant_ids": user['id']}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = await db.messages.find(
        {"conversation_id": request.conversation_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Format messages with sender names
    formatted_messages = []
    for msg in messages:
        sender = await get_user_by_id(msg['sender_id'])
        formatted_messages.append({
            "sender_name": sender.get('display_name', sender.get('username', 'User')) if sender else 'User',
            "content": msg.get('content', '')
        })
    
    try:
        from services.ai_service import ai_service
        
        summary = await ai_service.summarize_conversation(formatted_messages)
        return {"summary": summary}
    except Exception as e:
        logging.error(f"Summarize error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to summarize: {str(e)}")


@router.post("/generate-image")
async def generate_ai_image(request: AIImageGenRequest, token: str):
    """Generate an image from a text prompt."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from services.ai_service import ai_service
        
        result = await ai_service.generate_image(
            prompt=request.prompt,
            style=request.style
        )
        
        # Save the generated image
        image_id = str(uuid.uuid4())
        image_path = UPLOAD_DIR / f"ai_generated_{image_id}.png"
        
        image_bytes = base64.b64decode(result['image_base64'])
        async with aiofiles.open(image_path, 'wb') as f:
            await f.write(image_bytes)
        
        # Store in database
        await db.ai_images.insert_one({
            "id": image_id,
            "user_id": user['id'],
            "prompt": request.prompt,
            "style": request.style,
            "file_path": f"/uploads/ai_generated_{image_id}.png",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "image_id": image_id,
            "image_url": f"/uploads/ai_generated_{image_id}.png",
            "image_base64": result['image_base64'],
            "prompt": result['prompt']
        }
    except Exception as e:
        logging.error(f"Image generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")


@router.post("/caption")
async def generate_ai_caption(request: AICaptionRequest, token: str):
    """Generate a caption for a post or story."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from services.ai_service import ai_service
        
        caption = await ai_service.generate_caption(
            context=request.context,
            mood=request.mood,
            include_hashtags=request.include_hashtags
        )
        return {"caption": caption}
    except Exception as e:
        logging.error(f"Caption generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate caption: {str(e)}")


@router.post("/search")
async def ai_powered_search(request: AISearchRequest, token: str):
    """AI-powered semantic search."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from services.ai_service import ai_service
        
        result = await ai_service.search_with_ai(
            query=request.query,
            content_type=request.content_type
        )
        return result
    except Exception as e:
        logging.error(f"AI search error: {e}")
        raise HTTPException(status_code=500, detail=f"AI search failed: {str(e)}")


@router.post("/emotional-support")
async def get_emotional_support(request: AIEmotionalRequest, token: str):
    """Get emotional support from AI."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from services.ai_service import ai_service
        
        result = await ai_service.get_emotional_support(
            user_id=user['id'],
            message=request.message
        )
        return result
    except Exception as e:
        logging.error(f"Emotional support error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get support: {str(e)}")


@router.get("/history")
async def get_ai_history(token: str, limit: int = 20):
    """Get user's AI interaction history."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    interactions = await db.ai_interactions.find(
        {"user_id": user['id']},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"interactions": interactions}


@router.delete("/history")
async def clear_ai_history(token: str):
    """Clear user's AI interaction history."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.ai_interactions.delete_many({"user_id": user['id']})
    return {"success": True, "message": "AI history cleared"}


# Export for other modules
__all__ = ["router"]
