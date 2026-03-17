"""
Test Group Chat APIs for FaceConnect
Tests: Create group, list groups, get group details, update group, add/remove members, make admin, leave group, delete group
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_1 = {"email": "testrefactor1@test.com", "password": "test123"}
TEST_USER_2 = {"email": "grouptest2@test.com", "password": "test123"}

class TestGroupChatAPIs:
    """Test Group Chat API endpoints"""
    
    token_1 = None
    token_2 = None
    user_1_id = None
    user_2_id = None
    test_group_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup: Login both test users and get tokens"""
        # Login user 1
        response1 = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response1.status_code == 200, f"User 1 login failed: {response1.text}"
        data1 = response1.json()
        cls.token_1 = data1.get('token')
        cls.user_1_id = data1.get('user', {}).get('id')
        
        # Login user 2
        response2 = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_2)
        if response2.status_code != 200:
            # Try to register user 2 if not exists
            register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_USER_2["email"],
                "password": TEST_USER_2["password"],
                "username": "grouptest2",
                "display_name": "Group Test User 2"
            })
            if register_resp.status_code == 200:
                response2 = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_2)
        
        assert response2.status_code == 200, f"User 2 login/register failed: {response2.text}"
        data2 = response2.json()
        cls.token_2 = data2.get('token')
        cls.user_2_id = data2.get('user', {}).get('id')
        
        print(f"User 1: {cls.user_1_id}, Token: {cls.token_1[:10]}...")
        print(f"User 2: {cls.user_2_id}, Token: {cls.token_2[:10]}...")

    # ============== CREATE GROUP TESTS ==============
    
    def test_01_create_group_success(self):
        """Test creating a new group"""
        response = requests.post(
            f"{BASE_URL}/api/groups?token={self.token_1}",
            json={
                "name": "TEST_Group Chat",
                "description": "Test group for API testing",
                "participant_ids": [self.user_2_id]
            }
        )
        assert response.status_code == 200, f"Create group failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Group ID not returned"
        assert data["name"] == "TEST_Group Chat", "Group name mismatch"
        assert data["member_count"] >= 2, "Should have at least 2 members"
        assert self.user_1_id in data["admins"], "Creator should be admin"
        
        TestGroupChatAPIs.test_group_id = data["id"]
        print(f"Created group: {data['id']}")

    def test_02_create_group_without_name_fails(self):
        """Test creating a group without name fails"""
        response = requests.post(
            f"{BASE_URL}/api/groups?token={self.token_1}",
            json={
                "name": "",
                "participant_ids": [self.user_2_id]
            }
        )
        assert response.status_code == 400, f"Expected 400 for empty name: {response.status_code}"

    def test_03_create_group_without_participants_fails(self):
        """Test creating a group without participants fails"""
        response = requests.post(
            f"{BASE_URL}/api/groups?token={self.token_1}",
            json={
                "name": "Empty Group",
                "participant_ids": []
            }
        )
        assert response.status_code == 400, f"Expected 400 for no participants: {response.status_code}"

    def test_04_create_group_unauthorized(self):
        """Test creating a group without valid token fails"""
        response = requests.post(
            f"{BASE_URL}/api/groups?token=invalid_token",
            json={
                "name": "Unauthorized Group",
                "participant_ids": ["some_id"]
            }
        )
        assert response.status_code == 401, f"Expected 401 for invalid token: {response.status_code}"

    # ============== LIST GROUPS TESTS ==============
    
    def test_05_list_groups_success(self):
        """Test listing user's groups"""
        response = requests.get(f"{BASE_URL}/api/groups?token={self.token_1}")
        assert response.status_code == 200, f"List groups failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        
        # Find our test group
        test_group = next((g for g in data if g["id"] == self.test_group_id), None)
        assert test_group is not None, "Test group not found in list"
        print(f"Found {len(data)} groups for user 1")

    def test_06_list_groups_for_member(self):
        """Test that added member can see the group"""
        response = requests.get(f"{BASE_URL}/api/groups?token={self.token_2}")
        assert response.status_code == 200, f"List groups failed: {response.text}"
        
        data = response.json()
        test_group = next((g for g in data if g["id"] == self.test_group_id), None)
        assert test_group is not None, "Member should see the group"
        print(f"Found {len(data)} groups for user 2")

    def test_07_list_groups_unauthorized(self):
        """Test listing groups with invalid token fails"""
        response = requests.get(f"{BASE_URL}/api/groups?token=invalid_token")
        assert response.status_code == 401, f"Expected 401: {response.status_code}"

    # ============== GET GROUP DETAILS TESTS ==============
    
    def test_08_get_group_details_success(self):
        """Test getting group details"""
        response = requests.get(f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_1}")
        assert response.status_code == 200, f"Get group details failed: {response.text}"
        
        data = response.json()
        assert data["id"] == self.test_group_id, "Group ID mismatch"
        assert data["name"] == "TEST_Group Chat", "Group name mismatch"
        assert "members" in data, "Members list missing"
        assert "admins" in data, "Admins list missing"
        print(f"Group has {len(data['members'])} members")

    def test_09_get_group_details_as_member(self):
        """Test member can get group details"""
        response = requests.get(f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_2}")
        assert response.status_code == 200, f"Member get group details failed: {response.text}"

    def test_10_get_group_details_nonexistent(self):
        """Test getting nonexistent group returns 404"""
        response = requests.get(f"{BASE_URL}/api/groups/nonexistent-id?token={self.token_1}")
        assert response.status_code == 404, f"Expected 404: {response.status_code}"

    # ============== UPDATE GROUP TESTS ==============
    
    def test_11_update_group_by_admin(self):
        """Test admin can update group"""
        response = requests.put(
            f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_1}",
            json={
                "name": "TEST_Updated Group Name",
                "description": "Updated description"
            }
        )
        assert response.status_code == 200, f"Update group failed: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_Updated Group Name", "Name not updated"
        print("Group name updated successfully")

    def test_12_update_group_by_non_admin_fails(self):
        """Test non-admin cannot update group"""
        response = requests.put(
            f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_2}",
            json={"name": "Hacked Name"}
        )
        assert response.status_code == 403, f"Expected 403: {response.status_code}"

    # ============== ADMIN MANAGEMENT TESTS ==============
    
    def test_13_make_admin(self):
        """Test making a member an admin"""
        response = requests.post(
            f"{BASE_URL}/api/groups/{self.test_group_id}/admins/{self.user_2_id}?token={self.token_1}"
        )
        assert response.status_code == 200, f"Make admin failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success"
        print(f"User 2 is now admin")

    def test_14_verify_new_admin_can_update(self):
        """Test new admin can update group"""
        response = requests.put(
            f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_2}",
            json={"description": "Updated by new admin"}
        )
        assert response.status_code == 200, f"New admin update failed: {response.text}"

    def test_15_remove_admin(self):
        """Test removing admin status (creator only)"""
        response = requests.delete(
            f"{BASE_URL}/api/groups/{self.test_group_id}/admins/{self.user_2_id}?token={self.token_1}"
        )
        assert response.status_code == 200, f"Remove admin failed: {response.text}"

    def test_16_verify_removed_admin_cannot_update(self):
        """Test removed admin cannot update group"""
        response = requests.put(
            f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_2}",
            json={"description": "Should fail"}
        )
        assert response.status_code == 403, f"Expected 403: {response.status_code}"

    # ============== MEMBER MANAGEMENT TESTS ==============
    
    def test_17_add_member(self):
        """Test adding new member to group"""
        # First create a third user
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"grouptest3_{self.test_group_id[:8]}@test.com",
            "password": "test123",
            "username": f"grouptest3_{self.test_group_id[:8]}",
            "display_name": "Group Test User 3"
        })
        
        if register_resp.status_code == 200:
            user_3_id = register_resp.json().get('user', {}).get('id')
            
            # Add to group
            response = requests.post(
                f"{BASE_URL}/api/groups/{self.test_group_id}/members?token={self.token_1}",
                json={"user_ids": [user_3_id]}
            )
            assert response.status_code == 200, f"Add member failed: {response.text}"
            
            data = response.json()
            assert data.get("success") == True, "Should return success"
            assert data.get("added_count") >= 1, "Should have added at least 1 member"
            print(f"Added {data.get('added_count')} members")
        else:
            pytest.skip("Could not create third test user")

    def test_18_add_member_by_non_admin_fails(self):
        """Test non-admin cannot add members"""
        response = requests.post(
            f"{BASE_URL}/api/groups/{self.test_group_id}/members?token={self.token_2}",
            json={"user_ids": ["some_user"]}
        )
        assert response.status_code == 403, f"Expected 403: {response.status_code}"

    def test_19_remove_member_by_admin(self):
        """Test admin can remove member"""
        # Get group to find members
        get_resp = requests.get(f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_1}")
        if get_resp.status_code == 200:
            members = get_resp.json().get("members", [])
            # Find a non-admin member to remove
            non_admin = next((m for m in members if m["id"] != self.user_1_id and m["id"] != self.user_2_id), None)
            if non_admin:
                response = requests.delete(
                    f"{BASE_URL}/api/groups/{self.test_group_id}/members/{non_admin['id']}?token={self.token_1}"
                )
                assert response.status_code == 200, f"Remove member failed: {response.text}"
                print(f"Removed member: {non_admin['id']}")
            else:
                pytest.skip("No non-admin member to remove")
        else:
            pytest.skip("Could not get group details")

    # ============== LEAVE GROUP TESTS ==============
    
    def test_20_leave_group(self):
        """Test member can leave group"""
        response = requests.post(
            f"{BASE_URL}/api/groups/{self.test_group_id}/leave?token={self.token_2}"
        )
        assert response.status_code == 200, f"Leave group failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success"
        assert data.get("is_self_leave") == True, "Should indicate self leave"
        print("User 2 left the group")

    def test_21_verify_left_member_cannot_access(self):
        """Test left member cannot access group"""
        response = requests.get(f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_2}")
        assert response.status_code == 403, f"Expected 403 for non-member: {response.status_code}"

    def test_22_leave_nonexistent_group_fails(self):
        """Test leaving nonexistent group fails"""
        response = requests.post(
            f"{BASE_URL}/api/groups/nonexistent-id/leave?token={self.token_1}"
        )
        assert response.status_code == 404, f"Expected 404: {response.status_code}"

    # ============== DELETE GROUP TESTS ==============
    
    def test_23_delete_group_by_non_creator_fails(self):
        """Test non-creator cannot delete group"""
        # Re-add user 2 to group first
        requests.post(
            f"{BASE_URL}/api/groups/{self.test_group_id}/members?token={self.token_1}",
            json={"user_ids": [self.user_2_id]}
        )
        
        # Try to delete as non-creator
        response = requests.delete(
            f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_2}"
        )
        assert response.status_code == 403, f"Expected 403: {response.status_code}"

    def test_24_delete_group_by_creator(self):
        """Test creator can delete group"""
        response = requests.delete(
            f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_1}"
        )
        assert response.status_code == 200, f"Delete group failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success"
        assert data.get("deleted") == self.test_group_id, "Should return deleted group ID"
        print("Group deleted successfully")

    def test_25_verify_deleted_group_not_accessible(self):
        """Test deleted group is not accessible"""
        response = requests.get(f"{BASE_URL}/api/groups/{self.test_group_id}?token={self.token_1}")
        assert response.status_code == 404, f"Expected 404 for deleted group: {response.status_code}"


class TestGroupChatEdgeCases:
    """Test edge cases and error handling for Group Chat"""
    
    token = None
    user_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup: Login test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER_1)
        assert response.status_code == 200
        data = response.json()
        cls.token = data.get('token')
        cls.user_id = data.get('user', {}).get('id')

    def test_invalid_group_id_format(self):
        """Test operations with invalid group ID format"""
        # Get with invalid ID
        response = requests.get(f"{BASE_URL}/api/groups/!!!invalid!!!?token={self.token}")
        assert response.status_code in [400, 404], f"Expected 400/404: {response.status_code}"

    def test_add_nonexistent_user_to_group(self):
        """Test adding nonexistent user is handled gracefully"""
        # Create a temp group
        create_resp = requests.post(
            f"{BASE_URL}/api/groups?token={self.token}",
            json={
                "name": "TEST_Temp Group for Edge Cases",
                "participant_ids": ["nonexistent-user-id-12345"]
            }
        )
        # This might succeed but just not add the invalid user, or fail
        # Either is acceptable behavior
        if create_resp.status_code == 200:
            group_id = create_resp.json().get("id")
            # Clean up
            requests.delete(f"{BASE_URL}/api/groups/{group_id}?token={self.token}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
