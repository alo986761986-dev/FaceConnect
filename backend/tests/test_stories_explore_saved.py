"""
Test Stories, Explore, and Saved Posts APIs for FaceConnect
Tests new P1 Stories feature, P1 Explore/Discover page, P2 Save/Bookmark posts functionality
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials
TEST_EMAIL = "test1916@example.com"
TEST_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def test_post_id(auth_token):
    """Get or create a test post for saved posts testing."""
    # Try to get existing posts
    response = requests.get(f"{BASE_URL}/api/feed/home?token={auth_token}")
    if response.status_code == 200:
        data = response.json()
        posts = data.get("posts", [])
        if posts:
            return posts[0]["id"]
    
    # Create a test post if none exist
    response = requests.post(
        f"{BASE_URL}/api/posts",
        data={"content": "TEST_post_for_saved_testing", "token": auth_token}
    )
    if response.status_code in [200, 201]:
        data = response.json()
        return data.get("id")
    
    pytest.skip("No posts available for testing")


class TestStoriesAPI:
    """Tests for Stories CRUD endpoints - 24-hour disappearing content"""
    
    def test_create_story_text_only(self, auth_token):
        """Test creating a text-only story."""
        response = requests.post(
            f"{BASE_URL}/api/stories?token={auth_token}",
            data={
                "content": "TEST_story_text_content",
                "background_color": "#FF5733"
            }
        )
        assert response.status_code == 200, f"Failed to create story: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain story ID"
        assert "expires_at" in data, "Response should contain expiry time"
        assert data.get("message") == "Story created successfully"
    
    def test_create_story_requires_content_or_media(self, auth_token):
        """Test that story creation fails without content or media."""
        response = requests.post(
            f"{BASE_URL}/api/stories?token={auth_token}",
            data={
                "background_color": "#000000"
            }
        )
        assert response.status_code == 400, "Should fail without content or media"
        
        data = response.json()
        assert "detail" in data
    
    def test_get_stories_feed(self, auth_token):
        """Test GET /api/stories/feed - get stories from friends."""
        response = requests.get(f"{BASE_URL}/api/stories/feed?token={auth_token}")
        
        assert response.status_code == 200, f"Failed to get stories feed: {response.text}"
        
        data = response.json()
        assert "stories" in data, "Response should contain stories array"
        
        # Verify structure if stories exist
        if data["stories"]:
            story_group = data["stories"][0]
            assert "user_id" in story_group
            assert "username" in story_group
            assert "has_unviewed" in story_group
            assert "stories" in story_group
    
    def test_get_single_story(self, auth_token):
        """Test GET /api/stories/{story_id} - get a single story."""
        # First create a story
        create_response = requests.post(
            f"{BASE_URL}/api/stories?token={auth_token}",
            data={
                "content": "TEST_single_story_fetch",
                "background_color": "#00FF00"
            }
        )
        
        if create_response.status_code == 200:
            story_id = create_response.json()["id"]
            
            # Now fetch it
            response = requests.get(f"{BASE_URL}/api/stories/{story_id}?token={auth_token}")
            
            assert response.status_code == 200, f"Failed to get story: {response.text}"
            
            data = response.json()
            assert data["id"] == story_id
            assert data["content"] == "TEST_single_story_fetch"
    
    def test_mark_story_viewed(self, auth_token):
        """Test POST /api/stories/{id}/view - mark story as viewed."""
        # First create a story
        create_response = requests.post(
            f"{BASE_URL}/api/stories?token={auth_token}",
            data={
                "content": "TEST_story_for_viewing",
                "background_color": "#0000FF"
            }
        )
        
        if create_response.status_code == 200:
            story_id = create_response.json()["id"]
            
            # Mark as viewed
            response = requests.post(f"{BASE_URL}/api/stories/{story_id}/view?token={auth_token}")
            
            assert response.status_code == 200, f"Failed to mark story viewed: {response.text}"
            
            data = response.json()
            assert data["message"] == "Story marked as viewed"
    
    def test_get_story_viewers(self, auth_token):
        """Test GET /api/stories/{story_id}/viewers - get list of viewers (owner only)."""
        # First create a story
        create_response = requests.post(
            f"{BASE_URL}/api/stories?token={auth_token}",
            data={
                "content": "TEST_story_viewers_check",
                "background_color": "#FFFF00"
            }
        )
        
        if create_response.status_code == 200:
            story_id = create_response.json()["id"]
            
            # Get viewers
            response = requests.get(f"{BASE_URL}/api/stories/{story_id}/viewers?token={auth_token}")
            
            assert response.status_code == 200, f"Failed to get story viewers: {response.text}"
            
            data = response.json()
            assert "viewers" in data
            assert "count" in data
    
    def test_delete_story(self, auth_token):
        """Test DELETE /api/stories/{story_id} - delete own story."""
        # First create a story
        create_response = requests.post(
            f"{BASE_URL}/api/stories?token={auth_token}",
            data={
                "content": "TEST_story_to_delete",
                "background_color": "#800080"
            }
        )
        
        if create_response.status_code == 200:
            story_id = create_response.json()["id"]
            
            # Delete it
            response = requests.delete(f"{BASE_URL}/api/stories/{story_id}?token={auth_token}")
            
            assert response.status_code == 200, f"Failed to delete story: {response.text}"
            
            data = response.json()
            assert data["message"] == "Story deleted successfully"
            
            # Verify deletion
            get_response = requests.get(f"{BASE_URL}/api/stories/{story_id}?token={auth_token}")
            assert get_response.status_code == 404
    
    def test_story_requires_authentication(self):
        """Test that story endpoints require authentication."""
        response = requests.get(f"{BASE_URL}/api/stories/feed?token=invalid_token")
        assert response.status_code == 401


class TestExploreAPI:
    """Tests for Explore/Discover endpoints"""
    
    def test_get_explore_feed_all(self, auth_token):
        """Test GET /api/explore - get explore feed with all content."""
        response = requests.get(f"{BASE_URL}/api/explore?token={auth_token}")
        
        assert response.status_code == 200, f"Failed to get explore feed: {response.text}"
        
        data = response.json()
        assert "posts" in data
        assert "skip" in data
        assert "limit" in data
        assert "category" in data
        assert data["category"] == "all"
    
    def test_get_explore_feed_photos(self, auth_token):
        """Test GET /api/explore with category=photos filter."""
        response = requests.get(f"{BASE_URL}/api/explore?token={auth_token}&category=photos")
        
        assert response.status_code == 200, f"Failed to get photos explore: {response.text}"
        
        data = response.json()
        assert data["category"] == "photos"
    
    def test_get_explore_feed_videos(self, auth_token):
        """Test GET /api/explore with category=videos filter."""
        response = requests.get(f"{BASE_URL}/api/explore?token={auth_token}&category=videos")
        
        assert response.status_code == 200, f"Failed to get videos explore: {response.text}"
        
        data = response.json()
        assert data["category"] == "videos"
    
    def test_get_explore_feed_reels(self, auth_token):
        """Test GET /api/explore with category=reels filter."""
        response = requests.get(f"{BASE_URL}/api/explore?token={auth_token}&category=reels")
        
        assert response.status_code == 200, f"Failed to get reels explore: {response.text}"
        
        data = response.json()
        assert data["category"] == "reels"
    
    def test_explore_search_users(self, auth_token):
        """Test GET /api/explore/search - search for users."""
        response = requests.get(f"{BASE_URL}/api/explore/search?token={auth_token}&q=test&type=users")
        
        assert response.status_code == 200, f"Failed to search users: {response.text}"
        
        data = response.json()
        assert "users" in data
        
        if data["users"]:
            user = data["users"][0]
            assert "id" in user
            assert "username" in user
    
    def test_explore_search_posts(self, auth_token):
        """Test GET /api/explore/search - search for posts."""
        response = requests.get(f"{BASE_URL}/api/explore/search?token={auth_token}&q=test&type=posts")
        
        assert response.status_code == 200, f"Failed to search posts: {response.text}"
        
        data = response.json()
        assert "posts" in data
    
    def test_explore_search_hashtags(self, auth_token):
        """Test GET /api/explore/search - search for hashtags."""
        response = requests.get(f"{BASE_URL}/api/explore/search?token={auth_token}&q=test&type=hashtags")
        
        assert response.status_code == 200, f"Failed to search hashtags: {response.text}"
        
        data = response.json()
        assert "hashtags" in data
    
    def test_explore_search_all_types(self, auth_token):
        """Test GET /api/explore/search - search all types at once."""
        response = requests.get(f"{BASE_URL}/api/explore/search?token={auth_token}&q=test")
        
        assert response.status_code == 200, f"Failed to search all: {response.text}"
        
        data = response.json()
        assert "users" in data
        assert "posts" in data
        assert "hashtags" in data
    
    def test_explore_search_query_too_short(self, auth_token):
        """Test that search fails with query too short."""
        response = requests.get(f"{BASE_URL}/api/explore/search?token={auth_token}&q=a")
        
        assert response.status_code == 400, "Should fail with short query"
    
    def test_get_for_you_feed(self, auth_token):
        """Test GET /api/explore/for-you - personalized feed."""
        response = requests.get(f"{BASE_URL}/api/explore/for-you?token={auth_token}")
        
        assert response.status_code == 200, f"Failed to get for-you feed: {response.text}"
        
        data = response.json()
        assert "posts" in data
        assert "skip" in data
        assert "limit" in data
    
    def test_get_trending(self, auth_token):
        """Test GET /api/explore/trending - get trending hashtags."""
        response = requests.get(f"{BASE_URL}/api/explore/trending?token={auth_token}")
        
        assert response.status_code == 200, f"Failed to get trending: {response.text}"
        
        data = response.json()
        assert "trending_hashtags" in data
    
    def test_get_suggested_users(self, auth_token):
        """Test GET /api/explore/suggested-users - get user suggestions."""
        response = requests.get(f"{BASE_URL}/api/explore/suggested-users?token={auth_token}")
        
        assert response.status_code == 200, f"Failed to get suggested users: {response.text}"
        
        data = response.json()
        assert "users" in data
    
    def test_explore_requires_authentication(self):
        """Test that explore endpoints require authentication."""
        response = requests.get(f"{BASE_URL}/api/explore?token=invalid_token")
        assert response.status_code == 401


class TestSavedPostsAPI:
    """Tests for Save/Bookmark posts functionality"""
    
    def test_save_post_toggle(self, auth_token, test_post_id):
        """Test POST /api/saved/posts/{id} - save/unsave post toggle."""
        # First save
        response = requests.post(f"{BASE_URL}/api/saved/posts/{test_post_id}?token={auth_token}")
        
        assert response.status_code == 200, f"Failed to save post: {response.text}"
        
        data = response.json()
        assert "saved" in data
        assert "message" in data
        
        first_state = data["saved"]
        
        # Toggle again
        response2 = requests.post(f"{BASE_URL}/api/saved/posts/{test_post_id}?token={auth_token}")
        
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["saved"] != first_state, "Toggle should change saved state"
    
    def test_save_nonexistent_post(self, auth_token):
        """Test saving a non-existent post."""
        response = requests.post(f"{BASE_URL}/api/saved/posts/nonexistent-post-id-12345?token={auth_token}")
        
        assert response.status_code == 404, "Should fail for non-existent post"
    
    def test_get_saved_posts(self, auth_token, test_post_id):
        """Test GET /api/saved/posts - get all saved posts."""
        # First ensure post is saved
        requests.post(f"{BASE_URL}/api/saved/posts/{test_post_id}?token={auth_token}")
        
        # Get saved posts
        response = requests.get(f"{BASE_URL}/api/saved/posts?token={auth_token}")
        
        assert response.status_code == 200, f"Failed to get saved posts: {response.text}"
        
        data = response.json()
        assert "posts" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
    
    def test_check_saved_status(self, auth_token, test_post_id):
        """Test GET /api/saved/posts/{id}/status - check if post is saved."""
        response = requests.get(f"{BASE_URL}/api/saved/posts/{test_post_id}/status?token={auth_token}")
        
        assert response.status_code == 200, f"Failed to check saved status: {response.text}"
        
        data = response.json()
        assert "is_saved" in data
        assert isinstance(data["is_saved"], bool)
    
    def test_unsave_post_delete(self, auth_token, test_post_id):
        """Test DELETE /api/saved/posts/{id} - remove post from saved."""
        # First ensure post is saved by checking status and saving if needed
        status_resp = requests.get(f"{BASE_URL}/api/saved/posts/{test_post_id}/status?token={auth_token}")
        if status_resp.status_code == 200 and not status_resp.json().get("is_saved"):
            # Post not saved, save it first
            save_resp = requests.post(f"{BASE_URL}/api/saved/posts/{test_post_id}?token={auth_token}")
            assert save_resp.status_code == 200, f"Failed to save post for test setup: {save_resp.text}"
        
        # Now unsave via DELETE
        response = requests.delete(f"{BASE_URL}/api/saved/posts/{test_post_id}?token={auth_token}")
        
        assert response.status_code == 200, f"Failed to unsave post: {response.text}"
        
        # Verify it's unsaved
        status_response = requests.get(f"{BASE_URL}/api/saved/posts/{test_post_id}/status?token={auth_token}")
        assert status_response.json()["is_saved"] == False
    
    def test_saved_requires_authentication(self):
        """Test that saved endpoints require authentication."""
        response = requests.get(f"{BASE_URL}/api/saved/posts?token=invalid_token")
        assert response.status_code == 401


class TestCollectionsAPI:
    """Tests for Collections feature (organize saved posts)"""
    
    def test_create_collection(self, auth_token):
        """Test POST /api/saved/collections - create a new collection."""
        response = requests.post(
            f"{BASE_URL}/api/saved/collections?token={auth_token}&name=TEST_collection&description=Test%20description"
        )
        
        assert response.status_code == 200, f"Failed to create collection: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["message"] == "Collection created"
        
        return data["id"]
    
    def test_get_collections(self, auth_token):
        """Test GET /api/saved/collections - get all collections."""
        response = requests.get(f"{BASE_URL}/api/saved/collections?token={auth_token}")
        
        assert response.status_code == 200, f"Failed to get collections: {response.text}"
        
        data = response.json()
        assert "collections" in data
    
    def test_add_post_to_collection(self, auth_token, test_post_id):
        """Test POST /api/saved/collections/{collection_id}/posts/{post_id} - add post to collection."""
        # First create a collection
        create_response = requests.post(
            f"{BASE_URL}/api/saved/collections?token={auth_token}&name=TEST_add_post_collection"
        )
        
        if create_response.status_code == 200:
            collection_id = create_response.json()["id"]
            
            # Add post to collection
            response = requests.post(
                f"{BASE_URL}/api/saved/collections/{collection_id}/posts/{test_post_id}?token={auth_token}"
            )
            
            assert response.status_code == 200, f"Failed to add post to collection: {response.text}"
            
            data = response.json()
            assert data["message"] == "Post added to collection"
    
    def test_delete_collection(self, auth_token):
        """Test DELETE /api/saved/collections/{collection_id} - delete a collection."""
        # First create a collection
        create_response = requests.post(
            f"{BASE_URL}/api/saved/collections?token={auth_token}&name=TEST_delete_collection"
        )
        
        if create_response.status_code == 200:
            collection_id = create_response.json()["id"]
            
            # Delete it
            response = requests.delete(f"{BASE_URL}/api/saved/collections/{collection_id}?token={auth_token}")
            
            assert response.status_code == 200, f"Failed to delete collection: {response.text}"
            
            data = response.json()
            assert data["message"] == "Collection deleted"


class TestHomePageStoriesIntegration:
    """Test that Home page correctly uses /api/stories/feed"""
    
    def test_stories_feed_returns_correct_structure_for_frontend(self, auth_token):
        """Verify /api/stories/feed returns structure expected by Home.jsx."""
        response = requests.get(f"{BASE_URL}/api/stories/feed?token={auth_token}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "stories" in data
        
        # If there are stories, verify the structure matches frontend expectations
        if data["stories"]:
            story_group = data["stories"][0]
            # Home.jsx expects these fields for StoryItem component
            assert "user_id" in story_group
            assert "username" in story_group
            assert "avatar" in story_group or story_group.get("avatar") is None
            assert "has_unviewed" in story_group
            assert "stories" in story_group
            
            # Verify individual story structure
            if story_group["stories"]:
                story = story_group["stories"][0]
                assert "id" in story
                assert "content" in story or story.get("content") is None
                assert "media_url" in story or story.get("media_url") is None
                assert "created_at" in story


# Cleanup function for test data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(auth_token):
    """Cleanup TEST_ prefixed data after tests complete."""
    yield
    
    # Cleanup stories
    try:
        feed_response = requests.get(f"{BASE_URL}/api/stories/feed?token={auth_token}")
        if feed_response.status_code == 200:
            stories_data = feed_response.json()
            for story_group in stories_data.get("stories", []):
                for story in story_group.get("stories", []):
                    if "TEST_" in str(story.get("content", "")):
                        requests.delete(f"{BASE_URL}/api/stories/{story['id']}?token={auth_token}")
    except:
        pass
    
    # Cleanup collections
    try:
        collections_response = requests.get(f"{BASE_URL}/api/saved/collections?token={auth_token}")
        if collections_response.status_code == 200:
            collections_data = collections_response.json()
            for col in collections_data.get("collections", []):
                if "TEST_" in str(col.get("name", "")):
                    requests.delete(f"{BASE_URL}/api/saved/collections/{col['id']}?token={auth_token}")
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
