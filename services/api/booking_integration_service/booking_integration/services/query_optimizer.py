"""
Query Optimizer for Azure SQL Database
Provides optimized queries for booking data retrieval
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import date, timedelta

logger = logging.getLogger(__name__)


class QueryOptimizer:
    """
    Optimizes queries for Azure SQL database
    Provides pre-built optimized queries for common operations
    """
    
    @staticmethod
    def get_optimized_cpg_query(
        place_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 1000
    ) -> tuple[str, list]:
        """
        Get optimized query for CPG calculations
        Uses existing indexes for maximum performance
        """
        # Base query using the optimized index
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
            AND status = 'confirmed'
        """
        
        params = [start_date, end_date]
        
        if place_id:
            query += " AND placeID = ?"
            params.append(place_id)
        
        # Use index for ordering
        query += " ORDER BY date DESC, placeID"
        
        # Limit results
        query += " OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY"
        params.append(limit)
        
        return query, params
    
    @staticmethod
    def get_restaurant_summary_query(
        place_id: Optional[int] = None,
        period_days: int = 30
    ) -> tuple[str, list]:
        """
        Get optimized query for restaurant summary
        """
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
        
        end_date = date.today()
        start_date = end_date - timedelta(days=period_days)
        params = [start_date, end_date]
        
        if place_id:
            query += " AND placeID = ?"
            params.append(place_id)
        
        return query, params
    
    @staticmethod
    def get_daily_aggregation_query(
        place_id: Optional[int] = None,
        days: int = 30
    ) -> tuple[str, list]:
        """
        Get optimized query for daily guest aggregation
        """
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
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        params = [start_date, end_date]
        
        if place_id:
            query += " AND placeID = ?"
            params.append(place_id)
        
        query += " GROUP BY date ORDER BY date"
        
        return query, params
    
    @staticmethod
    def get_restaurant_list_query() -> tuple[str, list]:
        """
        Get optimized query for restaurant list
        """
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
        
        return query, []
    
    @staticmethod
    def get_performance_monitoring_query() -> tuple[str, list]:
        """
        Get query for performance monitoring
        """
        query = """
            SELECT 
                COUNT(*) as total_rows,
                COUNT(DISTINCT placeID) as unique_restaurants,
                MIN(date) as earliest_date,
                MAX(date) as latest_date,
                COUNT(CASE WHEN date >= DATEADD(day, -7, GETDATE()) THEN 1 END) as recent_bookings
            FROM stg.easytable_bookings
        """
        
        return query, []
    
    @staticmethod
    def get_index_usage_query() -> tuple[str, list]:
        """
        Get query for index usage statistics
        """
        query = """
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
        """
        
        return query, []
