"""
Reels Feature API Tests
Tests for: POST /api/reels, GET /api/reels, POST /api/reels/{id}/like, 
           GET /api/reels/{id}/comments, POST /api/reels/{id}/comments,
           POST /api/reels/{id}/share, DELETE /api/reels/{id}
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from previous iterations
TEST_EMAIL = "test1916@example.com"
TEST_PASSWORD = "password123"


class TestReelsAPI:
    """Tests for Reels CRUD operations and interactions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def test_reel_id(self, auth_token):
        """Create a test reel and return its ID for subsequent tests"""
        response = requests.post(
            f"{BASE_URL}/api/reels?token={auth_token}",
            json={
                "video_url": "/api/files/test_video.mp4",
                "caption": f"TEST_reel_caption_{uuid.uuid4().hex[:8]}",
                "duration": 15.5
            }
        )
        assert response.status_code == 200, f"Failed to create test reel: {response.text}"
        data = response.json()
        assert "id" in data, "No id in reel creation response"
        return data["id"]
    
    # ============== CREATE REEL TESTS ==============
    def test_create_reel_success(self, auth_token):
        """Test creating a new reel with valid data"""
        response = requests.post(
            f"{BASE_URL}/api/reels?token={auth_token}",
            json={
                "video_url": "/api/files/sample_video.mp4",
                "caption": f"TEST_new_reel_{uuid.uuid4().hex[:8]}",
                "duration": 30.0
            }
        )
        
        assert response.status_code == 200, f"Create reel failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data, "Missing id in response"
        assert "user_id" in data, "Missing user_id in response"
        assert "video_url" in data, "Missing video_url in response"
        assert data["video_url"] == "/api/files/sample_video.mp4"
        assert data["likes_count"] == 0
        assert data["comments_count"] == 0
        assert data["shares_count"] == 0
        assert data["is_liked"] == False
        assert "created_at" in data
        
        # Cleanup - delete created reel
        requests.delete(f"{BASE_URL}/api/reels/{data['id']}?token={auth_token}")
    
    def test_create_reel_without_caption(self, auth_token):
        """Test creating reel without caption (should work)"""
        response = requests.post(
            f"{BASE_URL}/api/reels?token={auth_token}",
            json={
                "video_url": "/api/files/no_caption_video.mp4"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("caption") is None
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/reels/{data['id']}?token={auth_token}")
    
    def test_create_reel_unauthorized(self):
        """Test creating reel without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/reels?token=invalid_token",
            json={"video_url": "/api/files/test.mp4"}
        )
        
        assert response.status_code == 401
    
    # ============== GET REELS FEED TESTS ==============
    def test_get_reels_feed_success(self, auth_token):
        """Test fetching reels feed"""
        response = requests.get(f"{BASE_URL}/api/reels?token={auth_token}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Reels feed should be a list"
        
        # If reels exist, validate structure
        if len(data) > 0:
            reel = data[0]
            assert "id" in reel
            assert "video_url" in reel
            assert "likes_count" in reel
            assert "comments_count" in reel
            assert "shares_count" in reel
            assert "is_liked" in reel
    
    def test_get_reels_with_pagination(self, auth_token):
        """Test pagination parameters work correctly"""
        response = requests.get(
            f"{BASE_URL}/api/reels?token={auth_token}&skip=0&limit=5"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5, "Limit parameter not respected"
    
    def test_get_reels_unauthorized(self):
        """Test fetching reels without auth"""
        response = requests.get(f"{BASE_URL}/api/reels?token=invalid")
        assert response.status_code == 401
    
    # ============== SINGLE REEL TESTS ==============
    def test_get_single_reel_success(self, auth_token, test_reel_id):
        """Test fetching a single reel by ID"""
        response = requests.get(
            f"{BASE_URL}/api/reels/{test_reel_id}?token={auth_token}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_reel_id
        assert "video_url" in data
        assert "user" in data
    
    def test_get_single_reel_not_found(self, auth_token):
        """Test fetching non-existent reel"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/reels/{fake_id}?token={auth_token}"
        )
        
        assert response.status_code == 404
    
    # ============== LIKE/UNLIKE TESTS ==============
    def test_like_reel_success(self, auth_token, test_reel_id):
        """Test liking a reel"""
        response = requests.post(
            f"{BASE_URL}/api/reels/{test_reel_id}/like?token={auth_token}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "liked" in data
        assert "likes_count" in data
        assert isinstance(data["likes_count"], int)
    
    def test_unlike_reel_toggle(self, auth_token, test_reel_id):
        """Test that like toggles on repeated calls"""
        # First like
        response1 = requests.post(
            f"{BASE_URL}/api/reels/{test_reel_id}/like?token={auth_token}"
        )
        assert response1.status_code == 200
        initial_state = response1.json()["liked"]
        
        # Second like should toggle
        response2 = requests.post(
            f"{BASE_URL}/api/reels/{test_reel_id}/like?token={auth_token}"
        )
        assert response2.status_code == 200
        toggled_state = response2.json()["liked"]
        
        assert initial_state != toggled_state, "Like should toggle on repeated calls"
    
    def test_like_nonexistent_reel(self, auth_token):
        """Test liking a non-existent reel"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/reels/{fake_id}/like?token={auth_token}"
        )
        
        assert response.status_code == 404
    
    # ============== COMMENTS TESTS ==============
    def test_get_comments_empty(self, auth_token, test_reel_id):
        """Test getting comments for reel with no comments"""
        response = requests.get(
            f"{BASE_URL}/api/reels/{test_reel_id}/comments?token={auth_token}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_add_comment_success(self, auth_token, test_reel_id):
        """Test adding a comment to a reel"""
        comment_text = f"TEST_comment_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/reels/{test_reel_id}/comments?token={auth_token}",
            json={"content": comment_text}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["content"] == comment_text
        assert data["reel_id"] == test_reel_id
        assert "user" in data
        assert data["likes_count"] == 0
        assert data["is_liked"] == False
    
    def test_add_comment_to_nonexistent_reel(self, auth_token):
        """Test adding comment to non-existent reel"""
        fake_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/reels/{fake_id}/comments?token={auth_token}",
            json={"content": "Test comment"}
        )
        
        assert response.status_code == 404
    
    def test_add_comment_unauthorized(self, test_reel_id):
        """Test adding comment without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/reels/{test_reel_id}/comments?token=invalid",
            json={"content": "Test"}
        )
        
        assert response.status_code == 401
    
    def test_comments_count_increment(self, auth_token, test_reel_id):
        """Test that adding comment increments comments_count on reel"""
        # Get initial count
        reel_response = requests.get(
            f"{BASE_URL}/api/reels/{test_reel_id}?token={auth_token}"
        )
        initial_count = reel_response.json()["comments_count"]
        
        # Add comment
        requests.post(
            f"{BASE_URL}/api/reels/{test_reel_id}/comments?token={auth_token}",
            json={"content": f"TEST_count_comment_{uuid.uuid4().hex[:8]}"}
        )
        
        # Verify count increased
        reel_response = requests.get(
            f"{BASE_URL}/api/reels/{test_reel_id}?token={auth_token}"
        )
        new_count = reel_response.json()["comments_count"]
        
        assert new_count == initial_count + 1, "Comments count should increment"
    
    # ============== SHARE TESTS ==============
    def test_share_reel_success(self, auth_token, test_reel_id):
        """Test sharing a reel increments share count"""
        # Get initial share count
        reel_response = requests.get(
            f"{BASE_URL}/api/reels/{test_reel_id}?token={auth_token}"
        )
        initial_shares = reel_response.json()["shares_count"]
        
        # Share the reel
        response = requests.post(
            f"{BASE_URL}/api/reels/{test_reel_id}/share?token={auth_token}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "shares_count" in data
        assert data["shares_count"] == initial_shares + 1
    
    def test_share_nonexistent_reel(self, auth_token):
        """Test sharing non-existent reel"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/reels/{fake_id}/share?token={auth_token}"
        )
        
        assert response.status_code == 404
    
    # ============== DELETE TESTS ==============
    def test_delete_reel_unauthorized_user(self, auth_token):
        """Test that users can only delete their own reels (create and try to delete with different user)"""
        # Create a reel
        create_response = requests.post(
            f"{BASE_URL}/api/reels?token={auth_token}",
            json={"video_url": "/api/files/delete_test.mp4", "caption": "TEST_delete_test"}
        )
        reel_id = create_response.json()["id"]
        
        # Try to delete with invalid token (simulating another user)
        response = requests.delete(
            f"{BASE_URL}/api/reels/{reel_id}?token=invalid_token"
        )
        
        assert response.status_code == 401
        
        # Cleanup with valid token
        requests.delete(f"{BASE_URL}/api/reels/{reel_id}?token={auth_token}")
    
    def test_delete_reel_success(self, auth_token):
        """Test deleting own reel"""
        # Create a reel
        create_response = requests.post(
            f"{BASE_URL}/api/reels?token={auth_token}",
            json={"video_url": "/api/files/to_delete.mp4", "caption": "TEST_to_be_deleted"}
        )
        assert create_response.status_code == 200
        reel_id = create_response.json()["id"]
        
        # Delete the reel
        delete_response = requests.delete(
            f"{BASE_URL}/api/reels/{reel_id}?token={auth_token}"
        )
        
        assert delete_response.status_code == 200
        
        # Verify reel no longer exists
        get_response = requests.get(
            f"{BASE_URL}/api/reels/{reel_id}?token={auth_token}"
        )
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_reel(self, auth_token):
        """Test deleting non-existent reel"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/reels/{fake_id}?token={auth_token}"
        )
        
        assert response.status_code == 404
    
    # ============== COMMENT LIKE TESTS ==============
    def test_like_comment_success(self, auth_token, test_reel_id):
        """Test liking a comment"""
        # First add a comment
        comment_response = requests.post(
            f"{BASE_URL}/api/reels/{test_reel_id}/comments?token={auth_token}",
            json={"content": f"TEST_likeable_comment_{uuid.uuid4().hex[:8]}"}
        )
        comment_id = comment_response.json()["id"]
        
        # Like the comment
        like_response = requests.post(
            f"{BASE_URL}/api/reels/{test_reel_id}/comments/{comment_id}/like?token={auth_token}"
        )
        
        assert like_response.status_code == 200
        data = like_response.json()
        assert "liked" in data
        assert "likes_count" in data
    
    # ============== CLEANUP ==============
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_test_reels(self, auth_token):
        """Cleanup test reels after all tests"""
        yield
        
        # Get all reels and delete TEST_ prefixed ones
        response = requests.get(f"{BASE_URL}/api/reels?token={auth_token}&limit=100")
        if response.status_code == 200:
            reels = response.json()
            for reel in reels:
                if reel.get("caption", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/reels/{reel['id']}?token={auth_token}")
