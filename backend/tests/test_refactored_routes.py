"""
Test suite for refactored modular routes in FaceConnect backend.
Tests the 6 route modules extracted from server.py:
- push.py - Push notifications endpoints
- users.py - User management endpoints  
- friends.py - Friends/friendships endpoints
- calls.py - Video/voice call endpoints
- ai.py - AI-powered features endpoints
- search.py - Universal search endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_EMAIL = f"TEST_refactor_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "TestPass123!"
TEST_USERNAME = f"TEST_refactor_user_{uuid.uuid4().hex[:8]}"


class TestHealthCheck:
    """Test /api/health endpoint"""
    
    def test_health_check(self):
        """GET /api/health - health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy", f"Unexpected status: {data}"
        print("PASS: Health check returns status=healthy")


class TestPushRoutes:
    """Test push notification routes from routes/push.py"""
    
    def test_get_vapid_public_key(self):
        """GET /api/push/vapid-public-key - get VAPID public key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert response.status_code == 200, f"VAPID key request failed: {response.text}"
        data = response.json()
        assert "publicKey" in data, f"Missing publicKey in response: {data}"
        print(f"PASS: VAPID public key returned: {data['publicKey'][:20]}...")


class TestAuthRoutes:
    """Test authentication routes for user registration and login"""
    
    @pytest.fixture(scope="class")
    def registered_user(self):
        """Register a test user and return credentials"""
        register_payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "username": TEST_USERNAME
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        if response.status_code == 200:
            data = response.json()
            return {"token": data.get("token"), "user": data.get("user")}
        else:
            # User might already exist, try login
            login_payload = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
            if login_response.status_code == 200:
                data = login_response.json()
                return {"token": data.get("token"), "user": data.get("user")}
            pytest.skip(f"Could not create or login test user: {response.text}")
    
    def test_register_user(self):
        """POST /api/auth/register - register a new user"""
        unique_email = f"TEST_reg_{uuid.uuid4().hex[:8]}@test.com"
        unique_username = f"TEST_reg_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "username": unique_username
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data, f"Missing token in response: {data}"
        assert "user" in data, f"Missing user in response: {data}"
        assert data["user"]["email"] == unique_email
        print(f"PASS: User registered successfully: {unique_username}")
        return data["token"]
    
    def test_login_user(self, registered_user):
        """POST /api/auth/login - login with credentials"""
        payload = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, f"Missing token: {data}"
        print("PASS: User login successful")


class TestUsersRoutes:
    """Test user management routes from routes/users.py"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for testing"""
        # Try to register or login
        unique_email = f"TEST_users_{uuid.uuid4().hex[:8]}@test.com"
        unique_username = f"TEST_users_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "username": unique_username
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        if response.status_code == 200:
            return response.json().get("token")
        
        # If registration fails, try to login with existing test user
        login_payload = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        if login_response.status_code == 200:
            return login_response.json().get("token")
        
        pytest.skip("Could not get auth token")
    
    def test_get_users_requires_auth(self):
        """GET /api/users - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/users")
        # Should fail without token
        assert response.status_code in [401, 422], f"Expected auth error, got: {response.status_code}"
        print("PASS: /api/users requires authentication")
    
    def test_get_users_with_auth(self, auth_token):
        """GET /api/users - list users (requires auth)"""
        response = requests.get(f"{BASE_URL}/api/users", params={"token": auth_token})
        assert response.status_code == 200, f"Get users failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list of users: {data}"
        print(f"PASS: Got {len(data)} users")
    
    def test_search_users(self, auth_token):
        """GET /api/users/search?q=test - search users (requires auth)"""
        response = requests.get(f"{BASE_URL}/api/users/search", params={"token": auth_token, "q": "test"})
        assert response.status_code == 200, f"Search users failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list of search results: {data}"
        print(f"PASS: User search returned {len(data)} results")


class TestFriendsRoutes:
    """Test friends management routes from routes/friends.py"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for testing"""
        unique_email = f"TEST_friends_{uuid.uuid4().hex[:8]}@test.com"
        unique_username = f"TEST_friends_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "username": unique_username
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get auth token")
    
    def test_get_friends_requires_auth(self):
        """GET /api/friends - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/friends")
        assert response.status_code in [401, 422], f"Expected auth error: {response.status_code}"
        print("PASS: /api/friends requires authentication")
    
    def test_get_friends_with_auth(self, auth_token):
        """GET /api/friends - get friends list (requires auth)"""
        response = requests.get(f"{BASE_URL}/api/friends", params={"token": auth_token})
        assert response.status_code == 200, f"Get friends failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list of friends: {data}"
        print(f"PASS: Got {len(data)} friends")
    
    def test_get_friend_requests(self, auth_token):
        """GET /api/friends/requests - get pending friend requests"""
        response = requests.get(f"{BASE_URL}/api/friends/requests", params={"token": auth_token})
        assert response.status_code == 200, f"Get friend requests failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list: {data}"
        print(f"PASS: Got {len(data)} pending friend requests")


class TestSearchRoutes:
    """Test universal search routes from routes/search.py"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for testing"""
        unique_email = f"TEST_search_{uuid.uuid4().hex[:8]}@test.com"
        unique_username = f"TEST_search_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "username": unique_username
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get auth token")
    
    def test_universal_search_requires_auth(self):
        """GET /api/search/universal - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/search/universal", params={"q": "test"})
        assert response.status_code in [401, 422], f"Expected auth error: {response.status_code}"
        print("PASS: /api/search/universal requires authentication")
    
    def test_universal_search_with_auth(self, auth_token):
        """GET /api/search/universal?q=test - universal search (requires auth)"""
        response = requests.get(f"{BASE_URL}/api/search/universal", params={"token": auth_token, "q": "test"})
        assert response.status_code == 200, f"Universal search failed: {response.text}"
        data = response.json()
        # Should return search results with categories
        assert isinstance(data, dict), f"Expected dict: {data}"
        # Check for expected result categories
        expected_keys = ["users", "posts", "reels", "stories", "live", "hashtags"]
        for key in expected_keys:
            assert key in data, f"Missing key '{key}' in search results: {data}"
        print(f"PASS: Universal search returned results with {len(data)} categories")


class TestCallsRoutes:
    """Test call management routes from routes/calls.py"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for testing"""
        unique_email = f"TEST_calls_{uuid.uuid4().hex[:8]}@test.com"
        unique_username = f"TEST_calls_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "username": unique_username
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get auth token")
    
    def test_get_call_history_requires_auth(self):
        """GET /api/calls/history - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/calls/history")
        assert response.status_code in [401, 422], f"Expected auth error: {response.status_code}"
        print("PASS: /api/calls/history requires authentication")
    
    def test_get_call_history_with_auth(self, auth_token):
        """GET /api/calls/history - get call history (requires auth)"""
        response = requests.get(f"{BASE_URL}/api/calls/history", params={"token": auth_token})
        assert response.status_code == 200, f"Get call history failed: {response.text}"
        data = response.json()
        assert "calls" in data, f"Missing 'calls' in response: {data}"
        assert isinstance(data["calls"], list), f"Expected list of calls: {data}"
        print(f"PASS: Got {len(data['calls'])} call history entries")


class TestAIRoutes:
    """Test AI-powered features routes from routes/ai.py"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for testing"""
        unique_email = f"TEST_ai_{uuid.uuid4().hex[:8]}@test.com"
        unique_username = f"TEST_ai_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "username": unique_username
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get auth token")
    
    def test_get_ai_personas_requires_auth(self):
        """GET /api/ai/personas - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/ai/personas")
        assert response.status_code in [401, 422], f"Expected auth error: {response.status_code}"
        print("PASS: /api/ai/personas requires authentication")
    
    def test_get_ai_personas_with_auth(self, auth_token):
        """GET /api/ai/personas - get AI personas (requires auth)"""
        response = requests.get(f"{BASE_URL}/api/ai/personas", params={"token": auth_token})
        assert response.status_code == 200, f"Get AI personas failed: {response.text}"
        data = response.json()
        assert "personas" in data, f"Missing 'personas' in response: {data}"
        assert isinstance(data["personas"], list), f"Expected list of personas: {data}"
        print(f"PASS: Got {len(data['personas'])} AI personas")


# Run all tests when executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
