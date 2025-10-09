#!/usr/bin/env python3
"""
Booking Sync Script for GitHub Actions
Fetches data from Azure SQL and inserts into Supabase PAX table
"""

import os
import sys
import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_azure_connection():
    """Get Azure SQL connection using pyodbc with SQL authentication"""
    import os, pyodbc, logging
    logger = logging.getLogger(__name__)

    server = os.getenv("D6_DB_SERVER")
    database = os.getenv("D6_DB_DATABASE")
    user = os.getenv("D6_DB_USER")
    password = os.getenv("D6_DB_PASSWORD")

    if not all([server, database, user, password]):
        raise ValueError("Missing DB env vars")

    server_short = server.split(".")[0]
    # Try both formats: contained user and user@servername
    candidates = [user] if "@" in user else [user, f"{user}@{server_short}"]

    last = None
    for cand in candidates:
        cs = (
            "Driver={ODBC Driver 18 for SQL Server};"
            f"Server=tcp:{server},1433;"
            f"Database={database};"
            f"Uid={cand};"
            f"Pwd={password};"
            "Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
            "Authentication=SqlPassword;"
        )
        try:
            logger.info(f"ODBC connect: user={cand} db={database}")
            return pyodbc.connect(cs)
        except pyodbc.Error as e:
            logger.warning(f"Failed with user={cand}: {e}")
            last = e
            continue
    
    raise last

def get_supabase_client():
    """Get Supabase client"""
    try:
        from supabase import create_client, Client
        
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        
        supabase: Client = create_client(url, key)
        return supabase
    except ImportError:
        logger.error("supabase-py not installed")
        raise
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        raise

def fetch_booking_data_for_dates(conn, place_id: Optional[int] = None, dates: List[str] = None) -> List[Dict]:
    """Fetch booking data for specific dates"""
    try:
        cursor = conn.cursor()
        
        if not dates:
            logger.warning("No dates provided for fetching")
            return []
        
        logger.info(f"Fetching booking data for {len(dates)} specific dates")
        
        # Build query with IN clause for specific dates
        placeholders = ','.join(['?' for _ in dates])
        query = f"""
            SELECT 
                placeID,
                placeName,
                date,
                SUM(persons) as total_persons,
                COUNT(*) as booking_count
            FROM stg.easytable_bookings
            WHERE date IN ({placeholders})
            AND status = 1  -- confirmed bookings
        """
        
        params = dates.copy()
        
        if place_id:
            query += " AND placeID = ?"
            params.append(place_id)
        
        query += " GROUP BY placeID, placeName, date ORDER BY date DESC, placeID"
        
        cursor.execute(query, params)
        
        # Fetch results
        results = cursor.fetchall()
        
        # Convert to list of dictionaries
        booking_data = []
        for row in results:
            booking_data.append({
                'placeID': row[0],
                'placeName': row[1],
                'date': row[2].isoformat() if hasattr(row[2], 'isoformat') else str(row[2]),
                'total_persons': row[3],
                'booking_count': row[4]
            })
        
        logger.info(f"Fetched {len(booking_data)} booking records for {len(dates)} dates")
        return booking_data
        
    except Exception as e:
        logger.error(f"Error fetching booking data for dates: {e}")
        raise

def fetch_booking_data_since(conn, place_id: Optional[int] = None, since_date: str = None) -> List[Dict]:
    """Fetch booking data since a specific date"""
    try:
        cursor = conn.cursor()
        
        # Parse the since_date
        from datetime import datetime
        since_datetime = datetime.fromisoformat(since_date) if since_date else None
        
        logger.info(f"Fetching booking data since {since_date}")
        
        # Build query
        query = """
            SELECT 
                placeID,
                placeName,
                date,
                SUM(persons) as total_persons,
                COUNT(*) as booking_count
            FROM stg.easytable_bookings
            WHERE date >= ?
            AND status = 1  -- confirmed bookings
        """
        
        params = [since_datetime]
        
        if place_id:
            query += " AND placeID = ?"
            params.append(place_id)
        
        query += " GROUP BY placeID, placeName, date ORDER BY date DESC, placeID"
        
        cursor.execute(query, params)
        
        # Fetch results
        results = cursor.fetchall()
        
        # Convert to list of dictionaries
        booking_data = []
        for row in results:
            booking_data.append({
                'placeID': row[0],
                'placeName': row[1],
                'date': row[2].isoformat() if hasattr(row[2], 'isoformat') else str(row[2]),
                'total_persons': row[3],
                'booking_count': row[4]
            })
        
        logger.info(f"Fetched {len(booking_data)} booking records since {since_date}")
        return booking_data
        
    except Exception as e:
        logger.error(f"Error fetching booking data: {e}")
        raise

def fetch_booking_data(conn, place_id: Optional[int] = None, days_back: int = 30) -> List[Dict]:
    """Fetch booking data from Azure SQL"""
    try:
        cursor = conn.cursor()
        
        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)
        
        logger.info(f"Fetching booking data from {start_date} to {end_date}")
        
        # Build query
        query = """
            SELECT 
                placeID,
                placeName,
                date,
                SUM(persons) as total_persons,
                COUNT(*) as booking_count
            FROM stg.easytable_bookings
            WHERE date >= ? AND date <= ?
            AND status = 1  -- confirmed bookings
        """
        
        params = [start_date, end_date]
        
        if place_id:
            query += " AND placeID = ?"
            params.append(place_id)
        
        query += " GROUP BY placeID, placeName, date ORDER BY date DESC, placeID"
        
        cursor.execute(query, params)
        
        # Fetch results
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
        # Convert to list of dictionaries
        booking_data = []
        for row in rows:
            record = dict(zip(columns, row))
            # Convert date to string
            if record['date']:
                record['date'] = record['date'].isoformat()
            booking_data.append(record)
        
        logger.info(f"Fetched {len(booking_data)} booking records")
        return booking_data
        
    except Exception as e:
        logger.error(f"Error fetching booking data: {e}")
        raise

def fetch_all_2025_booking_data(conn, place_id: Optional[int] = None) -> List[Dict]:
    """Fetch all booking data from 2025-01-01 up until today"""
    try:
        cursor = conn.cursor()
        
        # Set date range from 2025-01-01 to today
        start_date = date(2025, 1, 1)
        end_date = date.today()
        
        logger.info(f"Fetching ALL 2025 booking data from {start_date} to {end_date}")
        
        # Build query
        query = """
            SELECT 
                placeID,
                placeName,
                date,
                SUM(persons) as total_persons,
                COUNT(*) as booking_count
            FROM stg.easytable_bookings
            WHERE date >= ? AND date <= ?
            AND status = 1  -- confirmed bookings
        """
        
        params = [start_date, end_date]
        
        if place_id:
            query += " AND placeID = ?"
            params.append(place_id)
        
        query += " GROUP BY placeID, placeName, date ORDER BY date DESC, placeID"
        
        cursor.execute(query, params)
        
        # Fetch results
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
        # Convert to list of dictionaries
        booking_data = []
        for row in rows:
            record = dict(zip(columns, row))
            # Convert date to string
            if record['date']:
                record['date'] = record['date'].isoformat()
            booking_data.append(record)
        
        logger.info(f"Fetched {len(booking_data)} booking records from 2025")
        return booking_data
        
    except Exception as e:
        logger.error(f"Error fetching 2025 booking data: {e}")
        raise

def get_location_mapping() -> Dict[int, str]:
    """Get mapping from placeID to location_id"""
    # Based on your actual Supabase location data
    # placeID -> location_id mapping
    return {
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

def insert_pax_records(supabase, booking_data: List[Dict], organization_id: str) -> Dict[str, int]:
    """Insert PAX records into Supabase using batched upserts"""
    from itertools import islice
    
    try:
        # Get location mapping once
        location_mapping = get_location_mapping()
        
        # Build all rows once
        payload = []
        for booking in booking_data:
            place_id = booking['placeID']
            
            # Check if we have a mapping for this placeID
            if place_id not in location_mapping:
                logger.warning(f"Unknown placeID: {place_id}, skipping")
                continue
            
            location_id = location_mapping[place_id]
            
            payload.append({
                'date_id': booking['date'],                # 'YYYY-MM-DD'
                'location_id': location_id,
                'pax_count': int(booking['total_persons']),
                'organization_id': organization_id,
            })
        
        if not payload:
            logger.info("No valid PAX records to process")
            return {"inserted": 0, "updated": 0, "errors": 0}
        
        # Helper: chunk list
        def chunks(lst, n):
            it = iter(lst)
            while True:
                chunk = list(islice(it, n))
                if not chunk:
                    break
                yield chunk
        
        # Upsert in batches (avoid per-row GET)
        inserted = updated = errors = 0
        batch_size = 500  # Safe for PostgREST
        total_batches = (len(payload) + batch_size - 1) // batch_size
        
        logger.info(f"Upserting {len(payload)} pax rows in {total_batches} batches")
        
        for batch_num, batch in enumerate(chunks(payload, batch_size), 1):
            try:
                # Use upsert with on_conflict for efficient batch operations
                supabase.table("pax") \
                    .upsert(batch, on_conflict="date_id,location_id,organization_id") \
                    .execute()
                
                # We can't split insert/update exactly with upsert, so track as processed
                processed = len(batch)
                inserted += processed
                
                logger.info(f"Batch {batch_num}/{total_batches}: processed {processed} records")
                
            except Exception as e:
                logger.error(f"Upsert batch {batch_num} failed ({len(batch)} rows): {e}")
                errors += len(batch)
        
        logger.info(f"PAX records processed: {inserted} upserted, {errors} errors")
        return {"inserted": inserted, "updated": 0, "errors": errors}
        
    except Exception as e:
        logger.error(f"Error in batched PAX upsert: {e}")
        return {'inserted': 0, 'updated': 0, 'errors': 1}

def get_missing_dates(supabase, organization_id: str, start_date: str, end_date: str) -> List[str]:
    """Get list of dates that are missing in the pax table for the given interval"""
    try:
        from datetime import datetime, timedelta
        
        # Parse dates
        start = datetime.fromisoformat(start_date).date()
        end = datetime.fromisoformat(end_date).date()
        
        # Generate all dates in the interval
        all_dates = []
        current = start
        while current <= end:
            all_dates.append(current.isoformat())
            current += timedelta(days=1)
        
        # Get existing dates from pax table for this organization
        result = supabase.table('pax').select('date_id').eq('organization_id', organization_id).gte('date_id', start_date).lte('date_id', end_date).execute()
        
        existing_dates = set()
        if result.data:
            existing_dates = {row['date_id'] for row in result.data}
        
        # Find missing dates
        missing_dates = [date for date in all_dates if date not in existing_dates]
        
        logger.info(f"Date interval: {start_date} to {end_date}")
        logger.info(f"Total dates in interval: {len(all_dates)}")
        logger.info(f"Existing dates: {len(existing_dates)}")
        logger.info(f"Missing dates: {len(missing_dates)}")
        
        return missing_dates
        
    except Exception as e:
        logger.error(f"Error getting missing dates: {e}")
        return []

def main():
    """Main function"""
    try:
        logger.info("Starting booking sync process")

        # Get parameters
        organization_id = os.getenv("ORGANIZATION_ID")
        location_id = os.getenv("LOCATION_ID")
        start_date = os.getenv("START_DATE")
        end_date = os.getenv("END_DATE")
        business_type = os.getenv("BUSINESS_TYPE", "restaurant")

        if not organization_id:
            raise ValueError("ORGANIZATION_ID environment variable not set")

        # Set default date range if not provided
        if not start_date or not end_date:
            from datetime import date, timedelta
            end_date = end_date or date.today().isoformat()
            start_date = start_date or (date.today() - timedelta(days=30)).isoformat()

        if location_id:
            place_id = int(location_id)  # Convert location_id to place_id for backward compatibility
        else:
            place_id = None

        logger.info(f"Parameters: organization_id={organization_id}, location_id={location_id}, start_date={start_date}, end_date={end_date}, business_type={business_type}")

        # Connect to Supabase first to find missing dates
        supabase = get_supabase_client()
        
        # Get missing dates in the interval
        missing_dates = get_missing_dates(supabase, organization_id, start_date, end_date)
        
        if not missing_dates:
            logger.info("No missing dates found - all data is already synced!")
            return

        logger.info(f"Will fetch data for {len(missing_dates)} missing dates")

        # Connect to Azure SQL
        azure_conn = get_azure_connection()

        # Fetch booking data for missing dates only
        booking_data = fetch_booking_data_for_dates(azure_conn, place_id, missing_dates)
        
        if not booking_data:
            logger.warning("No booking data found")
            return
        
        # Insert PAX records
        result = insert_pax_records(supabase, booking_data, organization_id)
        
        logger.info(f"Sync completed: {result['inserted']} inserted, {result['updated']} updated, {result['errors']} errors")
        
        # No need to update sync date - we'll get it from the pax table next time
        
        # Close connections
        azure_conn.close()
        
    except Exception as e:
        logger.error(f"Booking sync failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
