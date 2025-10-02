/*
  # New Database Schema
  
  1. Reference Tables
    - suppliers: Core supplier reference table
    - restaurants: Core restaurant reference table
    - dates: Date dimension table for time-based analysis
  
  2. Data Tables
    - pax: Guest count data linked to restaurants and dates
  
  3. Features
    - All tables have RLS enabled with appropriate policies
    - Indexes for optimized querying
    - Proper foreign key relationships
*/

-- Create suppliers reference table
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create restaurants reference table
CREATE TABLE IF NOT EXISTS restaurants (
  restaurant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name text NOT NULL UNIQUE,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create date dimension table
CREATE TABLE IF NOT EXISTS dates (
  date_id date PRIMARY KEY,
  year integer NOT NULL,
  month integer NOT NULL,
  day_in_month integer NOT NULL,
  week integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create PAX data table
CREATE TABLE IF NOT EXISTS pax (
  pax_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id date REFERENCES dates(date_id),
  restaurant_id uuid REFERENCES restaurants(restaurant_id),
  pax_count integer NOT NULL CHECK (pax_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX dates_year_month_idx ON dates (year, month);
CREATE INDEX dates_week_idx ON dates (week);
CREATE INDEX pax_date_restaurant_idx ON pax (date_id, restaurant_id);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pax ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow full access to authenticated users" ON suppliers
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON restaurants
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON dates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON pax
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pax_updated_at
  BEFORE UPDATE ON pax
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to populate dates table
CREATE OR REPLACE FUNCTION populate_dates(start_date date, end_date date)
RETURNS void AS $$
DECLARE
  current_date date := start_date;
BEGIN
  WHILE current_date <= end_date LOOP
    INSERT INTO dates (
      date_id,
      year,
      month,
      day_in_month,
      week
    )
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
END;
$$ LANGUAGE plpgsql;