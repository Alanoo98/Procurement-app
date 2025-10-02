-- Performance Monitoring Scripts for DiningSix Booking Integration
-- Track query performance and identify optimization opportunities

-- 1. Create performance monitoring table
CREATE TABLE IF NOT EXISTS booking_query_performance (
    id INT IDENTITY(1,1) PRIMARY KEY,
    query_name VARCHAR(100) NOT NULL,
    execution_time_ms INT NOT NULL,
    rows_returned INT,
    cache_hit BIT DEFAULT 0,
    error_message VARCHAR(500),
    execution_date DATETIME2 DEFAULT GETDATE(),
    parameters VARCHAR(500)
);

-- 2. Create performance monitoring stored procedure
CREATE OR ALTER PROCEDURE sp_monitor_query_performance
    @QueryName VARCHAR(100),
    @StartTime DATETIME2,
    @EndTime DATETIME2,
    @RowsReturned INT = NULL,
    @CacheHit BIT = 0,
    @ErrorMessage VARCHAR(500) = NULL,
    @Parameters VARCHAR(500) = NULL
AS
BEGIN
    DECLARE @ExecutionTimeMs INT = DATEDIFF(millisecond, @StartTime, @EndTime);
    
    INSERT INTO booking_query_performance (
        query_name, 
        execution_time_ms, 
        rows_returned, 
        cache_hit, 
        error_message, 
        parameters
    )
    VALUES (
        @QueryName, 
        @ExecutionTimeMs, 
        @RowsReturned, 
        @CacheHit, 
        @ErrorMessage, 
        @Parameters
    );
    
    -- Alert if query is slow (> 1 second)
    IF @ExecutionTimeMs > 1000
    BEGIN
        PRINT 'SLOW QUERY ALERT: ' + @QueryName + ' took ' + CAST(@ExecutionTimeMs AS VARCHAR(10)) + 'ms';
    END
END;

-- 3. Create performance analysis views
CREATE OR ALTER VIEW v_query_performance_summary AS
SELECT 
    query_name,
    COUNT(*) as total_executions,
    AVG(execution_time_ms) as avg_execution_time_ms,
    MAX(execution_time_ms) as max_execution_time_ms,
    MIN(execution_time_ms) as min_execution_time_ms,
    SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits,
    SUM(CASE WHEN cache_hit = 0 THEN 1 ELSE 0 END) as cache_misses,
    CAST(SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as cache_hit_rate,
    SUM(rows_returned) as total_rows_returned,
    AVG(rows_returned) as avg_rows_per_query
FROM booking_query_performance
WHERE execution_date >= DATEADD(day, -7, GETDATE())
GROUP BY query_name;

-- 4. Create slow query analysis view
CREATE OR ALTER VIEW v_slow_queries AS
SELECT 
    query_name,
    execution_time_ms,
    rows_returned,
    cache_hit,
    execution_date,
    parameters,
    ROW_NUMBER() OVER (PARTITION BY query_name ORDER BY execution_time_ms DESC) as rank_by_speed
FROM booking_query_performance
WHERE execution_time_ms > 1000  -- Queries taking more than 1 second
  AND execution_date >= DATEADD(day, -1, GETDATE())
ORDER BY execution_time_ms DESC;

-- 5. Create cache effectiveness analysis view
CREATE OR ALTER VIEW v_cache_effectiveness AS
SELECT 
    query_name,
    DATE(execution_date) as execution_date,
    COUNT(*) as total_queries,
    SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits,
    SUM(CASE WHEN cache_hit = 0 THEN 1 ELSE 0 END) as cache_misses,
    CAST(SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as cache_hit_rate,
    AVG(execution_time_ms) as avg_execution_time_ms
FROM booking_query_performance
WHERE execution_date >= DATEADD(day, -7, GETDATE())
GROUP BY query_name, DATE(execution_date)
ORDER BY execution_date DESC, cache_hit_rate DESC;

-- 6. Create database performance monitoring queries
-- Monitor index usage
CREATE OR ALTER VIEW v_index_usage_stats AS
SELECT 
    OBJECT_NAME(i.object_id) as table_name,
    i.name as index_name,
    i.type_desc as index_type,
    s.user_seeks,
    s.user_scans,
    s.user_lookups,
    s.user_updates,
    s.last_user_seek,
    s.last_user_scan
FROM sys.dm_db_index_usage_stats s
INNER JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE OBJECT_NAME(i.object_id) = 'easytable_bookings'
ORDER BY s.user_seeks + s.user_scans DESC;

-- Monitor table statistics
CREATE OR ALTER VIEW v_table_statistics AS
SELECT 
    OBJECT_NAME(p.object_id) as table_name,
    p.rows as total_rows,
    p.data_pages as data_pages,
    p.used_pages as used_pages,
    p.reserved_pages as reserved_pages,
    CAST(p.rows * 100.0 / SUM(p.rows) OVER () AS DECIMAL(5,2)) as row_percentage
FROM sys.partitions p
WHERE OBJECT_NAME(p.object_id) = 'easytable_bookings'
  AND p.index_id IN (0, 1);

-- 7. Create performance monitoring functions
CREATE OR ALTER FUNCTION fn_get_query_performance_trend(
    @QueryName VARCHAR(100),
    @Days INT = 7
)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        DATE(execution_date) as execution_date,
        AVG(execution_time_ms) as avg_execution_time_ms,
        COUNT(*) as total_executions,
        SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits,
        CAST(SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as cache_hit_rate
    FROM booking_query_performance
    WHERE query_name = @QueryName
      AND execution_date >= DATEADD(day, -@Days, GETDATE())
    GROUP BY DATE(execution_date)
);

-- 8. Create cleanup procedure for old performance data
CREATE OR ALTER PROCEDURE sp_cleanup_performance_data
    @DaysToKeep INT = 30
AS
BEGIN
    DELETE FROM booking_query_performance
    WHERE execution_date < DATEADD(day, -@DaysToKeep, GETDATE());
    
    PRINT 'Cleaned up performance data older than ' + CAST(@DaysToKeep AS VARCHAR(10)) + ' days';
END;

-- 9. Create performance alert procedure
CREATE OR ALTER PROCEDURE sp_check_performance_alerts
AS
BEGIN
    -- Check for slow queries in the last hour
    IF EXISTS (
        SELECT 1 FROM booking_query_performance 
        WHERE execution_time_ms > 5000  -- 5 seconds
          AND execution_date >= DATEADD(hour, -1, GETDATE())
    )
    BEGIN
        PRINT 'ALERT: Slow queries detected in the last hour';
        
        SELECT 
            query_name,
            execution_time_ms,
            execution_date,
            parameters
        FROM booking_query_performance 
        WHERE execution_time_ms > 5000
          AND execution_date >= DATEADD(hour, -1, GETDATE())
        ORDER BY execution_time_ms DESC;
    END
    
    -- Check for low cache hit rates
    IF EXISTS (
        SELECT 1 FROM v_query_performance_summary
        WHERE cache_hit_rate < 50  -- Less than 50% cache hit rate
    )
    BEGIN
        PRINT 'ALERT: Low cache hit rates detected';
        
        SELECT 
            query_name,
            cache_hit_rate,
            total_executions
        FROM v_query_performance_summary
        WHERE cache_hit_rate < 50
        ORDER BY cache_hit_rate ASC;
    END
END;

-- 10. Create performance dashboard queries
-- Top 10 slowest queries
SELECT TOP 10
    query_name,
    AVG(execution_time_ms) as avg_execution_time_ms,
    COUNT(*) as execution_count,
    MAX(execution_date) as last_execution
FROM booking_query_performance
WHERE execution_date >= DATEADD(day, -7, GETDATE())
GROUP BY query_name
ORDER BY avg_execution_time_ms DESC;

-- Cache performance summary
SELECT 
    SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as total_cache_hits,
    COUNT(*) as total_queries,
    CAST(SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as overall_cache_hit_rate,
    AVG(execution_time_ms) as avg_execution_time_ms
FROM booking_query_performance
WHERE execution_date >= DATEADD(day, -1, GETDATE());

-- Performance trends by hour
SELECT 
    DATEPART(hour, execution_date) as hour_of_day,
    COUNT(*) as query_count,
    AVG(execution_time_ms) as avg_execution_time_ms,
    SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits
FROM booking_query_performance
WHERE execution_date >= DATEADD(day, -1, GETDATE())
GROUP BY DATEPART(hour, execution_date)
ORDER BY hour_of_day;

