#!/usr/bin/env python3
"""
One-time script to fetch ALL 2025 booking data and insert into PAX table
This is a one-time fix to get all historical data from 2025-01-01 to today
"""

import os
import sys
from datetime import date
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

def main():
    """Main function to fetch all 2025 data and insert into PAX"""
    try:
        # Import the functions
        from booking_sync_github import (
            get_azure_connection, 
            get_supabase_client, 
            fetch_all_2025_booking_data,
            insert_pax_records
        )
        
        print("🚀 One-time 2025 Data Fetch & Insert")
        print("=" * 50)
        print("This will fetch ALL booking data from 2025-01-01 to today")
        print("and insert it into the PAX table in Supabase.")
        print()
        
        # Get organization ID
        organization_id = "5c38a370-7d13-4656-97f8-0b71f4000703"  # DiningSix
        print(f"📋 Organization ID: {organization_id}")
        
        # Connect to Azure SQL
        print("\n📡 Connecting to Azure SQL...")
        azure_conn = get_azure_connection()
        print("✅ Azure SQL connected!")
        
        # Connect to Supabase
        print("📡 Connecting to Supabase...")
        supabase = get_supabase_client()
        print("✅ Supabase connected!")
        
        # Fetch all 2025 data
        print("\n📊 Fetching all 2025 booking data...")
        booking_data = fetch_all_2025_booking_data(azure_conn)
        
        if not booking_data:
            print("❌ No booking data found for 2025")
            return
        
        print(f"✅ Found {len(booking_data)} booking records")
        
        # Show summary
        print(f"\n📈 Data Summary:")
        dates = [record['date'] for record in booking_data if record['date']]
        if dates:
            print(f"   Date range: {min(dates)} to {max(dates)}")
        
        restaurants = {}
        total_guests = 0
        for record in booking_data:
            place_id = record['placeID']
            place_name = record['placeName']
            guests = record['total_persons'] or 0
            total_guests += guests
            
            if place_id not in restaurants:
                restaurants[place_id] = {'name': place_name, 'records': 0, 'guests': 0}
            restaurants[place_id]['records'] += 1
            restaurants[place_id]['guests'] += guests
        
        print(f"   Total guests: {total_guests}")
        print(f"   Restaurants: {len(restaurants)}")
        
        for place_id, info in restaurants.items():
            print(f"   - {place_id}: {info['name']} ({info['records']} records, {info['guests']} guests)")
        
        # Ask for confirmation
        print(f"\n⚠️  This will insert/update {len(booking_data)} PAX records in Supabase.")
        response = input("Do you want to proceed? (y/N): ").strip().lower()
        
        if response != 'y':
            print("❌ Operation cancelled by user")
            return
        
        # Insert PAX records
        print(f"\n💾 Inserting PAX records into Supabase...")
        result = insert_pax_records(supabase, booking_data, organization_id)
        
        print(f"\n✅ Insert completed!")
        print(f"   📥 Inserted: {result['inserted']} records")
        print(f"   🔄 Updated: {result['updated']} records")
        print(f"   ❌ Errors: {result['errors']} records")
        
        # Close connections
        azure_conn.close()
        print(f"\n🎉 All 2025 data successfully synced to PAX table!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
