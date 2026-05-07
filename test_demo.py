#!/usr/bin/env python3
"""
Demo Testing Script
Run this to verify all demo features are working before presentation.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

def test_api_endpoint(name, url, expected_status=200):
    """Test an API endpoint"""
    try:
        response = requests.get(url)
        if response.status_code == expected_status:
            print(f"✅ {name}: OK ({response.status_code})")
            return True
        else:
            print(f"❌ {name}: FAILED ({response.status_code})")
            return False
    except Exception as e:
        print(f"❌ {name}: ERROR ({str(e)})")
        return False

def test_authentication():
    """Test user authentication"""
    print("\n🔐 Testing Authentication...")

    # Test admin login
    admin_data = {"email": "admin@gov.ng", "password": "admin123"}
    response = requests.post(f"{BASE_URL}/api/accounts/auth/login/", json=admin_data)
    if response.status_code == 200:
        print("✅ Admin login: OK")
        admin_token = response.json().get('tokens', {}).get('access')
    else:
        print("❌ Admin login: FAILED")
        return False

    # Test tax officer login
    officer_data = {"email": "officer@gov.ng", "password": "officer123"}
    response = requests.post(f"{BASE_URL}/api/accounts/auth/login/", json=officer_data)
    if response.status_code == 200:
        print("✅ Tax officer login: OK")
    else:
        print("❌ Tax officer login: FAILED")

    # Test taxpayer login
    taxpayer_data = {"email": "ahmad@email.com", "password": "demo123"}
    response = requests.post(f"{BASE_URL}/api/accounts/auth/login/", json=taxpayer_data)
    if response.status_code == 200:
        print("✅ Taxpayer login: OK")
    else:
        print("❌ Taxpayer login: FAILED")

    return True

def test_dashboard_data():
    """Test dashboard API endpoints"""
    print("\n📊 Testing Dashboard Data...")

    endpoints = [
        ("Dashboard Summary", f"{BASE_URL}/api/dashboard/dashboard/"),
        ("Sector Breakdown", f"{BASE_URL}/api/dashboard/dashboard/sectors/"),
        ("Location Breakdown", f"{BASE_URL}/api/dashboard/dashboard/locations/"),
        ("Recent Transactions", f"{BASE_URL}/api/dashboard/dashboard/transactions/"),
        ("User Journey Tracking", f"{BASE_URL}/api/dashboard/dashboard/user_journey_tracking/"),
    ]

    all_passed = True
    for name, url in endpoints:
        if not test_api_endpoint(name, url):
            all_passed = False

    return all_passed

def test_database_counts():
    """Test that demo data was created correctly"""
    print("\n🗄️ Testing Database Content...")

    try:
        # Test dashboard summary for data counts
        response = requests.get(f"{BASE_URL}/api/dashboard/dashboard/")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Total Taxpayers: {data.get('total_taxpayers', 0)} (expected: 5)")
            print(f"✅ Active Users: {data.get('active_users', 0)} (expected: 3)")
            print(f"✅ Successful Payments: {data.get('successful_payments', 0)} (expected: 18)")
            print(f"✅ Failed Payments: {data.get('failed_payments', 0)} (expected: 3)")
            print(f"✅ Compliance Rate: {data.get('compliance_rate', 0):.1f}% (expected: ~85%)")

            # Check if we have the expected numbers
            if data.get('total_taxpayers') == 5 and data.get('active_users') == 3:
                print("✅ Database counts: CORRECT")
                return True
            else:
                print("❌ Database counts: INCORRECT")
                return False
        else:
            print("❌ Dashboard API: FAILED")
            return False
    except Exception as e:
        print(f"❌ Database test error: {str(e)}")
        return False

def test_frontend_access():
    """Test that frontend is accessible"""
    print("\n🌐 Testing Frontend Access...")

    try:
        response = requests.get(FRONTEND_URL)
        if response.status_code == 200:
            print("✅ Frontend homepage: OK")
            return True
        else:
            print(f"❌ Frontend homepage: FAILED ({response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Frontend access error: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 Digital Tax Collection Platform - Demo Test Suite")
    print("=" * 60)

    # Wait a moment for servers to be ready
    print("⏳ Waiting for servers to be ready...")
    time.sleep(3)

    tests = [
        ("Frontend Access", test_frontend_access),
        ("API Endpoints", test_dashboard_data),
        ("Authentication", test_authentication),
        ("Database Content", test_database_counts),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n🧪 Running {test_name} Tests...")
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"❌ {test_name}: CRASHED ({str(e)})")
            results.append(False)

    # Summary
    print("\n" + "=" * 60)
    print("📋 TEST RESULTS SUMMARY")
    print("=" * 60)

    passed = sum(results)
    total = len(results)

    for i, (test_name, _) in enumerate(tests):
        status = "✅ PASSED" if results[i] else "❌ FAILED"
        print(f"{test_name}: {status}")

    print(f"\n🎯 Overall: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Demo is ready for presentation.")
        print("\n📋 Next Steps:")
        print("1. Open http://localhost:3000 in your browser")
        print("2. Login with admin@gov.ng / admin123")
        print("3. Navigate to the dashboard")
        print("4. Follow the presentation script in PRESENTATION_README.md")
        return True
    else:
        print(f"\n⚠️ {total - passed} tests failed. Please fix before presentation.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)