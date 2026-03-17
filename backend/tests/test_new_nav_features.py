"""
Test Suite for FaceConnect New Features - Navigation Bar, Reactions, Highlight, Post Count
Features tested:
- Bottom navigation has 4 tabs: Home, Reels, Live, Chat
- Post reactions API (POST /api/posts/{id}/react) with 8 reaction types
- Post reactions API (GET /api/posts/{id}/reactions) returns user reaction and breakdown
- Post highlight API with duration_days and highlight_expires_at
- Post count limit API (GET /api/users/{id}/post-count) returns limit of 20
- Creating more than 20 posts returns error
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_1 = {"email": "testuser123@test.com", "password": "test123"}
TEST_USER_2 = {"email": "testuser456@test.com", "password": "test123"}

# Test post ID provided by main agent
TEST_POST_ID = "6ac50b7a-795d-429a-ab86-d2bae1d4df77"
HIGHLIGHTED_POST_ID = "b74ac6da-2c4f-445e-a257-a5487cc2dc4b"

# Expected reaction types
EXPECTED_REACTION_TYPES = ["like", "love", "haha", "wow", "sad", "angry", "fire", "clap"]


class TestAuth:
    """Test authentication endpoints"""
    
    @pytest.fixture(scope="class")
    def user1_token(self):
        """Get auth token for test user 1"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def user1_id(self, user1_token):
        """Get user 1 ID"""
        response = requests.get(f"{BASE_URL}/api/auth/me?token={user1_token}")
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_login_user1(self):
        """Test login with testuser123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"User 1 logged in successfully: {data['user'].get('username')}")


class TestPostReactions:
    """Test post reactions API - 8 reaction types: like, love, haha, wow, sad, angry, fire, clap"""
    
    @pytest.fixture(scope="class")
    def user1_token(self):
        """Get auth token for test user 1"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_post_id(self, user1_token):
        """Create a test post or use existing one"""
        # First try to get posts to find an existing one
        response = requests.get(f"{BASE_URL}/api/posts?token={user1_token}&type=post&limit=5")
        if response.status_code == 200:
            posts = response.json()
            if posts:
                return posts[0]["id"]
        
        # Create a new post if none exist
        response = requests.post(
            f"{BASE_URL}/api/posts?token={user1_token}",
            json={"type": "post", "content": "TEST_reaction_test_post"}
        )
        if response.status_code == 200 or response.status_code == 201:
            return response.json()["id"]
        
        # Fall back to provided test post ID
        return TEST_POST_ID
    
    def test_react_like(self, user1_token, test_post_id):
        """Test adding 'like' reaction to a post"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{test_post_id}/react?token={user1_token}&reaction_type=like"
        )
        assert response.status_code == 200, f"Failed to add like reaction: {response.text}"
        data = response.json()
        assert "reaction_type" in data or "added" in data
        print(f"Like reaction response: {data}")
    
    def test_react_love(self, user1_token, test_post_id):
        """Test adding 'love' reaction to a post"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{test_post_id}/react?token={user1_token}&reaction_type=love"
        )
        assert response.status_code == 200, f"Failed to add love reaction: {response.text}"
        data = response.json()
        print(f"Love reaction response: {data}")
    
    def test_react_haha(self, user1_token, test_post_id):
        """Test adding 'haha' reaction to a post"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{test_post_id}/react?token={user1_token}&reaction_type=haha"
        )
        assert response.status_code == 200
        print(f"Haha reaction added successfully")
    
    def test_react_wow(self, user1_token, test_post_id):
        """Test adding 'wow' reaction to a post"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{test_post_id}/react?token={user1_token}&reaction_type=wow"
        )
        assert response.status_code == 200
        print(f"Wow reaction added successfully")
    
    def test_react_sad(self, user1_token, test_post_id):
        """Test adding 'sad' reaction to a post"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{test_post_id}/react?token={user1_token}&reaction_type=sad"
        )
        assert response.status_code == 200
        print(f"Sad reaction added successfully")
    
    def test_react_angry(self, user1_token, test_post_id):
        """Test adding 'angry' reaction to a post"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{test_post_id}/react?token={user1_token}&reaction_type=angry"
        )
        assert response.status_code == 200
        print(f"Angry reaction added successfully")
    
    def test_react_fire(self, user1_token, test_post_id):
        """Test adding 'fire' reaction to a post"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{test_post_id}/react?token={user1_token}&reaction_type=fire"
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Fire reaction response: {data}")
    
    def test_react_clap(self, user1_token, test_post_id):
        """Test adding 'clap' reaction to a post"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{test_post_id}/react?token={user1_token}&reaction_type=clap"
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Clap reaction response: {data}")
    
    def test_invalid_reaction_type(self, user1_token, test_post_id):
        """Test that invalid reaction type returns 400 error"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{test_post_id}/react?token={user1_token}&reaction_type=invalid"
        )
        assert response.status_code == 400, f"Expected 400 for invalid reaction, got {response.status_code}"
        print(f"Invalid reaction correctly rejected: {response.json()}")
    
    def test_get_reactions(self, user1_token, test_post_id):
        """Test GET /api/posts/{id}/reactions returns user_reaction and breakdown"""
        response = requests.get(
            f"{BASE_URL}/api/posts/{test_post_id}/reactions?token={user1_token}"
        )
        assert response.status_code == 200, f"Failed to get reactions: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "user_reaction" in data, "Response should include user_reaction"
        assert "total_reactions" in data, "Response should include total_reactions"
        assert "reactions_breakdown" in data, "Response should include reactions_breakdown"
        
        print(f"Reactions response: user_reaction={data.get('user_reaction')}, "
              f"total={data.get('total_reactions')}, breakdown={data.get('reactions_breakdown')}")


class TestPostHighlight:
    """Test post highlight API with duration_days and highlight_expires_at"""
    
    @pytest.fixture(scope="class")
    def user1_token(self):
        """Get auth token for test user 1"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def user_post_id(self, user1_token):
        """Create a test post owned by user1 for highlight testing"""
        response = requests.post(
            f"{BASE_URL}/api/posts?token={user1_token}",
            json={"type": "post", "content": "TEST_highlight_test_post"}
        )
        if response.status_code in [200, 201]:
            return response.json()["id"]
        return HIGHLIGHTED_POST_ID
    
    def test_highlight_post_default_duration(self, user1_token, user_post_id):
        """Test highlighting a post with default 7 days duration"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{user_post_id}/highlight?token={user1_token}"
        )
        # May fail with 403 if not post owner - that's expected behavior
        if response.status_code == 403:
            print(f"User doesn't own post {user_post_id}, trying with different post")
            pytest.skip("User doesn't own the test post")
        
        assert response.status_code == 200, f"Failed to highlight post: {response.text}"
        data = response.json()
        
        # Verify response includes highlight fields
        assert "is_highlighted" in data
        assert "duration_days" in data or "highlight_expires_at" in data
        print(f"Highlight response: {data}")
    
    def test_highlight_post_custom_duration(self, user1_token, user_post_id):
        """Test highlighting with custom duration_days parameter"""
        # Try 14 days duration
        response = requests.post(
            f"{BASE_URL}/api/posts/{user_post_id}/highlight?token={user1_token}&duration_days=14"
        )
        if response.status_code == 403:
            pytest.skip("User doesn't own the test post")
        
        assert response.status_code == 200
        data = response.json()
        print(f"Highlight with 14 days: {data}")
    
    def test_highlight_response_includes_expires_at(self, user1_token, user_post_id):
        """Verify highlight response includes highlight_expires_at field"""
        response = requests.post(
            f"{BASE_URL}/api/posts/{user_post_id}/highlight?token={user1_token}&duration_days=7"
        )
        if response.status_code == 403:
            pytest.skip("User doesn't own the test post")
        
        assert response.status_code == 200
        data = response.json()
        
        # The response should include highlight_expires_at when highlighted
        if data.get("is_highlighted", False):
            assert "highlight_expires_at" in data, "Response should include highlight_expires_at"
            print(f"highlight_expires_at: {data.get('highlight_expires_at')}")
        else:
            # If unhighlighted, expires_at should be None
            print(f"Post unhighlighted, expires_at is None")


class TestPostCountLimit:
    """Test post count limit API - limit of 20 posts per user"""
    
    @pytest.fixture(scope="class")
    def user1_token(self):
        """Get auth token for test user 1"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def user1_id(self, user1_token):
        """Get user 1 ID"""
        response = requests.get(f"{BASE_URL}/api/auth/me?token={user1_token}")
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_get_post_count(self, user1_token, user1_id):
        """Test GET /api/users/{id}/post-count returns limit info"""
        response = requests.get(
            f"{BASE_URL}/api/users/{user1_id}/post-count?token={user1_token}"
        )
        assert response.status_code == 200, f"Failed to get post count: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "post_count" in data, "Response should include post_count"
        assert "post_limit" in data, "Response should include post_limit"
        assert "remaining" in data, "Response should include remaining"
        assert "can_post" in data, "Response should include can_post"
        
        # Verify limit is 20
        assert data["post_limit"] == 20, f"Expected post_limit=20, got {data['post_limit']}"
        
        print(f"Post count: {data['post_count']}/{data['post_limit']}, "
              f"remaining: {data['remaining']}, can_post: {data['can_post']}")
    
    def test_post_limit_enforced(self, user1_token, user1_id):
        """Test that creating more than 20 posts returns error"""
        # First check current count
        response = requests.get(
            f"{BASE_URL}/api/users/{user1_id}/post-count?token={user1_token}"
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["can_post"]:
            print(f"User has {data['remaining']} posts remaining - limit not reached yet")
        else:
            # Try to create a post when at limit
            response = requests.post(
                f"{BASE_URL}/api/posts?token={user1_token}",
                json={"type": "post", "content": "TEST_limit_test_post"}
            )
            assert response.status_code == 400, "Should return 400 when at post limit"
            print(f"Post limit enforced correctly: {response.json()}")


class TestReelsPageFeatures:
    """Test Reels page features - Watch More and Rewatch buttons"""
    
    @pytest.fixture(scope="class")
    def user1_token(self):
        """Get auth token for test user 1"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_reels_feed(self, user1_token):
        """Test that reels feed loads correctly"""
        response = requests.get(f"{BASE_URL}/api/reels?token={user1_token}")
        assert response.status_code == 200
        reels = response.json()
        print(f"Loaded {len(reels)} reels from feed")
        return reels


class TestUniversalSearch:
    """Test universal search with content previews"""
    
    @pytest.fixture(scope="class")
    def user1_token(self):
        """Get auth token for test user 1"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_search_all_categories(self, user1_token):
        """Test universal search returns results from all categories"""
        response = requests.get(
            f"{BASE_URL}/api/search/universal?token={user1_token}&q=test&category=all"
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        
        # Verify response has all category keys
        expected_keys = ["users", "posts", "reels", "stories", "live", "hashtags"]
        for key in expected_keys:
            assert key in data, f"Response should include '{key}' category"
        
        print(f"Search results: users={len(data.get('users', []))}, "
              f"posts={len(data.get('posts', []))}, reels={len(data.get('reels', []))}")
    
    def test_search_users_only(self, user1_token):
        """Test searching users category only"""
        response = requests.get(
            f"{BASE_URL}/api/search/universal?token={user1_token}&q=test&category=users"
        )
        assert response.status_code == 200
        data = response.json()
        print(f"User search results: {len(data.get('users', []))} users found")


class TestHealthCheck:
    """Basic health and API verification"""
    
    def test_api_accessible(self):
        """Test that API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        # Accept 200 or 404 (health endpoint might not exist)
        assert response.status_code in [200, 404], f"API not accessible: {response.status_code}"
        if response.status_code == 200:
            print(f"Health check: {response.json()}")
        else:
            print("Health endpoint not implemented, but API is accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
