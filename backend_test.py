#!/usr/bin/env python3
"""
Backend API Testing Suite for Student-Teacher Connect Application
Tests authentication, assignment management, and role-based access control
"""

import requests
import json
from datetime import datetime, timedelta, timezone
import uuid

# Configuration
BASE_URL = "https://eduassign-1.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30  # Increased timeout for external API calls

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def log_success(self, test_name):
        print(f"✅ {test_name}")
        self.passed += 1
        
    def log_failure(self, test_name, error):
        print(f"❌ {test_name}: {error}")
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")

def test_user_registration():
    """Test user registration for both teacher and student roles"""
    results = TestResults()
    
    # Test data with realistic information
    teacher_data = {
        "name": "Dr. Sarah Johnson",
        "email": f"sarah.johnson.{uuid.uuid4().hex[:8]}@university.edu",
        "password": "SecurePass123!",
        "role": "teacher"
    }
    
    student_data = {
        "name": "Alex Chen",
        "email": f"alex.chen.{uuid.uuid4().hex[:8]}@student.edu", 
        "password": "StudentPass456!",
        "role": "student"
    }
    
    # Test teacher registration
    try:
        response = requests.post(f"{BASE_URL}/auth/register", 
                               json=teacher_data, headers=HEADERS, timeout=TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and data["user"]["role"] == "teacher":
                results.log_success("Teacher Registration")
                teacher_token = data["access_token"]
                teacher_id = data["user"]["id"]
            else:
                results.log_failure("Teacher Registration", "Missing token or incorrect role in response")
                teacher_token = None
                teacher_id = None
        else:
            results.log_failure("Teacher Registration", f"HTTP {response.status_code}: {response.text}")
            teacher_token = None
            teacher_id = None
    except Exception as e:
        results.log_failure("Teacher Registration", f"Request failed: {str(e)}")
        teacher_token = None
        teacher_id = None
    
    # Test student registration
    try:
        response = requests.post(f"{BASE_URL}/auth/register", 
                               json=student_data, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and data["user"]["role"] == "student":
                results.log_success("Student Registration")
                student_token = data["access_token"]
                student_id = data["user"]["id"]
            else:
                results.log_failure("Student Registration", "Missing token or incorrect role in response")
                student_token = None
                student_id = None
        else:
            results.log_failure("Student Registration", f"HTTP {response.status_code}: {response.text}")
            student_token = None
            student_id = None
    except Exception as e:
        results.log_failure("Student Registration", f"Request failed: {str(e)}")
        student_token = None
        student_id = None
    
    # Test duplicate email registration
    try:
        response = requests.post(f"{BASE_URL}/auth/register", 
                               json=teacher_data, headers=HEADERS, timeout=10)
        if response.status_code == 400:
            results.log_success("Duplicate Email Prevention")
        else:
            results.log_failure("Duplicate Email Prevention", f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.log_failure("Duplicate Email Prevention", f"Request failed: {str(e)}")
    
    return results, teacher_token, student_token, teacher_data, student_data

def test_user_login(teacher_data, student_data):
    """Test user login functionality"""
    results = TestResults()
    
    # Test teacher login
    try:
        login_data = {"email": teacher_data["email"], "password": teacher_data["password"]}
        response = requests.post(f"{BASE_URL}/auth/login", 
                               json=login_data, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and data["user"]["role"] == "teacher":
                results.log_success("Teacher Login")
                teacher_token = data["access_token"]
            else:
                results.log_failure("Teacher Login", "Missing token or incorrect role")
                teacher_token = None
        else:
            results.log_failure("Teacher Login", f"HTTP {response.status_code}: {response.text}")
            teacher_token = None
    except Exception as e:
        results.log_failure("Teacher Login", f"Request failed: {str(e)}")
        teacher_token = None
    
    # Test student login
    try:
        login_data = {"email": student_data["email"], "password": student_data["password"]}
        response = requests.post(f"{BASE_URL}/auth/login", 
                               json=login_data, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and data["user"]["role"] == "student":
                results.log_success("Student Login")
                student_token = data["access_token"]
            else:
                results.log_failure("Student Login", "Missing token or incorrect role")
                student_token = None
        else:
            results.log_failure("Student Login", f"HTTP {response.status_code}: {response.text}")
            student_token = None
    except Exception as e:
        results.log_failure("Student Login", f"Request failed: {str(e)}")
        student_token = None
    
    # Test invalid credentials
    try:
        invalid_login = {"email": teacher_data["email"], "password": "wrongpassword"}
        response = requests.post(f"{BASE_URL}/auth/login", 
                               json=invalid_login, headers=HEADERS, timeout=10)
        if response.status_code == 401:
            results.log_success("Invalid Credentials Rejection")
        else:
            results.log_failure("Invalid Credentials Rejection", f"Expected 401, got {response.status_code}")
    except Exception as e:
        results.log_failure("Invalid Credentials Rejection", f"Request failed: {str(e)}")
    
    return results, teacher_token, student_token

def test_user_profile(teacher_token, student_token):
    """Test user profile management"""
    results = TestResults()
    
    # Test getting current user profile (teacher)
    if teacher_token:
        try:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {teacher_token}"}
            response = requests.get(f"{BASE_URL}/users/me", headers=auth_headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "name" in data and "role" in data:
                    results.log_success("Get Teacher Profile")
                else:
                    results.log_failure("Get Teacher Profile", "Missing required fields in response")
            else:
                results.log_failure("Get Teacher Profile", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.log_failure("Get Teacher Profile", f"Request failed: {str(e)}")
    
    # Test updating profile
    if teacher_token:
        try:
            update_data = {
                "name": "Dr. Sarah Johnson-Smith",
                "theme_preference": "dark",
                "profile_photo": "https://example.com/photo.jpg"
            }
            auth_headers = {**HEADERS, "Authorization": f"Bearer {teacher_token}"}
            response = requests.put(f"{BASE_URL}/users/me", 
                                  json=update_data, headers=auth_headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data["name"] == update_data["name"] and data["theme_preference"] == update_data["theme_preference"]:
                    results.log_success("Update User Profile")
                else:
                    results.log_failure("Update User Profile", "Profile not updated correctly")
            else:
                results.log_failure("Update User Profile", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.log_failure("Update User Profile", f"Request failed: {str(e)}")
    
    # Test unauthorized access
    try:
        response = requests.get(f"{BASE_URL}/users/me", headers=HEADERS, timeout=10)
        if response.status_code == 403 or response.status_code == 401:
            results.log_success("Unauthorized Profile Access Prevention")
        else:
            results.log_failure("Unauthorized Profile Access Prevention", f"Expected 401/403, got {response.status_code}")
    except Exception as e:
        results.log_failure("Unauthorized Profile Access Prevention", f"Request failed: {str(e)}")
    
    return results

def test_assignment_management(teacher_token, student_token):
    """Test assignment CRUD operations"""
    results = TestResults()
    assignment_id = None
    
    # Test assignment creation (teacher only)
    if teacher_token:
        try:
            assignment_data = {
                "title": "Advanced Calculus Problem Set",
                "description": "Complete problems 1-15 from Chapter 8. Show all work and provide detailed explanations for each solution.",
                "subject": "Mathematics",
                "deadline": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            }
            auth_headers = {**HEADERS, "Authorization": f"Bearer {teacher_token}"}
            response = requests.post(f"{BASE_URL}/assignments", 
                                   json=assignment_data, headers=auth_headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data["title"] == assignment_data["title"]:
                    results.log_success("Assignment Creation (Teacher)")
                    assignment_id = data["id"]
                else:
                    results.log_failure("Assignment Creation (Teacher)", "Missing ID or incorrect title")
            else:
                results.log_failure("Assignment Creation (Teacher)", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.log_failure("Assignment Creation (Teacher)", f"Request failed: {str(e)}")
    
    # Test assignment creation by student (should fail)
    if student_token:
        try:
            assignment_data = {
                "title": "Unauthorized Assignment",
                "description": "This should not be allowed",
                "subject": "Test",
                "deadline": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            auth_headers = {**HEADERS, "Authorization": f"Bearer {student_token}"}
            response = requests.post(f"{BASE_URL}/assignments", 
                                   json=assignment_data, headers=auth_headers, timeout=10)
            if response.status_code == 403:
                results.log_success("Assignment Creation Prevention (Student)")
            else:
                results.log_failure("Assignment Creation Prevention (Student)", f"Expected 403, got {response.status_code}")
        except Exception as e:
            results.log_failure("Assignment Creation Prevention (Student)", f"Request failed: {str(e)}")
    
    # Test getting all assignments
    if student_token:
        try:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {student_token}"}
            response = requests.get(f"{BASE_URL}/assignments", headers=auth_headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    results.log_success("Get All Assignments")
                else:
                    results.log_failure("Get All Assignments", "Response is not a list")
            else:
                results.log_failure("Get All Assignments", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.log_failure("Get All Assignments", f"Request failed: {str(e)}")
    
    # Test getting teacher's assignments
    if teacher_token:
        try:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {teacher_token}"}
            response = requests.get(f"{BASE_URL}/assignments/my", headers=auth_headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    results.log_success("Get Teacher's Assignments")
                else:
                    results.log_failure("Get Teacher's Assignments", "Response is not a list")
            else:
                results.log_failure("Get Teacher's Assignments", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.log_failure("Get Teacher's Assignments", f"Request failed: {str(e)}")
    
    # Test student trying to access teacher's assignments (should fail)
    if student_token:
        try:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {student_token}"}
            response = requests.get(f"{BASE_URL}/assignments/my", headers=auth_headers, timeout=10)
            if response.status_code == 403:
                results.log_success("Teacher Assignments Access Prevention (Student)")
            else:
                results.log_failure("Teacher Assignments Access Prevention (Student)", f"Expected 403, got {response.status_code}")
        except Exception as e:
            results.log_failure("Teacher Assignments Access Prevention (Student)", f"Request failed: {str(e)}")
    
    return results, assignment_id

def test_assignment_completion(student_token, teacher_token, assignment_id):
    """Test assignment completion functionality"""
    results = TestResults()
    
    if not assignment_id:
        results.log_failure("Assignment Completion Tests", "No assignment ID available from previous tests")
        return results
    
    # Test assignment completion by student
    if student_token:
        try:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {student_token}"}
            response = requests.post(f"{BASE_URL}/assignments/{assignment_id}/complete", 
                                   headers=auth_headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    results.log_success("Assignment Completion (Student)")
                else:
                    results.log_failure("Assignment Completion (Student)", "Missing success message")
            else:
                results.log_failure("Assignment Completion (Student)", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.log_failure("Assignment Completion (Student)", f"Request failed: {str(e)}")
    
    # Test duplicate completion (should fail)
    if student_token:
        try:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {student_token}"}
            response = requests.post(f"{BASE_URL}/assignments/{assignment_id}/complete", 
                                   headers=auth_headers, timeout=10)
            if response.status_code == 400:
                results.log_success("Duplicate Completion Prevention")
            else:
                results.log_failure("Duplicate Completion Prevention", f"Expected 400, got {response.status_code}")
        except Exception as e:
            results.log_failure("Duplicate Completion Prevention", f"Request failed: {str(e)}")
    
    # Test teacher trying to complete assignment (should fail)
    if teacher_token:
        try:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {teacher_token}"}
            response = requests.post(f"{BASE_URL}/assignments/{assignment_id}/complete", 
                                   headers=auth_headers, timeout=10)
            if response.status_code == 403:
                results.log_success("Teacher Completion Prevention")
            else:
                results.log_failure("Teacher Completion Prevention", f"Expected 403, got {response.status_code}")
        except Exception as e:
            results.log_failure("Teacher Completion Prevention", f"Request failed: {str(e)}")
    
    # Test getting assignment submissions (teacher only)
    if teacher_token:
        try:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {teacher_token}"}
            response = requests.get(f"{BASE_URL}/assignments/{assignment_id}/submissions", 
                                  headers=auth_headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    results.log_success("Get Assignment Submissions (Teacher)")
                else:
                    results.log_failure("Get Assignment Submissions (Teacher)", "Response is not a list")
            else:
                results.log_failure("Get Assignment Submissions (Teacher)", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.log_failure("Get Assignment Submissions (Teacher)", f"Request failed: {str(e)}")
    
    # Test student getting their submissions
    if student_token:
        try:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {student_token}"}
            response = requests.get(f"{BASE_URL}/submissions/my", headers=auth_headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "completed_assignments" in data and isinstance(data["completed_assignments"], list):
                    results.log_success("Get Student Submissions")
                else:
                    results.log_failure("Get Student Submissions", "Missing or invalid completed_assignments field")
            else:
                results.log_failure("Get Student Submissions", f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            results.log_failure("Get Student Submissions", f"Request failed: {str(e)}")
    
    return results

def main():
    """Run all backend tests"""
    print("🚀 Starting Student-Teacher Connect Backend API Tests")
    print(f"Testing against: {BASE_URL}")
    print("="*60)
    
    overall_results = TestResults()
    
    # Test 1: User Registration
    print("\n📝 Testing User Registration...")
    reg_results, teacher_token, student_token, teacher_data, student_data = test_user_registration()
    overall_results.passed += reg_results.passed
    overall_results.failed += reg_results.failed
    overall_results.errors.extend(reg_results.errors)
    
    # Test 2: User Login
    print("\n🔐 Testing User Login...")
    login_results, teacher_token, student_token = test_user_login(teacher_data, student_data)
    overall_results.passed += login_results.passed
    overall_results.failed += login_results.failed
    overall_results.errors.extend(login_results.errors)
    
    # Test 3: User Profile Management
    print("\n👤 Testing User Profile Management...")
    profile_results = test_user_profile(teacher_token, student_token)
    overall_results.passed += profile_results.passed
    overall_results.failed += profile_results.failed
    overall_results.errors.extend(profile_results.errors)
    
    # Test 4: Assignment Management
    print("\n📚 Testing Assignment Management...")
    assignment_results, assignment_id = test_assignment_management(teacher_token, student_token)
    overall_results.passed += assignment_results.passed
    overall_results.failed += assignment_results.failed
    overall_results.errors.extend(assignment_results.errors)
    
    # Test 5: Assignment Completion
    print("\n✅ Testing Assignment Completion...")
    completion_results = test_assignment_completion(student_token, teacher_token, assignment_id)
    overall_results.passed += completion_results.passed
    overall_results.failed += completion_results.failed
    overall_results.errors.extend(completion_results.errors)
    
    # Final Summary
    overall_results.summary()
    
    return overall_results.failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)