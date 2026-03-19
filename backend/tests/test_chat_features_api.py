"""
Test Chat Features API - Block, Mute, Archive, Star, Nickname endpoints
Also tests Gaming, Marketplace, and Watch feed APIs

This file tests the new chat feature routes from /app/backend/routes/chat_features.py
along with gaming, marketplace, and watch APIs.
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSetup:
    """Setup helper for test fixtures"""
    
    @staticmethod
    def create_test_user():
        """Create a test user and return token"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_chat_{unique_id}",
            "email": f"test_chat_{unique_id}@example.com",
            "password": "TestPass123!",
            "display_name": f"Test User {unique_id}"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            return data.get("token"), data.get("user", {}).get("id"), user_data
        return None, None, None

    @staticmethod
    def login_test_user():
        """Login with the test user from the test request"""
        login_data = {
            "email": "chattest@test.com",
            "password": "Test123!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            return data.get("token"), data.get("user", {}).get("id")
        # If user doesn't exist, create it
        user_data = {
            "username": "chattest",
            "email": "chattest@test.com",
            "password": "Test123!",
            "display_name": "Chat Test User"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            return data.get("token"), data.get("user", {}).get("id")
        return None, None


class TestBlockFeatures:
    """Test Block/Unblock user functionality"""
    
    def test_block_user(self):
        """Test blocking a user"""
        # Create main user
        token, user_id, _ = TestSetup.create_test_user()
        assert token is not None, "Failed to create test user"
        
        # Create another user to block
        _, target_id, _ = TestSetup.create_test_user()
        assert target_id is not None, "Failed to create target user"
        
        # Block the target user
        response = requests.post(
            f"{BASE_URL}/api/chat/block?token={token}",
            json={"user_id": target_id}
        )
        
        assert response.status_code == 200, f"Block user failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("message") == "User blocked"
        print(f"SUCCESS: Blocked user {target_id}")
    
    def test_block_user_already_blocked(self):
        """Test blocking an already blocked user fails"""
        token, user_id, _ = TestSetup.create_test_user()
        _, target_id, _ = TestSetup.create_test_user()
        
        # Block first time
        requests.post(
            f"{BASE_URL}/api/chat/block?token={token}",
            json={"user_id": target_id}
        )
        
        # Try to block again
        response = requests.post(
            f"{BASE_URL}/api/chat/block?token={token}",
            json={"user_id": target_id}
        )
        
        assert response.status_code == 400, "Should fail when blocking already blocked user"
        print("SUCCESS: Cannot block already blocked user")
    
    def test_cannot_block_self(self):
        """Test that user cannot block themselves"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.post(
            f"{BASE_URL}/api/chat/block?token={token}",
            json={"user_id": user_id}
        )
        
        assert response.status_code == 400, "Should fail when blocking self"
        print("SUCCESS: Cannot block self")
    
    def test_unblock_user(self):
        """Test unblocking a user"""
        token, user_id, _ = TestSetup.create_test_user()
        _, target_id, _ = TestSetup.create_test_user()
        
        # Block first
        requests.post(
            f"{BASE_URL}/api/chat/block?token={token}",
            json={"user_id": target_id}
        )
        
        # Now unblock
        response = requests.post(
            f"{BASE_URL}/api/chat/unblock?token={token}",
            json={"user_id": target_id}
        )
        
        assert response.status_code == 200, f"Unblock failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("SUCCESS: Unblocked user")
    
    def test_get_blocked_users_list(self):
        """Test getting list of blocked users"""
        token, user_id, _ = TestSetup.create_test_user()
        _, target_id, _ = TestSetup.create_test_user()
        
        # Block a user
        requests.post(
            f"{BASE_URL}/api/chat/block?token={token}",
            json={"user_id": target_id}
        )
        
        # Get blocked list
        response = requests.get(f"{BASE_URL}/api/chat/blocked?token={token}")
        
        assert response.status_code == 200, f"Get blocked list failed: {response.text}"
        data = response.json()
        assert "blocked_users" in data
        assert isinstance(data["blocked_users"], list)
        print(f"SUCCESS: Got blocked users list with {len(data['blocked_users'])} users")
    
    def test_block_invalid_token(self):
        """Test block with invalid token returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/chat/block?token=invalid_token",
            json={"user_id": "some_id"}
        )
        assert response.status_code == 401, "Invalid token should return 401"
        print("SUCCESS: Invalid token rejected with 401")


class TestMuteFeatures:
    """Test Mute/Unmute conversation functionality"""
    
    def test_mute_conversation_forever(self):
        """Test muting a conversation forever"""
        token, user_id, _ = TestSetup.create_test_user()
        conversation_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/chat/mute?token={token}",
            json={"conversation_id": conversation_id, "duration": "forever"}
        )
        
        assert response.status_code == 200, f"Mute failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("mute_until") is None  # forever has no expiry
        print("SUCCESS: Muted conversation forever")
    
    def test_mute_conversation_8h(self):
        """Test muting a conversation for 8 hours"""
        token, user_id, _ = TestSetup.create_test_user()
        conversation_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/chat/mute?token={token}",
            json={"conversation_id": conversation_id, "duration": "8h"}
        )
        
        assert response.status_code == 200, f"Mute failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("mute_until") is not None  # Should have expiry
        print(f"SUCCESS: Muted conversation for 8h, expires at {data.get('mute_until')}")
    
    def test_mute_conversation_1w(self):
        """Test muting a conversation for 1 week"""
        token, user_id, _ = TestSetup.create_test_user()
        conversation_id = str(uuid.uuid4())
        
        response = requests.post(
            f"{BASE_URL}/api/chat/mute?token={token}",
            json={"conversation_id": conversation_id, "duration": "1w"}
        )
        
        assert response.status_code == 200, f"Mute failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("mute_until") is not None
        print(f"SUCCESS: Muted conversation for 1 week")
    
    def test_unmute_conversation(self):
        """Test unmuting a conversation"""
        token, user_id, _ = TestSetup.create_test_user()
        conversation_id = str(uuid.uuid4())
        
        # Mute first
        requests.post(
            f"{BASE_URL}/api/chat/mute?token={token}",
            json={"conversation_id": conversation_id}
        )
        
        # Unmute
        response = requests.post(
            f"{BASE_URL}/api/chat/unmute?token={token}",
            json={"conversation_id": conversation_id}
        )
        
        assert response.status_code == 200, f"Unmute failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("SUCCESS: Unmuted conversation")
    
    def test_get_muted_conversations(self):
        """Test getting list of muted conversations"""
        token, user_id, _ = TestSetup.create_test_user()
        conversation_id = str(uuid.uuid4())
        
        # Mute a conversation
        requests.post(
            f"{BASE_URL}/api/chat/mute?token={token}",
            json={"conversation_id": conversation_id}
        )
        
        # Get muted list
        response = requests.get(f"{BASE_URL}/api/chat/muted?token={token}")
        
        assert response.status_code == 200, f"Get muted list failed: {response.text}"
        data = response.json()
        assert "muted_conversations" in data
        assert isinstance(data["muted_conversations"], list)
        print(f"SUCCESS: Got muted conversations list with {len(data['muted_conversations'])} items")
    
    def test_mute_invalid_token(self):
        """Test mute with invalid token returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/chat/mute?token=invalid_token",
            json={"conversation_id": "some_id"}
        )
        assert response.status_code == 401, "Invalid token should return 401"
        print("SUCCESS: Invalid token rejected with 401")


class TestArchiveFeatures:
    """Test Archive/Unarchive conversation functionality"""
    
    def test_archive_conversation(self):
        """Test archiving a conversation - requires real conversation"""
        token, user_id, _ = TestSetup.create_test_user()
        _, other_user_id, _ = TestSetup.create_test_user()
        
        # Create a conversation first
        response = requests.post(
            f"{BASE_URL}/api/conversations?token={token}",
            json={"participant_ids": [other_user_id], "is_group": False}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create test conversation")
        
        conversation_id = response.json().get("id")
        
        # Archive the conversation
        response = requests.post(
            f"{BASE_URL}/api/chat/archive?token={token}",
            json={"conversation_id": conversation_id}
        )
        
        assert response.status_code == 200, f"Archive failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("archived") == True
        print(f"SUCCESS: Archived conversation {conversation_id}")
    
    def test_archive_nonexistent_conversation(self):
        """Test archiving a non-existent conversation fails"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.post(
            f"{BASE_URL}/api/chat/archive?token={token}",
            json={"conversation_id": "nonexistent_conv_id"}
        )
        
        assert response.status_code == 404, "Should fail for non-existent conversation"
        print("SUCCESS: Non-existent conversation returns 404")
    
    def test_unarchive_conversation(self):
        """Test unarchiving a conversation"""
        token, user_id, _ = TestSetup.create_test_user()
        _, other_user_id, _ = TestSetup.create_test_user()
        
        # Create conversation
        response = requests.post(
            f"{BASE_URL}/api/conversations?token={token}",
            json={"participant_ids": [other_user_id], "is_group": False}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create test conversation")
        
        conversation_id = response.json().get("id")
        
        # Archive first
        requests.post(
            f"{BASE_URL}/api/chat/archive?token={token}",
            json={"conversation_id": conversation_id}
        )
        
        # Unarchive
        response = requests.post(
            f"{BASE_URL}/api/chat/unarchive?token={token}",
            json={"conversation_id": conversation_id}
        )
        
        assert response.status_code == 200, f"Unarchive failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("SUCCESS: Unarchived conversation")
    
    def test_get_archived_conversations(self):
        """Test getting list of archived conversations"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(f"{BASE_URL}/api/chat/archived?token={token}")
        
        assert response.status_code == 200, f"Get archived list failed: {response.text}"
        data = response.json()
        assert "conversations" in data
        assert isinstance(data["conversations"], list)
        print(f"SUCCESS: Got archived conversations list with {len(data['conversations'])} items")
    
    def test_archive_invalid_token(self):
        """Test archive with invalid token returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/chat/archive?token=invalid_token",
            json={"conversation_id": "some_id"}
        )
        assert response.status_code == 401, "Invalid token should return 401"
        print("SUCCESS: Invalid token rejected with 401")


class TestStarFeatures:
    """Test Star/Unstar message functionality"""
    
    def test_star_message_not_found(self):
        """Test starring a non-existent message fails"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.post(
            f"{BASE_URL}/api/chat/star?token={token}",
            json={"message_id": "nonexistent_msg_id"}
        )
        
        assert response.status_code == 404, "Non-existent message should return 404"
        print("SUCCESS: Non-existent message returns 404")
    
    def test_unstar_message(self):
        """Test unstarring a message (even if not starred)"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.post(
            f"{BASE_URL}/api/chat/unstar?token={token}",
            json={"message_id": "some_message_id"}
        )
        
        assert response.status_code == 200, f"Unstar failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        # was_starred should be False if message wasn't starred
        print("SUCCESS: Unstar endpoint works correctly")
    
    def test_get_starred_messages(self):
        """Test getting list of starred messages"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(f"{BASE_URL}/api/chat/starred?token={token}")
        
        assert response.status_code == 200, f"Get starred list failed: {response.text}"
        data = response.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)
        print(f"SUCCESS: Got starred messages list with {len(data['messages'])} items")
    
    def test_star_invalid_token(self):
        """Test star with invalid token returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/chat/star?token=invalid_token",
            json={"message_id": "some_id"}
        )
        assert response.status_code == 401, "Invalid token should return 401"
        print("SUCCESS: Invalid token rejected with 401")


class TestNicknameFeatures:
    """Test Nickname functionality for users in conversations"""
    
    def test_set_nickname_conversation_not_found(self):
        """Test setting nickname for non-existent conversation fails"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.post(
            f"{BASE_URL}/api/chat/nickname?token={token}",
            json={
                "conversation_id": "nonexistent_conv",
                "user_id": "some_user",
                "nickname": "TestNick"
            }
        )
        
        assert response.status_code == 404, "Non-existent conversation should return 404"
        print("SUCCESS: Non-existent conversation returns 404")
    
    def test_set_nickname_valid_conversation(self):
        """Test setting nickname for a valid conversation"""
        token, user_id, _ = TestSetup.create_test_user()
        _, other_user_id, _ = TestSetup.create_test_user()
        
        # Create conversation
        response = requests.post(
            f"{BASE_URL}/api/conversations?token={token}",
            json={"participant_ids": [other_user_id], "is_group": False}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create test conversation")
        
        conversation_id = response.json().get("id")
        
        # Set nickname
        response = requests.post(
            f"{BASE_URL}/api/chat/nickname?token={token}",
            json={
                "conversation_id": conversation_id,
                "user_id": other_user_id,
                "nickname": "TestNickname"
            }
        )
        
        assert response.status_code == 200, f"Set nickname failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("nickname") == "TestNickname"
        print("SUCCESS: Set nickname for user in conversation")
    
    def test_nickname_invalid_token(self):
        """Test nickname with invalid token returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/chat/nickname?token=invalid_token",
            json={
                "conversation_id": "some_conv",
                "user_id": "some_user",
                "nickname": "Nick"
            }
        )
        assert response.status_code == 401, "Invalid token should return 401"
        print("SUCCESS: Invalid token rejected with 401")


class TestGamingAPI:
    """Test Gaming API endpoints"""
    
    def test_gaming_discover_returns_games(self):
        """Test gaming discover endpoint returns games list"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(f"{BASE_URL}/api/gaming/discover?token={token}")
        
        assert response.status_code == 200, f"Gaming discover failed: {response.text}"
        data = response.json()
        assert "games" in data
        assert isinstance(data["games"], list)
        
        # Check game structure if games exist
        if len(data["games"]) > 0:
            game = data["games"][0]
            assert "id" in game
            assert "name" in game
            print(f"SUCCESS: Gaming discover returned {len(data['games'])} games")
        else:
            print("SUCCESS: Gaming discover returned empty games list (mock data)")
    
    def test_gaming_discover_with_genre_filter(self):
        """Test gaming discover with genre filter"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(
            f"{BASE_URL}/api/gaming/discover?token={token}&genre=action"
        )
        
        assert response.status_code == 200, f"Gaming discover with filter failed: {response.text}"
        print("SUCCESS: Gaming discover with genre filter works")
    
    def test_gaming_discover_invalid_token(self):
        """Test gaming discover with invalid token returns 401"""
        response = requests.get(f"{BASE_URL}/api/gaming/discover?token=invalid_token")
        assert response.status_code == 401, "Invalid token should return 401"
        print("SUCCESS: Invalid token rejected with 401")
    
    def test_gaming_genres(self):
        """Test getting gaming genres"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(f"{BASE_URL}/api/gaming/genres?token={token}")
        
        assert response.status_code == 200, f"Gaming genres failed: {response.text}"
        data = response.json()
        assert "genres" in data
        assert isinstance(data["genres"], list)
        assert len(data["genres"]) > 0
        print(f"SUCCESS: Got {len(data['genres'])} gaming genres")
    
    def test_gaming_streams(self):
        """Test getting gaming streams"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(f"{BASE_URL}/api/gaming/streams?token={token}")
        
        assert response.status_code == 200, f"Gaming streams failed: {response.text}"
        data = response.json()
        assert "streams" in data
        assert isinstance(data["streams"], list)
        print(f"SUCCESS: Gaming streams returned {len(data['streams'])} streams")


class TestMarketplaceAPI:
    """Test Marketplace API endpoints"""
    
    def test_marketplace_listings(self):
        """Test marketplace listings endpoint"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(f"{BASE_URL}/api/marketplace/listings?token={token}")
        
        assert response.status_code == 200, f"Marketplace listings failed: {response.text}"
        data = response.json()
        assert "listings" in data
        assert isinstance(data["listings"], list)
        print(f"SUCCESS: Marketplace listings returned {len(data['listings'])} items")
    
    def test_marketplace_categories(self):
        """Test marketplace categories endpoint"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(f"{BASE_URL}/api/marketplace/categories?token={token}")
        
        assert response.status_code == 200, f"Marketplace categories failed: {response.text}"
        data = response.json()
        assert "categories" in data
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) > 0
        print(f"SUCCESS: Got {len(data['categories'])} marketplace categories")
    
    def test_marketplace_listings_with_filters(self):
        """Test marketplace listings with category filter"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(
            f"{BASE_URL}/api/marketplace/listings?token={token}&category=electronics"
        )
        
        assert response.status_code == 200, f"Marketplace listings with filter failed: {response.text}"
        print("SUCCESS: Marketplace listings with category filter works")
    
    def test_marketplace_invalid_token(self):
        """Test marketplace with invalid token returns 401"""
        response = requests.get(f"{BASE_URL}/api/marketplace/listings?token=invalid_token")
        assert response.status_code == 401, "Invalid token should return 401"
        print("SUCCESS: Invalid token rejected with 401")


class TestWatchAPI:
    """Test Watch/Video API endpoints"""
    
    def test_watch_feed(self):
        """Test watch feed endpoint"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(f"{BASE_URL}/api/watch/feed?token={token}")
        
        assert response.status_code == 200, f"Watch feed failed: {response.text}"
        data = response.json()
        assert "videos" in data
        assert isinstance(data["videos"], list)
        print(f"SUCCESS: Watch feed returned {len(data['videos'])} videos")
    
    def test_watch_categories(self):
        """Test watch categories endpoint"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(f"{BASE_URL}/api/watch/categories?token={token}")
        
        assert response.status_code == 200, f"Watch categories failed: {response.text}"
        data = response.json()
        assert "categories" in data
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) > 0
        print(f"SUCCESS: Got {len(data['categories'])} watch categories")
    
    def test_watch_feed_with_category(self):
        """Test watch feed with category filter"""
        token, user_id, _ = TestSetup.create_test_user()
        
        response = requests.get(
            f"{BASE_URL}/api/watch/feed?token={token}&category=gaming"
        )
        
        assert response.status_code == 200, f"Watch feed with filter failed: {response.text}"
        print("SUCCESS: Watch feed with category filter works")
    
    def test_watch_invalid_token(self):
        """Test watch with invalid token returns 401"""
        response = requests.get(f"{BASE_URL}/api/watch/feed?token=invalid_token")
        assert response.status_code == 401, "Invalid token should return 401"
        print("SUCCESS: Invalid token rejected with 401")


class TestAuthAndHealthCheck:
    """Test basic auth and health check"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("SUCCESS: Health check passed")
    
    def test_existing_user_login(self):
        """Test login with the chattest@test.com user"""
        token, user_id = TestSetup.login_test_user()
        assert token is not None, "Failed to login/create test user"
        assert user_id is not None, "Failed to get user_id"
        print(f"SUCCESS: Logged in as user {user_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
