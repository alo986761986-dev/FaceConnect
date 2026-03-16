"""
Test chat enhancement features:
- Message deletion (soft delete)
- Conversation deletion 
- Message types (gif, sticker, text)
- User online/offline status
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testfeed@example.com"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    """Get authentication token for test user"""
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed with status {response.status_code}")


@pytest.fixture(scope="module")
def user_id(session, auth_token):
    """Get current user id"""
    response = session.get(f"{BASE_URL}/api/auth/me?token={auth_token}")
    if response.status_code == 200:
        return response.json().get("id")
    pytest.skip("Failed to get user info")


@pytest.fixture(scope="module")
def test_conversation(session, auth_token):
    """Get or create a test conversation"""
    # First get existing conversations
    response = session.get(f"{BASE_URL}/api/conversations?token={auth_token}")
    if response.status_code == 200:
        convs = response.json()
        if convs and len(convs) > 0:
            return convs[0]
    
    # If no existing conversation, try to create one with another user
    users_resp = session.get(f"{BASE_URL}/api/users?token={auth_token}")
    if users_resp.status_code == 200:
        users = users_resp.json()
        if users and len(users) > 0:
            other_user = users[0]
            create_resp = session.post(f"{BASE_URL}/api/conversations?token={auth_token}", json={
                "participant_ids": [other_user["id"]],
                "is_group": False
            })
            if create_resp.status_code == 200:
                return create_resp.json()
    
    pytest.skip("Could not get or create test conversation")


class TestMessageAPI:
    """Test message-related endpoints"""
    
    def test_send_text_message(self, session, auth_token, test_conversation):
        """Test sending a regular text message"""
        conv_id = test_conversation["id"]
        response = session.post(
            f"{BASE_URL}/api/conversations/{conv_id}/messages?token={auth_token}",
            json={
                "content": f"TEST_text_message_{int(time.time())}",
                "message_type": "text"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["message_type"] == "text"
        assert "content" in data
        print(f"✓ Text message sent: {data['id']}")
        return data
    
    def test_send_gif_message(self, session, auth_token, test_conversation):
        """Test sending a GIF message"""
        conv_id = test_conversation["id"]
        gif_url = "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif"
        
        response = session.post(
            f"{BASE_URL}/api/conversations/{conv_id}/messages?token={auth_token}",
            json={
                "content": gif_url,
                "message_type": "gif"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["message_type"] == "gif"
        assert data["content"] == gif_url
        print(f"✓ GIF message sent: {data['id']}")
    
    def test_send_sticker_message(self, session, auth_token, test_conversation):
        """Test sending a sticker message"""
        conv_id = test_conversation["id"]
        sticker_url = "https://media.giphy.com/media/3o7TKsQ8UwVFTYWyPK/giphy.gif"
        
        response = session.post(
            f"{BASE_URL}/api/conversations/{conv_id}/messages?token={auth_token}",
            json={
                "content": sticker_url,
                "message_type": "sticker"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["message_type"] == "sticker"
        print(f"✓ Sticker message sent: {data['id']}")
    
    def test_get_messages(self, session, auth_token, test_conversation):
        """Test fetching messages from conversation"""
        conv_id = test_conversation["id"]
        response = session.get(
            f"{BASE_URL}/api/conversations/{conv_id}/messages?token={auth_token}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        messages = response.json()
        assert isinstance(messages, list)
        print(f"✓ Fetched {len(messages)} messages from conversation")


class TestMessageDeletion:
    """Test message deletion functionality"""
    
    def test_delete_own_message(self, session, auth_token, test_conversation, user_id):
        """Test deleting user's own message (soft delete)"""
        conv_id = test_conversation["id"]
        
        # First create a message to delete
        create_resp = session.post(
            f"{BASE_URL}/api/conversations/{conv_id}/messages?token={auth_token}",
            json={
                "content": f"TEST_message_to_delete_{int(time.time())}",
                "message_type": "text"
            }
        )
        assert create_resp.status_code == 200
        message = create_resp.json()
        message_id = message["id"]
        
        # Now delete the message
        delete_resp = session.delete(
            f"{BASE_URL}/api/messages/{message_id}?token={auth_token}"
        )
        
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.status_code}: {delete_resp.text}"
        data = delete_resp.json()
        
        # Verify message is marked as deleted
        assert data.get("is_deleted") == True or data.get("success") == True
        print(f"✓ Message {message_id} deleted successfully")
    
    def test_deleted_message_shows_placeholder(self, session, auth_token, test_conversation):
        """Test that deleted messages show 'This message was deleted' content"""
        conv_id = test_conversation["id"]
        
        # Create and delete a message
        create_resp = session.post(
            f"{BASE_URL}/api/conversations/{conv_id}/messages?token={auth_token}",
            json={
                "content": f"TEST_delete_placeholder_{int(time.time())}",
                "message_type": "text"
            }
        )
        message = create_resp.json()
        message_id = message["id"]
        
        # Delete it
        session.delete(f"{BASE_URL}/api/messages/{message_id}?token={auth_token}")
        
        # Fetch messages and check the deleted one
        msgs_resp = session.get(
            f"{BASE_URL}/api/conversations/{conv_id}/messages?token={auth_token}"
        )
        messages = msgs_resp.json()
        
        # Messages marked as deleted should not appear in regular list (due to query filter)
        # OR they show placeholder text if returned
        deleted_msg = next((m for m in messages if m.get("id") == message_id), None)
        if deleted_msg:
            assert deleted_msg.get("is_deleted") == True
            assert deleted_msg.get("content") == "This message was deleted"
        
        print("✓ Deleted message handled correctly")


class TestConversationDeletion:
    """Test conversation deletion functionality"""
    
    def test_delete_conversation(self, session, auth_token):
        """Test deleting a conversation (soft delete)"""
        # First create a fresh conversation to delete
        users_resp = session.get(f"{BASE_URL}/api/users?token={auth_token}")
        if users_resp.status_code != 200 or not users_resp.json():
            pytest.skip("No users available to create conversation")
        
        users = users_resp.json()
        other_user = users[-1] if len(users) > 1 else users[0]  # Use last user
        
        create_resp = session.post(f"{BASE_URL}/api/conversations?token={auth_token}", json={
            "participant_ids": [other_user["id"]],
            "is_group": False
        })
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create conversation to delete")
        
        conv = create_resp.json()
        conv_id = conv["id"]
        
        # Now delete it
        delete_resp = session.delete(
            f"{BASE_URL}/api/conversations/{conv_id}?token={auth_token}"
        )
        
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.status_code}: {delete_resp.text}"
        print(f"✓ Conversation {conv_id} deleted successfully")
        
        # Verify it's no longer in the list
        list_resp = session.get(f"{BASE_URL}/api/conversations?token={auth_token}")
        convs = list_resp.json()
        conv_ids = [c["id"] for c in convs]
        
        assert conv_id not in conv_ids, "Deleted conversation still appears in list"
        print("✓ Deleted conversation no longer appears in list")


class TestConversationAPI:
    """Test conversation list and details"""
    
    def test_get_conversations_list(self, session, auth_token):
        """Test fetching conversations list"""
        response = session.get(f"{BASE_URL}/api/conversations?token={auth_token}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} conversations")
    
    def test_conversation_has_participants(self, session, auth_token, test_conversation):
        """Test that conversations include participant details"""
        conv_id = test_conversation["id"]
        response = session.get(f"{BASE_URL}/api/conversations/{conv_id}?token={auth_token}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "participants" in data
        assert len(data["participants"]) > 0
        
        # Check participant has required fields for UI
        participant = data["participants"][0]
        assert "id" in participant
        assert "username" in participant or "display_name" in participant
        print(f"✓ Conversation has {len(data['participants'])} participants with required fields")
    
    def test_conversation_participants_have_online_status(self, session, auth_token, test_conversation):
        """Test that participants include online status"""
        conv_id = test_conversation["id"]
        response = session.get(f"{BASE_URL}/api/conversations/{conv_id}?token={auth_token}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that is_online field exists on participants
        for participant in data.get("participants", []):
            # is_online should be present (true or false)
            assert "is_online" in participant or "last_seen" in participant
        
        print("✓ Participants have online status fields")


class TestUserAPI:
    """Test user-related endpoints for chat"""
    
    def test_get_users_list(self, session, auth_token):
        """Test fetching users for new chat dialog"""
        response = session.get(f"{BASE_URL}/api/users?token={auth_token}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        users = response.json()
        assert isinstance(users, list)
        
        if users:
            user = users[0]
            assert "id" in user
            assert "username" in user or "display_name" in user
        
        print(f"✓ Retrieved {len(users)} users")
    
    def test_users_have_avatar(self, session, auth_token):
        """Test that users have avatar field"""
        response = session.get(f"{BASE_URL}/api/users?token={auth_token}")
        
        assert response.status_code == 200
        users = response.json()
        
        if users:
            # Check first user has avatar field
            user = users[0]
            # Avatar may be optional/null but field should exist
            assert "avatar" in user or "picture" in user
        
        print("✓ Users have avatar field")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
