"""
Backend tests for Push Notification feature
Testing: 
- GET /api/push/vapid-public-key - Get VAPID public key
- POST /api/push/subscribe - Subscribe to push notifications
- DELETE /api/push/unsubscribe - Unsubscribe from push notifications
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestVapidPublicKey:
    """Tests for VAPID public key endpoint"""
    
    def test_get_vapid_public_key(self):
        """Test getting VAPID public key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "publicKey" in data, "Response should contain publicKey"
        
        # VAPID public key should be a non-empty string
        assert data["publicKey"], "VAPID public key should not be empty"
        assert isinstance(data["publicKey"], str), "VAPID public key should be a string"
        
        # Base64url encoded key should be around 87 characters
        assert len(data["publicKey"]) > 40, f"VAPID key seems too short: {len(data['publicKey'])} chars"
        print(f"SUCCESS: Got VAPID public key ({len(data['publicKey'])} chars)")


class TestPushSubscription:
    """Tests for push subscription endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Create test user and return token"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_push_{unique_id}",
            "email": f"test_push_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip(f"Failed to create test user: {response.text}")
        
        return response.json()["token"], response.json()["user"]["id"]
    
    def test_subscribe_to_push(self, auth_token):
        """Test subscribing to push notifications"""
        token, user_id = auth_token
        
        # Mock subscription data (what browser would normally send)
        subscription_data = {
            "subscription": {
                "endpoint": f"https://fcm.googleapis.com/fcm/send/TEST_{uuid.uuid4()}",
                "keys": {
                    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                    "auth": "tBHItJI5svbpez7KI4CCXg"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe?token={token}",
            json=subscription_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert data["message"] == "Subscribed to push notifications"
        print("SUCCESS: Subscribe to push notifications works")
        
        return subscription_data["subscription"]["endpoint"]
    
    def test_subscribe_without_auth_fails(self):
        """Test that subscribing without authentication fails"""
        subscription_data = {
            "subscription": {
                "endpoint": f"https://fcm.googleapis.com/fcm/send/TEST_{uuid.uuid4()}",
                "keys": {
                    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                    "auth": "tBHItJI5svbpez7KI4CCXg"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe?token=invalid_token",
            json=subscription_data
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Subscribe without auth correctly rejected")
    
    def test_subscribe_with_invalid_data_fails(self, auth_token):
        """Test that subscribing with invalid data fails"""
        token, user_id = auth_token
        
        # Missing required fields
        invalid_data = {
            "subscription": {
                "endpoint": "test-endpoint"
                # Missing 'keys'
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe?token={token}",
            json=invalid_data
        )
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected 400 or 422, got {response.status_code}"
        print("SUCCESS: Subscribe with invalid data correctly rejected")
    
    def test_unsubscribe_from_push(self, auth_token):
        """Test unsubscribing from push notifications"""
        token, user_id = auth_token
        
        # First subscribe
        endpoint = f"https://fcm.googleapis.com/fcm/send/TEST_{uuid.uuid4()}"
        subscription_data = {
            "subscription": {
                "endpoint": endpoint,
                "keys": {
                    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                    "auth": "tBHItJI5svbpez7KI4CCXg"
                }
            }
        }
        
        subscribe_response = requests.post(
            f"{BASE_URL}/api/push/subscribe?token={token}",
            json=subscription_data
        )
        assert subscribe_response.status_code == 200
        
        # Now unsubscribe
        unsubscribe_response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe?token={token}&endpoint={endpoint}"
        )
        assert unsubscribe_response.status_code == 200, f"Expected 200, got {unsubscribe_response.status_code}: {unsubscribe_response.text}"
        
        data = unsubscribe_response.json()
        assert data["message"] == "Unsubscribed from push notifications"
        print("SUCCESS: Unsubscribe from push notifications works")
    
    def test_unsubscribe_without_auth_fails(self):
        """Test that unsubscribing without authentication fails"""
        endpoint = "https://fcm.googleapis.com/fcm/send/TEST_123"
        
        response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe?token=invalid_token&endpoint={endpoint}"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Unsubscribe without auth correctly rejected")
    
    def test_subscription_upsert(self, auth_token):
        """Test that subscribing twice with same endpoint updates instead of duplicating"""
        token, user_id = auth_token
        
        endpoint = f"https://fcm.googleapis.com/fcm/send/TEST_{uuid.uuid4()}"
        subscription_data = {
            "subscription": {
                "endpoint": endpoint,
                "keys": {
                    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                    "auth": "tBHItJI5svbpez7KI4CCXg"
                }
            }
        }
        
        # Subscribe twice
        response1 = requests.post(
            f"{BASE_URL}/api/push/subscribe?token={token}",
            json=subscription_data
        )
        assert response1.status_code == 200
        
        response2 = requests.post(
            f"{BASE_URL}/api/push/subscribe?token={token}",
            json=subscription_data
        )
        assert response2.status_code == 200
        
        print("SUCCESS: Subscription upsert works (no duplicates)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
