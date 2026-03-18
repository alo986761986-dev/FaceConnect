"""
Test video/voice call APIs for FaceConnect.
Tests: initiate call, answer call, reject call, end call, call history, signaling
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCallsAPI:
    """Test suite for /api/calls endpoints"""
    
    @pytest.fixture(scope="class")
    def test_users(self):
        """Create two test users for call testing"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create caller user
        caller_data = {
            "email": f"TEST_caller_{unique_id}@test.com",
            "password": "TestPass123!",
            "username": f"testcaller_{unique_id}",
            "display_name": "Test Caller"
        }
        caller_resp = requests.post(f"{BASE_URL}/api/auth/register", json=caller_data)
        assert caller_resp.status_code == 200, f"Failed to register caller: {caller_resp.text}"
        caller = caller_resp.json()
        
        # Create recipient user
        recipient_data = {
            "email": f"TEST_recipient_{unique_id}@test.com",
            "password": "TestPass123!",
            "username": f"testrecipient_{unique_id}",
            "display_name": "Test Recipient"
        }
        recipient_resp = requests.post(f"{BASE_URL}/api/auth/register", json=recipient_data)
        assert recipient_resp.status_code == 200, f"Failed to register recipient: {recipient_resp.text}"
        recipient = recipient_resp.json()
        
        return {
            "caller": caller,
            "recipient": recipient
        }
    
    def test_call_history_requires_auth(self):
        """Test that call history endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/calls/history")
        # Should return 401 or 422 without token
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print("✓ GET /api/calls/history requires auth (401/422 without token)")
    
    def test_call_history_with_auth(self, test_users):
        """Test getting call history with valid token"""
        token = test_users["caller"]["token"]
        response = requests.get(f"{BASE_URL}/api/calls/history?token={token}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "calls" in data, "Response should have 'calls' field"
        assert isinstance(data["calls"], list), "Calls should be a list"
        print(f"✓ GET /api/calls/history returns {len(data['calls'])} calls")
    
    def test_initiate_call_requires_auth(self):
        """Test that initiating a call requires authentication"""
        response = requests.post(f"{BASE_URL}/api/calls/initiate", json={
            "recipient_id": "some-id",
            "call_type": "video"
        })
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print("✓ POST /api/calls/initiate requires auth (401/422 without token)")
    
    def test_initiate_video_call(self, test_users):
        """Test initiating a video call"""
        caller_token = test_users["caller"]["token"]
        recipient_id = test_users["recipient"]["user"]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={caller_token}",
            json={
                "recipient_id": recipient_id,
                "call_type": "video"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "call_id" in data, "Response should have 'call_id'"
        assert "status" in data, "Response should have 'status'"
        assert data["status"] == "ringing", f"Call status should be 'ringing', got {data['status']}"
        assert "recipient" in data, "Response should have 'recipient' info"
        
        # Store call_id for later tests
        test_users["video_call_id"] = data["call_id"]
        print(f"✓ POST /api/calls/initiate creates video call (call_id: {data['call_id']})")
        return data["call_id"]
    
    def test_initiate_voice_call(self, test_users):
        """Test initiating a voice call"""
        caller_token = test_users["caller"]["token"]
        recipient_id = test_users["recipient"]["user"]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={caller_token}",
            json={
                "recipient_id": recipient_id,
                "call_type": "audio"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "call_id" in data
        assert data["status"] == "ringing"
        
        test_users["voice_call_id"] = data["call_id"]
        print(f"✓ POST /api/calls/initiate creates voice call (call_id: {data['call_id']})")
        return data["call_id"]
    
    def test_initiate_call_invalid_recipient(self, test_users):
        """Test initiating call to non-existent user"""
        caller_token = test_users["caller"]["token"]
        
        response = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={caller_token}",
            json={
                "recipient_id": "non-existent-user-id",
                "call_type": "video"
            }
        )
        assert response.status_code == 404, f"Expected 404 for invalid recipient, got {response.status_code}"
        print("✓ POST /api/calls/initiate returns 404 for invalid recipient")
    
    def test_answer_call(self, test_users):
        """Test answering a call"""
        # First create a new call
        caller_token = test_users["caller"]["token"]
        recipient_token = test_users["recipient"]["token"]
        recipient_id = test_users["recipient"]["user"]["id"]
        
        # Initiate call
        init_resp = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={caller_token}",
            json={"recipient_id": recipient_id, "call_type": "video"}
        )
        assert init_resp.status_code == 200
        call_id = init_resp.json()["call_id"]
        
        # Answer call as recipient
        answer_resp = requests.post(f"{BASE_URL}/api/calls/{call_id}/answer?token={recipient_token}")
        assert answer_resp.status_code == 200, f"Expected 200, got {answer_resp.status_code}: {answer_resp.text}"
        
        data = answer_resp.json()
        assert data["status"] == "connected", f"Expected 'connected', got {data['status']}"
        print(f"✓ POST /api/calls/{call_id}/answer - call connected")
    
    def test_reject_call(self, test_users):
        """Test rejecting a call"""
        caller_token = test_users["caller"]["token"]
        recipient_token = test_users["recipient"]["token"]
        recipient_id = test_users["recipient"]["user"]["id"]
        
        # Initiate call
        init_resp = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={caller_token}",
            json={"recipient_id": recipient_id, "call_type": "audio"}
        )
        assert init_resp.status_code == 200
        call_id = init_resp.json()["call_id"]
        
        # Reject call as recipient
        reject_resp = requests.post(f"{BASE_URL}/api/calls/{call_id}/reject?token={recipient_token}")
        assert reject_resp.status_code == 200, f"Expected 200, got {reject_resp.status_code}: {reject_resp.text}"
        
        data = reject_resp.json()
        assert data["status"] == "rejected"
        print(f"✓ POST /api/calls/{call_id}/reject - call rejected")
    
    def test_end_call(self, test_users):
        """Test ending an ongoing call"""
        caller_token = test_users["caller"]["token"]
        recipient_token = test_users["recipient"]["token"]
        recipient_id = test_users["recipient"]["user"]["id"]
        
        # Initiate and answer call
        init_resp = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={caller_token}",
            json={"recipient_id": recipient_id, "call_type": "video"}
        )
        call_id = init_resp.json()["call_id"]
        
        requests.post(f"{BASE_URL}/api/calls/{call_id}/answer?token={recipient_token}")
        
        # End call as caller
        end_resp = requests.post(f"{BASE_URL}/api/calls/{call_id}/end?token={caller_token}")
        assert end_resp.status_code == 200, f"Expected 200, got {end_resp.status_code}: {end_resp.text}"
        
        data = end_resp.json()
        assert data["status"] == "ended"
        print(f"✓ POST /api/calls/{call_id}/end - call ended")
    
    def test_call_signal(self, test_users):
        """Test sending WebRTC signaling data"""
        caller_token = test_users["caller"]["token"]
        recipient_id = test_users["recipient"]["user"]["id"]
        
        # Create a call first
        init_resp = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={caller_token}",
            json={"recipient_id": recipient_id, "call_type": "video"}
        )
        call_id = init_resp.json()["call_id"]
        
        # Send signal (ICE candidate)
        signal_resp = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/signal?token={caller_token}",
            json={
                "call_id": call_id,
                "signal_type": "ice-candidate",
                "data": {"candidate": "test-candidate-data"}
            }
        )
        assert signal_resp.status_code == 200, f"Expected 200, got {signal_resp.status_code}: {signal_resp.text}"
        
        data = signal_resp.json()
        assert data["status"] == "signal_sent"
        print(f"✓ POST /api/calls/{call_id}/signal - ICE candidate sent")
    
    def test_call_history_includes_calls(self, test_users):
        """Test that call history includes previously made calls"""
        token = test_users["caller"]["token"]
        response = requests.get(f"{BASE_URL}/api/calls/history?token={token}")
        assert response.status_code == 200
        
        data = response.json()
        calls = data["calls"]
        
        # Should have multiple calls from previous tests
        assert len(calls) > 0, "Call history should not be empty after making calls"
        
        # Verify call structure
        call = calls[0]
        required_fields = ["id", "caller_id", "recipient_id", "call_type", "status", "started_at"]
        for field in required_fields:
            assert field in call, f"Call should have '{field}' field"
        
        print(f"✓ GET /api/calls/history - returns {len(calls)} calls with proper structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
