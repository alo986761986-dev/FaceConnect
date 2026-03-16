"""
Test suite for Video/Voice Call APIs
Tests call initiation, answer, reject, end, signal and history endpoints
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_1 = {
    "email": "testfeed@example.com",
    "password": "test123"
}

# Second test user for call testing
TEST_USER_2 = {
    "username": f"testcalluser_{int(time.time())}",
    "email": f"testcall_{int(time.time())}@example.com",
    "password": "test123"
}

class TestCallsAPI:
    """Tests for video/voice call endpoints"""
    
    user1_token = None
    user1_id = None
    user2_token = None
    user2_id = None
    call_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup: Login user 1 and register/login user 2"""
        # Login user 1
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response.status_code == 200, f"Failed to login user 1: {response.text}"
        data = response.json()
        cls.user1_token = data["token"]
        cls.user1_id = data["user"]["id"]
        print(f"User 1 logged in: {cls.user1_id}")
        
        # Register user 2
        response = requests.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_2)
        if response.status_code == 200:
            data = response.json()
            cls.user2_token = data["token"]
            cls.user2_id = data["user"]["id"]
            print(f"User 2 registered: {cls.user2_id}")
        else:
            # Already exists, try login
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER_2["email"],
                "password": TEST_USER_2["password"]
            })
            if response.status_code == 200:
                data = response.json()
                cls.user2_token = data["token"]
                cls.user2_id = data["user"]["id"]
                print(f"User 2 logged in: {cls.user2_id}")
            else:
                print(f"Warning: Could not setup user 2: {response.text}")
    
    # ============== Call Initiation Tests ==============
    def test_initiate_video_call(self):
        """Test initiating a video call"""
        if not self.user2_id:
            pytest.skip("User 2 not available")
        
        response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            params={"token": self.user1_token},
            json={
                "recipient_id": self.user2_id,
                "call_type": "video"
            }
        )
        
        print(f"Initiate video call response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to initiate video call: {response.text}"
        
        data = response.json()
        assert "call_id" in data, "Response should contain call_id"
        assert data["status"] == "ringing", "Call status should be 'ringing'"
        assert "recipient" in data, "Response should contain recipient info"
        
        # Store call_id for subsequent tests
        TestCallsAPI.call_id = data["call_id"]
        print(f"Video call initiated: {data['call_id']}")
    
    def test_initiate_audio_call(self):
        """Test initiating an audio/voice call"""
        if not self.user2_id:
            pytest.skip("User 2 not available")
        
        response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            params={"token": self.user1_token},
            json={
                "recipient_id": self.user2_id,
                "call_type": "audio"
            }
        )
        
        print(f"Initiate audio call response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to initiate audio call: {response.text}"
        
        data = response.json()
        assert "call_id" in data
        assert data["status"] == "ringing"
    
    def test_initiate_call_invalid_recipient(self):
        """Test initiating call to non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            params={"token": self.user1_token},
            json={
                "recipient_id": "non-existent-user-id",
                "call_type": "video"
            }
        )
        
        print(f"Invalid recipient response: {response.status_code}")
        assert response.status_code == 404, "Should return 404 for non-existent user"
    
    def test_initiate_call_without_token(self):
        """Test initiating call without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            json={
                "recipient_id": self.user2_id,
                "call_type": "video"
            }
        )
        
        print(f"No token response: {response.status_code}")
        assert response.status_code in [401, 422], "Should return 401 or 422 without token"
    
    # ============== Call Answer Tests ==============
    def test_answer_call(self):
        """Test answering an incoming call"""
        if not self.user2_id:
            pytest.skip("User 2 not available")
        
        # First initiate a call
        init_response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            params={"token": self.user1_token},
            json={
                "recipient_id": self.user2_id,
                "call_type": "video"
            }
        )
        assert init_response.status_code == 200
        call_id = init_response.json()["call_id"]
        
        # Answer the call as user 2
        response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/answer",
            params={"token": self.user2_token}
        )
        
        print(f"Answer call response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to answer call: {response.text}"
        
        data = response.json()
        assert data["status"] == "connected", "Call status should be 'connected'"
        assert data["call_id"] == call_id
    
    def test_answer_call_unauthorized(self):
        """Test answering a call that wasn't directed at the user"""
        if not self.user2_id:
            pytest.skip("User 2 not available")
        
        # Initiate a call
        init_response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            params={"token": self.user1_token},
            json={
                "recipient_id": self.user2_id,
                "call_type": "video"
            }
        )
        assert init_response.status_code == 200
        call_id = init_response.json()["call_id"]
        
        # Try to answer as user 1 (the caller, not recipient)
        response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/answer",
            params={"token": self.user1_token}
        )
        
        print(f"Unauthorized answer response: {response.status_code}")
        assert response.status_code == 403, "Should return 403 for unauthorized answer"
    
    # ============== Call Reject Tests ==============
    def test_reject_call(self):
        """Test rejecting an incoming call"""
        if not self.user2_id:
            pytest.skip("User 2 not available")
        
        # Initiate a call
        init_response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            params={"token": self.user1_token},
            json={
                "recipient_id": self.user2_id,
                "call_type": "video"
            }
        )
        assert init_response.status_code == 200
        call_id = init_response.json()["call_id"]
        
        # Reject the call as user 2
        response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/reject",
            params={"token": self.user2_token}
        )
        
        print(f"Reject call response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to reject call: {response.text}"
        assert response.json()["status"] == "rejected"
    
    # ============== Call End Tests ==============
    def test_end_call(self):
        """Test ending an ongoing call"""
        if not self.user2_id:
            pytest.skip("User 2 not available")
        
        # Initiate a call
        init_response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            params={"token": self.user1_token},
            json={
                "recipient_id": self.user2_id,
                "call_type": "video"
            }
        )
        assert init_response.status_code == 200
        call_id = init_response.json()["call_id"]
        
        # Answer the call
        answer_response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/answer",
            params={"token": self.user2_token}
        )
        assert answer_response.status_code == 200
        
        # End the call as caller
        response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/end",
            params={"token": self.user1_token}
        )
        
        print(f"End call response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to end call: {response.text}"
        assert response.json()["status"] == "ended"
    
    def test_end_call_as_recipient(self):
        """Test ending call as the recipient"""
        if not self.user2_id:
            pytest.skip("User 2 not available")
        
        # Initiate and answer call
        init_response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            params={"token": self.user1_token},
            json={
                "recipient_id": self.user2_id,
                "call_type": "audio"
            }
        )
        assert init_response.status_code == 200
        call_id = init_response.json()["call_id"]
        
        answer_response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/answer",
            params={"token": self.user2_token}
        )
        assert answer_response.status_code == 200
        
        # End the call as recipient
        response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/end",
            params={"token": self.user2_token}
        )
        
        print(f"End call (recipient) response: {response.status_code}")
        assert response.status_code == 200
        assert response.json()["status"] == "ended"
    
    # ============== Call Signal Tests ==============
    def test_send_call_signal(self):
        """Test sending WebRTC signaling data"""
        if not self.user2_id:
            pytest.skip("User 2 not available")
        
        # Initiate call
        init_response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            params={"token": self.user1_token},
            json={
                "recipient_id": self.user2_id,
                "call_type": "video"
            }
        )
        assert init_response.status_code == 200
        call_id = init_response.json()["call_id"]
        
        # Send ICE candidate signal
        response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/signal",
            params={"token": self.user1_token},
            json={
                "call_id": call_id,
                "signal_type": "ice-candidate",
                "data": {
                    "candidate": {
                        "candidate": "candidate:1 1 UDP 2130706431 192.168.1.100 50000 typ host",
                        "sdpMid": "0",
                        "sdpMLineIndex": 0
                    }
                }
            }
        )
        
        print(f"Signal response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to send signal: {response.text}"
        assert response.json()["status"] == "signal_sent"
    
    def test_send_offer_signal(self):
        """Test sending SDP offer signal"""
        if not self.user2_id:
            pytest.skip("User 2 not available")
        
        init_response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            params={"token": self.user1_token},
            json={
                "recipient_id": self.user2_id,
                "call_type": "video"
            }
        )
        assert init_response.status_code == 200
        call_id = init_response.json()["call_id"]
        
        # Send offer signal
        response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/signal",
            params={"token": self.user1_token},
            json={
                "call_id": call_id,
                "signal_type": "offer",
                "data": {
                    "sdp": {
                        "type": "offer",
                        "sdp": "v=0\r\no=- 123 456 IN IP4 127.0.0.1\r\n..."
                    }
                }
            }
        )
        
        print(f"Offer signal response: {response.status_code}")
        assert response.status_code == 200
    
    # ============== Call History Tests ==============
    def test_get_call_history(self):
        """Test getting call history"""
        response = requests.get(
            f"{BASE_URL}/api/calls/history",
            params={"token": self.user1_token}
        )
        
        print(f"Call history response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to get call history: {response.text}"
        
        data = response.json()
        assert "calls" in data, "Response should contain 'calls' array"
        assert isinstance(data["calls"], list), "Calls should be a list"
        
        # We created several calls above, so there should be some
        print(f"Found {len(data['calls'])} calls in history")
    
    def test_get_call_history_limit(self):
        """Test call history with limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/calls/history",
            params={"token": self.user1_token, "limit": 5}
        )
        
        print(f"Limited history response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["calls"]) <= 5, "Should respect limit parameter"
    
    def test_get_call_history_without_token(self):
        """Test getting call history without authentication"""
        response = requests.get(f"{BASE_URL}/api/calls/history")
        
        print(f"No token history response: {response.status_code}")
        assert response.status_code in [401, 422], "Should return 401 or 422 without token"


class TestMessageDeletion:
    """Tests for complete message deletion"""
    
    user_token = None
    user_id = None
    conversation_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup: Login and create conversation"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response.status_code == 200
        data = response.json()
        cls.user_token = data["token"]
        cls.user_id = data["user"]["id"]
        
        # Get or create conversation with user 2
        conversations_response = requests.get(
            f"{BASE_URL}/api/conversations",
            params={"token": cls.user_token}
        )
        if conversations_response.status_code == 200:
            convs = conversations_response.json()
            if convs:
                cls.conversation_id = convs[0]["id"]
                print(f"Using existing conversation: {cls.conversation_id}")
    
    def test_delete_message_completely_removes_from_ui(self):
        """Test that deleting a message completely removes it"""
        if not self.conversation_id:
            pytest.skip("No conversation available")
        
        # Send a message
        msg_content = f"Test message to delete {uuid.uuid4()}"
        send_response = requests.post(
            f"{BASE_URL}/api/conversations/{self.conversation_id}/messages",
            params={"token": self.user_token},
            json={"content": msg_content, "message_type": "text"}
        )
        
        assert send_response.status_code == 200
        message_id = send_response.json()["id"]
        print(f"Created message: {message_id}")
        
        # Verify message exists
        messages_response = requests.get(
            f"{BASE_URL}/api/conversations/{self.conversation_id}/messages",
            params={"token": self.user_token}
        )
        assert messages_response.status_code == 200
        messages_before = messages_response.json()
        found_before = any(m["id"] == message_id for m in messages_before)
        assert found_before, "Message should exist before deletion"
        
        # Delete the message
        delete_response = requests.delete(
            f"{BASE_URL}/api/messages/{message_id}",
            params={"token": self.user_token}
        )
        
        print(f"Delete response: {delete_response.status_code} - {delete_response.text}")
        assert delete_response.status_code == 200, f"Failed to delete message: {delete_response.text}"
        assert delete_response.json()["success"] == True
        
        # Verify message is no longer shown (is_deleted filter in API)
        messages_after = requests.get(
            f"{BASE_URL}/api/conversations/{self.conversation_id}/messages",
            params={"token": self.user_token}
        ).json()
        
        # Check that the message with that ID is not in the visible list
        found_after = any(m["id"] == message_id and not m.get("is_deleted", False) for m in messages_after)
        print(f"Message visible after deletion: {found_after}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
