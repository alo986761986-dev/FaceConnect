"""
Test suite for Video/Voice Call APIs
Tests call initiation, answer, reject, end, signal, and history endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_EMAIL = "testrefactor1@test.com"
TEST_PASSWORD = "test123"

# Store auth token across tests
auth_data = {}


class TestCallAPIs:
    """Test Video/Voice Call API endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        if 'token' not in auth_data:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                data = response.json()
                auth_data['token'] = data.get('token')
                auth_data['user_id'] = data.get('user', {}).get('id')
                print(f"Login successful. User ID: {auth_data.get('user_id')}")
            else:
                pytest.skip(f"Login failed with status {response.status_code}")
    
    # ============== CALL INITIATE TESTS ==============
    
    def test_initiate_video_call_valid(self):
        """Test initiating a video call with valid recipient"""
        # First, get a user list to find a valid recipient
        token = auth_data.get('token')
        response = requests.get(f"{BASE_URL}/api/users?token={token}")
        
        if response.status_code != 200:
            pytest.skip("Could not get user list")
        
        users = response.json()
        if not users:
            pytest.skip("No other users available for test")
        
        recipient_id = users[0]['id']
        
        # Initiate call
        call_response = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={token}",
            json={
                "recipient_id": recipient_id,
                "call_type": "video"
            }
        )
        
        assert call_response.status_code == 200, f"Expected 200, got {call_response.status_code}: {call_response.text}"
        
        data = call_response.json()
        assert "call_id" in data
        assert data.get("status") == "ringing"
        assert "recipient" in data
        
        # Store call_id for later tests
        auth_data['test_call_id'] = data['call_id']
        print(f"Video call initiated: {data['call_id']}")
    
    def test_initiate_audio_call_valid(self):
        """Test initiating an audio call"""
        token = auth_data.get('token')
        response = requests.get(f"{BASE_URL}/api/users?token={token}")
        
        if response.status_code != 200:
            pytest.skip("Could not get user list")
        
        users = response.json()
        if not users:
            pytest.skip("No other users available for test")
        
        recipient_id = users[0]['id']
        
        call_response = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={token}",
            json={
                "recipient_id": recipient_id,
                "call_type": "audio"
            }
        )
        
        assert call_response.status_code == 200, f"Expected 200, got {call_response.status_code}"
        
        data = call_response.json()
        assert "call_id" in data
        assert data.get("status") == "ringing"
        print(f"Audio call initiated: {data['call_id']}")
    
    def test_initiate_call_invalid_recipient(self):
        """Test initiating call with invalid recipient"""
        token = auth_data.get('token')
        
        call_response = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={token}",
            json={
                "recipient_id": "invalid-user-id-12345",
                "call_type": "video"
            }
        )
        
        assert call_response.status_code == 404, f"Expected 404, got {call_response.status_code}"
        print("Correctly rejected call to invalid recipient")
    
    def test_initiate_call_without_token(self):
        """Test initiating call without auth token"""
        call_response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            json={
                "recipient_id": "any-id",
                "call_type": "video"
            }
        )
        
        # Should require token (either 401 or 422 for missing param)
        assert call_response.status_code in [401, 422], f"Expected 401/422, got {call_response.status_code}"
        print("Correctly required auth token")
    
    # ============== CALL HISTORY TESTS ==============
    
    def test_get_call_history(self):
        """Test getting call history"""
        token = auth_data.get('token')
        
        response = requests.get(f"{BASE_URL}/api/calls/history?token={token}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "calls" in data
        assert isinstance(data['calls'], list)
        print(f"Call history returned {len(data['calls'])} calls")
    
    def test_get_call_history_with_limit(self):
        """Test getting call history with limit"""
        token = auth_data.get('token')
        
        response = requests.get(f"{BASE_URL}/api/calls/history?token={token}&limit=5")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "calls" in data
        assert len(data['calls']) <= 5
        print(f"Call history limited to {len(data['calls'])} calls")
    
    def test_get_call_history_without_token(self):
        """Test getting call history without token"""
        response = requests.get(f"{BASE_URL}/api/calls/history")
        
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print("Correctly required auth token for history")
    
    # ============== CALL END TESTS ==============
    
    def test_end_call(self):
        """Test ending a call"""
        token = auth_data.get('token')
        
        # First create a call
        response = requests.get(f"{BASE_URL}/api/users?token={token}")
        if response.status_code != 200:
            pytest.skip("Could not get user list")
        
        users = response.json()
        if not users:
            pytest.skip("No other users available")
        
        # Initiate call
        call_response = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={token}",
            json={
                "recipient_id": users[0]['id'],
                "call_type": "video"
            }
        )
        
        if call_response.status_code != 200:
            pytest.skip("Could not initiate call")
        
        call_id = call_response.json()['call_id']
        
        # End the call
        end_response = requests.post(f"{BASE_URL}/api/calls/{call_id}/end?token={token}")
        
        assert end_response.status_code == 200, f"Expected 200, got {end_response.status_code}"
        
        data = end_response.json()
        assert data.get("status") == "ended"
        print(f"Call {call_id} ended successfully")
    
    def test_end_nonexistent_call(self):
        """Test ending a call that doesn't exist"""
        token = auth_data.get('token')
        
        response = requests.post(f"{BASE_URL}/api/calls/fake-call-id/end?token={token}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent call")
    
    # ============== CALL SIGNAL TESTS ==============
    
    def test_send_call_signal(self):
        """Test sending WebRTC signal"""
        token = auth_data.get('token')
        
        # First create a call
        response = requests.get(f"{BASE_URL}/api/users?token={token}")
        if response.status_code != 200:
            pytest.skip("Could not get user list")
        
        users = response.json()
        if not users:
            pytest.skip("No other users available")
        
        call_response = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={token}",
            json={
                "recipient_id": users[0]['id'],
                "call_type": "video"
            }
        )
        
        if call_response.status_code != 200:
            pytest.skip("Could not initiate call")
        
        call_id = call_response.json()['call_id']
        
        # Send signal
        signal_response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/signal?token={token}",
            json={
                "call_id": call_id,
                "signal_type": "offer",
                "data": {"sdp": "mock-sdp-offer-data"}
            }
        )
        
        assert signal_response.status_code == 200, f"Expected 200, got {signal_response.status_code}"
        
        data = signal_response.json()
        assert data.get("status") == "signal_sent"
        print(f"Signal sent for call {call_id}")
        
        # Cleanup - end the call
        requests.post(f"{BASE_URL}/api/calls/{call_id}/end?token={token}")
    
    def test_send_ice_candidate_signal(self):
        """Test sending ICE candidate signal"""
        token = auth_data.get('token')
        
        response = requests.get(f"{BASE_URL}/api/users?token={token}")
        if response.status_code != 200:
            pytest.skip("Could not get user list")
        
        users = response.json()
        if not users:
            pytest.skip("No other users available")
        
        call_response = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={token}",
            json={
                "recipient_id": users[0]['id'],
                "call_type": "audio"
            }
        )
        
        if call_response.status_code != 200:
            pytest.skip("Could not initiate call")
        
        call_id = call_response.json()['call_id']
        
        # Send ICE candidate
        signal_response = requests.post(
            f"{BASE_URL}/api/calls/{call_id}/signal?token={token}",
            json={
                "call_id": call_id,
                "signal_type": "ice-candidate",
                "data": {"candidate": "mock-ice-candidate"}
            }
        )
        
        assert signal_response.status_code == 200
        print("ICE candidate signal sent successfully")
        
        # Cleanup
        requests.post(f"{BASE_URL}/api/calls/{call_id}/end?token={token}")


class TestCallDataValidation:
    """Test call data validation and response structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Ensure we're logged in"""
        if 'token' not in auth_data:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                data = response.json()
                auth_data['token'] = data.get('token')
                auth_data['user_id'] = data.get('user', {}).get('id')
    
    def test_call_history_data_structure(self):
        """Verify call history response structure"""
        token = auth_data.get('token')
        if not token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/calls/history?token={token}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "calls" in data
        
        # If there are calls, validate structure
        if data['calls']:
            call = data['calls'][0]
            # Verify expected fields exist
            expected_fields = ['id', 'caller_id', 'recipient_id', 'call_type', 'status', 'started_at']
            for field in expected_fields:
                assert field in call, f"Missing field: {field}"
            
            # Verify call_type is valid
            assert call['call_type'] in ['video', 'audio'], f"Invalid call_type: {call['call_type']}"
            
            print(f"Call data structure validated. Sample call: type={call['call_type']}, status={call['status']}")
    
    def test_initiate_call_response_structure(self):
        """Verify initiate call response structure"""
        token = auth_data.get('token')
        if not token:
            pytest.skip("No auth token available")
        
        # Get users
        response = requests.get(f"{BASE_URL}/api/users?token={token}")
        if response.status_code != 200 or not response.json():
            pytest.skip("Could not get users")
        
        users = response.json()
        
        call_response = requests.post(
            f"{BASE_URL}/api/calls/initiate?token={token}",
            json={
                "recipient_id": users[0]['id'],
                "call_type": "video"
            }
        )
        
        assert call_response.status_code == 200
        data = call_response.json()
        
        # Verify response structure
        assert "call_id" in data
        assert "status" in data
        assert "recipient" in data
        assert data['status'] == "ringing"
        
        # Verify recipient structure
        recipient = data['recipient']
        assert "id" in recipient
        
        print(f"Initiate response structure validated: call_id={data['call_id']}")
        
        # Cleanup
        requests.post(f"{BASE_URL}/api/calls/{data['call_id']}/end?token={token}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
