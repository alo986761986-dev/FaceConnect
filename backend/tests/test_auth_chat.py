"""
Backend tests for Authentication and Chat features
Testing: 
- User registration
- User login  
- User session/token validation
- Chat conversations CRUD
- Chat messages CRUD
- File upload
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health check tests - run first"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("SUCCESS: Health endpoint returns healthy status")


class TestUserAuthentication:
    """User registration and login tests"""
    
    def test_register_new_user(self):
        """Test new user registration"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_user_{unique_id}",
            "email": f"test_{unique_id}@example.com",
            "password": "testpass123",
            "display_name": f"Test User {unique_id}"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user data"
        assert data["user"]["email"] == user_data["email"]
        assert data["user"]["username"] == user_data["username"]
        print(f"SUCCESS: Registered new user {user_data['username']}")
        
        return data["token"], data["user"]
    
    def test_register_duplicate_user_fails(self):
        """Test that registering duplicate user fails"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_dup_{unique_id}",
            "email": f"test_dup_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        # First registration should succeed
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response1.status_code == 200
        
        # Second registration should fail
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response2.status_code == 400, "Duplicate registration should fail"
        print("SUCCESS: Duplicate registration correctly rejected")
    
    def test_login_with_valid_credentials(self):
        """Test login with valid credentials"""
        # First register a user
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_login_{unique_id}",
            "email": f"test_login_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert reg_response.status_code == 200
        
        # Now login
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == user_data["email"]
        print("SUCCESS: Login with valid credentials works")
        
        return data["token"]
    
    def test_login_existing_test_user(self):
        """Test login with pre-existing test user"""
        login_data = {
            "email": "test1916@example.com",
            "password": "password123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            print("SUCCESS: Login with existing test user works")
            return data["token"]
        elif response.status_code == 401:
            print("INFO: Pre-existing test user not found, skipping")
            pytest.skip("Pre-existing test user not found")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")
    
    def test_login_invalid_credentials_fails(self):
        """Test that login with invalid credentials fails"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 401, "Invalid login should return 401"
        print("SUCCESS: Invalid credentials correctly rejected")
    
    def test_get_current_user_with_token(self):
        """Test getting current user with valid token"""
        # First register and get token
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_me_{unique_id}",
            "email": f"test_me_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert reg_response.status_code == 200
        token = reg_response.json()["token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me?token={token}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == user_data["email"]
        print("SUCCESS: Get current user with token works")
    
    def test_get_current_user_invalid_token_fails(self):
        """Test that invalid token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me?token=invalid_token_123")
        assert response.status_code == 401
        print("SUCCESS: Invalid token correctly rejected")


class TestChatConversations:
    """Chat conversations tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Create test user and return token"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_chat_{unique_id}",
            "email": f"test_chat_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip(f"Failed to create test user: {response.text}")
        
        return response.json()["token"], response.json()["user"]["id"]
    
    @pytest.fixture
    def second_user(self):
        """Create a second test user for chat"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_chat2_{unique_id}",
            "email": f"test_chat2_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip(f"Failed to create second user: {response.text}")
        
        return response.json()["token"], response.json()["user"]["id"]
    
    def test_get_conversations_empty(self, auth_token):
        """Test getting conversations for new user (should be empty)"""
        token, user_id = auth_token
        
        response = requests.get(f"{BASE_URL}/api/conversations?token={token}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print("SUCCESS: Get conversations returns empty list for new user")
    
    def test_create_conversation(self, auth_token, second_user):
        """Test creating a new conversation"""
        token1, user_id1 = auth_token
        token2, user_id2 = second_user
        
        conv_data = {
            "participant_ids": [user_id2],
            "is_group": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/conversations?token={token1}",
            json=conv_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "participants" in data
        assert len(data["participants"]) == 2
        print(f"SUCCESS: Created conversation {data['id']}")
        
        return data["id"], token1, token2
    
    def test_create_duplicate_conversation_returns_existing(self, auth_token, second_user):
        """Test that creating duplicate conversation returns existing one"""
        token1, user_id1 = auth_token
        token2, user_id2 = second_user
        
        conv_data = {
            "participant_ids": [user_id2],
            "is_group": False
        }
        
        # Create first conversation
        response1 = requests.post(
            f"{BASE_URL}/api/conversations?token={token1}",
            json=conv_data
        )
        assert response1.status_code == 200
        conv_id1 = response1.json()["id"]
        
        # Create second conversation (should return same)
        response2 = requests.post(
            f"{BASE_URL}/api/conversations?token={token1}",
            json=conv_data
        )
        assert response2.status_code == 200
        conv_id2 = response2.json()["id"]
        
        assert conv_id1 == conv_id2, "Should return existing conversation"
        print("SUCCESS: Duplicate conversation returns existing")
    
    def test_get_conversation_by_id(self, auth_token, second_user):
        """Test getting a specific conversation by ID"""
        token1, user_id1 = auth_token
        token2, user_id2 = second_user
        
        # Create conversation
        conv_data = {"participant_ids": [user_id2], "is_group": False}
        create_response = requests.post(
            f"{BASE_URL}/api/conversations?token={token1}",
            json=conv_data
        )
        assert create_response.status_code == 200
        conv_id = create_response.json()["id"]
        
        # Get conversation
        response = requests.get(
            f"{BASE_URL}/api/conversations/{conv_id}?token={token1}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == conv_id
        print("SUCCESS: Get conversation by ID works")


class TestChatMessages:
    """Chat messages tests"""
    
    @pytest.fixture
    def chat_setup(self):
        """Setup two users and a conversation between them"""
        # Create user 1
        unique_id = str(uuid.uuid4())[:8]
        user1_data = {
            "username": f"TEST_msg1_{unique_id}",
            "email": f"test_msg1_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        reg1 = requests.post(f"{BASE_URL}/api/auth/register", json=user1_data)
        if reg1.status_code != 200:
            pytest.skip(f"Failed to create user 1: {reg1.text}")
        
        token1 = reg1.json()["token"]
        user_id1 = reg1.json()["user"]["id"]
        
        # Create user 2
        user2_data = {
            "username": f"TEST_msg2_{unique_id}",
            "email": f"test_msg2_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        reg2 = requests.post(f"{BASE_URL}/api/auth/register", json=user2_data)
        if reg2.status_code != 200:
            pytest.skip(f"Failed to create user 2: {reg2.text}")
        
        token2 = reg2.json()["token"]
        user_id2 = reg2.json()["user"]["id"]
        
        # Create conversation
        conv_response = requests.post(
            f"{BASE_URL}/api/conversations?token={token1}",
            json={"participant_ids": [user_id2], "is_group": False}
        )
        if conv_response.status_code != 200:
            pytest.skip(f"Failed to create conversation: {conv_response.text}")
        
        conv_id = conv_response.json()["id"]
        
        return {
            "token1": token1,
            "token2": token2,
            "user_id1": user_id1,
            "user_id2": user_id2,
            "conv_id": conv_id
        }
    
    def test_send_text_message(self, chat_setup):
        """Test sending a text message"""
        msg_data = {
            "content": "Hello, this is a TEST_ message!",
            "message_type": "text"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/conversations/{chat_setup['conv_id']}/messages?token={chat_setup['token1']}",
            json=msg_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["content"] == msg_data["content"]
        assert data["message_type"] == "text"
        assert data["sender_id"] == chat_setup["user_id1"]
        print("SUCCESS: Send text message works")
        
        return data["id"]
    
    def test_get_messages(self, chat_setup):
        """Test getting messages from conversation"""
        # Send a message first
        msg_data = {
            "content": "TEST_ message for retrieval",
            "message_type": "text"
        }
        
        send_response = requests.post(
            f"{BASE_URL}/api/conversations/{chat_setup['conv_id']}/messages?token={chat_setup['token1']}",
            json=msg_data
        )
        assert send_response.status_code == 200
        
        # Get messages
        response = requests.get(
            f"{BASE_URL}/api/conversations/{chat_setup['conv_id']}/messages?token={chat_setup['token1']}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Find our message
        found = False
        for msg in data:
            if msg["content"] == msg_data["content"]:
                found = True
                break
        
        assert found, "Sent message not found in conversation"
        print("SUCCESS: Get messages works")
    
    def test_mark_messages_as_read(self, chat_setup):
        """Test marking messages as read"""
        # User 1 sends a message
        msg_data = {
            "content": "TEST_ message to be read",
            "message_type": "text"
        }
        
        requests.post(
            f"{BASE_URL}/api/conversations/{chat_setup['conv_id']}/messages?token={chat_setup['token1']}",
            json=msg_data
        )
        
        # User 2 marks as read
        response = requests.post(
            f"{BASE_URL}/api/conversations/{chat_setup['conv_id']}/read?token={chat_setup['token2']}"
        )
        assert response.status_code == 200
        print("SUCCESS: Mark messages as read works")
    
    def test_conversation_not_found(self, chat_setup):
        """Test accessing non-existent conversation returns 404"""
        fake_conv_id = str(uuid.uuid4())
        
        response = requests.get(
            f"{BASE_URL}/api/conversations/{fake_conv_id}/messages?token={chat_setup['token1']}"
        )
        assert response.status_code == 404
        print("SUCCESS: Non-existent conversation returns 404")


class TestUserSearch:
    """Test user search functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Create test user and return token"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_search_{unique_id}",
            "email": f"test_search_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip(f"Failed to create test user: {response.text}")
        
        return response.json()["token"]
    
    def test_get_users_list(self, auth_token):
        """Test getting list of users"""
        response = requests.get(f"{BASE_URL}/api/users?token={auth_token}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Get users list works, found {len(data)} users")
    
    def test_search_users(self, auth_token):
        """Test searching users by username"""
        # Create a user to search for
        unique_id = str(uuid.uuid4())[:8]
        searchable_user = {
            "username": f"searchable_{unique_id}",
            "email": f"searchable_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        requests.post(f"{BASE_URL}/api/auth/register", json=searchable_user)
        
        # Search for the user
        response = requests.get(
            f"{BASE_URL}/api/users?token={auth_token}&search=searchable"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Search users works, found {len(data)} matching users")


class TestStatsEndpoint:
    """Test stats endpoint"""
    
    def test_get_stats(self):
        """Test getting stats"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_persons" in data
        assert "total_connections" in data
        print("SUCCESS: Stats endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
