"""
Dating API Tests
Tests for Dating profile, discover, likes, matches, and secret crush features
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "facebook@test.com"
TEST_PASSWORD = "Facebook123!"


class TestDatingAPI:
    """Dating API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token"""
        # Login to get token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.user_id = data.get("user", {}).get("id")
        assert self.token, "No token received from login"
        print(f"Logged in successfully, token: {self.token[:20]}...")
    
    def test_create_dating_profile(self):
        """Test POST /api/dating/profile - Create dating profile"""
        profile_data = {
            "bio": "Test bio for dating profile",
            "photos": ["https://example.com/photo1.jpg"],
            "interests": ["music", "travel", "food"],
            "zodiac_sign": "leo",
            "job_title": "Software Engineer",
            "looking_for": "dating",
            "age_range_min": 25,
            "age_range_max": 40,
            "distance_km": 30
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dating/profile?token={self.token}",
            json=profile_data
        )
        
        print(f"Create profile response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Create profile failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Profile ID not returned"
        assert "user_id" in data, "User ID not returned"
        assert data.get("bio") == profile_data["bio"], "Bio mismatch"
        assert data.get("looking_for") == "dating", "Looking for mismatch"
        print(f"Created dating profile: {data.get('id')}")
    
    def test_get_my_dating_profile(self):
        """Test GET /api/dating/profile - Get own dating profile"""
        # First create a profile
        profile_data = {
            "bio": "My dating profile bio",
            "interests": ["coding", "gaming"],
            "looking_for": "dating"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/dating/profile?token={self.token}",
            json=profile_data
        )
        assert create_response.status_code == 200, f"Create profile failed: {create_response.text}"
        
        # Now get the profile
        response = requests.get(f"{BASE_URL}/api/dating/profile?token={self.token}")
        
        print(f"Get profile response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Get profile failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Profile ID not returned"
        assert "name" in data, "Name not returned"
        assert "age" in data, "Age not returned"
        print(f"Retrieved dating profile for user: {data.get('name')}")
    
    def test_discover_profiles(self):
        """Test GET /api/dating/discover - Discover profiles to swipe"""
        response = requests.get(
            f"{BASE_URL}/api/dating/discover?token={self.token}&mode=dating&limit=5"
        )
        
        print(f"Discover response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Discover failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Discovered {len(data)} profiles")
        
        # If profiles exist, verify structure
        if len(data) > 0:
            profile = data[0]
            assert "id" in profile, "Profile ID missing"
            assert "name" in profile, "Name missing"
            assert "age" in profile, "Age missing"
            print(f"First profile: {profile.get('name')}, {profile.get('age')}")
    
    def test_discover_friendship_mode(self):
        """Test GET /api/dating/discover with friendship mode"""
        response = requests.get(
            f"{BASE_URL}/api/dating/discover?token={self.token}&mode=friendship&limit=5"
        )
        
        print(f"Discover friendship response: {response.status_code}")
        assert response.status_code == 200, f"Discover friendship failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Discovered {len(data)} friendship profiles")
    
    def test_like_profile(self):
        """Test POST /api/dating/like - Like a profile"""
        # Create a fake user ID to like
        fake_user_id = str(uuid.uuid4())
        
        like_data = {
            "liked_user_id": fake_user_id,
            "like_type": "like"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dating/like?token={self.token}",
            json=like_data
        )
        
        print(f"Like response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Like failed: {response.text}"
        
        data = response.json()
        assert "action" in data, "Action not returned"
        assert data.get("action") in ["liked", "match"], f"Unexpected action: {data.get('action')}"
        print(f"Like action: {data.get('action')}")
    
    def test_super_like_profile(self):
        """Test POST /api/dating/like with super_like type"""
        fake_user_id = str(uuid.uuid4())
        
        like_data = {
            "liked_user_id": fake_user_id,
            "like_type": "super_like"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dating/like?token={self.token}",
            json=like_data
        )
        
        print(f"Super like response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Super like failed: {response.text}"
        
        data = response.json()
        assert "action" in data, "Action not returned"
        print(f"Super like action: {data.get('action')}")
    
    def test_pass_profile(self):
        """Test POST /api/dating/pass - Pass on a profile"""
        fake_user_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/dating/pass?token={self.token}&user_id={fake_user_id}"
        )
        
        print(f"Pass response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Pass failed: {response.text}"
        
        data = response.json()
        assert data.get("action") == "passed", f"Unexpected action: {data.get('action')}"
        print(f"Pass action: {data.get('action')}")
    
    def test_get_matches(self):
        """Test GET /api/dating/matches - Get all matches"""
        response = requests.get(f"{BASE_URL}/api/dating/matches?token={self.token}")
        
        print(f"Matches response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Get matches failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} matches")
    
    def test_get_likes_you(self):
        """Test GET /api/dating/likes-you - Get profiles that liked you"""
        response = requests.get(f"{BASE_URL}/api/dating/likes-you?token={self.token}")
        
        print(f"Likes you response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Get likes-you failed: {response.text}"
        
        data = response.json()
        assert "count" in data, "Count not returned"
        assert "profiles" in data, "Profiles not returned"
        print(f"Found {data.get('count')} profiles that liked you")
    
    def test_add_secret_crush(self):
        """Test POST /api/dating/secret-crush - Add a secret crush"""
        fake_crush_id = str(uuid.uuid4())
        
        crush_data = {
            "crush_user_id": fake_crush_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dating/secret-crush?token={self.token}",
            json=crush_data
        )
        
        print(f"Secret crush response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Add secret crush failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Crush ID not returned"
        assert "user_id" in data, "User ID not returned"
        assert "crush_user_id" in data, "Crush user ID not returned"
        assert data.get("crush_user_id") == fake_crush_id, "Crush user ID mismatch"
        print(f"Added secret crush: {data.get('id')}")
        
        return data.get("id")
    
    def test_get_secret_crushes(self):
        """Test GET /api/dating/secret-crushes - Get all secret crushes"""
        response = requests.get(f"{BASE_URL}/api/dating/secret-crushes?token={self.token}")
        
        print(f"Secret crushes response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200, f"Get secret crushes failed: {response.text}"
        
        data = response.json()
        assert "count" in data, "Count not returned"
        assert "max" in data, "Max not returned"
        assert "crushes" in data, "Crushes not returned"
        assert data.get("max") == 9, "Max should be 9"
        print(f"Found {data.get('count')}/{data.get('max')} secret crushes")
    
    def test_delete_secret_crush(self):
        """Test DELETE /api/dating/secret-crush/{crush_id} - Remove a secret crush"""
        # First add a crush
        fake_crush_id = str(uuid.uuid4())
        crush_data = {"crush_user_id": fake_crush_id}
        
        add_response = requests.post(
            f"{BASE_URL}/api/dating/secret-crush?token={self.token}",
            json=crush_data
        )
        
        if add_response.status_code == 200:
            crush_id = add_response.json().get("id")
            
            # Now delete it
            response = requests.delete(
                f"{BASE_URL}/api/dating/secret-crush/{crush_id}?token={self.token}"
            )
            
            print(f"Delete crush response: {response.status_code} - {response.text[:200]}")
            assert response.status_code == 200, f"Delete crush failed: {response.text}"
            
            data = response.json()
            assert "message" in data, "Message not returned"
            print(f"Delete result: {data.get('message')}")
        else:
            print(f"Could not add crush to delete: {add_response.text}")
    
    def test_secret_crush_limit(self):
        """Test that secret crush limit of 9 is enforced"""
        # Get current crushes
        response = requests.get(f"{BASE_URL}/api/dating/secret-crushes?token={self.token}")
        assert response.status_code == 200
        
        data = response.json()
        current_count = data.get("count", 0)
        print(f"Current crush count: {current_count}")
        
        # If already at limit, verify we can't add more
        if current_count >= 9:
            fake_crush_id = str(uuid.uuid4())
            crush_data = {"crush_user_id": fake_crush_id}
            
            response = requests.post(
                f"{BASE_URL}/api/dating/secret-crush?token={self.token}",
                json=crush_data
            )
            
            assert response.status_code == 400, "Should fail when at crush limit"
            print("Crush limit enforced correctly")
    
    def test_unauthorized_access(self):
        """Test that endpoints require valid token"""
        # Test with invalid token
        invalid_token = "invalid_token_12345"
        
        response = requests.get(f"{BASE_URL}/api/dating/profile?token={invalid_token}")
        assert response.status_code in [401, 404], f"Should be unauthorized: {response.status_code}"
        print(f"Unauthorized access correctly rejected: {response.status_code}")
        
        response = requests.get(f"{BASE_URL}/api/dating/discover?token={invalid_token}")
        assert response.status_code == 401, f"Should be unauthorized: {response.status_code}"
        print(f"Discover unauthorized correctly rejected: {response.status_code}")


class TestDatingProfileUpdate:
    """Tests for updating dating profile"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
    
    def test_update_profile_bio(self):
        """Test updating profile bio"""
        # Create initial profile
        initial_data = {
            "bio": "Initial bio",
            "looking_for": "dating"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dating/profile?token={self.token}",
            json=initial_data
        )
        assert response.status_code == 200
        
        # Update with new bio
        updated_data = {
            "bio": "Updated bio text",
            "looking_for": "dating"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dating/profile?token={self.token}",
            json=updated_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("bio") == "Updated bio text", "Bio not updated"
        print(f"Profile bio updated successfully")
    
    def test_update_profile_preferences(self):
        """Test updating profile preferences"""
        profile_data = {
            "looking_for": "friendship",
            "age_range_min": 20,
            "age_range_max": 35,
            "distance_km": 25
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dating/profile?token={self.token}",
            json=profile_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("looking_for") == "friendship", "Looking for not updated"
        print(f"Profile preferences updated successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
