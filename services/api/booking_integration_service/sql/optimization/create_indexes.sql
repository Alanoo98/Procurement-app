-- Database Optimization Scripts for DiningSix Booking Integration
-- Create indexes for fast query performance on stg.easytable_bookings

-- Enable statistics for query optimization
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- 1. Primary index on date (most common filter)
CREATE NONCLUSTERED INDEX IX_easytable_bookings_date 
ON stg.easytable_bookings (date)
INCLUDE (persons, status, placeID, placeName)
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);

-- 2. Composite index for restaurant-specific queries
CREATE NONCLUSTERED INDEX IX_easytable_bookings_place_date 
ON stg.easytable_bookings (placeID, date)
INCLUDE (persons, status, placeName)
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);

-- 3. Index for status-based queries (1, 2, etc.)
CREATE NONCLUSTERED INDEX IX_easytable_bookings_status_date 
ON stg.easytable_bookings (status, date)
INCLUDE (persons, placeID, placeName)
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);

-- 4. Index for guest count aggregation queries
CREATE NONCLUSTERED INDEX IX_easytable_bookings_persons_date 
ON stg.easytable_bookings (date, persons)
INCLUDE (placeID, status, placeName)
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);

-- 5. Covering index for CPG calculation queries
CREATE NONCLUSTERED INDEX IX_easytable_bookings_cpg_calc 
ON stg.easytable_bookings (date, placeID, status)
INCLUDE (persons)
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);

-- 6. Index for date range queries with pagination
CREATE NONCLUSTERED INDEX IX_easytable_bookings_date_range 
ON stg.easytable_bookings (date DESC)
INCLUDE (placeID, persons, status, placeName)
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);

-- 7. Index for createdOn queries (for tracking new bookings)
CREATE NONCLUSTERED INDEX IX_easytable_bookings_created_on 
ON stg.easytable_bookings (createdOn DESC)
INCLUDE (date, placeID, persons, status)
WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);

-- Update statistics for optimal query planning
UPDATE STATISTICS stg.easytable_bookings WITH FULLSCAN;

-- Verify indexes were created successfully
SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    c.name AS ColumnName,
    ic.key_ordinal AS KeyOrdinal
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('stg.easytable_bookings')
ORDER BY i.name, ic.key_ordinal;

-- Performance test query
PRINT 'Testing index performance...';
DECLARE @StartTime DATETIME2 = SYSDATETIME();

SELECT 
    date,
    placeID,
    placeName,
    SUM(persons) as total_guests,
    COUNT(*) as total_bookings
FROM stg.easytable_bookings 
WHERE date >= DATEADD(day, -30, GETDATE())
  AND status = '2'  -- Assuming status 2 is confirmed
GROUP BY date, placeID, placeName
ORDER BY date DESC;

DECLARE @EndTime DATETIME2 = SYSDATETIME();
PRINT 'Query execution time: ' + CAST(DATEDIFF(millisecond, @StartTime, @EndTime) AS VARCHAR(10)) + ' ms';
