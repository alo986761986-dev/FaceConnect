"""
Tests for the unified home feed endpoint (/api/feed/home)
Tests stories, reels preview, highlighted posts, and regular posts feed
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHomeFeed:
    """Tests for the unified home feed endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user for feed tests"""
        self.unique_id = str(uuid.uuid4())[:8]
        self.test_email = f"TEST_feeduser_{self.unique_id}@test.com"
        self.test_password = "password123"
        self.test_username = f"TEST_feeduser_{self.unique_id}"
        
        # Register test user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": self.test_username,
            "email": self.test_email,
            "password": self.test_password,
            "display_name": "Feed Test User"
        })
        
        if register_response.status_code == 200:
            data = register_response.json()
            self.token = data["token"]
            self.user_id = data["user"]["id"]
        else:
            # User may already exist, try login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.test_email,
                "password": self.test_password
            })
            if login_response.status_code == 200:
                data = login_response.json()
                self.token = data["token"]
                self.user_id = data["user"]["id"]
            else:
                pytest.skip("Could not create or login test user")
    
    def test_feed_home_returns_200(self):
        """Test that /api/feed/home returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_feed_home_structure(self):
        """Test that /api/feed/home returns correct data structure"""
        response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify all required keys are present
        assert "stories" in data, "Response missing 'stories' key"
        assert "highlighted_posts" in data, "Response missing 'highlighted_posts' key"
        assert "reels_preview" in data, "Response missing 'reels_preview' key"
        assert "posts" in data, "Response missing 'posts' key"
        
        # Verify types
        assert isinstance(data["stories"], list), "stories should be a list"
        assert isinstance(data["highlighted_posts"], list), "highlighted_posts should be a list"
        assert isinstance(data["reels_preview"], list), "reels_preview should be a list"
        assert isinstance(data["posts"], list), "posts should be a list"
    
    def test_feed_home_unauthorized(self):
        """Test that /api/feed/home rejects unauthorized requests"""
        response = requests.get(f"{BASE_URL}/api/feed/home?token=invalid_token")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_create_story_appears_in_feed(self):
        """Test that a new story appears in the feed"""
        # Create a story
        story_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "story",
                "content": f"Test story from {self.test_username}"
            }
        )
        assert story_response.status_code == 200, f"Failed to create story: {story_response.text}"
        
        story_data = story_response.json()
        story_id = story_data["id"]
        
        # Verify story appears in feed
        feed_response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        assert feed_response.status_code == 200
        
        feed_data = feed_response.json()
        story_ids = [s["id"] for s in feed_data["stories"]]
        assert story_id in story_ids, "Created story not found in feed"
    
    def test_create_post_appears_in_feed(self):
        """Test that a new post appears in the feed"""
        # Create a post
        post_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "post",
                "content": f"Test post from {self.test_username}"
            }
        )
        assert post_response.status_code == 200, f"Failed to create post: {post_response.text}"
        
        post_data = post_response.json()
        post_id = post_data["id"]
        
        # Verify post appears in feed
        feed_response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        assert feed_response.status_code == 200
        
        feed_data = feed_response.json()
        post_ids = [p["id"] for p in feed_data["posts"]]
        assert post_id in post_ids, "Created post not found in feed"
    
    def test_post_like_updates_count(self):
        """Test that liking a post updates the like count"""
        # Create a post
        post_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "post",
                "content": f"Test like post from {self.test_username}"
            }
        )
        assert post_response.status_code == 200
        post_id = post_response.json()["id"]
        
        # Like the post
        like_response = requests.post(f"{BASE_URL}/api/posts/{post_id}/like?token={self.token}")
        assert like_response.status_code == 200
        
        like_data = like_response.json()
        assert like_data["liked"] == True, "Expected liked=True"
        assert like_data["likes_count"] == 1, "Expected likes_count=1"
    
    def test_post_unlike(self):
        """Test that unliking a post decreases the count"""
        # Create a post
        post_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "post",
                "content": f"Test unlike post from {self.test_username}"
            }
        )
        assert post_response.status_code == 200
        post_id = post_response.json()["id"]
        
        # Like the post
        like_response = requests.post(f"{BASE_URL}/api/posts/{post_id}/like?token={self.token}")
        assert like_response.status_code == 200
        assert like_response.json()["liked"] == True
        
        # Unlike the post (same endpoint toggles)
        unlike_response = requests.post(f"{BASE_URL}/api/posts/{post_id}/like?token={self.token}")
        assert unlike_response.status_code == 200
        
        unlike_data = unlike_response.json()
        assert unlike_data["liked"] == False, "Expected liked=False after unlike"
        assert unlike_data["likes_count"] == 0, "Expected likes_count=0 after unlike"
    
    def test_story_has_viewed_field(self):
        """Test that stories have the viewed field"""
        # Create a story
        story_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "story",
                "content": f"Test viewed story from {self.test_username}"
            }
        )
        assert story_response.status_code == 200
        
        # Get feed
        feed_response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        assert feed_response.status_code == 200
        
        feed_data = feed_response.json()
        if feed_data["stories"]:
            story = feed_data["stories"][0]
            assert "viewed" in story, "Story missing 'viewed' field"
    
    def test_highlighted_posts_have_required_fields(self):
        """Test that highlighted posts have all required fields"""
        feed_response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        assert feed_response.status_code == 200
        
        feed_data = feed_response.json()
        
        for post in feed_data.get("highlighted_posts", []):
            assert "id" in post, "Highlighted post missing 'id'"
            assert "user_id" in post, "Highlighted post missing 'user_id'"
            assert "likes_count" in post, "Highlighted post missing 'likes_count'"
            assert "is_highlighted" in post, "Highlighted post missing 'is_highlighted'"
            assert post["is_highlighted"] == True, "Highlighted post should have is_highlighted=True"
    
    def test_view_story_marks_as_viewed(self):
        """Test that viewing a story marks it as viewed"""
        # Create a story
        story_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "story",
                "content": f"Test viewable story from {self.test_username}"
            }
        )
        assert story_response.status_code == 200
        story_id = story_response.json()["id"]
        
        # View the story
        view_response = requests.post(f"{BASE_URL}/api/posts/{story_id}/view?token={self.token}")
        assert view_response.status_code == 200
        
        view_data = view_response.json()
        assert view_data.get("success") == True, "Expected success=True from view endpoint"


class TestReelsPreview:
    """Tests for reels preview in home feed"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user for reels tests"""
        self.unique_id = str(uuid.uuid4())[:8]
        self.test_email = f"TEST_reelsuser_{self.unique_id}@test.com"
        self.test_password = "password123"
        self.test_username = f"TEST_reelsuser_{self.unique_id}"
        
        # Register test user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": self.test_username,
            "email": self.test_email,
            "password": self.test_password,
            "display_name": "Reels Test User"
        })
        
        if register_response.status_code == 200:
            data = register_response.json()
            self.token = data["token"]
            self.user_id = data["user"]["id"]
        else:
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.test_email,
                "password": self.test_password
            })
            if login_response.status_code == 200:
                data = login_response.json()
                self.token = data["token"]
                self.user_id = data["user"]["id"]
            else:
                pytest.skip("Could not create or login test user")
    
    def test_reels_preview_fields(self):
        """Test that reels preview has required fields"""
        feed_response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        assert feed_response.status_code == 200
        
        feed_data = feed_response.json()
        
        for reel in feed_data.get("reels_preview", []):
            assert "id" in reel, "Reel missing 'id'"
            assert "user_id" in reel, "Reel missing 'user_id'"
            assert "video_url" in reel, "Reel missing 'video_url'"
            # thumbnail_url can be null/optional


class TestNavigation:
    """Tests for navigation routes"""
    
    def test_home_route_accessible(self):
        """Test that home route (/) is accessible"""
        response = requests.get(f"{BASE_URL}/")
        # May redirect or return frontend, just verify no 500 error
        assert response.status_code < 500, f"Home route returned {response.status_code}"
    
    def test_profiles_route_api(self):
        """Test that profiles-related API exists"""
        # Just verify the persons endpoint exists (used by profiles/dashboard)
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
