"""
Cache Service for Booking Integration
Provides in-memory caching with TTL support
"""

import time
import logging
from typing import Any, Optional, Dict
from threading import Lock

logger = logging.getLogger(__name__)


class CacheService:
    """
    Simple in-memory cache with TTL support
    Optimized for booking data caching
    """
    
    def __init__(self, default_ttl: int = 900):  # 15 minutes default
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
        self.lock = Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        with self.lock:
            if key not in self.cache:
                return None
            
            entry = self.cache[key]
            if time.time() > entry['expires_at']:
                del self.cache[key]
                return None
            
            return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        if ttl is None:
            ttl = self.default_ttl
        
        with self.lock:
            self.cache[key] = {
                'value': value,
                'expires_at': time.time() + ttl,
                'created_at': time.time()
            }
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        with self.lock:
            if key in self.cache:
                del self.cache[key]
                return True
            return False
    
    def clear(self) -> int:
        """Clear all cache entries"""
        with self.lock:
            count = len(self.cache)
            self.cache.clear()
            return count
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear cache entries matching pattern"""
        with self.lock:
            keys_to_delete = [key for key in self.cache.keys() if pattern in key]
            for key in keys_to_delete:
                del self.cache[key]
            return len(keys_to_delete)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self.lock:
            now = time.time()
            total_entries = len(self.cache)
            expired_entries = sum(
                1 for entry in self.cache.values() 
                if now > entry['expires_at']
            )
            
            return {
                'total_entries': total_entries,
                'active_entries': total_entries - expired_entries,
                'expired_entries': expired_entries,
                'hit_rate': 0,  # Would need to track hits/misses
                'memory_usage': len(str(self.cache))
            }
    
    def cleanup_expired(self) -> int:
        """Remove expired entries"""
        with self.lock:
            now = time.time()
            expired_keys = [
                key for key, entry in self.cache.items()
                if now > entry['expires_at']
            ]
            
            for key in expired_keys:
                del self.cache[key]
            
            return len(expired_keys)