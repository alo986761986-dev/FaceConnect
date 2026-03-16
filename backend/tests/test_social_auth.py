"""
Tests for social login (Google OAuth, Apple/Facebook coming soon)
Tests /api/auth/google endpoint and existing email/password auth
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSocialAuth:
    """Social authentication endpoint tests"""
    
    def test_google_oauth_endpoint_exists(self):
        """Test that /api/auth/google endpoint exists and returns 401 for invalid session"""
        response = requests.post(
            f"{BASE_URL}/api/auth/google?session_id=invalid_session_test_12345",
            headers={"Content-Type": "application/json"}
        )
        # Should reject invalid session_id with 401, not 404
        assert response.status_code == 401, f"Expected 401 for invalid session, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "authentication failed" in data["detail"].lower() or "invalid" in data["detail"].lower()
        print("PASS: /api/auth/google endpoint exists and rejects invalid session_id")
    
    def test_google_oauth_rejects_empty_session(self):
        """Test that empty session_id is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/auth/google?session_id=",
            headers={"Content-Type": "application/json"}
        )
        # Should reject empty session_id
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print("PASS: /api/auth/google rejects empty session_id")
    
    def test_google_oauth_without_session_param(self):
        """Test that missing session_id parameter returns validation error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/google",
            headers={"Content-Type": "application/json"}
        )
        # Should return 422 for missing required parameter
        assert response.status_code == 422, f"Expected 422 for missing session_id, got {response.status_code}"
        print("PASS: /api/auth/google returns 422 for missing session_id parameter")


class TestEmailPasswordAuth:
    """Email/password authentication still works alongside social login"""
    
    def test_login_with_valid_credentials(self):
        """Test that email/password login still works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "homeuser@test.com", "password": "password123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "homeuser@test.com"
        print("PASS: Email/password login still works")
    
    def test_login_with_invalid_credentials(self):
        """Test that invalid credentials are rejected"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@example.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid credentials are rejected")
    
    def test_register_new_user(self):
        """Test that registration still works"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": f"TEST_social_auth_{unique_id}",
                "email": f"TEST_social_auth_{unique_id}@test.com",
                "password": "password123",
                "display_name": "Test Social Auth User"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        print("PASS: Registration still works alongside social login")
    
    def test_auth_me_with_valid_token(self):
        """Test that /auth/me works with valid token"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "homeuser@test.com", "password": "password123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Test /auth/me
        response = requests.get(f"{BASE_URL}/api/auth/me?token={token}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["email"] == "homeuser@test.com"
        print("PASS: /auth/me works with valid token")


class TestAuthCallbackRoute:
    """Test that /auth/callback route exists in frontend routing"""
    
    def test_auth_callback_route_exists(self):
        """Test that /auth/callback route doesn't 404 - it's handled by React router"""
        response = requests.get(f"{BASE_URL}/auth/callback", allow_redirects=False)
        # Should not be a 404 - React SPA should handle this route
        # Will return HTML since it's a frontend route
        assert response.status_code in [200, 301, 302, 304], f"Expected 200/redirect, got {response.status_code}"
        print("PASS: /auth/callback route exists (frontend handles it)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
