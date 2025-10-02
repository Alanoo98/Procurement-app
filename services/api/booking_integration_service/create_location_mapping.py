#!/usr/bin/env python3
"""
Create location mapping for PAX table
Maps placeID from booking data to location_id in Supabase
"""

import os
import sys
from typing import Dict, List

def create_location_mapping():
    """Create mapping from placeID to location_id"""
    
    # Based on your actual location data from Supabase
    placeid_to_location_mapping = {
        11262: "1f3168d0-ba4f-4f02-995e-0e53e4cdd11d",  # KöD Bergen
        11267: "9cb923c1-4446-41dd-b066-5dd1998c68dd",  # KöD Vesterbro  
        11269: "14190a09-0122-45a3-9ee8-e1c097e4ea74",  # KöD København
        11270: "3894772c-751d-42f5-ae71-d7266e7c8abe",  # KöD Aarhus
        11272: "8d7454f7-13c5-4edf-986c-34226b4b3d0d",  # Basso Aarhus
        11273: "1462345d-5c59-4024-a84e-a9cfe7d5c05c",  # Basso København
        11274: "c9ff9225-822a-4c39-80fe-0d45aee72d06",  # Keyser Social Aarhus
        11275: "5597d17a-8fa8-41d7-a4fd-3dc736d133be",  # Klokken Aarhus
        11276: "cdfa8509-b5be-4d9f-a319-921fa4163e1b",  # Cinco Aarhus
        11277: "4f7f2214-e452-4dc9-a89a-583b8c9f1501",  # Feed Bistro
        11278: "e54a2268-063a-4b36-940b-b3afc0f76ff8",  # Keyser Social København
        11279: "c5da1663-0689-42a4-9e8d-75c1223ec4f5",  # Cinco København
        11280: "9e2d666b-b366-45d4-9b3e-8fa41f8f352e",  # KöD Posthallen (Oslo)
        11281: "b2a67990-d237-4f17-abef-6533892e6f19",  # KöD Frogner
        11282: "005eb9ba-4e52-4719-9773-c09e860aaf54",  # Keyser Social Oslo (Frogner)
        11283: "1e5f4501-72a5-436e-b957-037873cd9a0e",  # Basso Social Oslo
        11284: "d2387480-1f3d-4196-a22f-ec9969d28024",  # Basso Social Bergen
        11757: "f0618aa6-0c66-4ce1-a93a-97da8ff85fca",  # KöD Soho
        11758: "23fa0644-a4aa-46bf-9e02-0d419b174b13"   # KöD London City
    }
    
    # Restaurant names for reference
    restaurant_names = {
        11262: "KöD Bergen",
        11267: "KöD Vesterbro",
        11269: "KöD København",
        11270: "KöD Aarhus",
        11272: "Basso Aarhus",
        11273: "Basso København",
        11274: "Keyser Social Aarhus",
        11275: "Klokken Aarhus",
        11276: "Cinco Aarhus",
        11277: "Feed Bistro",
        11278: "Keyser Social København",
        11279: "Cinco København",
        11280: "KöD Posthallen",
        11281: "KöD Frogner",
        11282: "Keyser Social Oslo",
        11283: "Basso Social Oslo",
        11284: "Basso Social Bergen",
        11757: "KöD Soho",
        11758: "KöD London City"
    }
    
    print("🏪 Restaurant to Location Mapping")
    print("=" * 50)
    print("Based on your actual Supabase location data:")
    print()
    
    for place_id, location_id in placeid_to_location_mapping.items():
        restaurant_name = restaurant_names[place_id]
        print(f"placeID: {place_id:5d} → location_id: '{location_id}' ({restaurant_name})")
    
    print()
    print("🔧 Update your booking_sync_github.py with this mapping:")
    print("=" * 50)
    
    print("""
def get_location_mapping() -> Dict[int, str]:
    \"\"\"Get mapping from placeID to location_id\"\"\"
    return {""")
    i alread
    for place_id, location_id in placeid_to_location_mapping.items():
        restaurant_name = restaurant_names[place_id]
        print(f"        {place_id}: \"{location_id}\",  # {restaurant_name}")
    
    print("    }")
    print("")
    
    print("📊 Available restaurants in your booking data:")
    print("=" * 50)
    booking_placeids = [11758, 11757, 11284, 11283, 11282, 11281, 11280, 11279, 11278]
    for place_id in booking_placeids:
        if place_id in placeid_to_location_mapping:
            location_id = placeid_to_location_mapping[place_id]
            restaurant_name = restaurant_names[place_id]
            print(f"✅ {place_id:5d} → {location_id} ({restaurant_name})")
        else:
            print(f"❌ {place_id:5d} → NOT FOUND in location mapping")

if __name__ == "__main__":
    create_location_mapping()
