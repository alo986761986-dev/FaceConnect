"""
Profile and Notifications API Tests
Tests for:
- Profile API: GET/PUT /api/profile/me, avatar/cover upload, friends, posts
- Notifications API: GET, mark read, delete notifications
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from main agent
TEST_TOKEN = "kCLbmeFcgFGwK3g0-TGb7-rihY9-J9DpJRZGCa8LTD8"


class TestProfileAPI:
    """Profile endpoint tests"""
    
    def test_get_my_profile(self):
        """GET /api/profile/me - Get current user profile"""
        response = requests.get(f"{BASE_URL}/api/profile/me?token={TEST_TOKEN}")
        print(f"GET /api/profile/me - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Profile data: {data}")
        
        # Validate required fields exist
        assert "id" in data, "Profile should have 'id' field"
        assert "username" in data, "Profile should have 'username' field"
        assert "email" in data, "Profile should have 'email' field"
        assert "friends_count" in data, "Profile should have 'friends_count' field"
        assert "posts_count" in data, "Profile should have 'posts_count' field"
        
        # Validate data types
        assert isinstance(data["friends_count"], int), "friends_count should be int"
        assert isinstance(data["posts_count"], int), "posts_count should be int"
        
        print(f"✓ Profile retrieved: {data.get('display_name') or data.get('username')}")
    
    def test_get_profile_unauthorized(self):
        """GET /api/profile/me - Should fail with invalid token"""
        response = requests.get(f"{BASE_URL}/api/profile/me?token=invalid_token_123")
        print(f"GET /api/profile/me (invalid token) - Status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized access properly rejected")
    
    def test_update_profile(self):
        """PUT /api/profile/me - Update profile fields"""
        update_data = {
            "bio": "Test bio update from pytest",
            "location": "Test City",
            "hometown": "Test Hometown",
            "relationship": "Single"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/profile/me?token={TEST_TOKEN}",
            json=update_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"PUT /api/profile/me - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Updated profile: {data}")
        
        # Verify update was applied
        assert data.get("bio") == update_data["bio"], "Bio should be updated"
        assert data.get("location") == update_data["location"], "Location should be updated"
        
        # Verify by GET
        verify_response = requests.get(f"{BASE_URL}/api/profile/me?token={TEST_TOKEN}")
        verify_data = verify_response.json()
        assert verify_data.get("bio") == update_data["bio"], "Bio should persist after GET"
        
        print("✓ Profile updated and verified")
    
    def test_get_my_friends(self):
        """GET /api/profile/me/friends - Get friends list"""
        response = requests.get(f"{BASE_URL}/api/profile/me/friends?token={TEST_TOKEN}&limit=10")
        print(f"GET /api/profile/me/friends - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Friends list: {data}")
        
        # Should return a list
        assert isinstance(data, list), "Friends should be a list"
        
        # If friends exist, validate structure
        if len(data) > 0:
            friend = data[0]
            assert "id" in friend, "Friend should have 'id'"
            assert "username" in friend, "Friend should have 'username'"
            print(f"✓ Found {len(data)} friends")
        else:
            print("✓ Friends list returned (empty)")
    
    def test_get_my_posts(self):
        """GET /api/profile/me/posts - Get user's posts"""
        response = requests.get(f"{BASE_URL}/api/profile/me/posts?token={TEST_TOKEN}&limit=10")
        print(f"GET /api/profile/me/posts - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Posts list: {data}")
        
        # Should return a list
        assert isinstance(data, list), "Posts should be a list"
        
        # If posts exist, validate structure
        if len(data) > 0:
            post = data[0]
            assert "id" in post, "Post should have 'id'"
            assert "author_id" in post, "Post should have 'author_id'"
            assert "created_at" in post, "Post should have 'created_at'"
            print(f"✓ Found {len(data)} posts")
        else:
            print("✓ Posts list returned (empty)")
    
    def test_get_mutual_friends(self):
        """GET /api/profile/me/mutual-friends - Get mutual friends suggestions"""
        response = requests.get(f"{BASE_URL}/api/profile/me/mutual-friends?token={TEST_TOKEN}&limit=5")
        print(f"GET /api/profile/me/mutual-friends - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Mutual friends: {data}")
        
        # Should return a list
        assert isinstance(data, list), "Mutual friends should be a list"
        print(f"✓ Mutual friends returned ({len(data)} suggestions)")
    
    def test_avatar_upload_endpoint_exists(self):
        """POST /api/profile/avatar - Test endpoint exists (without actual file)"""
        # Create a small test image (1x1 pixel PNG)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test.png', io.BytesIO(png_data), 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/profile/avatar?token={TEST_TOKEN}",
            files=files
        )
        print(f"POST /api/profile/avatar - Status: {response.status_code}")
        
        # Should accept the upload (200) or reject for valid reasons (400 for size/type)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "avatar" in data or "message" in data, "Response should have avatar URL or message"
            print("✓ Avatar upload successful")
        else:
            print(f"✓ Avatar upload endpoint exists (rejected: {response.text})")
    
    def test_cover_upload_endpoint_exists(self):
        """POST /api/profile/cover - Test endpoint exists (without actual file)"""
        # Create a small test image (1x1 pixel PNG)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test.png', io.BytesIO(png_data), 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/profile/cover?token={TEST_TOKEN}",
            files=files
        )
        print(f"POST /api/profile/cover - Status: {response.status_code}")
        
        # Should accept the upload (200) or reject for valid reasons (400 for size/type)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "cover_photo" in data or "message" in data, "Response should have cover_photo URL or message"
            print("✓ Cover upload successful")
        else:
            print(f"✓ Cover upload endpoint exists (rejected: {response.text})")


class TestNotificationsAPI:
    """Notifications endpoint tests"""
    
    def test_get_notifications(self):
        """GET /api/notifications - Get user notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications?token={TEST_TOKEN}&limit=50")
        print(f"GET /api/notifications - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Notifications response: {data}")
        
        # Should have notifications array and unread_count
        assert "notifications" in data, "Response should have 'notifications' field"
        assert "unread_count" in data, "Response should have 'unread_count' field"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        assert isinstance(data["unread_count"], int), "unread_count should be int"
        
        print(f"✓ Got {len(data['notifications'])} notifications, {data['unread_count']} unread")
    
    def test_get_notifications_unauthorized(self):
        """GET /api/notifications - Should fail with invalid token"""
        response = requests.get(f"{BASE_URL}/api/notifications?token=invalid_token_123")
        print(f"GET /api/notifications (invalid token) - Status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized access properly rejected")
    
    def test_get_unread_count(self):
        """GET /api/notifications/unread-count - Get unread notification count"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count?token={TEST_TOKEN}")
        print(f"GET /api/notifications/unread-count - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Unread count: {data}")
        
        assert "unread_count" in data, "Response should have 'unread_count'"
        assert isinstance(data["unread_count"], int), "unread_count should be int"
        
        print(f"✓ Unread count: {data['unread_count']}")
    
    def test_mark_all_read(self):
        """POST /api/notifications/read-all - Mark all notifications as read"""
        response = requests.post(f"{BASE_URL}/api/notifications/read-all?token={TEST_TOKEN}")
        print(f"POST /api/notifications/read-all - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Mark all read response: {data}")
        
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, "success should be True"
        
        # Verify unread count is now 0
        verify_response = requests.get(f"{BASE_URL}/api/notifications/unread-count?token={TEST_TOKEN}")
        verify_data = verify_response.json()
        assert verify_data["unread_count"] == 0, "Unread count should be 0 after mark all read"
        
        print("✓ All notifications marked as read")
    
    def test_mark_single_notification_read(self):
        """POST /api/notifications/{id}/read - Mark single notification as read"""
        # First get notifications to find an ID
        get_response = requests.get(f"{BASE_URL}/api/notifications?token={TEST_TOKEN}&limit=1")
        notifications = get_response.json().get("notifications", [])
        
        if len(notifications) == 0:
            pytest.skip("No notifications to test mark as read")
        
        notif_id = notifications[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/notifications/{notif_id}/read?token={TEST_TOKEN}")
        print(f"POST /api/notifications/{notif_id}/read - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        
        print(f"✓ Notification {notif_id} marked as read")
    
    def test_delete_notification(self):
        """DELETE /api/notifications/{id} - Delete a notification"""
        # First get notifications to find an ID
        get_response = requests.get(f"{BASE_URL}/api/notifications?token={TEST_TOKEN}&limit=1")
        notifications = get_response.json().get("notifications", [])
        
        if len(notifications) == 0:
            pytest.skip("No notifications to test delete")
        
        notif_id = notifications[0]["id"]
        
        response = requests.delete(f"{BASE_URL}/api/notifications/{notif_id}?token={TEST_TOKEN}")
        print(f"DELETE /api/notifications/{notif_id} - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        
        # Verify notification is deleted
        verify_response = requests.get(f"{BASE_URL}/api/notifications?token={TEST_TOKEN}&limit=50")
        verify_notifications = verify_response.json().get("notifications", [])
        deleted_ids = [n["id"] for n in verify_notifications]
        assert notif_id not in deleted_ids, "Deleted notification should not appear in list"
        
        print(f"✓ Notification {notif_id} deleted")
    
    def test_delete_nonexistent_notification(self):
        """DELETE /api/notifications/{id} - Should return 404 for non-existent notification"""
        response = requests.delete(f"{BASE_URL}/api/notifications/nonexistent-id-12345?token={TEST_TOKEN}")
        print(f"DELETE /api/notifications/nonexistent - Status: {response.status_code}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent notification properly returns 404")


class TestProfileNotificationsIntegration:
    """Integration tests for Profile and Notifications"""
    
    def test_profile_api_returns_correct_structure(self):
        """Verify profile API returns all expected fields for frontend"""
        response = requests.get(f"{BASE_URL}/api/profile/me?token={TEST_TOKEN}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Fields expected by Profile.jsx
        expected_fields = [
            "id", "username", "email", "display_name", "bio", "avatar",
            "cover_photo", "location", "hometown", "birthday", "relationship",
            "language", "instagram_handle", "instagram_url", "friends_count",
            "posts_count", "verified", "created_at"
        ]
        
        for field in expected_fields:
            assert field in data, f"Profile should have '{field}' field for frontend"
        
        print(f"✓ Profile API returns all {len(expected_fields)} expected fields")
    
    def test_notifications_api_returns_correct_structure(self):
        """Verify notifications API returns all expected fields for frontend"""
        response = requests.get(f"{BASE_URL}/api/notifications?token={TEST_TOKEN}&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        
        # Top-level fields
        assert "notifications" in data
        assert "unread_count" in data
        
        # If notifications exist, check structure
        if len(data["notifications"]) > 0:
            notif = data["notifications"][0]
            expected_fields = [
                "id", "type", "actor_id", "is_read", "created_at"
            ]
            for field in expected_fields:
                assert field in notif, f"Notification should have '{field}' field"
        
        print("✓ Notifications API returns correct structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
