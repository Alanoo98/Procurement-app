-- Database Views for DiningSix Booking Integration
-- Create optimized views for flexible business analysis

-- 1. Rolling period booking summary (last N days)
CREATE OR ALTER VIEW v_rolling_booking_summary AS
SELECT 
    placeID as restaurant_id,
    placeName as restaurant_name,
    COUNT(*) as total_bookings,
    SUM(persons) as total_guests,
    AVG(CAST(persons AS FLOAT)) as avg_guests_per_booking,
    SUM(CASE WHEN status = '1' THEN persons ELSE 0 END) as active_guests,
    SUM(CASE WHEN status = '1' THEN 1 ELSE 0 END) as active_bookings,
    SUM(CASE WHEN status = '2' THEN persons ELSE 0 END) as cancelled_guests,
    SUM(CASE WHEN status = '2' THEN 1 ELSE 0 END) as cancelled_bookings,
    SUM(CASE WHEN status = '3' THEN persons ELSE 0 END) as no_show_guests,
    SUM(CASE WHEN status = '3' THEN 1 ELSE 0 END) as no_show_bookings,
    -- Arrival metrics
    SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) as arrived_guests,
    SUM(CASE WHEN arrived = 1 THEN 1 ELSE 0 END) as arrived_bookings,
    SUM(CASE WHEN arrived = 0 THEN persons ELSE 0 END) as not_arrived_guests,
    SUM(CASE WHEN arrived = 0 THEN 1 ELSE 0 END) as not_arrived_bookings,
    -- Expired metrics
    SUM(CASE WHEN expired = 1 THEN persons ELSE 0 END) as expired_guests,
    SUM(CASE WHEN expired = 1 THEN 1 ELSE 0 END) as expired_bookings,
    -- Efficiency metrics
    CAST(SUM(persons) AS FLOAT) / NULLIF(COUNT(*), 0) as guest_efficiency_ratio,
    CAST(SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as arrival_rate,
    COUNT(DISTINCT date) as active_days,
    MIN(date) as first_booking_date,
    MAX(date) as last_booking_date
FROM stg.easytable_bookings 
WHERE date >= DATEADD(day, -30, GETDATE())  -- Last 30 days by default
GROUP BY placeID, placeName;

-- 2. Peak vs Off-Peak analysis
CREATE OR ALTER VIEW v_peak_analysis AS
SELECT 
    placeID as restaurant_id,
    placeName as restaurant_name,
    -- Day of week analysis
    DATEPART(weekday, date) as day_of_week,
    DATENAME(weekday, date) as day_name,
    COUNT(*) as bookings_count,
    SUM(persons) as total_guests,
    AVG(CAST(persons AS FLOAT)) as avg_guests_per_booking,
    -- Peak hour analysis (using arrival time)
    DATEPART(hour, arrival) as hour_of_day,
    COUNT(*) as bookings_at_hour,
    SUM(persons) as guests_at_hour,
    -- Weekend vs Weekday
    CASE 
        WHEN DATEPART(weekday, date) IN (1, 7) THEN 'Weekend'
        ELSE 'Weekday'
    END as day_type,
    -- Status breakdown
    SUM(CASE WHEN status = '1' THEN 1 ELSE 0 END) as active_count,
    SUM(CASE WHEN status = '2' THEN 1 ELSE 0 END) as cancelled_count,
    SUM(CASE WHEN status = '3' THEN 1 ELSE 0 END) as no_show_count,
    -- Arrival breakdown
    SUM(CASE WHEN arrived = 1 THEN 1 ELSE 0 END) as arrived_count,
    SUM(CASE WHEN arrived = 0 THEN 1 ELSE 0 END) as not_arrived_count
FROM stg.easytable_bookings 
WHERE date >= DATEADD(day, -90, GETDATE())  -- Last 90 days for pattern analysis
GROUP BY placeID, placeName, DATEPART(weekday, date), DATENAME(weekday, date), 
         DATEPART(hour, arrival), 
         CASE WHEN DATEPART(weekday, date) IN (1, 7) THEN 'Weekend' ELSE 'Weekday' END;

-- 3. Guest efficiency trends (rolling averages)
CREATE OR ALTER VIEW v_guest_efficiency_trends AS
SELECT 
    date as booking_date,
    placeID as restaurant_id,
    placeName as restaurant_name,
    SUM(persons) as daily_guests,
    COUNT(*) as daily_bookings,
    AVG(CAST(persons AS FLOAT)) as avg_guests_per_booking,
    -- 7-day rolling average
    AVG(SUM(persons)) OVER (
        PARTITION BY placeID 
        ORDER BY date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as rolling_avg_7d_guests,
    -- 14-day rolling average
    AVG(SUM(persons)) OVER (
        PARTITION BY placeID 
        ORDER BY date 
        ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
    ) as rolling_avg_14d_guests,
    -- 30-day rolling average
    AVG(SUM(persons)) OVER (
        PARTITION BY placeID 
        ORDER BY date 
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) as rolling_avg_30d_guests,
    -- Efficiency trends
    AVG(AVG(CAST(persons AS FLOAT))) OVER (
        PARTITION BY placeID 
        ORDER BY date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as rolling_avg_7d_efficiency,
    -- Capacity utilization (assuming 4-hour service window)
    SUM(persons) / 4.0 as hourly_guest_rate,
    -- Booking density
    COUNT(*) / 4.0 as hourly_booking_rate,
    -- Arrival rate
    CAST(SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as daily_arrival_rate
FROM stg.easytable_bookings 
WHERE date >= DATEADD(day, -90, GETDATE())
  AND status = '1'  -- Active bookings only
GROUP BY date, placeID, placeName;

-- 4. Real-time operational metrics
CREATE OR ALTER VIEW v_operational_metrics AS
SELECT 
    placeID as restaurant_id,
    placeName as restaurant_name,
    -- Today's metrics
    SUM(CASE WHEN date = CAST(GETDATE() AS DATE) THEN persons ELSE 0 END) as today_guests,
    COUNT(CASE WHEN date = CAST(GETDATE() AS DATE) THEN 1 END) as today_bookings,
    SUM(CASE WHEN date = CAST(GETDATE() AS DATE) AND arrived = 1 THEN persons ELSE 0 END) as today_arrived_guests,
    COUNT(CASE WHEN date = CAST(GETDATE() AS DATE) AND arrived = 1 THEN 1 END) as today_arrived_bookings,
    -- This week (rolling 7 days)
    SUM(CASE WHEN date >= DATEADD(day, -6, GETDATE()) THEN persons ELSE 0 END) as week_guests,
    COUNT(CASE WHEN date >= DATEADD(day, -6, GETDATE()) THEN 1 END) as week_bookings,
    SUM(CASE WHEN date >= DATEADD(day, -6, GETDATE()) AND arrived = 1 THEN persons ELSE 0 END) as week_arrived_guests,
    COUNT(CASE WHEN date >= DATEADD(day, -6, GETDATE()) AND arrived = 1 THEN 1 END) as week_arrived_bookings,
    -- This month (rolling 30 days)
    SUM(CASE WHEN date >= DATEADD(day, -29, GETDATE()) THEN persons ELSE 0 END) as month_guests,
    COUNT(CASE WHEN date >= DATEADD(day, -29, GETDATE()) THEN 1 END) as month_bookings,
    SUM(CASE WHEN date >= DATEADD(day, -29, GETDATE()) AND arrived = 1 THEN persons ELSE 0 END) as month_arrived_guests,
    COUNT(CASE WHEN date >= DATEADD(day, -29, GETDATE()) AND arrived = 1 THEN 1 END) as month_arrived_bookings,
    -- Efficiency ratios
    CAST(SUM(CASE WHEN date = CAST(GETDATE() AS DATE) THEN persons ELSE 0 END) AS FLOAT) / 
         NULLIF(COUNT(CASE WHEN date = CAST(GETDATE() AS DATE) THEN 1 END), 0) as today_efficiency,
    CAST(SUM(CASE WHEN date >= DATEADD(day, -6, GETDATE()) THEN persons ELSE 0 END) AS FLOAT) / 
         NULLIF(COUNT(CASE WHEN date >= DATEADD(day, -6, GETDATE()) THEN 1 END), 0) as week_efficiency,
    CAST(SUM(CASE WHEN date >= DATEADD(day, -29, GETDATE()) THEN persons ELSE 0 END) AS FLOAT) / 
         NULLIF(COUNT(CASE WHEN date >= DATEADD(day, -29, GETDATE()) THEN 1 END), 0) as month_efficiency,
    -- Arrival rates
    CAST(SUM(CASE WHEN date = CAST(GETDATE() AS DATE) AND arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / 
         NULLIF(SUM(CASE WHEN date = CAST(GETDATE() AS DATE) THEN persons ELSE 0 END), 0) as today_arrival_rate,
    CAST(SUM(CASE WHEN date >= DATEADD(day, -6, GETDATE()) AND arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / 
         NULLIF(SUM(CASE WHEN date >= DATEADD(day, -6, GETDATE()) THEN persons ELSE 0 END), 0) as week_arrival_rate,
    CAST(SUM(CASE WHEN date >= DATEADD(day, -29, GETDATE()) AND arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / 
         NULLIF(SUM(CASE WHEN date >= DATEADD(day, -29, GETDATE()) THEN persons ELSE 0 END), 0) as month_arrival_rate
FROM stg.easytable_bookings 
GROUP BY placeID, placeName;

-- 5. CPG calculation base (flexible periods)
CREATE OR ALTER VIEW v_cpg_calculation_base AS
SELECT 
    date as booking_date,
    placeID as restaurant_id,
    placeName as restaurant_name,
    SUM(persons) as total_guests,
    COUNT(*) as total_bookings,
    AVG(CAST(persons AS FLOAT)) as avg_guests_per_booking,
    -- Efficiency metrics for CPG correlation
    CAST(SUM(persons) AS FLOAT) / NULLIF(COUNT(*), 0) as guest_efficiency_ratio,
    COUNT(DISTINCT arrival) as unique_arrival_times,
    -- Arrival metrics for procurement correlation
    SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) as arrived_guests,
    SUM(CASE WHEN arrived = 1 THEN 1 ELSE 0 END) as arrived_bookings,
    CAST(SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as arrival_rate,
    -- Procurement correlation fields (to be populated)
    NULL as procurement_spend,
    NULL as cost_per_guest,
    NULL as cost_per_booking
FROM stg.easytable_bookings 
WHERE status = '1'  -- Active bookings only
GROUP BY date, placeID, placeName;

-- 6. Performance monitoring view (real-time)
CREATE OR ALTER VIEW v_performance_metrics AS
SELECT 
    'total_bookings' as metric_name,
    COUNT(*) as metric_value,
    GETDATE() as measurement_time
FROM stg.easytable_bookings
UNION ALL
SELECT 
    'total_guests' as metric_name,
    SUM(persons) as metric_value,
    GETDATE() as measurement_time
FROM stg.easytable_bookings
UNION ALL
SELECT 
    'avg_guests_per_booking' as metric_name,
    AVG(CAST(persons AS FLOAT)) as metric_value,
    GETDATE() as measurement_time
FROM stg.easytable_bookings
UNION ALL
SELECT 
    'active_bookings_pct' as metric_name,
    (SUM(CASE WHEN status = '1' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as metric_value,
    GETDATE() as measurement_time
FROM stg.easytable_bookings
UNION ALL
SELECT 
    'guest_efficiency_ratio' as metric_name,
    CAST(SUM(persons) AS FLOAT) / NULLIF(COUNT(*), 0) as metric_value,
    GETDATE() as measurement_time
FROM stg.easytable_bookings
UNION ALL
SELECT 
    'arrival_rate' as metric_name,
    (SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) * 100.0 / NULLIF(SUM(persons), 0)) as metric_value,
    GETDATE() as measurement_time
FROM stg.easytable_bookings;

-- 7. Restaurant summary (comprehensive)
CREATE OR ALTER VIEW v_restaurant_summary AS
SELECT 
    placeID as restaurant_id,
    placeName as restaurant_name,
    COUNT(*) as total_bookings,
    SUM(persons) as total_guests,
    AVG(CAST(persons AS FLOAT)) as avg_guests_per_booking,
    MIN(date) as first_booking_date,
    MAX(date) as last_booking_date,
    COUNT(DISTINCT date) as active_days,
    -- Efficiency metrics
    CAST(SUM(persons) AS FLOAT) / NULLIF(COUNT(*), 0) as overall_efficiency_ratio,
    -- Arrival metrics
    SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) as total_arrived_guests,
    SUM(CASE WHEN arrived = 1 THEN 1 ELSE 0 END) as total_arrived_bookings,
    CAST(SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as overall_arrival_rate,
    -- Recent activity (last 30 days)
    COUNT(CASE WHEN date >= DATEADD(day, -30, GETDATE()) THEN 1 END) as recent_bookings,
    SUM(CASE WHEN date >= DATEADD(day, -30, GETDATE()) THEN persons ELSE 0 END) as recent_guests,
    -- Peak performance
    MAX(SUM(persons)) OVER (PARTITION BY placeID, date) as peak_daily_guests,
    MAX(COUNT(*)) OVER (PARTITION BY placeID, date) as peak_daily_bookings
FROM stg.easytable_bookings 
GROUP BY placeID, placeName;

-- 8. Status breakdown (detailed)
CREATE OR ALTER VIEW v_status_breakdown AS
SELECT 
    status,
    CASE 
        WHEN status = '1' THEN 'Active'
        WHEN status = '2' THEN 'Cancelled'
        WHEN status = '3' THEN 'No-Show'
        ELSE 'Unknown'
    END as status_name,
    COUNT(*) as booking_count,
    SUM(persons) as total_guests,
    AVG(CAST(persons AS FLOAT)) as avg_guests_per_booking,
    -- Status efficiency
    CAST(SUM(persons) AS FLOAT) / NULLIF(COUNT(*), 0) as status_efficiency_ratio,
    -- Arrival metrics by status
    SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) as arrived_guests,
    SUM(CASE WHEN arrived = 1 THEN 1 ELSE 0 END) as arrived_bookings,
    CAST(SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as status_arrival_rate,
    -- Recent trends (last 30 days)
    COUNT(CASE WHEN date >= DATEADD(day, -30, GETDATE()) THEN 1 END) as recent_count,
    SUM(CASE WHEN date >= DATEADD(day, -30, GETDATE()) THEN persons ELSE 0 END) as recent_guests
FROM stg.easytable_bookings 
GROUP BY status;

-- 9. Time-based efficiency analysis
CREATE OR ALTER VIEW v_time_efficiency AS
SELECT 
    placeID as restaurant_id,
    placeName as restaurant_name,
    -- Hour of day analysis
    DATEPART(hour, arrival) as hour_of_day,
    COUNT(*) as bookings_at_hour,
    SUM(persons) as guests_at_hour,
    AVG(CAST(persons AS FLOAT)) as avg_guests_at_hour,
    -- Efficiency by time
    CAST(SUM(persons) AS FLOAT) / NULLIF(COUNT(*), 0) as hourly_efficiency,
    -- Arrival rate by time
    CAST(SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as hourly_arrival_rate,
    -- Peak hours identification
    CASE 
        WHEN DATEPART(hour, arrival) BETWEEN 18 AND 21 THEN 'Peak Dinner'
        WHEN DATEPART(hour, arrival) BETWEEN 12 AND 14 THEN 'Peak Lunch'
        WHEN DATEPART(hour, arrival) BETWEEN 14 AND 18 THEN 'Afternoon'
        WHEN DATEPART(hour, arrival) BETWEEN 21 AND 23 THEN 'Late Evening'
        ELSE 'Other'
    END as time_period,
    -- Day of week efficiency
    DATEPART(weekday, date) as day_of_week,
    DATENAME(weekday, date) as day_name
FROM stg.easytable_bookings 
WHERE date >= DATEADD(day, -90, GETDATE())
  AND status = '1'  -- Active bookings only
GROUP BY placeID, placeName, DATEPART(hour, arrival), DATEPART(weekday, date), DATENAME(weekday, date);

-- 10. Arrival analysis view
CREATE OR ALTER VIEW v_arrival_analysis AS
SELECT 
    placeID as restaurant_id,
    placeName as restaurant_name,
    date as booking_date,
    COUNT(*) as total_bookings,
    SUM(persons) as total_guests,
    SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) as arrived_guests,
    SUM(CASE WHEN arrived = 1 THEN 1 ELSE 0 END) as arrived_bookings,
    SUM(CASE WHEN arrived = 0 THEN persons ELSE 0 END) as not_arrived_guests,
    SUM(CASE WHEN arrived = 0 THEN 1 ELSE 0 END) as not_arrived_bookings,
    -- Arrival rate
    CAST(SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as daily_arrival_rate,
    -- No-show rate
    CAST(SUM(CASE WHEN status = '3' THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as no_show_rate,
    -- Average duration
    AVG(CAST(duration AS FLOAT)) as avg_booking_duration
FROM stg.easytable_bookings 
WHERE date >= DATEADD(day, -90, GETDATE())
GROUP BY placeID, placeName, date;

-- Verify views were created successfully
SELECT 
    name as view_name,
    create_date,
    modify_date
FROM sys.views 
WHERE name LIKE 'v_%'
ORDER BY name;

-- Test view performance
PRINT 'Testing flexible view performance...';
DECLARE @StartTime DATETIME2 = SYSDATETIME();

-- Test rolling period analysis
SELECT TOP 10 * FROM v_rolling_booking_summary 
ORDER BY total_guests DESC;

-- Test peak analysis
SELECT TOP 10 * FROM v_peak_analysis 
WHERE day_type = 'Weekend'
ORDER BY total_guests DESC;

-- Test efficiency trends
SELECT TOP 10 * FROM v_guest_efficiency_trends 
WHERE restaurant_id = 11262  -- KöD Bergen
ORDER BY booking_date DESC;

-- Test arrival analysis
SELECT TOP 10 * FROM v_arrival_analysis 
WHERE restaurant_id = 11262
ORDER BY booking_date DESC;

DECLARE @EndTime DATETIME2 = SYSDATETIME();
PRINT 'Flexible view query execution time: ' + CAST(DATEDIFF(millisecond, @StartTime, @EndTime) AS VARCHAR(10)) + ' ms';
