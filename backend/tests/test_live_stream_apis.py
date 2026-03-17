"""
Test WebRTC Live Stream APIs for FaceConnect.
Tests: create/end stream, join/leave, chat, reactions, WebRTC signaling
API Routes tested:
- POST /api/streams (create stream)
- GET /api/streams (list streams)
- GET /api/streams/{id} (get stream)
- POST /api/streams/{id}/join
- POST /api/streams/{id}/leave
- POST /api/streams/{id}/end
- POST /api/streams/{id}/chat (send chat message)
- POST /api/streams/{id}/react (send reaction: heart, fire, clap, laugh, wow)
- POST /api/streams/{id}/gift (send gift)
- POST /api/streams/{id}/signal (WebRTC signaling)
- DELETE /api/streams/{id} (delete stream)
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://profile-connector-3.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testrefactor1@test.com"
TEST_PASSWORD = "test123"


class TestStreamAPIs:
    """Test WebRTC Live Stream APIs - /api/streams/*"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.user_id = data["user"]["id"]
        self.stream_id = None  # Will be set by create_stream test
    
    def test_01_create_stream(self):
        """Test creating a new live stream"""
        response = requests.post(f"{BASE_URL}/api/streams?token={self.token}", json={
            "title": f"TEST_Stream_{uuid.uuid4().hex[:8]}"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Stream ID missing"
        assert data["status"] == "live", "Stream should be live"
        print(f"Stream created: {data['id']}")
        
        # Save for other tests
        self.__class__.stream_id = data["id"]
    
    def test_02_get_live_streams(self):
        """Test getting list of live streams"""
        response = requests.get(f"{BASE_URL}/api/streams?token={self.token}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of streams"
        print(f"Live streams count: {len(data)}")
    
    def test_03_get_stream_details(self):
        """Test getting a specific stream by ID"""
        # First create a stream if not already created
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            create_resp = requests.post(f"{BASE_URL}/api/streams?token={self.token}", json={
                "title": f"TEST_Stream_{uuid.uuid4().hex[:8]}"
            })
            if create_resp.status_code == 200:
                self.__class__.stream_id = create_resp.json()["id"]
        
        if not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.get(f"{BASE_URL}/api/streams/{self.__class__.stream_id}?token={self.token}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["id"] == self.__class__.stream_id
        assert "user_id" in data
        assert "viewer_count" in data
        print(f"Stream details: {data['id']} - viewers: {data.get('viewer_count', 0)}")
    
    def test_04_send_stream_chat(self):
        """Test sending chat message in a live stream - uses 'message' field"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        # Chat expects 'message' field, not 'content'
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/chat?token={self.token}",
            json={"message": "Hello from test!"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("status") == "sent", f"Expected status 'sent', got: {data}"
        assert "message" in data, "Chat message response missing message object"
        print(f"Chat sent successfully")
    
    def test_05_send_stream_reaction_heart(self):
        """Test sending heart reaction to a stream"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/react?token={self.token}",
            json={"reaction_type": "heart"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("status") == "reaction_sent"
        print("Heart reaction sent successfully")
    
    def test_06_send_stream_reaction_fire(self):
        """Test sending fire reaction to a stream"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/react?token={self.token}",
            json={"reaction_type": "fire"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Fire reaction sent successfully")
    
    def test_07_send_stream_reaction_clap(self):
        """Test sending clap reaction to a stream"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/react?token={self.token}",
            json={"reaction_type": "clap"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Clap reaction sent successfully")
    
    def test_08_send_stream_reaction_laugh(self):
        """Test sending laugh reaction to a stream"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/react?token={self.token}",
            json={"reaction_type": "laugh"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Laugh reaction sent successfully")
    
    def test_09_send_stream_reaction_wow(self):
        """Test sending wow reaction to a stream"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/react?token={self.token}",
            json={"reaction_type": "wow"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Wow reaction sent successfully")
    
    def test_10_send_stream_reaction_invalid(self):
        """Test sending invalid reaction type returns 400"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/react?token={self.token}",
            json={"reaction_type": "invalid_type"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid reaction, got: {response.status_code}"
        print("Invalid reaction correctly rejected")
    
    def test_11_send_webrtc_signal(self):
        """Test WebRTC signaling endpoint"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        # Test sending an offer signal (streamer to viewers)
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/signal?token={self.token}",
            json={
                "stream_id": self.__class__.stream_id,
                "signal_type": "offer",
                "data": {
                    "sdp": {
                        "type": "offer",
                        "sdp": "mock_sdp_data"
                    }
                }
            }
        )
        
        # Should succeed for streamer
        assert response.status_code == 200, f"Failed: {response.text}"
        print("WebRTC signal (offer) sent successfully")
    
    def test_12_send_stream_gift(self):
        """Test sending gift to a stream"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/gift?token={self.token}",
            json={
                "gift_type": "heart",
                "quantity": 1
            }
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("status") == "gift_sent"
        assert "gift" in data
        print(f"Gift sent successfully: {data['gift']}")
    
    def test_13_send_stream_gift_diamond(self):
        """Test sending diamond gift to a stream"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/gift?token={self.token}",
            json={
                "gift_type": "diamond",
                "quantity": 2
            }
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Diamond gift sent successfully")
    
    def test_14_leave_stream(self):
        """Test leaving a stream as viewer"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/leave?token={self.token}"
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("status") == "left"
        print("Left stream successfully")
    
    def test_15_join_stream(self):
        """Test joining a stream as viewer"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/join?token={self.token}"
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("status") == "joined"
        assert "viewer_count" in data
        print(f"Joined stream successfully - viewer count: {data['viewer_count']}")
    
    def test_16_end_stream(self):
        """Test ending a live stream (streamer only)"""
        if not hasattr(self.__class__, 'stream_id') or not self.__class__.stream_id:
            pytest.skip("No stream ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/streams/{self.__class__.stream_id}/end?token={self.token}"
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("status") == "ended"
        print("Stream ended successfully")
    
    def test_17_delete_stream(self):
        """Test deleting a stream"""
        # Create a new stream to delete
        create_resp = requests.post(f"{BASE_URL}/api/streams?token={self.token}", json={
            "title": f"TEST_Delete_Stream_{uuid.uuid4().hex[:8]}"
        })
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create stream to delete")
        
        delete_stream_id = create_resp.json()["id"]
        
        response = requests.delete(
            f"{BASE_URL}/api/streams/{delete_stream_id}?token={self.token}"
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Stream deleted successfully")


class TestModularLivestreamAPI:
    """Test modular livestream routes - /api/livestream/*"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.user_id = data["user"]["id"]
    
    def test_01_get_active_streams(self):
        """Test getting active streams from modular route"""
        response = requests.get(f"{BASE_URL}/api/livestream/active?token={self.token}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Active streams: {len(data)}")
    
    def test_02_start_stream_modular(self):
        """Test starting a stream via modular route"""
        response = requests.post(f"{BASE_URL}/api/livestream/start?token={self.token}", json={
            "title": f"TEST_Modular_Stream_{uuid.uuid4().hex[:8]}",
            "description": "Test stream from modular API"
        })
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Modular stream created: {data['id']}")
        
        # Save for cleanup
        self.__class__.modular_stream_id = data["id"]
    
    def test_03_get_stream_modular(self):
        """Test getting stream details from modular route"""
        if not hasattr(self.__class__, 'modular_stream_id'):
            pytest.skip("No modular stream ID")
        
        response = requests.get(f"{BASE_URL}/api/livestream/{self.__class__.modular_stream_id}?token={self.token}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["id"] == self.__class__.modular_stream_id
        print(f"Modular stream details: {data['title']}")
    
    def test_04_stream_chat_modular(self):
        """Test chat in modular livestream route"""
        if not hasattr(self.__class__, 'modular_stream_id'):
            pytest.skip("No modular stream ID")
        
        response = requests.post(
            f"{BASE_URL}/api/livestream/{self.__class__.modular_stream_id}/chat?token={self.token}",
            json={"content": "Hello from modular test!"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Modular stream chat sent")
    
    def test_05_end_stream_modular(self):
        """Test ending stream via modular route"""
        if not hasattr(self.__class__, 'modular_stream_id'):
            pytest.skip("No modular stream ID")
        
        response = requests.post(f"{BASE_URL}/api/livestream/{self.__class__.modular_stream_id}/end?token={self.token}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Modular stream ended")


class TestAuthAPIs:
    """Test Auth APIs after refactor"""
    
    def test_login(self):
        """Test login endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"Login successful: {data['user']['username']}")
    
    def test_auth_me(self):
        """Test /api/auth/me endpoint"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_resp.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/auth/me?token={token}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"Auth me: {data['username']}")


class TestReelsAPIs:
    """Test Reels APIs after refactor (modular routes)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["token"]
    
    def test_get_reels(self):
        """Test /api/reels endpoint"""
        response = requests.get(f"{BASE_URL}/api/reels?token={self.token}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Reels count: {len(data)}")
    
    def test_reels_unauthorized(self):
        """Test reels endpoint without valid token"""
        response = requests.get(f"{BASE_URL}/api/reels?token=invalid")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthorized access correctly rejected")


class TestPostsAPIs:
    """Test Posts APIs after refactor"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["token"]
    
    def test_get_posts(self):
        """Test /api/posts endpoint"""
        response = requests.get(f"{BASE_URL}/api/posts?token={self.token}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Posts count: {len(data)}")
    
    def test_home_feed(self):
        """Test /api/feed/home endpoint"""
        response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify feed structure
        assert "live_streams" in data, "Missing live_streams in feed"
        assert "stories" in data, "Missing stories in feed"
        assert "posts" in data, "Missing posts in feed"
        print(f"Home feed: {len(data.get('live_streams', []))} live, {len(data.get('stories', []))} stories, {len(data.get('posts', []))} posts")


class TestStreamErrorCases:
    """Test error cases for stream APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["token"]
    
    def test_get_nonexistent_stream(self):
        """Test getting a non-existent stream returns 404"""
        response = requests.get(f"{BASE_URL}/api/streams/nonexistent-stream-id?token={self.token}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent stream correctly returns 404")
    
    def test_chat_on_ended_stream(self):
        """Test sending chat to ended stream returns error"""
        # Create and end a stream
        create_resp = requests.post(f"{BASE_URL}/api/streams?token={self.token}", json={
            "title": f"TEST_Ended_Stream_{uuid.uuid4().hex[:8]}"
        })
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create stream")
        
        stream_id = create_resp.json()["id"]
        
        # End the stream
        requests.post(f"{BASE_URL}/api/streams/{stream_id}/end?token={self.token}")
        
        # Try to send chat
        response = requests.post(
            f"{BASE_URL}/api/streams/{stream_id}/chat?token={self.token}",
            json={"message": "Test message"}
        )
        
        assert response.status_code == 404, f"Expected 404 for ended stream, got {response.status_code}"
        print("Chat to ended stream correctly rejected")
    
    def test_unauthorized_stream_access(self):
        """Test accessing stream APIs without valid token"""
        response = requests.get(f"{BASE_URL}/api/streams?token=invalid_token")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthorized stream access correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
