#!/usr/bin/env python3
"""
Test script to verify the GitHub Action workflow works correctly
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_environment_variables():
    """Test that all required environment variables are available"""
    print("🧪 Testing GitHub Action Environment Variables")
    print("=" * 50)
    
    # Core required variables (always needed)
    required_vars = [
        "AZURE_SQL_SERVER",
        "AZURE_SQL_DATABASE", 
        "AZURE_SQL_USER",
        "AZURE_SQL_PASSWORD",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY"
    ]
    
    # GitHub Actions specific variables (only set in GitHub Actions)
    github_vars = [
        "ORGANIZATION_ID",
        "DAYS_BACK"
    ]
    
    missing_vars = []
    
    # Check core required variables
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if "PASSWORD" in var or "KEY" in var:
                display_value = f"{value[:8]}..." if len(value) > 8 else "***"
            else:
                display_value = value
            print(f"✅ {var}: {display_value}")
        else:
            print(f"❌ {var}: NOT SET")
            missing_vars.append(var)
    
    # Check GitHub Actions variables (optional for local testing)
    print(f"\n📋 GitHub Actions Variables (set automatically in GitHub Actions):")
    for var in github_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"ℹ️  {var}: Not set (will be set by GitHub Actions)")
    
    if missing_vars:
        print(f"\n❌ Missing core environment variables: {', '.join(missing_vars)}")
        return False
    else:
        print(f"\n✅ All core environment variables are set!")
        return True

def test_imports():
    """Test that all required modules can be imported"""
    print("\n🧪 Testing Module Imports")
    print("=" * 30)
    
    try:
        import pymssql
        print("✅ pymssql: Available")
    except ImportError:
        print("❌ pymssql: Not available")
        return False
    
    try:
        from supabase import create_client
        print("✅ supabase: Available")
    except ImportError:
        print("❌ supabase: Not available")
        return False
    
    try:
        from booking_sync_github import get_azure_connection, get_supabase_client
        print("✅ booking_sync_github: Available")
    except ImportError as e:
        print(f"❌ booking_sync_github: {e}")
        return False
    
    print("✅ All modules imported successfully!")
    return True

def main():
    """Main test function"""
    print("🚀 GitHub Action Test Suite")
    print("=" * 40)
    
    # Test environment variables
    env_ok = test_environment_variables()
    
    # Test imports
    imports_ok = test_imports()
    
    print(f"\n📊 Test Results:")
    print(f"   Environment Variables: {'✅ PASS' if env_ok else '❌ FAIL'}")
    print(f"   Module Imports: {'✅ PASS' if imports_ok else '❌ FAIL'}")
    
    if env_ok and imports_ok:
        print(f"\n🎉 All tests passed! GitHub Action should work correctly.")
    else:
        print(f"\n⚠️  Some tests failed. Please fix the issues above.")
    
    return env_ok and imports_ok

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
