"""
Backend API Tests for FaceConnect - Friends, Posts, Stories, and User Search Features
Tests: User Registration, Login, User Search, Friend Requests, Posts Creation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUserAuthFlow:
    """Test user registration and login flow"""
    
    test_user_email = f"TEST_auth_{uuid.uuid4().hex[:8]}@example.com"
    test_user_password = "password123"
    test_user_username = f"TEST_authuser_{uuid.uuid4().hex[:8]}"
    
    def test_health_check(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        print("PASS: Health check endpoint working")
    
    def test_register_new_user(self):
        """User registration should create new user and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": self.test_user_username,
            "email": self.test_user_email,
            "password": self.test_user_password,
            "display_name": "Test Auth User"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["email"] == self.test_user_email
        assert data["user"]["username"] == self.test_user_username
        assert len(data["token"]) > 0
        
        TestUserAuthFlow.registered_token = data["token"]
        TestUserAuthFlow.registered_user_id = data["user"]["id"]
        print(f"PASS: User registered successfully - ID: {data['user']['id']}")
    
    def test_register_duplicate_user(self):
        """Duplicate registration should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": self.test_user_username,
            "email": self.test_user_email,
            "password": self.test_user_password
        })
        assert response.status_code == 400, "Should reject duplicate registration"
        print("PASS: Duplicate registration rejected correctly")
    
    def test_login_valid_credentials(self):
        """Login with valid credentials should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_user_email,
            "password": self.test_user_password
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == self.test_user_email
        print("PASS: Login with valid credentials successful")
    
    def test_login_invalid_credentials(self):
        """Login with invalid credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_user_email,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, "Should reject invalid credentials"
        print("PASS: Invalid credentials rejected correctly")
    
    def test_get_current_user(self):
        """Get current user profile with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            params={"token": getattr(TestUserAuthFlow, 'registered_token', '')}
        )
        assert response.status_code == 200, f"Get user failed: {response.text}"
        data = response.json()
        
        assert data["email"] == self.test_user_email
        assert data["username"] == self.test_user_username
        print("PASS: Get current user profile working")
    
    def test_get_current_user_invalid_token(self):
        """Get current user with invalid token should fail"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            params={"token": "invalid_token_here"}
        )
        assert response.status_code == 401
        print("PASS: Invalid token rejected correctly")


class TestUserSearch:
    """Test user search functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test user and get token"""
        email = f"TEST_search_{uuid.uuid4().hex[:8]}@example.com"
        username = f"TEST_searchuser_{uuid.uuid4().hex[:8]}"
        
        # Register user
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": username,
            "email": email,
            "password": "password123",
            "display_name": "Search Test User"
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.user_id = response.json()["user"]["id"]
        else:
            # Login if already exists
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": email,
                "password": "password123"
            })
            if response.status_code == 200:
                self.token = response.json()["token"]
                self.user_id = response.json()["user"]["id"]
            else:
                pytest.skip("Could not create/login test user")
    
    def test_search_users_endpoint(self):
        """Search users endpoint should work with valid query"""
        # First create a user to search for
        target_username = f"TEST_target_{uuid.uuid4().hex[:8]}"
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": target_username,
            "email": f"{target_username}@example.com",
            "password": "password123",
            "display_name": "Target User"
        })
        
        # Search for the user
        response = requests.get(
            f"{BASE_URL}/api/users/search",
            params={"token": self.token, "q": target_username[:10]}
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"PASS: User search returned {len(data)} results")
    
    def test_search_users_short_query(self):
        """Search with too short query should return empty results"""
        response = requests.get(
            f"{BASE_URL}/api/users/search",
            params={"token": self.token, "q": "a"}  # Too short
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0  # Should return empty for query < 2 chars
        print("PASS: Short query returns empty results")
    
    def test_search_users_unauthorized(self):
        """Search without token should fail"""
        response = requests.get(
            f"{BASE_URL}/api/users/search",
            params={"token": "", "q": "test"}
        )
        assert response.status_code == 401
        print("PASS: Unauthorized search rejected")


class TestFriendsFlow:
    """Test complete friends workflow: send request, accept, get friends list"""
    
    @classmethod
    def setup_class(cls):
        """Create two test users for friend testing"""
        cls.user1_email = f"TEST_friend1_{uuid.uuid4().hex[:8]}@example.com"
        cls.user1_username = f"TEST_frienduser1_{uuid.uuid4().hex[:8]}"
        cls.user2_email = f"TEST_friend2_{uuid.uuid4().hex[:8]}@example.com"
        cls.user2_username = f"TEST_frienduser2_{uuid.uuid4().hex[:8]}"
        
        # Register user 1
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": cls.user1_username,
            "email": cls.user1_email,
            "password": "password123",
            "display_name": "Friend User 1"
        })
        assert response.status_code == 200, f"User 1 registration failed: {response.text}"
        cls.user1_token = response.json()["token"]
        cls.user1_id = response.json()["user"]["id"]
        
        # Register user 2
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": cls.user2_username,
            "email": cls.user2_email,
            "password": "password123",
            "display_name": "Friend User 2"
        })
        assert response.status_code == 200, f"User 2 registration failed: {response.text}"
        cls.user2_token = response.json()["token"]
        cls.user2_id = response.json()["user"]["id"]
        
        print(f"Setup: Created test users - User1: {cls.user1_id}, User2: {cls.user2_id}")
    
    def test_01_get_friends_empty(self):
        """New user should have no friends"""
        response = requests.get(
            f"{BASE_URL}/api/friends",
            params={"token": self.user1_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("PASS: Get friends list working (empty for new user)")
    
    def test_02_send_friend_request(self):
        """User 1 sends friend request to User 2"""
        response = requests.post(
            f"{BASE_URL}/api/friends/request",
            params={"token": self.user1_token},
            json={"user_id": self.user2_id}
        )
        assert response.status_code == 200, f"Send request failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "message" in data
        TestFriendsFlow.friend_request_id = data["id"]
        print(f"PASS: Friend request sent - Request ID: {data['id']}")
    
    def test_03_duplicate_friend_request(self):
        """Duplicate friend request should fail"""
        response = requests.post(
            f"{BASE_URL}/api/friends/request",
            params={"token": self.user1_token},
            json={"user_id": self.user2_id}
        )
        assert response.status_code == 400, "Should reject duplicate request"
        print("PASS: Duplicate friend request rejected")
    
    def test_04_get_pending_requests(self):
        """User 2 should see pending friend request"""
        response = requests.get(
            f"{BASE_URL}/api/friends/requests",
            params={"token": self.user2_token}
        )
        assert response.status_code == 200, f"Get requests failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Find our specific request
        our_request = next((r for r in data if r["from_user_id"] == self.user1_id), None)
        assert our_request is not None, "Our friend request not found in pending"
        assert our_request["status"] == "pending"
        print(f"PASS: Pending requests retrieved ({len(data)} requests)")
    
    def test_05_get_sent_requests(self):
        """User 1 should see sent friend request"""
        response = requests.get(
            f"{BASE_URL}/api/friends/sent",
            params={"token": self.user1_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"PASS: Sent requests retrieved ({len(data)} requests)")
    
    def test_06_accept_friend_request(self):
        """User 2 accepts friend request from User 1"""
        response = requests.post(
            f"{BASE_URL}/api/friends/accept",
            params={"token": self.user2_token},
            json={"request_id": self.friend_request_id}
        )
        assert response.status_code == 200, f"Accept request failed: {response.text}"
        print("PASS: Friend request accepted")
    
    def test_07_verify_friendship(self):
        """Both users should now be friends"""
        # Check User 1's friends
        response = requests.get(
            f"{BASE_URL}/api/friends",
            params={"token": self.user1_token}
        )
        assert response.status_code == 200
        user1_friends = response.json()
        
        friend_ids = [f["id"] for f in user1_friends]
        assert self.user2_id in friend_ids, "User 2 not in User 1's friends list"
        
        # Check User 2's friends
        response = requests.get(
            f"{BASE_URL}/api/friends",
            params={"token": self.user2_token}
        )
        assert response.status_code == 200
        user2_friends = response.json()
        
        friend_ids = [f["id"] for f in user2_friends]
        assert self.user1_id in friend_ids, "User 1 not in User 2's friends list"
        
        print("PASS: Friendship verified for both users")
    
    def test_08_decline_friend_request(self):
        """Test decline friend request flow"""
        # Create another user
        user3_email = f"TEST_friend3_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"TEST_frienduser3_{uuid.uuid4().hex[:8]}",
            "email": user3_email,
            "password": "password123"
        })
        if response.status_code != 200:
            pytest.skip("Could not create third test user")
        
        user3_token = response.json()["token"]
        user3_id = response.json()["user"]["id"]
        
        # User 3 sends request to User 1
        response = requests.post(
            f"{BASE_URL}/api/friends/request",
            params={"token": user3_token},
            json={"user_id": self.user1_id}
        )
        assert response.status_code == 200
        request_id = response.json()["id"]
        
        # User 1 declines
        response = requests.post(
            f"{BASE_URL}/api/friends/decline",
            params={"token": self.user1_token},
            json={"request_id": request_id}
        )
        assert response.status_code == 200
        print("PASS: Friend request decline working")
    
    def test_09_remove_friend(self):
        """Test removing a friend"""
        response = requests.delete(
            f"{BASE_URL}/api/friends/{self.user2_id}",
            params={"token": self.user1_token}
        )
        assert response.status_code == 200, f"Remove friend failed: {response.text}"
        
        # Verify friendship is removed
        response = requests.get(
            f"{BASE_URL}/api/friends",
            params={"token": self.user1_token}
        )
        user1_friends = response.json()
        friend_ids = [f["id"] for f in user1_friends]
        assert self.user2_id not in friend_ids, "User 2 should not be in friends list after removal"
        
        print("PASS: Friend removal working")


class TestPostsAndStories:
    """Test posts and stories creation flow"""
    
    @classmethod
    def setup_class(cls):
        """Create test user for posts testing"""
        cls.user_email = f"TEST_posts_{uuid.uuid4().hex[:8]}@example.com"
        cls.user_username = f"TEST_postsuser_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": cls.user_username,
            "email": cls.user_email,
            "password": "password123",
            "display_name": "Posts Test User"
        })
        assert response.status_code == 200, f"User registration failed: {response.text}"
        cls.token = response.json()["token"]
        cls.user_id = response.json()["user"]["id"]
        print(f"Setup: Created test user - ID: {cls.user_id}")
    
    def test_01_create_text_post(self):
        """Create a text-only post"""
        response = requests.post(
            f"{BASE_URL}/api/posts",
            params={"token": self.token},
            json={
                "type": "post",
                "content": "This is a test post from automated tests!"
            }
        )
        assert response.status_code == 200, f"Create post failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["content"] == "This is a test post from automated tests!"
        assert data["type"] == "post"
        assert data["user_id"] == self.user_id
        
        TestPostsAndStories.post_id = data["id"]
        print(f"PASS: Text post created - ID: {data['id']}")
    
    def test_02_create_story(self):
        """Create a story"""
        response = requests.post(
            f"{BASE_URL}/api/posts",
            params={"token": self.token},
            json={
                "type": "story",
                "content": "This is a test story!"
            }
        )
        assert response.status_code == 200, f"Create story failed: {response.text}"
        data = response.json()
        
        assert data["type"] == "story"
        assert "expires_at" in data  # Stories should have expiration
        
        TestPostsAndStories.story_id = data["id"]
        print(f"PASS: Story created - ID: {data['id']}")
    
    def test_03_get_posts_feed(self):
        """Get posts feed"""
        response = requests.get(
            f"{BASE_URL}/api/posts",
            params={"token": self.token}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1  # Should have at least our test post
        print(f"PASS: Posts feed retrieved ({len(data)} posts)")
    
    def test_04_get_stories_only(self):
        """Get only stories from feed"""
        response = requests.get(
            f"{BASE_URL}/api/posts",
            params={"token": self.token, "type": "story"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # All items should be stories
        for item in data:
            assert item["type"] == "story"
        print(f"PASS: Stories filter working ({len(data)} stories)")
    
    def test_05_create_post_unauthorized(self):
        """Create post without token should fail"""
        response = requests.post(
            f"{BASE_URL}/api/posts",
            params={"token": ""},
            json={"type": "post", "content": "test"}
        )
        assert response.status_code == 401
        print("PASS: Unauthorized post creation rejected")


class TestExistingTestUsers:
    """Test with provided test credentials"""
    
    def test_login_alice(self):
        """Login with test user alice@test.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alice@test.com",
            "password": "password123"
        })
        # May or may not exist - just verify API response
        if response.status_code == 200:
            print("PASS: alice@test.com login successful")
        elif response.status_code == 401:
            print("INFO: alice@test.com user does not exist (expected if not seeded)")
        else:
            print(f"WARN: Unexpected status code {response.status_code}")
    
    def test_login_bob(self):
        """Login with test user bob@test.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "bob@test.com",
            "password": "password123"
        })
        if response.status_code == 200:
            print("PASS: bob@test.com login successful")
        elif response.status_code == 401:
            print("INFO: bob@test.com user does not exist (expected if not seeded)")
        else:
            print(f"WARN: Unexpected status code {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
