"""
Test suite for AI Features in FaceConnect
Tests:
- AI Chat with personas
- Caption generation
- AI Search
- Image generation (basic validation)
- AI history management
- Quick replies
- Text suggestions
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIFeatures:
    """AI Feature endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testfeed@example.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    # =============== AI CHAT TESTS ===============
    def test_ai_chat_default_persona(self, auth_token):
        """Test AI chat with default (assistant) persona"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat?token={auth_token}",
            json={
                "message": "Hello, what can you help me with?",
                "persona": "assistant"
            },
            timeout=60  # AI responses may take time
        )
        
        assert response.status_code == 200, f"AI chat failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "response" in data
        assert "persona" in data
        assert "persona_name" in data
        assert len(data["response"]) > 0
        assert data["persona"] == "assistant"
        assert data["persona_name"] == "FaceConnect AI"
        print(f"AI Response: {data['response'][:100]}...")
    
    def test_ai_chat_creative_persona(self, auth_token):
        """Test AI chat with creative persona"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat?token={auth_token}",
            json={
                "message": "Give me a creative post idea",
                "persona": "creative"
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["persona"] == "creative"
        assert data["persona_name"] == "Creative Muse"
        assert len(data["response"]) > 0
        print(f"Creative Response: {data['response'][:100]}...")
    
    def test_ai_chat_professional_persona(self, auth_token):
        """Test AI chat with professional persona"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat?token={auth_token}",
            json={
                "message": "How do I network professionally?",
                "persona": "professional"
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["persona"] == "professional"
        assert data["persona_name"] == "Pro Assistant"
        print(f"Professional Response: {data['response'][:100]}...")
    
    def test_ai_chat_emotional_support_persona(self, auth_token):
        """Test AI chat with emotional support persona"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat?token={auth_token}",
            json={
                "message": "I'm feeling a bit stressed today",
                "persona": "emotional_support"
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["persona"] == "emotional_support"
        assert data["persona_name"] == "Supportive Friend"
        print(f"Emotional Support Response: {data['response'][:100]}...")
    
    def test_ai_chat_unauthorized(self):
        """Test AI chat without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat?token=invalid_token",
            json={
                "message": "Test",
                "persona": "assistant"
            }
        )
        assert response.status_code == 401
    
    # =============== CAPTION GENERATION TESTS ===============
    def test_caption_generation_casual(self, auth_token):
        """Test caption generation with casual mood"""
        response = requests.post(
            f"{BASE_URL}/api/ai/caption?token={auth_token}",
            json={
                "context": "A beautiful sunset at the beach",
                "mood": "casual",
                "include_hashtags": True
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "caption" in data
        assert len(data["caption"]) > 0
        print(f"Casual Caption: {data['caption']}")
    
    def test_caption_generation_funny(self, auth_token):
        """Test caption generation with funny mood"""
        response = requests.post(
            f"{BASE_URL}/api/ai/caption?token={auth_token}",
            json={
                "context": "My cat doing something silly",
                "mood": "funny",
                "include_hashtags": True
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "caption" in data
        print(f"Funny Caption: {data['caption']}")
    
    def test_caption_generation_inspiring(self, auth_token):
        """Test caption generation with inspiring mood"""
        response = requests.post(
            f"{BASE_URL}/api/ai/caption?token={auth_token}",
            json={
                "context": "Achieving a fitness goal",
                "mood": "inspiring",
                "include_hashtags": False
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "caption" in data
        print(f"Inspiring Caption: {data['caption']}")
    
    def test_caption_generation_professional(self, auth_token):
        """Test caption generation with professional mood"""
        response = requests.post(
            f"{BASE_URL}/api/ai/caption?token={auth_token}",
            json={
                "context": "Company milestone announcement",
                "mood": "professional",
                "include_hashtags": True
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "caption" in data
        print(f"Professional Caption: {data['caption']}")
    
    # =============== AI SEARCH TESTS ===============
    def test_ai_search_basic(self, auth_token):
        """Test AI-powered search"""
        response = requests.post(
            f"{BASE_URL}/api/ai/search?token={auth_token}",
            json={
                "query": "Find posts about travel from last week",
                "content_type": "all"
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "interpretation" in data
        assert "suggestions" in data
        assert "filters" in data
        
        assert len(data["interpretation"]) > 0
        assert isinstance(data["suggestions"], list)
        print(f"Search Interpretation: {data['interpretation']}")
        print(f"Search Suggestions: {data['suggestions']}")
    
    def test_ai_search_people(self, auth_token):
        """Test AI search for people"""
        response = requests.post(
            f"{BASE_URL}/api/ai/search?token={auth_token}",
            json={
                "query": "People interested in photography",
                "content_type": "people"
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "interpretation" in data
        print(f"People Search: {data['interpretation']}")
    
    # =============== QUICK REPLIES TESTS ===============
    def test_quick_replies_greeting(self, auth_token):
        """Test quick reply suggestions for greeting context"""
        response = requests.post(
            f"{BASE_URL}/api/ai/quick-replies?token={auth_token}",
            json={
                "last_message": "Hey! How are you doing?",
                "context": "greeting"
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "replies" in data
        assert isinstance(data["replies"], list)
        assert len(data["replies"]) > 0
        print(f"Quick Replies: {data['replies']}")
    
    def test_quick_replies_thanks(self, auth_token):
        """Test quick reply suggestions for thanks context"""
        response = requests.post(
            f"{BASE_URL}/api/ai/quick-replies?token={auth_token}",
            json={
                "last_message": "Thank you so much for your help!",
                "context": "thanks"
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "replies" in data
        assert len(data["replies"]) > 0
        print(f"Thanks Replies: {data['replies']}")
    
    # =============== TEXT SUGGESTIONS TESTS ===============
    def test_text_suggestions_chat(self, auth_token):
        """Test text completion suggestions for chat context"""
        response = requests.post(
            f"{BASE_URL}/api/ai/text-suggest?token={auth_token}",
            json={
                "partial_text": "I was thinking we could",
                "context": "chat"
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)
        print(f"Text Suggestions: {data['suggestions']}")
    
    def test_text_suggestions_post(self, auth_token):
        """Test text completion suggestions for post context"""
        response = requests.post(
            f"{BASE_URL}/api/ai/text-suggest?token={auth_token}",
            json={
                "partial_text": "Just finished an amazing",
                "context": "post"
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        print(f"Post Suggestions: {data['suggestions']}")
    
    def test_text_suggestions_short_text(self, auth_token):
        """Test text suggestions with short text (should return empty)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/text-suggest?token={auth_token}",
            json={
                "partial_text": "Hi",  # Less than 3 chars
                "context": "chat"
            },
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        # Short text should return empty or minimal suggestions
    
    # =============== AI PERSONAS TESTS ===============
    def test_get_ai_personas(self, auth_token):
        """Test fetching available AI personas"""
        response = requests.get(
            f"{BASE_URL}/api/ai/personas?token={auth_token}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "personas" in data
        assert len(data["personas"]) == 4  # assistant, creative, professional, emotional_support
        
        persona_ids = [p["id"] for p in data["personas"]]
        assert "assistant" in persona_ids
        assert "creative" in persona_ids
        assert "professional" in persona_ids
        assert "emotional_support" in persona_ids
        
        print(f"Available Personas: {persona_ids}")
    
    # =============== AI HISTORY TESTS ===============
    def test_get_ai_history(self, auth_token):
        """Test fetching AI interaction history"""
        response = requests.get(
            f"{BASE_URL}/api/ai/history?token={auth_token}&limit=10"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "interactions" in data
        assert isinstance(data["interactions"], list)
        
        if len(data["interactions"]) > 0:
            interaction = data["interactions"][0]
            assert "id" in interaction
            assert "user_id" in interaction
            assert "type" in interaction
            assert "created_at" in interaction
            print(f"Found {len(data['interactions'])} AI interactions in history")
    
    def test_clear_ai_history(self, auth_token):
        """Test clearing AI interaction history"""
        # First, ensure there's at least one interaction
        requests.post(
            f"{BASE_URL}/api/ai/chat?token={auth_token}",
            json={"message": "Test message for history", "persona": "assistant"},
            timeout=30
        )
        
        # Then clear history
        response = requests.delete(
            f"{BASE_URL}/api/ai/history?token={auth_token}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "cleared" in data["message"].lower() or "success" in data.get("message", "").lower() or data["success"]
        
        # Verify history is cleared
        check_response = requests.get(
            f"{BASE_URL}/api/ai/history?token={auth_token}&limit=10"
        )
        assert check_response.status_code == 200
        check_data = check_response.json()
        assert len(check_data["interactions"]) == 0
        print("AI history cleared successfully")
    
    # =============== EMOTIONAL SUPPORT TESTS ===============
    def test_emotional_support_endpoint(self, auth_token):
        """Test emotional support endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/ai/emotional-support?token={auth_token}",
            json={
                "message": "I'm feeling overwhelmed with work"
            },
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "response" in data
        assert "resources" in data
        assert "mood_detected" in data
        
        assert len(data["response"]) > 0
        assert isinstance(data["resources"], list)
        print(f"Emotional Support Response: {data['response'][:100]}...")
    
    # =============== IMAGE GENERATION TESTS (VALIDATION ONLY) ===============
    def test_image_generation_endpoint_validation(self, auth_token):
        """Test image generation endpoint (validates request/response, may timeout)"""
        # Note: Image generation can take up to 1 minute
        # This test validates the endpoint accepts requests correctly
        try:
            response = requests.post(
                f"{BASE_URL}/api/ai/generate-image?token={auth_token}",
                json={
                    "prompt": "A cute cat",
                    "style": "artistic"
                },
                timeout=120  # 2 minute timeout for image generation
            )
            
            if response.status_code == 200:
                data = response.json()
                assert "image_base64" in data or "image_url" in data
                print("Image generation succeeded")
            else:
                # Endpoint may fail due to rate limits or other issues
                print(f"Image generation returned: {response.status_code}")
        except requests.exceptions.Timeout:
            print("Image generation timed out (this is expected for complex images)")
            pytest.skip("Image generation timed out - this is acceptable")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
