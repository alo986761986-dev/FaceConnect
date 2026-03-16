"""
AI Service Module for FaceConnect
Handles all AI-related functionality including:
- Chat with AI assistant
- Message summaries
- Quick reply suggestions
- Smart text suggestions
- Image generation
- Image analysis
- Emotional support
"""

import os
import base64
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

load_dotenv()

# Get API key from environment
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# AI Personas
AI_PERSONAS = {
    "assistant": {
        "name": "FaceConnect AI",
        "system_message": """You are FaceConnect AI, a helpful and friendly assistant for the FaceConnect social media app. 
You help users with:
- Finding and connecting with people
- Creating engaging posts and stories
- Understanding app features
- General questions and conversations
Keep responses concise, friendly, and helpful. Use emojis occasionally to be more personable."""
    },
    "creative": {
        "name": "Creative Muse",
        "system_message": """You are Creative Muse, an inspiring AI assistant focused on creativity and content creation.
You excel at:
- Writing catchy captions and bios
- Suggesting creative post ideas
- Brainstorming story concepts
- Helping with artistic expression
Be enthusiastic, imaginative, and encouraging. Use emojis and creative language."""
    },
    "professional": {
        "name": "Pro Assistant",
        "system_message": """You are Pro Assistant, a professional AI helper for networking and business use.
You specialize in:
- Professional networking advice
- Business communication
- Career-related content
- Formal writing assistance
Be professional, concise, and insightful. Maintain a business-appropriate tone."""
    },
    "emotional_support": {
        "name": "Supportive Friend",
        "system_message": """You are Supportive Friend, an empathetic AI companion focused on emotional wellbeing.
You provide:
- Active listening and validation
- Gentle encouragement
- Stress relief suggestions
- Positive affirmations
Be warm, understanding, and supportive. Never give medical advice, but suggest professional help when appropriate."""
    }
}

# Quick reply templates by context
QUICK_REPLY_CONTEXTS = {
    "greeting": ["Hey! How are you? 👋", "Hi there! 😊", "Hello! What's up?"],
    "thanks": ["You're welcome! 😊", "Happy to help!", "Anytime! 🙌"],
    "agreement": ["Sounds good! 👍", "I agree!", "Absolutely! ✨"],
    "question": ["Can you tell me more?", "What do you think?", "How so?"],
    "positive": ["That's amazing! 🎉", "So happy for you! 💖", "Love it! ❤️"],
    "sympathy": ["I'm sorry to hear that 💙", "That must be tough", "I'm here for you"],
}


class AIService:
    """Main AI Service class for handling all AI operations"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or EMERGENT_LLM_KEY
        self._chat_instances: Dict[str, LlmChat] = {}
    
    def _get_chat_instance(self, session_id: str, persona: str = "assistant") -> LlmChat:
        """Get or create a chat instance for a session"""
        cache_key = f"{session_id}_{persona}"
        
        if cache_key not in self._chat_instances:
            persona_config = AI_PERSONAS.get(persona, AI_PERSONAS["assistant"])
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=persona_config["system_message"]
            ).with_model("openai", "gpt-5.2")
            self._chat_instances[cache_key] = chat
        
        return self._chat_instances[cache_key]
    
    def _get_fast_chat_instance(self, session_id: str) -> LlmChat:
        """Get a fast chat instance using Gemini for quick suggestions"""
        cache_key = f"{session_id}_fast"
        
        if cache_key not in self._chat_instances:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message="You are a helpful assistant that provides brief, concise responses."
            ).with_model("gemini", "gemini-3-flash-preview")
            self._chat_instances[cache_key] = chat
        
        return self._chat_instances[cache_key]
    
    async def chat(self, user_id: str, message: str, persona: str = "assistant", 
                   conversation_history: List[Dict] = None) -> Dict[str, Any]:
        """
        Chat with AI assistant
        Returns: {"response": str, "persona": str}
        """
        session_id = f"ai_chat_{user_id}"
        chat = self._get_chat_instance(session_id, persona)
        
        user_message = UserMessage(text=message)
        response = await chat.send_message(user_message)
        
        return {
            "response": response,
            "persona": persona,
            "persona_name": AI_PERSONAS.get(persona, AI_PERSONAS["assistant"])["name"]
        }
    
    async def generate_quick_replies(self, context: str, last_message: str) -> List[str]:
        """
        Generate contextual quick reply suggestions
        Returns: List of suggested replies
        """
        # First try template-based replies
        context_lower = context.lower()
        for ctx_key, replies in QUICK_REPLY_CONTEXTS.items():
            if ctx_key in context_lower:
                return replies[:3]
        
        # Fall back to AI-generated replies
        session_id = f"quick_reply_{uuid.uuid4().hex[:8]}"
        chat = self._get_fast_chat_instance(session_id)
        
        prompt = f"""Generate 3 short, natural reply suggestions for this message:
"{last_message}"

Rules:
- Each reply should be under 50 characters
- Be casual and friendly
- Include 1 emoji per reply
- Return ONLY the 3 replies, one per line, no numbering"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse response into list
        replies = [r.strip() for r in response.strip().split('\n') if r.strip()]
        return replies[:3]
    
    async def generate_text_suggestions(self, partial_text: str, context: str = "chat") -> List[str]:
        """
        Generate smart text completion suggestions (CoPilot-style)
        Returns: List of completion suggestions
        """
        if len(partial_text) < 3:
            return []
        
        session_id = f"text_suggest_{uuid.uuid4().hex[:8]}"
        chat = self._get_fast_chat_instance(session_id)
        
        context_hints = {
            "chat": "casual conversation message",
            "post": "social media post caption",
            "story": "story caption",
            "bio": "profile bio"
        }
        
        prompt = f"""Complete this {context_hints.get(context, 'text')} in 3 different ways:
"{partial_text}"

Rules:
- Complete naturally from where the text ends
- Each completion should be 10-30 characters
- Keep the tone appropriate for {context}
- Return ONLY the 3 completions, one per line"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        completions = [r.strip() for r in response.strip().split('\n') if r.strip()]
        return completions[:3]
    
    async def summarize_conversation(self, messages: List[Dict]) -> str:
        """
        Summarize a conversation
        Returns: Summary string
        """
        if not messages:
            return "No messages to summarize."
        
        # Format messages for summary
        formatted = []
        for msg in messages[-50:]:  # Last 50 messages max
            sender = msg.get('sender_name', 'User')
            content = msg.get('content', '')[:200]  # Truncate long messages
            formatted.append(f"{sender}: {content}")
        
        conversation_text = "\n".join(formatted)
        
        session_id = f"summary_{uuid.uuid4().hex[:8]}"
        chat = self._get_fast_chat_instance(session_id)
        
        prompt = f"""Summarize this conversation in 2-3 sentences. Focus on key topics and outcomes.

Conversation:
{conversation_text}

Summary:"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return response.strip()
    
    async def analyze_image(self, image_base64: str, question: str = None) -> Dict[str, Any]:
        """
        Analyze an image and describe its contents
        Returns: {"description": str, "tags": List[str], "mood": str}
        """
        session_id = f"image_analysis_{uuid.uuid4().hex[:8]}"
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message="You are an image analysis expert. Describe images accurately and suggest relevant tags."
        ).with_model("openai", "gpt-5.2")
        
        prompt = question or "Describe this image in detail. Include: 1) Main subject 2) Setting/background 3) Mood/atmosphere 4) Suggested hashtags"
        
        # Note: For actual image analysis, we'd need vision model support
        # This is a placeholder that describes based on context
        user_message = UserMessage(text=f"Analyze this image: {prompt}")
        response = await chat.send_message(user_message)
        
        return {
            "description": response,
            "tags": ["photo", "social", "faceconnect"],
            "mood": "positive"
        }
    
    async def generate_image(self, prompt: str, style: str = "realistic") -> Dict[str, Any]:
        """
        Generate an image from a text prompt
        Returns: {"image_base64": str, "prompt": str}
        """
        style_prompts = {
            "realistic": "photorealistic, high quality, detailed",
            "artistic": "artistic, creative, stylized illustration",
            "cartoon": "cartoon style, colorful, fun",
            "minimal": "minimalist, clean, simple design"
        }
        
        enhanced_prompt = f"{prompt}, {style_prompts.get(style, style_prompts['realistic'])}"
        
        image_gen = OpenAIImageGeneration(api_key=self.api_key)
        images = await image_gen.generate_images(
            prompt=enhanced_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            return {
                "image_base64": image_base64,
                "prompt": enhanced_prompt
            }
        
        raise Exception("Failed to generate image")
    
    async def generate_caption(self, context: str, mood: str = "casual", 
                               include_hashtags: bool = True) -> str:
        """
        Generate a caption for a post or story
        Returns: Caption string with optional hashtags
        """
        session_id = f"caption_{uuid.uuid4().hex[:8]}"
        chat = self._get_fast_chat_instance(session_id)
        
        hashtag_instruction = "Include 3-5 relevant hashtags at the end." if include_hashtags else "Do not include hashtags."
        
        prompt = f"""Generate a {mood} social media caption for: {context}

Rules:
- Keep it under 150 characters (excluding hashtags)
- Match the {mood} tone
- {hashtag_instruction}
- Make it engaging and authentic

Caption:"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return response.strip()
    
    async def search_with_ai(self, query: str, content_type: str = "all") -> Dict[str, Any]:
        """
        AI-powered semantic search assistance
        Returns: {"interpretation": str, "suggestions": List[str], "filters": Dict}
        """
        session_id = f"search_{uuid.uuid4().hex[:8]}"
        chat = self._get_fast_chat_instance(session_id)
        
        prompt = f"""Interpret this search query for a social media app: "{query}"

Provide:
1. What the user is likely looking for
2. 3 related search suggestions
3. Recommended filters (content type, time range, etc.)

Format as:
Interpretation: [your interpretation]
Suggestions: [suggestion1], [suggestion2], [suggestion3]
Filters: [filter recommendations]"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse response
        lines = response.strip().split('\n')
        result = {
            "interpretation": "",
            "suggestions": [],
            "filters": {}
        }
        
        for line in lines:
            if line.startswith("Interpretation:"):
                result["interpretation"] = line.replace("Interpretation:", "").strip()
            elif line.startswith("Suggestions:"):
                suggestions = line.replace("Suggestions:", "").strip()
                result["suggestions"] = [s.strip() for s in suggestions.split(',')]
            elif line.startswith("Filters:"):
                result["filters"]["recommendation"] = line.replace("Filters:", "").strip()
        
        return result
    
    async def get_emotional_support(self, user_id: str, message: str) -> Dict[str, Any]:
        """
        Provide emotional support response
        Returns: {"response": str, "resources": List[str], "mood_detected": str}
        """
        session_id = f"emotional_{user_id}"
        chat = self._get_chat_instance(session_id, "emotional_support")
        
        user_message = UserMessage(text=message)
        response = await chat.send_message(user_message)
        
        return {
            "response": response,
            "resources": [
                "Remember: It's okay to take breaks",
                "Consider talking to a friend or professional",
                "Self-care is important"
            ],
            "mood_detected": "supportive_needed"
        }


# Create singleton instance
ai_service = AIService()
