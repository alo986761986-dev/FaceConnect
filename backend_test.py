#!/usr/bin/env python3
"""
Facial Recognition Social Tracker App - Backend API Tests
Tests all CRUD operations for persons and stats endpoints
"""

import requests
import sys
import json
from datetime import datetime

class SocialTrackerAPITester:
    def __init__(self, base_url="https://profile-connector-3.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_persons = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if not headers:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        resp_json = response.json()
                        if 'id' in resp_json and method == 'POST':
                            self.created_persons.append(resp_json['id'])
                        return True, resp_json
                    except:
                        return True, response.text
                return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    print(f"   Response: {response.text[:500]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test(
            "Health Check",
            "GET", 
            "health",
            200
        )

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test(
            "API Root",
            "GET",
            "",
            200
        )

    def test_create_person_basic(self):
        """Test creating a person with basic data"""
        person_data = {
            "name": "John Doe",
            "social_networks": [
                {
                    "platform": "facebook",
                    "username": "john.doe",
                    "profile_url": "john.doe",
                    "has_account": True
                },
                {
                    "platform": "instagram", 
                    "username": "johndoe",
                    "profile_url": "johndoe",
                    "has_account": True
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Person (Basic)",
            "POST",
            "persons",
            200,
            data=person_data
        )
        
        if success:
            # Validate response structure
            required_fields = ['id', 'name', 'social_networks', 'social_count']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field: {field}")
                    return False, {}
            
            if response['social_count'] != 2:
                print(f"❌ Expected social_count=2, got {response['social_count']}")
                return False, {}
                
        return success, response

    def test_create_person_with_photo(self):
        """Test creating a person with photo data"""
        # Small base64 encoded image data (1x1 pixel)
        base64_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI/hRZmBgAAAABJRU5ErkJggg=="
        
        person_data = {
            "name": "Jane Smith",
            "photo_data": base64_image,
            "social_networks": [
                {
                    "platform": "linkedin",
                    "username": "jane-smith",
                    "profile_url": "jane-smith",
                    "has_account": True
                }
            ]
        }
        
        return self.run_test(
            "Create Person (With Photo)",
            "POST",
            "persons",
            200,
            data=person_data
        )

    def test_get_persons(self):
        """Test retrieving all persons"""
        return self.run_test(
            "Get All Persons",
            "GET",
            "persons",
            200
        )

    def test_get_person_by_id(self, person_id):
        """Test retrieving a specific person"""
        return self.run_test(
            "Get Person by ID",
            "GET",
            f"persons/{person_id}",
            200
        )

    def test_update_person(self, person_id):
        """Test updating a person"""
        update_data = {
            "name": "John Doe Updated",
            "social_networks": [
                {
                    "platform": "facebook",
                    "username": "john.doe.updated",
                    "profile_url": "john.doe.updated", 
                    "has_account": True
                },
                {
                    "platform": "twitter",
                    "username": "johndoe",
                    "profile_url": "johndoe",
                    "has_account": True
                },
                {
                    "platform": "x",
                    "username": "johndoe_x",
                    "profile_url": "johndoe_x",
                    "has_account": True
                }
            ]
        }
        
        return self.run_test(
            "Update Person",
            "PUT",
            f"persons/{person_id}",
            200,
            data=update_data
        )

    def test_get_stats(self):
        """Test getting statistics"""
        success, response = self.run_test(
            "Get Statistics",
            "GET",
            "stats",
            200
        )
        
        if success:
            # Validate stats structure
            required_fields = ['total_persons', 'total_connections', 'platforms']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing stats field: {field}")
                    return False, {}
                    
            print(f"   Stats: {response['total_persons']} persons, {response['total_connections']} connections")
            
        return success, response

    def test_delete_person(self, person_id):
        """Test deleting a person"""
        return self.run_test(
            "Delete Person",
            "DELETE",
            f"persons/{person_id}",
            200
        )

    def test_get_nonexistent_person(self):
        """Test getting a person that doesn't exist"""
        return self.run_test(
            "Get Nonexistent Person",
            "GET",
            "persons/nonexistent-id",
            404
        )

    def test_create_message(self, person_id):
        """Test creating a message/note for a person"""
        message_data = {
            "content": "This is a test note about the person"
        }
        
        return self.run_test(
            "Create Message/Note",
            "POST",
            f"persons/{person_id}/messages",
            200,
            data=message_data
        )

    def test_get_messages(self, person_id):
        """Test retrieving all messages for a person"""
        return self.run_test(
            "Get Messages for Person",
            "GET", 
            f"persons/{person_id}/messages",
            200
        )

    def test_create_multiple_messages(self, person_id):
        """Test creating multiple messages for a person"""
        messages = [
            "First note about this person",
            "Second note with more details", 
            "Third note for testing deletion"
        ]
        
        created_messages = []
        for i, content in enumerate(messages):
            success, response = self.run_test(
                f"Create Message {i+1}",
                "POST",
                f"persons/{person_id}/messages", 
                200,
                data={"content": content}
            )
            if success and 'id' in response:
                created_messages.append(response['id'])
                
        return len(created_messages) == len(messages), created_messages

    def test_delete_message(self, person_id, message_id):
        """Test deleting a specific message"""
        return self.run_test(
            "Delete Message",
            "DELETE",
            f"persons/{person_id}/messages/{message_id}",
            200
        )

    def test_delete_nonexistent_message(self, person_id):
        """Test deleting a message that doesn't exist"""
        return self.run_test(
            "Delete Nonexistent Message",
            "DELETE", 
            f"persons/{person_id}/messages/nonexistent-message-id",
            404
        )

    def test_messages_for_nonexistent_person(self):
        """Test message operations on non-existent person"""
        # Test GET messages for non-existent person
        success1, _ = self.run_test(
            "Get Messages - Nonexistent Person",
            "GET",
            "persons/nonexistent-person/messages",
            404
        )
        
        # Test POST message for non-existent person
        success2, _ = self.run_test(
            "Create Message - Nonexistent Person", 
            "POST",
            "persons/nonexistent-person/messages",
            404,
            data={"content": "Test message"}
        )
        
        return success1 and success2, {}

    def cleanup_created_persons(self):
        """Clean up persons created during testing"""
        print(f"\n🧹 Cleaning up {len(self.created_persons)} created persons...")
        for person_id in self.created_persons:
            self.run_test(
                f"Cleanup Person {person_id[:8]}",
                "DELETE",
                f"persons/{person_id}",
                200
            )

def main():
    print("🚀 Starting Facial Recognition Social Tracker API Tests")
    print("=" * 60)
    
    tester = SocialTrackerAPITester()
    
    try:
        # Basic connectivity tests
        tester.test_health_check()
        tester.test_api_root()
        
        # Person CRUD operations
        success, person1 = tester.test_create_person_basic()
        person1_id = person1.get('id') if success else None
        
        success, person2 = tester.test_create_person_with_photo() 
        person2_id = person2.get('id') if success else None
        
        # Test retrieving persons
        tester.test_get_persons()
        
        if person1_id:
            tester.test_get_person_by_id(person1_id)
            tester.test_update_person(person1_id)
            
            # Test message/notes functionality
            print("\n📝 Testing Private Notes/Messages Functionality")
            
            # Test creating messages
            tester.test_create_message(person1_id)
            success, message_ids = tester.test_create_multiple_messages(person1_id)
            
            # Test retrieving messages
            tester.test_get_messages(person1_id)
            
            # Test deleting individual messages
            if success and message_ids:
                tester.test_delete_message(person1_id, message_ids[0])
                tester.test_delete_nonexistent_message(person1_id)
            
            # Test message operations on non-existent person
            tester.test_messages_for_nonexistent_person()
        
        # Test stats
        tester.test_get_stats()
        
        # Test error cases
        tester.test_get_nonexistent_person()
        
        # Test delete operations (this should also delete associated messages)
        if person1_id:
            # Before deleting, create one more message to test cascade delete
            tester.test_create_message(person1_id)
            print("\n🗑️  Testing cascade delete of messages when person is deleted")
            tester.test_delete_person(person1_id)
            # Try to get messages after person deletion (should return 404)
            success, _ = tester.run_test(
                "Verify Messages Deleted with Person",
                "GET",
                f"persons/{person1_id}/messages",
                404
            )
            
        if person2_id:
            tester.test_delete_person(person2_id)

    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
    finally:
        # Cleanup any remaining test data
        tester.cleanup_created_persons()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Tests Summary:")
    print(f"   Total Tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())