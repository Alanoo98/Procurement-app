"""
Optimized Azure SQL Adapter for DiningSix Booking Data
Direct queries with minimal data fetching for CPG analytics
"""

import pyodbc
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
import os
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class AzureSQLAdapter:
    """
    Optimized Azure SQL adapter for direct booking data queries
    Focuses on fetching only necessary data for CPG calculations
    """
    
    def __init__(self, connection_string: Optional[str] = None):
        self.connection_string = connection_string or os.getenv("AZURE_SQL_CONNECTION_STRING")
        if not self.connection_string:
            raise ValueError("Azure SQL connection string is required")
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections with proper cleanup"""
        conn = None
        try:
            conn = pyodbc.connect(self.connection_string, timeout=30)
            yield conn
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def test_connection(self) -> Dict[str, Any]:
        """Test database connection and return basic info"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Test basic connectivity
                cursor.execute("SELECT 1 as test")
                test_result = cursor.fetchone()[0]
                
                # Get table row counts for monitoring
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_bookings,
                        COUNT(DISTINCT placeID) as total_restaurants,
                        MIN(date) as earliest_booking,
                        MAX(date) as latest_booking
                    FROM stg.easytable_bookings
                """)
                
                stats = cursor.fetchone()
                
                return {
                    "status": "connected",
                    "test_query": test_result,
                    "total_bookings": stats[0],
                    "total_restaurants": stats[1],
                    "earliest_booking": stats[2].isoformat() if stats[2] else None,
                    "latest_booking": stats[3].isoformat() if stats[3] else None,
                    "timestamp": datetime.now().isoformat()
                }
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def get_cpg_data_optimized(
        self, 
        place_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Optimized query for CPG calculations - fetches only essential fields
        Uses existing indexes for maximum performance
        """
        try:
            # Default to last 30 days if no dates provided
            if not end_date:
                end_date = date.today()
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Optimized query using existing indexes
                # Only fetches fields needed for CPG calculations
                query = """
                    SELECT 
                        date,
                        placeID,
                        placeName,
                        persons,
                        status,
                        createdOn
                    FROM stg.easytable_bookings
                    WHERE date >= ? AND date <= ?
                """
                
                params = [start_date, end_date]
                
                if place_id:
                    query += " AND placeID = ?"
                    params.append(place_id)
                
                # Only get confirmed bookings for CPG calculations
                query += " AND status = 'confirmed'"
                
                # Use existing index for optimal performance
                query += " ORDER BY date DESC, placeID"
                
                # Limit results to prevent memory issues
                query += " OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY"
                params.append(limit)
                
                cursor.execute(query, params)
                
                # Fetch results efficiently
                columns = [column[0] for column in cursor.description]
                results = []
                
                for row in cursor.fetchall():
                    result = dict(zip(columns, row))
                    # Convert datetime objects to ISO strings
                    if result['date']:
                        result['date'] = result['date'].isoformat()
                    if result['createdOn']:
                        result['createdOn'] = result['createdOn'].isoformat()
                    results.append(result)
                
                logger.info(f"Retrieved {len(results)} booking records for CPG calculation")
                return results
                
        except Exception as e:
            logger.error(f"Error fetching CPG data: {e}")
            raise
    
    def get_restaurant_list(self) -> List[Dict[str, Any]]:
        """Get list of restaurants with basic info"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                query = """
                    SELECT DISTINCT 
                        b.placeID,
                        b.placeName,
                        r.restaurant,
                        r.country,
                        COUNT(*) as total_bookings
                    FROM stg.easytable_bookings b
                    LEFT JOIN stg.easytable_restauranter r ON b.placeID = r.restaurantId
                    WHERE b.date >= DATEADD(day, -90, GETDATE())
                    GROUP BY b.placeID, b.placeName, r.restaurant, r.country
                    ORDER BY total_bookings DESC
                """
                
                cursor.execute(query)
                
                columns = [column[0] for column in cursor.description]
                results = []
                
                for row in cursor.fetchall():
                    result = dict(zip(columns, row))
                    results.append(result)
                
                return results
                
        except Exception as e:
            logger.error(f"Error fetching restaurant list: {e}")
            raise
    
    def get_booking_summary(
        self,
        place_id: Optional[int] = None,
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Get optimized booking summary for dashboard
        Uses aggregated queries to minimize data transfer
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Calculate date range
                end_date = date.today()
                start_date = end_date - timedelta(days=period_days)
                
                query = """
                    SELECT 
                        COUNT(*) as total_bookings,
                        SUM(persons) as total_guests,
                        AVG(CAST(persons as FLOAT)) as avg_party_size,
                        COUNT(DISTINCT placeID) as active_restaurants,
                        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                        COUNT(CASE WHEN walkin = 1 THEN 1 END) as walkin_bookings,
                        COUNT(CASE WHEN webBooking = 1 THEN 1 END) as web_bookings
                    FROM stg.easytable_bookings
                    WHERE date >= ? AND date <= ?
                """
                
                params = [start_date, end_date]
                
                if place_id:
                    query += " AND placeID = ?"
                    params.append(place_id)
                
                cursor.execute(query, params)
                result = cursor.fetchone()
                
                if result:
                    columns = [column[0] for column in cursor.description]
                    summary = dict(zip(columns, result))
                    
                    # Calculate additional metrics
                    if summary['total_bookings'] > 0:
                        summary['confirmation_rate'] = (
                            summary['confirmed_bookings'] / summary['total_bookings'] * 100
                        )
                        summary['cancellation_rate'] = (
                            summary['cancelled_bookings'] / summary['total_bookings'] * 100
                        )
                    else:
                        summary['confirmation_rate'] = 0
                        summary['cancellation_rate'] = 0
                    
                    summary['period_start'] = start_date.isoformat()
                    summary['period_end'] = end_date.isoformat()
                    summary['period_days'] = period_days
                    
                    return summary
                
                return {}
                
        except Exception as e:
            logger.error(f"Error fetching booking summary: {e}")
            raise
    
    def get_daily_guest_counts(
        self,
        place_id: Optional[int] = None,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get daily guest counts for trend analysis
        Optimized for dashboard visualization
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                end_date = date.today()
                start_date = end_date - timedelta(days=days)
                
                query = """
                    SELECT 
                        date,
                        SUM(persons) as total_guests,
                        COUNT(*) as total_bookings,
                        AVG(CAST(persons as FLOAT)) as avg_party_size
                    FROM stg.easytable_bookings
                    WHERE date >= ? AND date <= ?
                    AND status = 'confirmed'
                """
                
                params = [start_date, end_date]
                
                if place_id:
                    query += " AND placeID = ?"
                    params.append(place_id)
                
                query += " GROUP BY date ORDER BY date"
                
                cursor.execute(query, params)
                
                columns = [column[0] for column in cursor.description]
                results = []
                
                for row in cursor.fetchall():
                    result = dict(zip(columns, row))
                    if result['date']:
                        result['date'] = result['date'].isoformat()
                    results.append(result)
                
                return results
                
        except Exception as e:
            logger.error(f"Error fetching daily guest counts: {e}")
            raise
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get database performance metrics for monitoring"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Get table statistics
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_rows,
                        COUNT(DISTINCT placeID) as unique_restaurants,
                        MIN(date) as earliest_date,
                        MAX(date) as latest_date,
                        COUNT(CASE WHEN date >= DATEADD(day, -7, GETDATE()) THEN 1 END) as recent_bookings
                    FROM stg.easytable_bookings
                """)
                
                stats = cursor.fetchone()
                
                # Get index usage statistics
                cursor.execute("""
                    SELECT 
                        i.name as index_name,
                        s.user_seeks,
                        s.user_scans,
                        s.user_lookups,
                        s.user_updates
                    FROM sys.indexes i
                    LEFT JOIN sys.dm_db_index_usage_stats s ON i.object_id = s.object_id AND i.index_id = s.index_id
                    WHERE i.object_id = OBJECT_ID('stg.easytable_bookings')
                    AND i.name IS NOT NULL
                """)
                
                index_stats = []
                for row in cursor.fetchall():
                    index_stats.append({
                        'index_name': row[0],
                        'user_seeks': row[1] or 0,
                        'user_scans': row[2] or 0,
                        'user_lookups': row[3] or 0,
                        'user_updates': row[4] or 0
                    })
                
                return {
                    'table_stats': {
                        'total_rows': stats[0],
                        'unique_restaurants': stats[1],
                        'earliest_date': stats[2].isoformat() if stats[2] else None,
                        'latest_date': stats[3].isoformat() if stats[3] else None,
                        'recent_bookings': stats[4]
                    },
                    'index_usage': index_stats,
                    'timestamp': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error fetching performance metrics: {e}")
            raise