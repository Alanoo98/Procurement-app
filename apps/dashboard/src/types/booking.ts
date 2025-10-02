/**
 * TypeScript types for DiningSix booking integration
 */

export interface BookingRecord {
  bookingID: number;
  placeID: number;
  placeName: string;
  date: string;
  arrival: string;
  duration: number;
  status: 'confirmed' | 'cancelled' | 'pending' | 'no-show';
  persons: number;
  arrived: boolean;
  expired: boolean;
  walkin: boolean;
  webBooking: boolean;
  customerID?: number;
  customerExternalID?: string;
  name?: string;
  mobile?: string;
  email?: string;
  customerNote?: string;
  bookingTypeID?: number;
  eventID?: number;
  eventName?: string;
  reference?: string;
  language?: string;
  prepaymentTotal?: number;
  prepaymentBalance?: number;
  preorderPaid?: boolean;
  preorderTotalAmount?: number;
  createdOn: string;
  modifiedOn?: string;
  createdByName?: string;
  createdByEmail?: string;
  tableID?: number;
  tableName?: string;
  firstTag?: string;
  DW_DimFirma_EK?: number;
  guestNote?: string;
}

export interface Restaurant {
  restaurant: string;
  restaurantId: number;
  country: string;
  DW_DimFirma_EK?: number;
  placeToken?: string;
}

export interface BookingSummary {
  total_bookings: number;
  total_guests: number;
  avg_party_size: number;
  active_restaurants: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  walkin_bookings: number;
  web_bookings: number;
  confirmation_rate: number;
  cancellation_rate: number;
  period_start: string;
  period_end: string;
  period_days: number;
}

export interface DailyGuestCount {
  date: string;
  total_guests: number;
  total_bookings: number;
  avg_party_size: number;
}

export interface CPGMetrics {
  date: string;
  location_id: number;
  location_name: string;
  total_guests: number;
  total_bookings: number;
  avg_party_size: number;
  cpg_value?: number;
  procurement_cost?: number;
}

export interface CPGSummary {
  period_start: string;
  period_end: string;
  total_guests: number;
  total_bookings: number;
  avg_cpg?: number;
  locations: CPGMetrics[];
  trends: {
    avg_guests_per_day: number;
    avg_bookings_per_day: number;
    total_locations: number;
    period_days: number;
    top_location?: {
      name: string;
      guests: number;
      bookings: number;
    };
    avg_cpg?: number;
  };
}

export interface BookingSyncRequest {
  place_id?: number;
  days_back?: number;
  organization_id?: string;
}

export interface BookingSyncResponse {
  status: string;
  message: string;
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  sync_time: string;
}

export interface BookingSyncStatus {
  status: 'idle' | 'running' | 'success' | 'error';
  last_sync?: string;
  error?: string;
  progress: number;
}

export interface DatabaseConnectionStatus {
  status: 'connected' | 'error';
  test_query?: number;
  total_bookings?: number;
  total_restaurants?: number;
  earliest_booking?: string;
  latest_booking?: string;
  timestamp: string;
  error?: string;
}

export interface PerformanceMetrics {
  table_stats: {
    total_rows: number;
    unique_restaurants: number;
    earliest_date?: string;
    latest_date?: string;
    recent_bookings: number;
  };
  index_usage: Array<{
    index_name: string;
    user_seeks: number;
    user_scans: number;
    user_lookups: number;
    user_updates: number;
  }>;
  timestamp: string;
}

export interface CacheStats {
  total_entries: number;
  active_entries: number;
  expired_entries: number;
  hit_rate: number;
  memory_usage: number;
}

// PAX table mapping types
export interface PaxRecordFromBooking {
  date_id: string;
  location_id: string;
  pax_count: number;
  organization_id: string;
}

export interface BookingToPaxMapping {
  placeID: number;
  placeName: string;
  date: string;
  total_persons: number;
  confirmed_bookings: number;
  mapped_location_id?: string;
  organization_id: string;
}