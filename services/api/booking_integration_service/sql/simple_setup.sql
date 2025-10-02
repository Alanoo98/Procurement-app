-- Simple Setup for DiningSix Booking Integration
-- Run this entire script in Azure SQL Management Studio
--
-- Status Mappings:
-- Status 1 = Active (active bookings)
-- Status 2 = Cancelled (cancelled bookings)
-- Status 3 = Expired (expired bookings)
-- Status 4 = Pending (pending bookings)
-- Status 5 = Confirmed (confirmed bookings)
-- Status 6 = No-Show (not arrived)

-- 1. Basic Indexes for Performance
CREATE NONCLUSTERED INDEX IX_easytable_bookings_date 
ON stg.easytable_bookings (date)
INCLUDE (persons, status, placeID, placeName);

CREATE NONCLUSTERED INDEX IX_easytable_bookings_place_date 
ON stg.easytable_bookings (placeID, date)
INCLUDE (persons, status);

CREATE NONCLUSTERED INDEX IX_easytable_bookings_status 
ON stg.easytable_bookings (status, date)
INCLUDE (persons, placeID);

-- 2. Simple Views for CPG Calculations

-- Daily booking summary for CPG calculations
CREATE OR ALTER VIEW v_booking_summary AS
SELECT 
    placeID as restaurant_id,
    placeName as restaurant_name,
    date as booking_date,
    SUM(persons) as total_guests,
    COUNT(*) as total_bookings,
    SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) as arrived_guests,
    SUM(CASE WHEN arrived = 1 THEN 1 ELSE 0 END) as arrived_bookings,
    AVG(CAST(persons AS FLOAT)) as avg_guests_per_booking,
    CAST(SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as arrival_rate
FROM stg.easytable_bookings 
WHERE status = '1'  -- Active bookings only (status 1 = active)
GROUP BY placeID, placeName, date;

-- Restaurant summary
CREATE OR ALTER VIEW v_restaurant_summary AS
SELECT 
    placeID as restaurant_id,
    placeName as restaurant_name,
    COUNT(*) as total_bookings,
    SUM(persons) as total_guests,
    SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) as arrived_guests,
    AVG(CAST(persons AS FLOAT)) as avg_guests_per_booking,
    CAST(SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as overall_arrival_rate,
    MIN(date) as first_booking_date,
    MAX(date) as last_booking_date
FROM stg.easytable_bookings 
WHERE status = '1'  -- Active bookings only (status 1 = active)
GROUP BY placeID, placeName;

-- Recent activity (last 30 days)
CREATE OR ALTER VIEW v_recent_activity AS
SELECT 
    placeID as restaurant_id,
    placeName as restaurant_name,
    COUNT(*) as recent_bookings,
    SUM(persons) as recent_guests,
    SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) as recent_arrived_guests,
    AVG(CAST(persons AS FLOAT)) as recent_avg_guests_per_booking,
    CAST(SUM(CASE WHEN arrived = 1 THEN persons ELSE 0 END) AS FLOAT) / NULLIF(SUM(persons), 0) as recent_arrival_rate
FROM stg.easytable_bookings 
WHERE status = '2'  -- Confirmed bookings only (status 2 = confirmed)
  AND date >= DATEADD(day, -30, GETDATE())
GROUP BY placeID, placeName;

-- Test the setup
PRINT 'Testing simple setup...';

-- Test booking summary
SELECT TOP 5 * FROM v_booking_summary ORDER BY booking_date DESC;

-- Test restaurant summary
SELECT * FROM v_restaurant_summary;

-- Test recent activity
SELECT * FROM v_recent_activity;

PRINT 'Simple setup complete!';
