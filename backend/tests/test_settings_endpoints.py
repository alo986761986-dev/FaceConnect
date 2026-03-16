"""
Test Suite for Settings Page Backend Endpoints
Tests: Password change, Profile update, Authentication
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testfeed@example.com"
TEST_PASSWORD = "test123"


class TestAuthentication:
    """Test authentication endpoints needed for settings"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == TEST_EMAIL
        print(f"LOGIN SUCCESS - Token obtained for {TEST_EMAIL}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("INVALID LOGIN TEST PASSED - Returns 401 as expected")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_resp.json()["token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me?token={token}")
        assert response.status_code == 200, f"Get user failed: {response.text}"
        data = response.json()
        assert data["email"] == TEST_EMAIL
        assert "username" in data
        assert "display_name" in data or "username" in data
        print(f"GET CURRENT USER SUCCESS - User: {data.get('username')}")


class TestPasswordChange:
    """Test password change functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Cannot login - skipping password tests")
        return response.json()["token"]
    
    def test_change_password_wrong_current(self, auth_token):
        """Test changing password with wrong current password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password?token={auth_token}",
            json={
                "current_password": "wrongpassword",
                "new_password": "newtest123"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "incorrect" in data.get("detail", "").lower() or "invalid" in data.get("detail", "").lower()
        print("WRONG CURRENT PASSWORD TEST PASSED - Returns 400")
    
    def test_change_password_success_and_revert(self, auth_token):
        """Test changing password successfully and reverting"""
        # Change password
        new_password = "newtest456"
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password?token={auth_token}",
            json={
                "current_password": TEST_PASSWORD,
                "new_password": new_password
            }
        )
        assert response.status_code == 200, f"Password change failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("PASSWORD CHANGE SUCCESS")
        
        # Login with new password
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": new_password
        })
        assert login_resp.status_code == 200, f"Login with new password failed: {login_resp.text}"
        new_token = login_resp.json()["token"]
        print("LOGIN WITH NEW PASSWORD SUCCESS")
        
        # Revert password back
        revert_resp = requests.post(
            f"{BASE_URL}/api/auth/change-password?token={new_token}",
            json={
                "current_password": new_password,
                "new_password": TEST_PASSWORD
            }
        )
        assert revert_resp.status_code == 200, f"Password revert failed: {revert_resp.text}"
        print("PASSWORD REVERTED SUCCESSFULLY")
    
    def test_change_password_unauthorized(self):
        """Test changing password without token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password?token=invalid_token",
            json={
                "current_password": TEST_PASSWORD,
                "new_password": "newtest123"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("UNAUTHORIZED PASSWORD CHANGE TEST PASSED")


class TestProfileUpdate:
    """Test profile update functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Cannot login - skipping profile tests")
        return response.json()["token"]
    
    def test_update_display_name(self, auth_token):
        """Test updating display name"""
        original_name = None
        
        # Get current user to save original name
        user_resp = requests.get(f"{BASE_URL}/api/auth/me?token={auth_token}")
        if user_resp.status_code == 200:
            original_name = user_resp.json().get("display_name")
        
        # Update display name
        new_name = "Test Settings User"
        response = requests.put(
            f"{BASE_URL}/api/auth/update-profile?token={auth_token}",
            json={"display_name": new_name}
        )
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"DISPLAY NAME UPDATE SUCCESS - Changed to: {new_name}")
        
        # Verify update
        verify_resp = requests.get(f"{BASE_URL}/api/auth/me?token={auth_token}")
        if verify_resp.status_code == 200:
            updated_user = verify_resp.json()
            assert updated_user.get("display_name") == new_name, "Display name not updated"
            print("DISPLAY NAME VERIFIED IN USER DATA")
        
        # Revert to original if we had one
        if original_name:
            requests.put(
                f"{BASE_URL}/api/auth/update-profile?token={auth_token}",
                json={"display_name": original_name}
            )
            print(f"DISPLAY NAME REVERTED TO: {original_name}")
    
    def test_update_phone(self, auth_token):
        """Test updating phone number"""
        phone = "+1 555 123 4567"
        response = requests.put(
            f"{BASE_URL}/api/auth/update-profile?token={auth_token}",
            json={"phone": phone}
        )
        assert response.status_code == 200, f"Phone update failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"PHONE UPDATE SUCCESS - Set to: {phone}")
    
    def test_update_profile_unauthorized(self):
        """Test updating profile without valid token"""
        response = requests.put(
            f"{BASE_URL}/api/auth/update-profile?token=invalid_token",
            json={"display_name": "Hacker"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("UNAUTHORIZED PROFILE UPDATE TEST PASSED")


class TestLogout:
    """Test logout functionality"""
    
    def test_logout(self):
        """Test logout endpoint"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_resp.json()["token"]
        
        # Logout
        response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            data={"token": token}
        )
        assert response.status_code == 200, f"Logout failed: {response.text}"
        print("LOGOUT SUCCESS")
        
        # Verify token is invalid after logout
        verify_resp = requests.get(f"{BASE_URL}/api/auth/me?token={token}")
        assert verify_resp.status_code == 401, "Token should be invalid after logout"
        print("TOKEN INVALIDATED AFTER LOGOUT - VERIFIED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
