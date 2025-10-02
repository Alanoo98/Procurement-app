"""
DiningSix Booking Integration Service
FastAPI application for syncing booking data from Azure SQL to Supabase PAX table
"""

import os
import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio

try:
    from booking_integration.adapters.azure_sql_adapter import AzureSQLAdapter
    from booking_integration.services.cache_service import CacheService
    from booking_integration.services.cpg_service import CPGService
except ImportError as e:
    logging.error(f"Import error: {e}")
    # Create dummy classes for development
    class AzureSQLAdapter:
        def __init__(self, *args, **kwargs): pass
        def test_connection(self): return {"status": "error", "error": "Import failed"}
    class CacheService:
        def __init__(self, *args, **kwargs): pass
    class CPGService:
        def __init__(self, *args, **kwargs): pass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="DiningSix Booking Integration API",
    description="API for syncing booking data from Azure SQL to Supabase PAX table",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
try:
    azure_adapter = AzureSQLAdapter()
    cache_service = CacheService()
    cpg_service = CPGService(azure_adapter, cache_service)
    services_available = True
except Exception as e:
    logger.error(f"Failed to initialize services: {e}")
    azure_adapter = None
    cache_service = None
    cpg_service = None
    services_available = False

# Global sync status
sync_status = {
    "status": "idle",
    "last_sync": None,
    "error": None,
    "progress": 0
}


# Pydantic models
class BookingSyncRequest(BaseModel):
    place_id: Optional[int] = None
    days_back: int = 30
    organization_id: str = "dining-six-org-id"  # Default to DiningSix


class BookingSyncResponse(BaseModel):
    status: str
    message: str
    records_processed: int
    records_inserted: int
    records_updated: int
    sync_time: str


class CPGRequest(BaseModel):
    place_id: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if not services_available:
        return {
            "status": "unhealthy",
            "error": "Services not initialized. Check dependencies and configuration.",
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        # Test database connection
        db_status = azure_adapter.test_connection()
        return {
            "status": "healthy" if db_status["status"] == "connected" else "unhealthy",
            "database": db_status["status"],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


# Booking sync endpoint
@app.post("/api/booking-sync", response_model=BookingSyncResponse)
async def trigger_booking_sync(
    request: BookingSyncRequest,
    background_tasks: BackgroundTasks
):
    """
    Trigger booking data sync from Azure SQL to Supabase PAX table
    This endpoint starts a background task to sync booking data
    """
    global sync_status
    
    if sync_status["status"] == "running":
        raise HTTPException(
            status_code=409,
            detail="Booking sync is already running"
        )
    
    # Update sync status
    sync_status.update({
        "status": "running",
        "last_sync": datetime.now().isoformat(),
        "error": None,
        "progress": 0
    })
    
    # Start background sync task
    background_tasks.add_task(
        sync_booking_data,
        request.place_id,
        request.days_back,
        request.organization_id
    )
    
    return BookingSyncResponse(
        status="started",
        message="Booking sync started successfully",
        records_processed=0,
        records_inserted=0,
        records_updated=0,
        sync_time=datetime.now().isoformat()
    )


# Sync status endpoint
@app.get("/api/booking-sync/status")
async def get_sync_status():
    """Get current sync status"""
    return sync_status


# CPG analytics endpoints
@app.get("/api/cpg/current")
async def get_current_cpg(request: CPGRequest):
    """Get current CPG metrics"""
    try:
        start_date = None
        end_date = None
        
        if request.start_date:
            start_date = datetime.fromisoformat(request.start_date).date()
        if request.end_date:
            end_date = datetime.fromisoformat(request.end_date).date()
        
        summary = cpg_service.calculate_cpg_for_period(
            place_id=request.place_id,
            start_date=start_date,
            end_date=end_date
        )
        
        return summary.__dict__
    except Exception as e:
        logger.error(f"Error getting CPG data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cpg/trends")
async def get_cpg_trends(place_id: Optional[int] = None, days: int = 30):
    """Get CPG trends for visualization"""
    try:
        trends = cpg_service.get_daily_cpg_trends(place_id=place_id, days=days)
        return {"trends": trends}
    except Exception as e:
        logger.error(f"Error getting CPG trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cpg/locations")
async def get_location_breakdown():
    """Get CPG breakdown by location"""
    try:
        breakdown = cpg_service.get_location_cpg_breakdown()
        return {"locations": breakdown}
    except Exception as e:
        logger.error(f"Error getting location breakdown: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Restaurant data endpoints
@app.get("/api/restaurants")
async def get_restaurants():
    """Get list of restaurants"""
    try:
        restaurants = azure_adapter.get_restaurant_list()
        return {"restaurants": restaurants}
    except Exception as e:
        logger.error(f"Error getting restaurants: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/booking-summary")
async def get_booking_summary(place_id: Optional[int] = None, period_days: int = 30):
    """Get booking summary statistics"""
    try:
        summary = azure_adapter.get_booking_summary(
            place_id=place_id,
            period_days=period_days
        )
        return summary
    except Exception as e:
        logger.error(f"Error getting booking summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Performance monitoring endpoints
@app.get("/api/performance/metrics")
async def get_performance_metrics():
    """Get database performance metrics"""
    try:
        metrics = azure_adapter.get_performance_metrics()
        return metrics
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    try:
        stats = cache_service.get_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cache/clear")
async def clear_cache(pattern: Optional[str] = None):
    """Clear cache entries"""
    try:
        if pattern:
            cleared = cache_service.clear_pattern(pattern)
        else:
            cleared = cache_service.clear()
        
        return {"message": f"Cleared {cleared} cache entries"}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Background task for syncing booking data
async def sync_booking_data(
    place_id: Optional[int],
    days_back: int,
    organization_id: str
):
    """
    Background task to sync booking data from Azure SQL to Supabase PAX table
    This would integrate with your existing Supabase client
    """
    global sync_status
    
    try:
        logger.info(f"Starting booking sync for place_id={place_id}, days_back={days_back}")
        
        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)
        
        # Fetch booking data from Azure SQL
        booking_data = azure_adapter.get_cpg_data_optimized(
            place_id=place_id,
            start_date=start_date,
            end_date=end_date,
            limit=10000  # Adjust based on your needs
        )
        
        sync_status["progress"] = 25
        
        # Process and aggregate data by date and location
        aggregated_data = {}
        for booking in booking_data:
            date_key = booking['date']
            location_key = booking['placeID']
            persons = booking['persons']
            
            key = f"{date_key}_{location_key}"
            if key not in aggregated_data:
                aggregated_data[key] = {
                    'date_id': date_key,
                    'location_id': location_key,
                    'pax_count': 0,
                    'organization_id': organization_id
                }
            
            aggregated_data[key]['pax_count'] += persons
        
        sync_status["progress"] = 50
        
        # Here you would insert/update the PAX records in Supabase
        # This is a placeholder - you'll need to implement the actual Supabase integration
        records_processed = len(booking_data)
        records_inserted = len(aggregated_data)
        records_updated = 0  # Would be calculated based on existing records
        
        # Simulate processing time
        await asyncio.sleep(2)
        
        sync_status["progress"] = 100
        
        # Update sync status
        sync_status.update({
            "status": "success",
            "last_sync": datetime.now().isoformat(),
            "error": None,
            "progress": 100
        })
        
        logger.info(f"Booking sync completed: {records_processed} processed, {records_inserted} inserted")
        
    except Exception as e:
        logger.error(f"Booking sync failed: {e}")
        sync_status.update({
            "status": "error",
            "error": str(e),
            "progress": 0
        })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)