"""
Test cases for Data Export and Face Comparison APIs.
- Export endpoints: /api/export/profile, /api/export/posts, /api/export/conversations, /api/export/all
- Face Comparison endpoints: /api/face-compare/compare, /api/face-compare/history, /api/face-compare/threshold-info
"""
import pytest
import requests
import os
import json
import random

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "testrefactor1@test.com"
TEST_USER_PASSWORD = "test123"


class TestAuthentication:
    """Get authentication token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]


class TestDataExportAPIs(TestAuthentication):
    """Test Data Export endpoints - /api/export/*"""
    
    # ===== Profile Export Tests =====
    def test_export_profile_json(self, auth_token):
        """Test profile export in JSON format"""
        response = requests.get(f"{BASE_URL}/api/export/profile", params={
            "token": auth_token,
            "format": "json"
        })
        assert response.status_code == 200, f"Profile export failed: {response.text}"
        
        data = response.json()
        assert "profile" in data, "Missing 'profile' key in response"
        assert "stats" in data, "Missing 'stats' key in response"
        assert "exported_at" in data, "Missing 'exported_at' key in response"
        
        profile = data["profile"]
        assert "id" in profile, "Missing 'id' in profile"
        assert "username" in profile, "Missing 'username' in profile"
        assert "email" in profile, "Missing 'email' in profile"
        print(f"Profile export JSON: username={profile.get('username')}")
    
    def test_export_profile_csv(self, auth_token):
        """Test profile export in CSV format"""
        response = requests.get(f"{BASE_URL}/api/export/profile", params={
            "token": auth_token,
            "format": "csv"
        })
        assert response.status_code == 200, f"CSV export failed: {response.status_code}"
        
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type, f"Expected CSV content-type, got: {content_type}"
        
        content = response.text
        assert len(content) > 0, "CSV content is empty"
        # CSV should have headers on first line
        lines = content.strip().split("\n")
        assert len(lines) >= 2, "CSV should have header and data rows"
        print(f"Profile CSV export: {len(lines)} lines, headers: {lines[0][:100]}...")
    
    def test_export_profile_pdf(self, auth_token):
        """Test profile export in PDF/HTML format"""
        response = requests.get(f"{BASE_URL}/api/export/profile", params={
            "token": auth_token,
            "format": "pdf"
        })
        assert response.status_code == 200, f"PDF export failed: {response.status_code}"
        
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML content-type, got: {content_type}"
        
        content = response.text
        assert "<!DOCTYPE html>" in content, "Missing HTML doctype"
        assert "FaceConnect" in content, "Missing FaceConnect branding"
        print(f"Profile PDF/HTML export: {len(content)} chars")
    
    def test_export_profile_invalid_token(self):
        """Test profile export with invalid token returns 401"""
        response = requests.get(f"{BASE_URL}/api/export/profile", params={
            "token": "invalid_token_123",
            "format": "json"
        })
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
    
    # ===== Posts Export Tests =====
    def test_export_posts_json(self, auth_token):
        """Test posts export in JSON format"""
        response = requests.get(f"{BASE_URL}/api/export/posts", params={
            "token": auth_token,
            "format": "json"
        })
        assert response.status_code == 200, f"Posts export failed: {response.text}"
        
        data = response.json()
        assert "posts" in data, "Missing 'posts' key in response"
        assert "total_posts" in data, "Missing 'total_posts' key"
        assert "exported_at" in data, "Missing 'exported_at' key"
        
        # Validate post structure if there are posts
        if data["posts"]:
            post = data["posts"][0]
            assert "id" in post, "Missing 'id' in post"
            assert "content" in post or post.get("content") is not None, "Post should have content field"
        print(f"Posts export JSON: {data['total_posts']} posts")
    
    def test_export_posts_csv(self, auth_token):
        """Test posts export in CSV format"""
        response = requests.get(f"{BASE_URL}/api/export/posts", params={
            "token": auth_token,
            "format": "csv"
        })
        assert response.status_code == 200, f"Posts CSV export failed: {response.status_code}"
        
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type, f"Expected CSV content-type, got: {content_type}"
        print(f"Posts CSV export successful: {len(response.text)} chars")
    
    def test_export_posts_pdf(self, auth_token):
        """Test posts export in PDF/HTML format"""
        response = requests.get(f"{BASE_URL}/api/export/posts", params={
            "token": auth_token,
            "format": "pdf"
        })
        assert response.status_code == 200, f"Posts PDF export failed: {response.status_code}"
        
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML content-type, got: {content_type}"
        print(f"Posts PDF/HTML export successful: {len(response.text)} chars")
    
    # ===== Conversations Export Tests =====
    def test_export_conversations_json(self, auth_token):
        """Test conversations export in JSON format"""
        response = requests.get(f"{BASE_URL}/api/export/conversations", params={
            "token": auth_token,
            "format": "json"
        })
        assert response.status_code == 200, f"Conversations export failed: {response.text}"
        
        data = response.json()
        assert "conversations" in data, "Missing 'conversations' key"
        assert "total_conversations" in data, "Missing 'total_conversations' key"
        assert "exported_at" in data, "Missing 'exported_at' key"
        
        # Validate conversation structure if there are conversations
        if data["conversations"]:
            conv = data["conversations"][0]
            assert "id" in conv, "Missing 'id' in conversation"
            assert "participants" in conv, "Missing 'participants' in conversation"
            assert "messages" in conv, "Missing 'messages' in conversation"
        print(f"Conversations export JSON: {data['total_conversations']} conversations")
    
    def test_export_conversations_csv(self, auth_token):
        """Test conversations export in CSV format"""
        response = requests.get(f"{BASE_URL}/api/export/conversations", params={
            "token": auth_token,
            "format": "csv"
        })
        assert response.status_code == 200, f"Conversations CSV export failed"
        
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type
        print(f"Conversations CSV export successful")
    
    def test_export_conversations_pdf(self, auth_token):
        """Test conversations export in PDF/HTML format"""
        response = requests.get(f"{BASE_URL}/api/export/conversations", params={
            "token": auth_token,
            "format": "pdf"
        })
        assert response.status_code == 200, f"Conversations PDF export failed"
        
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type
        print(f"Conversations PDF/HTML export successful")
    
    # ===== Complete Export Tests =====
    def test_export_all_json(self, auth_token):
        """Test complete data export (GDPR) in JSON format"""
        response = requests.get(f"{BASE_URL}/api/export/all", params={
            "token": auth_token,
            "format": "json"
        })
        assert response.status_code == 200, f"Complete export failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Missing 'user' key"
        assert "profile" in data, "Missing 'profile' key"
        assert "conversations" in data, "Missing 'conversations' key"
        assert "posts" in data, "Missing 'posts' key"
        assert "friends" in data, "Missing 'friends' key"
        assert "exported_at" in data, "Missing 'exported_at' key"
        assert "data_request_type" in data, "Missing 'data_request_type' key"
        assert data["data_request_type"] == "GDPR_EXPORT", "Should be GDPR_EXPORT type"
        
        user = data["user"]
        assert "id" in user, "Missing 'id' in user data"
        assert "username" in user, "Missing 'username' in user data"
        print(f"Complete export JSON: user={user.get('username')}, GDPR compliant")
    
    def test_export_all_pdf(self, auth_token):
        """Test complete data export in PDF/HTML format"""
        response = requests.get(f"{BASE_URL}/api/export/all", params={
            "token": auth_token,
            "format": "pdf"
        })
        assert response.status_code == 200, f"Complete PDF export failed"
        
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type
        assert "FaceConnect" in response.text
        print(f"Complete PDF/HTML export successful")
    
    def test_export_all_invalid_token(self):
        """Test complete export with invalid token returns 401"""
        response = requests.get(f"{BASE_URL}/api/export/all", params={
            "token": "invalid_token",
            "format": "json"
        })
        assert response.status_code == 401


class TestFaceComparisonAPIs(TestAuthentication):
    """Test Face Comparison endpoints - /api/face-compare/*"""
    
    # ===== Threshold Info Tests =====
    def test_threshold_info(self):
        """Test threshold info endpoint (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/face-compare/threshold-info")
        assert response.status_code == 200, f"Threshold info failed: {response.text}"
        
        data = response.json()
        assert "default_threshold" in data, "Missing 'default_threshold'"
        assert "thresholds" in data, "Missing 'thresholds'"
        assert "confidence_levels" in data, "Missing 'confidence_levels'"
        assert "algorithm" in data, "Missing 'algorithm'"
        
        assert data["default_threshold"] == 60.0, "Default threshold should be 60.0"
        assert "strict" in data["thresholds"], "Missing 'strict' threshold"
        assert "normal" in data["thresholds"], "Missing 'normal' threshold"
        assert "loose" in data["thresholds"], "Missing 'loose' threshold"
        print(f"Threshold info: default={data['default_threshold']}, algorithm={data['algorithm']}")
    
    # ===== Face Comparison Tests =====
    def test_face_compare_valid_descriptors(self, auth_token):
        """Test face comparison with valid 128-dimensional descriptors"""
        # Generate two similar descriptors (simulating same person)
        descriptor1 = [random.uniform(-0.5, 0.5) for _ in range(128)]
        # Small variations for similar face
        descriptor2 = [d + random.uniform(-0.05, 0.05) for d in descriptor1]
        
        response = requests.post(f"{BASE_URL}/api/face-compare/compare", params={
            "token": auth_token
        }, json={
            "descriptor1": descriptor1,
            "descriptor2": descriptor2
        })
        assert response.status_code == 200, f"Face compare failed: {response.text}"
        
        data = response.json()
        assert "match" in data, "Missing 'match' in response"
        assert "similarity" in data, "Missing 'similarity' in response"
        assert "confidence" in data, "Missing 'confidence' in response"
        assert "details" in data, "Missing 'details' in response"
        assert "comparison_id" in data, "Missing 'comparison_id' in response"
        
        assert isinstance(data["match"], bool), "match should be boolean"
        assert 0 <= data["similarity"] <= 100, "similarity should be 0-100"
        assert data["confidence"] in ["high", "medium", "low"], "Invalid confidence level"
        print(f"Face compare: match={data['match']}, similarity={data['similarity']}%, confidence={data['confidence']}")
    
    def test_face_compare_different_faces(self, auth_token):
        """Test face comparison with very different descriptors"""
        # Generate very different descriptors (different people)
        descriptor1 = [random.uniform(-1, 1) for _ in range(128)]
        descriptor2 = [random.uniform(-1, 1) for _ in range(128)]
        
        response = requests.post(f"{BASE_URL}/api/face-compare/compare", params={
            "token": auth_token
        }, json={
            "descriptor1": descriptor1,
            "descriptor2": descriptor2
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "similarity" in data
        # Different faces typically have low similarity
        print(f"Different faces: similarity={data['similarity']}%, match={data['match']}")
    
    def test_face_compare_missing_descriptors(self, auth_token):
        """Test face comparison with missing descriptors returns 400"""
        response = requests.post(f"{BASE_URL}/api/face-compare/compare", params={
            "token": auth_token
        }, json={
            "descriptor1": [0.1] * 128
            # Missing descriptor2
        })
        assert response.status_code == 400, f"Expected 400, got: {response.status_code}"
    
    def test_face_compare_wrong_dimensions(self, auth_token):
        """Test face comparison with wrong descriptor dimensions returns 400"""
        response = requests.post(f"{BASE_URL}/api/face-compare/compare", params={
            "token": auth_token
        }, json={
            "descriptor1": [0.1] * 64,  # Wrong: should be 128
            "descriptor2": [0.1] * 64
        })
        assert response.status_code == 400, f"Expected 400, got: {response.status_code}"
    
    def test_face_compare_invalid_token(self):
        """Test face comparison with invalid token returns 401"""
        response = requests.post(f"{BASE_URL}/api/face-compare/compare", params={
            "token": "invalid_token"
        }, json={
            "descriptor1": [0.1] * 128,
            "descriptor2": [0.2] * 128
        })
        assert response.status_code == 401
    
    # ===== History Tests =====
    def test_face_compare_history(self, auth_token):
        """Test getting face comparison history"""
        response = requests.get(f"{BASE_URL}/api/face-compare/history", params={
            "token": auth_token,
            "limit": 10
        })
        assert response.status_code == 200, f"History failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "History should return a list"
        
        # If there are history items, validate structure
        if data:
            item = data[0]
            assert "id" in item, "Missing 'id' in history item"
            assert "similarity" in item, "Missing 'similarity' in history item"
            assert "match" in item, "Missing 'match' in history item"
            assert "confidence" in item, "Missing 'confidence' in history item"
            assert "created_at" in item, "Missing 'created_at' in history item"
        print(f"Comparison history: {len(data)} items")
    
    def test_face_compare_history_invalid_token(self):
        """Test history with invalid token returns 401"""
        response = requests.get(f"{BASE_URL}/api/face-compare/history", params={
            "token": "invalid_token"
        })
        assert response.status_code == 401
    
    # ===== Clear History Tests =====
    def test_face_compare_clear_history(self, auth_token):
        """Test clearing comparison history"""
        # First make a comparison to ensure there's history
        descriptor1 = [random.uniform(-0.5, 0.5) for _ in range(128)]
        descriptor2 = [random.uniform(-0.5, 0.5) for _ in range(128)]
        
        requests.post(f"{BASE_URL}/api/face-compare/compare", params={
            "token": auth_token
        }, json={"descriptor1": descriptor1, "descriptor2": descriptor2})
        
        # Now clear history
        response = requests.delete(f"{BASE_URL}/api/face-compare/history", params={
            "token": auth_token
        })
        assert response.status_code == 200, f"Clear history failed: {response.text}"
        
        data = response.json()
        assert "success" in data, "Missing 'success' in response"
        assert data["success"] == True, "success should be True"
        print(f"Clear history: deleted_count={data.get('deleted_count', 'unknown')}")


class TestEdgeCases(TestAuthentication):
    """Edge case and error handling tests"""
    
    def test_export_with_default_format(self, auth_token):
        """Test export with no format parameter defaults to JSON"""
        response = requests.get(f"{BASE_URL}/api/export/profile", params={
            "token": auth_token
            # No format param - should default to JSON
        })
        assert response.status_code == 200
        data = response.json()
        assert "profile" in data
    
    def test_export_with_invalid_format(self, auth_token):
        """Test export with invalid format parameter"""
        response = requests.get(f"{BASE_URL}/api/export/profile", params={
            "token": auth_token,
            "format": "invalid_format"
        })
        # Should return 422 (validation error) for invalid enum value
        assert response.status_code == 422, f"Expected 422, got: {response.status_code}"
    
    def test_face_compare_empty_descriptors(self, auth_token):
        """Test face comparison with empty descriptor arrays"""
        response = requests.post(f"{BASE_URL}/api/face-compare/compare", params={
            "token": auth_token
        }, json={
            "descriptor1": [],
            "descriptor2": []
        })
        assert response.status_code == 400, f"Expected 400 for empty descriptors"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
