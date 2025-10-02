# 🚀 Comprehensive Caching Implementation Plan with Nightly Updates

## Overview

This document outlines a comprehensive caching implementation plan for the procurement system, incorporating automated nightly data updates and leveraging the specialized agent system for coordinated development.

## Table of Contents

- [Agent Coordination Strategy](#agent-coordination-strategy)
- [Phase 1: Architecture & Configuration](#phase-1-architecture--configuration)
- [Phase 2: Database Nightly Update System](#phase-2-database-nightly-update-system)
- [Phase 3: API Nightly Update System](#phase-3-api-nightly-update-system)
- [Phase 4: Frontend Nightly Update Integration](#phase-4-frontend-nightly-update-integration)
- [Phase 5: DevOps Nightly Update Orchestration](#phase-5-devops-nightly-update-orchestration)
- [Phase 6: Business Logic for Nightly Updates](#phase-6-business-logic-for-nightly-updates)
- [Implementation Timeline](#implementation-timeline)
- [Success Metrics](#success-metrics)

## Agent Coordination Strategy

The implementation leverages specialized agents to ensure each aspect of the caching system is handled by experts in their respective domains.

### Agent Responsibilities

| Agent | Primary Responsibilities | Nightly Update Focus |
|-------|-------------------------|---------------------|
| **Frontend Agent** | React Query integration, caching hooks, UI patterns | Client-side cache invalidation, user notifications |
| **API Agent** | Cache-friendly APIs, edge functions, invalidation endpoints | Nightly update APIs, webhook notifications |
| **Database Agent** | Query optimization, materialized views, triggers | Nightly refresh procedures, data consistency |
| **DevOps Agent** | Cron jobs, monitoring, alerting, orchestration | Nightly update scheduling, health monitoring |
| **Business Agent** | Business rules, validation, workflow design | Nightly update business logic, change detection |
| **Testing Agent** | Test implementation, quality assurance | Nightly update testing, performance validation |

## Phase 1: Architecture & Configuration

### Enhanced Cache Configuration

```typescript
export const CACHE_ARCHITECTURE = {
  // Data freshness tiers with nightly update consideration
  FRESHNESS: {
    REAL_TIME: 30 * 1000,      // Price alerts, live data
    FREQUENT: 2 * 60 * 1000,    // Dashboard metrics, COGS data
    MODERATE: 10 * 60 * 1000,   // Product data, supplier info
    STABLE: 30 * 60 * 1000,     // Location data, user preferences
    REFERENCE: 24 * 60 * 60 * 1000, // Static reference data
    NIGHTLY_REFRESH: 24 * 60 * 60 * 1000, // Data refreshed nightly
  },
  
  // Cache retention with nightly update strategy
  RETENTION: {
    SHORT: 5 * 60 * 1000,       // Temporary data
    MEDIUM: 15 * 60 * 1000,     // Frequently accessed data
    LONG: 60 * 60 * 1000,       // Important business data
    VERY_LONG: 24 * 60 * 60 * 1000, // Reference data
    NIGHTLY_CACHE: 25 * 60 * 60 * 1000, // Cache until next nightly update
  },
  
  // Business-specific cache settings with nightly updates
  BUSINESS_DATA: {
    PRICE_ALERTS: { staleTime: 'REAL_TIME', gcTime: 'SHORT' },
    COGS_ANALYSIS: { staleTime: 'NIGHTLY_REFRESH', gcTime: 'NIGHTLY_CACHE' },
    PRODUCT_METRICS: { staleTime: 'NIGHTLY_REFRESH', gcTime: 'NIGHTLY_CACHE' },
    SUPPLIER_DATA: { staleTime: 'STABLE', gcTime: 'LONG' },
    LOCATION_DATA: { staleTime: 'STABLE', gcTime: 'VERY_LONG' },
    USER_PREFERENCES: { staleTime: 'STABLE', gcTime: 'VERY_LONG' },
    DASHBOARD_METRICS: { staleTime: 'NIGHTLY_REFRESH', gcTime: 'NIGHTLY_CACHE' },
    INVOICE_ANALYTICS: { staleTime: 'NIGHTLY_REFRESH', gcTime: 'NIGHTLY_CACHE' },
  },
  
  // Nightly update configuration
  NIGHTLY_UPDATES: {
    SCHEDULE: '0 2 * * *', // 2 AM daily
    TIMEZONE: 'Europe/Copenhagen',
    BATCH_SIZE: 1000,
    MAX_RETRIES: 3,
    TIMEOUT: 30 * 60 * 1000, // 30 minutes
    NOTIFICATION_WEBHOOK: process.env.NIGHTLY_UPDATE_WEBHOOK,
  }
};
```

## Phase 2: Database Nightly Update System

### Database Agent Implementation

**Task**: Implement efficient nightly data refresh procedures

```sql
-- Nightly update procedure
CREATE OR REPLACE FUNCTION nightly_data_refresh()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  result json;
  organization_ids uuid[];
BEGIN
  start_time := clock_timestamp();
  
  -- Get all active organizations
  SELECT array_agg(id) INTO organization_ids
  FROM organizations
  WHERE status = 'active';
  
  -- Refresh materialized views for each organization
  FOREACH org_id IN ARRAY organization_ids LOOP
    -- Set organization context for RLS
    PERFORM set_config('app.current_organization_id', org_id::text, true);
    
    -- Refresh organization-specific materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_metrics_org;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_metrics_org;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cogs_analysis_org;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_supplier_metrics_org;
    
    -- Update cache invalidation timestamps
    INSERT INTO cache_invalidation_log (organization_id, updated_at, update_type)
    VALUES (org_id, now(), 'nightly_refresh')
    ON CONFLICT (organization_id) 
    DO UPDATE SET updated_at = now(), update_type = 'nightly_refresh';
  END LOOP;
  
  end_time := clock_timestamp();
  
  -- Return update summary
  result := json_build_object(
    'success', true,
    'organizations_updated', array_length(organization_ids, 1),
    'start_time', start_time,
    'end_time', end_time,
    'duration_seconds', extract(epoch from (end_time - start_time))
  );
  
  RETURN result;
END;
$$;

-- Cache invalidation log table
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
  organization_id uuid REFERENCES organizations(id),
  updated_at timestamp with time zone DEFAULT now(),
  update_type text NOT NULL,
  PRIMARY KEY (organization_id)
);

-- Nightly update trigger
CREATE OR REPLACE FUNCTION trigger_nightly_update()
RETURNS trigger AS $$
BEGIN
  -- Notify all connected clients about cache invalidation
  PERFORM pg_notify('nightly_update_complete', 
    json_build_object(
      'organization_id', NEW.organization_id,
      'updated_at', NEW.updated_at,
      'update_type', NEW.update_type
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nightly_update_notification
  AFTER INSERT OR UPDATE ON cache_invalidation_log
  FOR EACH ROW
  EXECUTE FUNCTION trigger_nightly_update();
```

## Phase 3: API Nightly Update System

### API Agent Implementation

**Task**: Create cache invalidation and data refresh APIs

```typescript
// Nightly update edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    // Execute nightly data refresh
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('nightly_data_refresh')

    if (refreshError) throw refreshError

    // Invalidate all caches for all organizations
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id')
      .eq('status', 'active')

    // Send cache invalidation notifications
    for (const org of organizations || []) {
      await supabase
        .channel(`cache-invalidation-${org.id}`)
        .send({
          type: 'broadcast',
          event: 'cache_invalidation',
          payload: {
            type: 'nightly_refresh',
            timestamp: new Date().toISOString(),
            organization_id: org.id
          }
        })
    }

    // Send webhook notification
    if (Deno.env.get('NIGHTLY_UPDATE_WEBHOOK')) {
      await fetch(Deno.env.get('NIGHTLY_UPDATE_WEBHOOK'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nightly_update_complete',
          result: refreshResult,
          timestamp: new Date().toISOString()
        })
      })
    }

    return new Response(JSON.stringify({
      success: true,
      result: refreshResult
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Nightly update error:', error)
    
    // Send error notification
    if (Deno.env.get('NIGHTLY_UPDATE_WEBHOOK')) {
      await fetch(Deno.env.get('NIGHTLY_UPDATE_WEBHOOK'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nightly_update_error',
          error: error.message,
          timestamp: new Date().toISOString()
        })
      })
    }

    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

## Phase 4: Frontend Nightly Update Integration

### Frontend Agent Implementation

**Task**: Implement client-side cache invalidation and refresh strategies

```typescript
// Enhanced cache configuration with nightly updates
export const CACHE_ARCHITECTURE = {
  // ... existing configuration ...
  
  NIGHTLY_UPDATES: {
    ENABLED: true,
    INVALIDATION_STRATEGY: 'smart', // 'immediate' | 'smart' | 'lazy'
    PREFETCH_STRATEGY: 'aggressive', // 'conservative' | 'aggressive' | 'on_demand'
    NOTIFICATION_ENABLED: true,
    BACKGROUND_REFRESH: true,
  }
};

// Nightly update hook
export const useNightlyUpdateListener = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  
  useEffect(() => {
    if (!currentOrganization) return;
    
    const channel = supabase
      .channel(`cache-invalidation-${currentOrganization.id}`)
      .on('broadcast', { event: 'cache_invalidation' }, (payload) => {
        console.log('Nightly update received:', payload);
        
        if (payload.type === 'nightly_refresh') {
          // Smart invalidation: only invalidate stale data
          queryClient.invalidateQueries({
            predicate: (query) => {
              const queryKey = query.queryKey[0] as string;
              const isNightlyData = [
                'dashboard-metrics',
                'product-metrics', 
                'cogs-analysis',
                'supplier-metrics',
                'invoice-analytics'
              ].some(prefix => queryKey.includes(prefix));
              
              return isNightlyData;
            }
          });
          
          // Show notification to user
          toast.info('Data has been refreshed with the latest information', {
            duration: 5000,
            action: {
              label: 'Refresh Now',
              onClick: () => {
                queryClient.refetchQueries({
                  type: 'active'
                });
              }
            }
          });
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization, queryClient]);
};

// Enhanced universal cache hook with nightly updates
export const useUniversalCache = <T>({
  key,
  fetcher,
  dataType,
  options = {}
}: {
  key: string;
  fetcher: () => Promise<T>;
  dataType: keyof typeof CACHE_ARCHITECTURE.BUSINESS_DATA;
  options?: CacheOptions;
}) => {
  const config = CACHE_ARCHITECTURE.BUSINESS_DATA[dataType];
  const isNightlyData = config.staleTime === 'NIGHTLY_REFRESH';
  
  return useQuery({
    queryKey: createQueryKey(key),
    queryFn: fetcher,
    staleTime: CACHE_ARCHITECTURE.FRESHNESS[config.staleTime],
    gcTime: CACHE_ARCHITECTURE.RETENTION[config.gcTime],
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    retry: options.retry ?? 3,
    enabled: options.enabled ?? true,
    // Add nightly update metadata
    meta: {
      isNightlyData,
      lastNightlyUpdate: isNightlyData ? getLastNightlyUpdate() : null,
      priority: isNightlyData ? 'high' : 'normal'
    }
  });
};

// Nightly update status hook
export const useNightlyUpdateStatus = () => {
  const [status, setStatus] = useState<'idle' | 'updating' | 'completed' | 'error'>('idle');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  useEffect(() => {
    const channel = supabase
      .channel('nightly-update-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cache_invalidation_log'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setStatus('completed');
          setLastUpdate(new Date(payload.new.updated_at));
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return { status, lastUpdate };
};
```

## Phase 5: DevOps Nightly Update Orchestration

### DevOps Agent Implementation

**Task**: Implement cron jobs, monitoring, and alerting for nightly updates

```yaml
# docker-compose.yml for nightly updates
version: '3.8'
services:
  nightly-updater:
    image: deno:latest
    command: |
      sh -c "
        echo '0 2 * * * deno run --allow-net --allow-env /app/nightly-update.ts' | crontab -
        crond -f
      "
    volumes:
      - ./supabase/functions:/app
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - NIGHTLY_UPDATE_WEBHOOK=${NIGHTLY_UPDATE_WEBHOOK}
    restart: unless-stopped
    networks:
      - procurement-network

  cache-monitor:
    image: node:18-alpine
    command: |
      sh -c "
        npm install && node cache-monitor.js
      "
    volumes:
      - ./monitoring:/app
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    restart: unless-stopped
    networks:
      - procurement-network
```

```typescript
// cache-monitor.js - Monitoring for nightly updates
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class CacheMonitor {
  async checkNightlyUpdateHealth() {
    try {
      // Check if nightly update completed successfully
      const { data: lastUpdate } = await supabase
        .from('cache_invalidation_log')
        .select('*')
        .eq('update_type', 'nightly_refresh')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      const now = new Date();
      const lastUpdateTime = new Date(lastUpdate?.updated_at);
      const hoursSinceUpdate = (now - lastUpdateTime) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate > 25) { // Should update every 24 hours
        console.error('Nightly update is overdue!');
        await this.sendAlert('Nightly update overdue', {
          lastUpdate: lastUpdateTime,
          hoursOverdue: hoursSinceUpdate - 24
        });
      }
      
      return {
        healthy: hoursSinceUpdate <= 25,
        lastUpdate: lastUpdateTime,
        hoursSinceUpdate
      };
    } catch (error) {
      console.error('Cache monitoring error:', error);
      await this.sendAlert('Cache monitoring error', { error: error.message });
    }
  }
  
  async sendAlert(title: string, data: any) {
    // Send to monitoring service (e.g., Slack, Discord, etc.)
    console.log(`ALERT: ${title}`, data);
  }
}

// Run monitoring every hour
const monitor = new CacheMonitor();
setInterval(() => {
  monitor.checkNightlyUpdateHealth();
}, 60 * 60 * 1000);
```

## Phase 6: Business Logic for Nightly Updates

### Business Agent Implementation

**Task**: Define business rules for nightly data refresh

```typescript
// Business rules for nightly updates
export const NIGHTLY_UPDATE_BUSINESS_RULES = {
  // Data that should be refreshed nightly
  NIGHTLY_REFRESH_DATA: [
    'dashboard-metrics',
    'product-metrics',
    'cogs-analysis',
    'supplier-metrics',
    'invoice-analytics',
    'price-alerts',
    'efficiency-metrics'
  ],
  
  // Data that should NOT be refreshed nightly
  EXCLUDE_FROM_NIGHTLY: [
    'user-preferences',
    'location-data',
    'supplier-master-data',
    'organization-settings'
  ],
  
  // Business rules for data refresh
  REFRESH_RULES: {
    // Only refresh if data is older than 12 hours
    MIN_AGE_HOURS: 12,
    
    // Skip refresh if system is under heavy load
    SKIP_IF_HIGH_LOAD: true,
    
    // Retry failed updates
    MAX_RETRIES: 3,
    
    // Notify users of significant changes
    NOTIFY_ON_CHANGES: true,
    CHANGE_THRESHOLD: 0.05, // 5% change threshold
  },
  
  // Data validation after nightly update
  VALIDATION_RULES: {
    // Validate data integrity
    CHECK_DATA_INTEGRITY: true,
    
    // Validate business rules
    VALIDATE_BUSINESS_RULES: true,
    
    // Check for anomalies
    DETECT_ANOMALIES: true,
    
    // Rollback if validation fails
    ROLLBACK_ON_FAILURE: true
  }
};

// Nightly update business logic
export const processNightlyUpdate = async (organizationId: string) => {
  const startTime = Date.now();
  
  try {
    // 1. Check if update is needed
    const lastUpdate = await getLastUpdateTime(organizationId);
    const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate < NIGHTLY_UPDATE_BUSINESS_RULES.REFRESH_RULES.MIN_AGE_HOURS) {
      console.log('Skipping update - data is still fresh');
      return { skipped: true, reason: 'Data still fresh' };
    }
    
    // 2. Check system load
    if (NIGHTLY_UPDATE_BUSINESS_RULES.REFRESH_RULES.SKIP_IF_HIGH_LOAD) {
      const systemLoad = await getSystemLoad();
      if (systemLoad > 0.8) {
        console.log('Skipping update - system under high load');
        return { skipped: true, reason: 'High system load' };
      }
    }
    
    // 3. Perform data refresh
    const refreshResult = await refreshOrganizationData(organizationId);
    
    // 4. Validate results
    if (NIGHTLY_UPDATE_BUSINESS_RULES.VALIDATION_RULES.CHECK_DATA_INTEGRITY) {
      const validationResult = await validateDataIntegrity(organizationId);
      if (!validationResult.valid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
      }
    }
    
    // 5. Check for significant changes
    if (NIGHTLY_UPDATE_BUSINESS_RULES.REFRESH_RULES.NOTIFY_ON_CHANGES) {
      const changes = await detectSignificantChanges(organizationId, refreshResult);
      if (changes.length > 0) {
        await notifyUsersOfChanges(organizationId, changes);
      }
    }
    
    const duration = Date.now() - startTime;
    return {
      success: true,
      duration,
      changes: refreshResult.changes,
      validated: true
    };
    
  } catch (error) {
    console.error('Nightly update failed:', error);
    
    // Rollback if configured
    if (NIGHTLY_UPDATE_BUSINESS_RULES.VALIDATION_RULES.ROLLBACK_ON_FAILURE) {
      await rollbackUpdate(organizationId);
    }
    
    throw error;
  }
};
```

## Implementation Timeline

### Week 1: Foundation + Nightly Updates
- **DevOps Agent**: Set up cron jobs and monitoring
- **Database Agent**: Create nightly update procedures
- **API Agent**: Implement cache invalidation APIs

### Week 2: Core Implementation
- **Frontend Agent**: Enhanced caching hooks with nightly updates
- **Business Agent**: Business rules for nightly refresh
- **Testing Agent**: Test nightly update workflows

### Week 3: Migration + Nightly Integration
- **Frontend Agent**: Migrate components with nightly update support
- **Business Agent**: Implement change detection and notifications
- **Testing Agent**: E2E testing for nightly updates

### Week 4: Optimization + Monitoring
- **DevOps Agent**: Performance monitoring and alerting
- **API Agent**: Advanced nightly update strategies
- **Testing Agent**: Performance testing for nightly updates

## Success Metrics

### Performance Metrics
- **Data Freshness**: All critical data refreshed within 2-hour window
- **System Performance**: <5% performance impact during updates
- **Cache Efficiency**: 80%+ cache hit rate
- **API Calls Reduction**: 50% reduction in unnecessary API calls

### User Experience Metrics
- **Page Load Speed**: 30% faster page loads
- **Seamless Updates**: No user interruption during nightly updates
- **Data Accuracy**: 99.9% data consistency after updates

### Reliability Metrics
- **Update Success Rate**: 99.9% successful nightly updates
- **Monitoring Coverage**: Real-time alerts for failed updates
- **Recovery Time**: <5 minutes for failed update recovery

### Business Metrics
- **Data Quality**: Automated validation of business rules
- **Change Detection**: Proactive notification of significant changes
- **Compliance**: Audit trail for all data updates

## Agent Activation Commands

To implement this plan, use the following agent activation commands:

```bash
# Phase 1: Architecture
Activate Frontend Agent and API Agent: Design unified caching architecture with nightly updates

# Phase 2: Database
Activate Database Agent: Implement nightly data refresh procedures and materialized views

# Phase 3: API
Activate API Agent: Create cache invalidation endpoints and nightly update APIs

# Phase 4: Frontend
Activate Frontend Agent: Implement client-side cache invalidation and user notifications

# Phase 5: DevOps
Activate DevOps Agent: Set up cron jobs, monitoring, and alerting for nightly updates

# Phase 6: Business Logic
Activate Business Agent: Define business rules and validation for nightly updates

# Testing
Activate Testing Agent: Create comprehensive tests for nightly update workflows

# Documentation
Activate Docs Agent: Document the caching system and nightly update processes
```

## Conclusion

This comprehensive caching implementation plan with nightly updates ensures:

✅ **Consistent Performance** - All pages load faster with unified caching  
✅ **Automated Updates** - Nightly data refresh without manual intervention  
✅ **Reduced API Calls** - Smart cache invalidation prevents unnecessary requests  
✅ **Better UX** - Instant data loading with seamless background updates  
✅ **Maintainable** - Centralized configuration and agent-coordinated development  
✅ **Scalable** - Support for 10x data growth with efficient nightly processing  
✅ **Reliable** - Comprehensive monitoring and error recovery  

The agent-coordinated approach ensures each specialist contributes their expertise while maintaining consistency across the entire caching system.


