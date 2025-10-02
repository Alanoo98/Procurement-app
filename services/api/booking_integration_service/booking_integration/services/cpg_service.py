"""
CPG (Cost Per Guest) Calculation Service
Optimized for efficient data processing and real-time analytics
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
from dataclasses import dataclass
from .cache_service import CacheService
from ..adapters.azure_sql_adapter import AzureSQLAdapter

logger = logging.getLogger(__name__)


@dataclass
class CPGMetrics:
    """CPG calculation results"""
    date: str
    location_id: int
    location_name: str
    total_guests: int
    total_bookings: int
    avg_party_size: float
    cpg_value: Optional[float] = None
    procurement_cost: Optional[float] = None


@dataclass
class CPGSummary:
    """CPG summary for dashboard"""
    period_start: str
    period_end: str
    total_guests: int
    total_bookings: int
    avg_cpg: Optional[float]
    locations: List[CPGMetrics]
    trends: Dict[str, Any]


class CPGService:
    """
    Service for calculating Cost Per Guest (CPG) metrics
    Optimized for real-time calculations with caching
    """
    
    def __init__(self, azure_adapter: AzureSQLAdapter, cache_service: CacheService):
        self.azure_adapter = azure_adapter
        self.cache_service = cache_service