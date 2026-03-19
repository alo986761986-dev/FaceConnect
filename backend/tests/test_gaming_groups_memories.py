"""
Test Gaming, Groups, and Memories API endpoints
Tests the frontend-backend integration for Gaming, Groups, and Memories pages
All APIs return mock data for newly registered users
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def test_user():
    """Register a new test user and return token"""
    timestamp = int(time.time())
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": f"test_gaming_{timestamp}@test.com",
        "password": "TestPass123!",
        "username": f"testgamer{timestamp}",
        "display_name": "Test Gamer"
    })
    assert response.status_code == 200, f"Registration failed: {response.text}"
    data = response.json()
    assert "token" in data, "Token not in registration response"
    return data["token"]


class TestGamingDiscoverAPI:
    """Tests for /api/gaming/discover endpoint"""
    
    def test_gaming_discover_returns_200(self, test_user):
        """Gaming discover API returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/gaming/discover?token={test_user}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_gaming_discover_returns_games_array(self, test_user):
        """Gaming discover API returns games array"""
        response = requests.get(f"{BASE_URL}/api/gaming/discover?token={test_user}")
        data = response.json()
        assert "games" in data, "Response should contain 'games' key"
        assert isinstance(data["games"], list), "Games should be a list"
        assert len(data["games"]) > 0, "Should return at least one game (mock data)"
    
    def test_gaming_discover_game_structure(self, test_user):
        """Gaming discover API returns properly structured game objects"""
        response = requests.get(f"{BASE_URL}/api/gaming/discover?token={test_user}")
        data = response.json()
        game = data["games"][0]
        
        # Required fields for frontend Gaming.jsx
        required_fields = ["id", "name", "thumbnail", "players", "rating"]
        for field in required_fields:
            assert field in game, f"Game should have '{field}' field"
        
        # Validate data types
        assert isinstance(game["id"], str), "Game id should be string"
        assert isinstance(game["name"], str), "Game name should be string"
        assert isinstance(game["players"], (int, float)), "Game players should be numeric"
        assert isinstance(game["rating"], (int, float)), "Game rating should be numeric"
    
    def test_gaming_discover_invalid_token(self):
        """Gaming discover API rejects invalid token"""
        response = requests.get(f"{BASE_URL}/api/gaming/discover?token=invalid_token")
        assert response.status_code == 401, "Should return 401 for invalid token"


class TestGamingStreamsAPI:
    """Tests for /api/gaming/streams endpoint"""
    
    def test_gaming_streams_returns_200(self, test_user):
        """Gaming streams API returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/gaming/streams?token={test_user}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_gaming_streams_returns_streams_array(self, test_user):
        """Gaming streams API returns streams array"""
        response = requests.get(f"{BASE_URL}/api/gaming/streams?token={test_user}")
        data = response.json()
        assert "streams" in data, "Response should contain 'streams' key"
        assert isinstance(data["streams"], list), "Streams should be a list"
        assert len(data["streams"]) > 0, "Should return at least one stream (mock data)"
    
    def test_gaming_streams_structure(self, test_user):
        """Gaming streams API returns properly structured stream objects"""
        response = requests.get(f"{BASE_URL}/api/gaming/streams?token={test_user}")
        data = response.json()
        stream = data["streams"][0]
        
        # Required fields for frontend Gaming.jsx StreamCard
        required_fields = ["id", "title", "game", "thumbnail", "streamer", "viewers", "is_live"]
        for field in required_fields:
            assert field in stream, f"Stream should have '{field}' field"
        
        # Validate streamer structure
        assert "streamer" in stream, "Stream should have streamer info"
        assert "username" in stream["streamer"], "Streamer should have username"
        assert "display_name" in stream["streamer"], "Streamer should have display_name"
    
    def test_gaming_streams_invalid_token(self):
        """Gaming streams API rejects invalid token"""
        response = requests.get(f"{BASE_URL}/api/gaming/streams?token=invalid_token")
        assert response.status_code == 401, "Should return 401 for invalid token"


class TestSocialGroupsAPI:
    """Tests for /api/social-groups endpoint"""
    
    def test_social_groups_returns_200(self, test_user):
        """Social groups API returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/social-groups?token={test_user}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_social_groups_returns_groups_array(self, test_user):
        """Social groups API returns groups array"""
        response = requests.get(f"{BASE_URL}/api/social-groups?token={test_user}")
        data = response.json()
        assert "groups" in data, "Response should contain 'groups' key"
        assert isinstance(data["groups"], list), "Groups should be a list"
        assert len(data["groups"]) > 0, "Should return at least one group (mock data)"
    
    def test_social_groups_structure(self, test_user):
        """Social groups API returns properly structured group objects"""
        response = requests.get(f"{BASE_URL}/api/social-groups?token={test_user}")
        data = response.json()
        group = data["groups"][0]
        
        # Required fields for frontend Groups.jsx
        required_fields = ["id", "name", "description", "members", "category", "is_private", "is_member"]
        for field in required_fields:
            assert field in group, f"Group should have '{field}' field"
        
        # Validate data types
        assert isinstance(group["id"], str), "Group id should be string"
        assert isinstance(group["name"], str), "Group name should be string"
        assert isinstance(group["members"], (int, float)), "Group members should be numeric"
        assert isinstance(group["is_private"], bool), "is_private should be boolean"
        assert isinstance(group["is_member"], bool), "is_member should be boolean"
    
    def test_social_groups_has_member_groups(self, test_user):
        """Social groups API returns groups where user is a member (mock)"""
        response = requests.get(f"{BASE_URL}/api/social-groups?token={test_user}")
        data = response.json()
        member_groups = [g for g in data["groups"] if g.get("is_member")]
        assert len(member_groups) > 0, "Should have at least one group where user is member (mock data)"
    
    def test_social_groups_invalid_token(self):
        """Social groups API rejects invalid token"""
        response = requests.get(f"{BASE_URL}/api/social-groups?token=invalid_token")
        assert response.status_code == 401, "Should return 401 for invalid token"
    
    def test_social_groups_search(self, test_user):
        """Social groups API supports search parameter"""
        response = requests.get(f"{BASE_URL}/api/social-groups?token={test_user}&search=React")
        assert response.status_code == 200, f"Search should return 200, got {response.status_code}"
        data = response.json()
        # Should filter to React-related groups
        if data["groups"]:
            for group in data["groups"]:
                assert "react" in group["name"].lower(), f"Filtered group should match search: {group['name']}"


class TestMemoriesAPI:
    """Tests for /api/memories endpoint"""
    
    def test_memories_returns_200(self, test_user):
        """Memories API returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/memories?token={test_user}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_memories_returns_memories_array(self, test_user):
        """Memories API returns memories array"""
        response = requests.get(f"{BASE_URL}/api/memories?token={test_user}")
        data = response.json()
        assert "memories" in data, "Response should contain 'memories' key"
        assert isinstance(data["memories"], list), "Memories should be a list"
        assert len(data["memories"]) > 0, "Should return at least one memory (mock data)"
    
    def test_memories_structure(self, test_user):
        """Memories API returns properly structured memory objects"""
        response = requests.get(f"{BASE_URL}/api/memories?token={test_user}")
        data = response.json()
        memory = data["memories"][0]
        
        # Required fields for frontend Memories.jsx MemorySection
        required_fields = ["id", "years_ago", "date", "posts"]
        for field in required_fields:
            assert field in memory, f"Memory should have '{field}' field"
        
        # Validate years_ago
        assert isinstance(memory["years_ago"], int), "years_ago should be integer"
        assert memory["years_ago"] >= 1, "years_ago should be at least 1"
        
        # Validate posts array
        assert isinstance(memory["posts"], list), "posts should be a list"
        assert len(memory["posts"]) > 0, "Should have at least one post in memory"
    
    def test_memories_post_structure(self, test_user):
        """Memories API returns properly structured post objects within memories"""
        response = requests.get(f"{BASE_URL}/api/memories?token={test_user}")
        data = response.json()
        memory = data["memories"][0]
        post = memory["posts"][0]
        
        # Required fields for frontend Memories.jsx
        required_fields = ["id", "content", "likes", "comments", "created_at"]
        for field in required_fields:
            assert field in post, f"Post should have '{field}' field"
        
        # Validate data types
        assert isinstance(post["likes"], (int, float)), "Post likes should be numeric"
        assert isinstance(post["comments"], (int, float)), "Post comments should be numeric"
    
    def test_memories_invalid_token(self):
        """Memories API rejects invalid token"""
        response = requests.get(f"{BASE_URL}/api/memories?token=invalid_token")
        assert response.status_code == 401, "Should return 401 for invalid token"


class TestMockDataIntegration:
    """Integration tests to verify mock data flows correctly to frontend"""
    
    def test_all_apis_return_mock_data_for_new_user(self, test_user):
        """All APIs return mock data for newly registered users"""
        apis = [
            ("Gaming Discover", f"{BASE_URL}/api/gaming/discover?token={test_user}"),
            ("Gaming Streams", f"{BASE_URL}/api/gaming/streams?token={test_user}"),
            ("Social Groups", f"{BASE_URL}/api/social-groups?token={test_user}"),
            ("Memories", f"{BASE_URL}/api/memories?token={test_user}"),
        ]
        
        for name, url in apis:
            response = requests.get(url)
            assert response.status_code == 200, f"{name} API failed: {response.status_code}"
            data = response.json()
            # Each API should have its primary data array
            assert any(key in data for key in ["games", "streams", "groups", "memories"]), \
                f"{name} API should return data array"
    
    def test_mock_data_has_correct_id_format(self, test_user):
        """Mock data uses consistent ID formats"""
        # Gaming games use "game-N" format
        response = requests.get(f"{BASE_URL}/api/gaming/discover?token={test_user}")
        games = response.json()["games"]
        for game in games:
            assert game["id"].startswith("game-"), f"Game ID should start with 'game-': {game['id']}"
        
        # Gaming streams use "stream-N" format  
        response = requests.get(f"{BASE_URL}/api/gaming/streams?token={test_user}")
        streams = response.json()["streams"]
        for stream in streams:
            assert stream["id"].startswith("stream-"), f"Stream ID should start with 'stream-': {stream['id']}"
        
        # Groups use "group-N" format
        response = requests.get(f"{BASE_URL}/api/social-groups?token={test_user}")
        groups = response.json()["groups"]
        for group in groups:
            assert group["id"].startswith("group-"), f"Group ID should start with 'group-': {group['id']}"
        
        # Memories use "memory-N" format
        response = requests.get(f"{BASE_URL}/api/memories?token={test_user}")
        memories = response.json()["memories"]
        for memory in memories:
            assert memory["id"].startswith("memory-"), f"Memory ID should start with 'memory-': {memory['id']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
