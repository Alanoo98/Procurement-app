/*
  # Create dates dimension table

  1. New Tables
    - `dates`
      - `date_id` (date, primary key) - Date identifier
      - `year` (integer) - Year component
      - `month` (integer) - Month component
      - `day_in_month` (integer) - Day component
      - `week` (integer) - Week number
      - `created_at` (timestamptz) - Creation timestamp
  2. Indexes
    - Primary key on `date_id`
    - Index on `year, month` for date range queries
    - Index on `week` for weekly reporting
*/

CREATE TABLE IF NOT EXISTS dates (
  date_id DATE PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day_in_month INTEGER NOT NULL,
  week INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dates_year_month_idx ON dates (year, month);
CREATE INDEX IF NOT EXISTS dates_week_idx ON dates (week);

-- Populate with dates for the next 5 years
DO $$
DECLARE
  start_date DATE := '2023-01-01';
  end_date DATE := '2028-12-31';
  current_date DATE;
BEGIN
  current_date := start_date;
  WHILE current_date <= end_date LOOP
    INSERT INTO dates (date_id, year, month, day_in_month, week)
    VALUES (
      current_date,
      EXTRACT(YEAR FROM current_date),
      EXTRACT(MONTH FROM current_date),
      EXTRACT(DAY FROM current_date),
      EXTRACT(WEEK FROM current_date)
    )
    ON CONFLICT (date_id) DO NOTHING;
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END $$;