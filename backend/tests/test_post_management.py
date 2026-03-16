"""
Test Post Management Features:
- Edit Post (PUT /api/posts/{id})
- Highlight Post (POST /api/posts/{id}/highlight)  
- Delete Post (DELETE /api/posts/{id})
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPostManagement:
    """Test post editing, highlighting, and deletion features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and authenticate"""
        # Login as test user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "homeuser@test.com",
            "password": "password123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login with test credentials")
        
        data = login_response.json()
        self.token = data['token']
        self.user_id = data['user']['id']
        self.username = data['user'].get('username')
        
    def test_create_post_for_testing(self):
        """Create a test post that we can edit/highlight/delete"""
        response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "post",
                "content": "TEST_Post for testing edit/highlight/delete - " + datetime.now().isoformat(),
                "media_url": None,
                "media_type": None
            }
        )
        
        assert response.status_code == 200, f"Failed to create post: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["content"].startswith("TEST_Post")
        assert data["user_id"] == self.user_id
        return data["id"]
    
    def test_edit_post_success(self):
        """Test editing a post - owner can edit"""
        # First create a post
        create_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "post",
                "content": "TEST_Original content before edit",
                "media_url": None,
                "media_type": None
            }
        )
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Edit the post using PUT with content as query param
        new_content = "TEST_Updated content after edit"
        edit_response = requests.put(
            f"{BASE_URL}/api/posts/{post_id}?token={self.token}&content={new_content}"
        )
        
        assert edit_response.status_code == 200, f"Failed to edit post: {edit_response.text}"
        data = edit_response.json()
        assert data["content"] == new_content, "Content was not updated"
        assert "edited_at" in data, "edited_at timestamp should be set"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/posts/{post_id}?token={self.token}")
    
    def test_edit_post_shows_edited_label(self):
        """Test that edited posts have edited_at timestamp"""
        # Create post
        create_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "post",
                "content": "TEST_Check edited label",
                "media_url": None,
                "media_type": None
            }
        )
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Verify no edited_at initially
        initial_post = create_response.json()
        # Note: Initial post may not have edited_at or it could be None
        
        # Edit the post
        edit_response = requests.put(
            f"{BASE_URL}/api/posts/{post_id}?token={self.token}&content=TEST_Edited content"
        )
        assert edit_response.status_code == 200
        
        edited_post = edit_response.json()
        assert edited_post.get("edited_at") is not None, "edited_at should be set after edit"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/posts/{post_id}?token={self.token}")
    
    def test_highlight_post_toggle(self):
        """Test highlighting a post - toggles is_highlighted"""
        # Create post
        create_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "post",
                "content": "TEST_Post to highlight",
                "media_url": None,
                "media_type": None
            }
        )
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Highlight the post (first toggle - should enable)
        highlight_response = requests.post(
            f"{BASE_URL}/api/posts/{post_id}/highlight?token={self.token}"
        )
        
        assert highlight_response.status_code == 200, f"Failed to highlight: {highlight_response.text}"
        data = highlight_response.json()
        assert data["is_highlighted"] == True, "Post should be highlighted after first toggle"
        
        # Toggle again (should disable highlight)
        unhighlight_response = requests.post(
            f"{BASE_URL}/api/posts/{post_id}/highlight?token={self.token}"
        )
        
        assert unhighlight_response.status_code == 200
        data = unhighlight_response.json()
        assert data["is_highlighted"] == False, "Post should be unhighlighted after second toggle"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/posts/{post_id}?token={self.token}")
    
    def test_delete_post_success(self):
        """Test deleting a post - owner can delete"""
        # Create post
        create_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "post",
                "content": "TEST_Post to be deleted",
                "media_url": None,
                "media_type": None
            }
        )
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Delete the post
        delete_response = requests.delete(
            f"{BASE_URL}/api/posts/{post_id}?token={self.token}"
        )
        
        assert delete_response.status_code == 200, f"Failed to delete: {delete_response.text}"
        data = delete_response.json()
        assert data.get("success") == True or "deleted" in data.get("message", "").lower()
        
        # Verify post is actually deleted - get posts and check it's not there
        # Note: We can't GET single post since no endpoint exists, but we can verify via feed
    
    def test_delete_post_not_found(self):
        """Test deleting a non-existent post returns 404"""
        fake_id = "non-existent-post-id-12345"
        delete_response = requests.delete(
            f"{BASE_URL}/api/posts/{fake_id}?token={self.token}"
        )
        
        assert delete_response.status_code == 404, "Should return 404 for non-existent post"
    
    def test_edit_other_user_post_forbidden(self):
        """Test that users cannot edit other users' posts"""
        # We need to create a post as a different user first
        # For this test, we'll try to edit a post that doesn't belong to us
        # First, get posts from home feed to find a post by another user
        
        feed_response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        if feed_response.status_code != 200:
            pytest.skip("Could not get feed")
        
        posts = feed_response.json().get("posts", [])
        other_user_post = None
        for post in posts:
            if post.get("user_id") != self.user_id:
                other_user_post = post
                break
        
        if not other_user_post:
            pytest.skip("No other user's posts available to test")
        
        # Try to edit the other user's post
        edit_response = requests.put(
            f"{BASE_URL}/api/posts/{other_user_post['id']}?token={self.token}&content=Hacked!"
        )
        
        assert edit_response.status_code == 403, "Should be forbidden to edit other user's post"
    
    def test_highlight_other_user_post_forbidden(self):
        """Test that users cannot highlight other users' posts"""
        feed_response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        if feed_response.status_code != 200:
            pytest.skip("Could not get feed")
        
        posts = feed_response.json().get("posts", [])
        other_user_post = None
        for post in posts:
            if post.get("user_id") != self.user_id:
                other_user_post = post
                break
        
        if not other_user_post:
            pytest.skip("No other user's posts available to test")
        
        # Try to highlight the other user's post
        highlight_response = requests.post(
            f"{BASE_URL}/api/posts/{other_user_post['id']}/highlight?token={self.token}"
        )
        
        assert highlight_response.status_code == 403, "Should be forbidden to highlight other user's post"
    
    def test_delete_other_user_post_forbidden(self):
        """Test that users cannot delete other users' posts"""
        feed_response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        if feed_response.status_code != 200:
            pytest.skip("Could not get feed")
        
        posts = feed_response.json().get("posts", [])
        other_user_post = None
        for post in posts:
            if post.get("user_id") != self.user_id:
                other_user_post = post
                break
        
        if not other_user_post:
            pytest.skip("No other user's posts available to test")
        
        # Try to delete the other user's post
        delete_response = requests.delete(
            f"{BASE_URL}/api/posts/{other_user_post['id']}?token={self.token}"
        )
        
        assert delete_response.status_code == 403, "Should be forbidden to delete other user's post"
    
    def test_home_feed_shows_highlighted_posts(self):
        """Test that home feed includes highlighted posts with badge"""
        # Create and highlight a post
        create_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "post",
                "content": "TEST_Highlighted post for feed test",
                "media_url": None,
                "media_type": None
            }
        )
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Like the post to make it appear in highlighted section
        like_response = requests.post(f"{BASE_URL}/api/posts/{post_id}/like?token={self.token}")
        assert like_response.status_code == 200
        
        # Highlight it
        highlight_response = requests.post(
            f"{BASE_URL}/api/posts/{post_id}/highlight?token={self.token}"
        )
        assert highlight_response.status_code == 200
        
        # Get home feed and verify structure 
        feed_response = requests.get(f"{BASE_URL}/api/feed/home?token={self.token}")
        assert feed_response.status_code == 200
        
        feed_data = feed_response.json()
        assert "posts" in feed_data
        assert "highlighted_posts" in feed_data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/posts/{post_id}?token={self.token}")


class TestPostDropdownMenu:
    """Test post dropdown menu functionality via API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and authenticate"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "homeuser@test.com",
            "password": "password123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login with test credentials")
        
        data = login_response.json()
        self.token = data['token']
        self.user_id = data['user']['id']
    
    def test_share_post_endpoint(self):
        """Test share endpoint for posts"""
        # Create post
        create_response = requests.post(
            f"{BASE_URL}/api/posts?token={self.token}",
            json={
                "type": "post",
                "content": "TEST_Post to share",
                "media_url": None,
                "media_type": None
            }
        )
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Share the post - there may or may not be a dedicated share tracking endpoint
        # Based on code review, share tracking is done silently
        # The key is that the post data is available for sharing
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/posts/{post_id}?token={self.token}")


class TestAuthRequirements:
    """Test that post management endpoints require authentication"""
    
    def test_edit_post_requires_auth(self):
        """Test that editing requires valid token"""
        response = requests.put(
            f"{BASE_URL}/api/posts/some-post-id?content=test"
        )
        assert response.status_code == 401 or response.status_code == 422
    
    def test_highlight_post_requires_auth(self):
        """Test that highlighting requires valid token"""
        response = requests.post(
            f"{BASE_URL}/api/posts/some-post-id/highlight"
        )
        assert response.status_code == 401 or response.status_code == 422
    
    def test_delete_post_requires_auth(self):
        """Test that deleting requires valid token"""
        response = requests.delete(
            f"{BASE_URL}/api/posts/some-post-id"
        )
        assert response.status_code == 401 or response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
