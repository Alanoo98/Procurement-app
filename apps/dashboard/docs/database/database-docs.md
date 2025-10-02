# Supabase Database Schema Documentation
This document describes the database schema used in the DiningSix Procurement system, built on Supabase PostgreSQL.

Overview
The database follows a multi-tenant architecture supporting restaurant procurement management across organizations, business units, locations, and suppliers. The schema includes comprehensive data tracking, mapping capabilities, and analytics support.

Core Organization Tables
organizations
Primary tenant table for multi-organization support.

Columns:

id (uuid, PK) - Organization identifier
name (text) - Organization name
slug (text, unique) - URL-friendly identifier
settings (jsonb) - Organization-specific configuration
created_at, updated_at (timestamptz) - Audit timestamps
Purpose: Root level tenant isolation and organization management.

organization_users
User membership and role management within organizations.

Columns:

organization_id (uuid, FK) - Reference to organization
user_id (uuid) - User identifier (links to Supabase auth)
role (text) - User role: 'owner', 'admin', 'member'
created_at (timestamptz) - Membership timestamp
Constraints:

Primary key on (organization_id, user_id)
Role check constraint
business_units
Organizational divisions within companies (e.g., regions, brands).

Columns:

id (uuid, PK) - Business unit identifier
organization_id (uuid, FK) - Parent organization
name (text) - Business unit name
type (text) - Business unit classification
settings (jsonb) - Unit-specific configuration
created_at, updated_at (timestamptz) - Audit timestamps
Location Management
locations
Standard location definitions for restaurants/facilities.

Columns:

location_id (uuid, PK) - Location identifier
name (text) - Standard location name
address (text) - Physical address
country (text) - Country code
organization_id (uuid, FK) - Owner organization
business_unit_id (uuid, FK) - Associated business unit
created_at, updated_at (timestamptz) - Audit timestamps
Indexes:

idx_locations_organization_id - Organization filtering
idx_locations_business_unit_id - Business unit filtering
idx_locations_country - Country-based queries
location_mappings
Maps variant location names/addresses to standard locations.

Columns:

mapping_id (uuid, PK) - Mapping identifier
location_id (uuid, FK) - Reference to standard location
variant_name (text) - Variant location name from source data
variant_address (text) - Variant address
variant_receiver_name (text) - Variant receiver name
organization_id (uuid, FK) - Organization context
created_at, updated_at (timestamptz) - Audit timestamps
Indexes: Multiple indexes for efficient variant lookup by name, address, and receiver.

pending_location_mappings
Temporary storage for unresolved location variants awaiting manual mapping.

Columns:

id (uuid, PK) - Record identifier
variant_receiver_name (text) - Unresolved receiver name
variant_address (text) - Unresolved address
suggested_location_id (uuid) - AI/algorithm suggested match
similarity_score (double precision) - Confidence score
status (text) - Processing status (default: 'pending')
organization_id (uuid, FK) - Organization context
created_at (timestamptz) - Discovery timestamp
Supplier Management
suppliers
Standard supplier definitions.

Columns:

supplier_id (uuid, PK) - Supplier identifier
organization_id (uuid, FK) - Owner organization
name (text) - Standard supplier name
address (text) - Supplier address
tax_id (text) - Tax identification number
created_at, updated_at (timestamptz) - Audit timestamps
supplier_mappings
Maps variant supplier names/addresses to standard suppliers.

Columns:

mapping_id (uuid, PK) - Mapping identifier
supplier_id (uuid, FK) - Reference to standard supplier
variant_name (text) - Variant supplier name
variant_address (text) - Variant address
organization_id (uuid, FK) - Organization context
created_at, updated_at (timestamptz) - Audit timestamps
Constraints: Unique constraint on (organization_id, variant_name, variant_address)

pending_supplier_mappings
Unresolved supplier variants awaiting mapping.

Columns:

id (uuid, PK) - Record identifier
variant_supplier_name (text) - Unresolved supplier name
variant_address (text) - Unresolved address
suggested_supplier_id (uuid, FK) - Suggested match
similarity_score (double precision) - Confidence score
status (text) - Processing status
organization_id (uuid, FK) - Organization context
created_at (timestamptz) - Discovery timestamp
supplier_business_units
Many-to-many relationship between suppliers and business units.

Columns:

id (uuid, PK) - Relationship identifier
supplier_id (uuid, FK) - Supplier reference
business_unit_id (uuid, FK) - Business unit reference
created_at (timestamptz) - Relationship timestamp
Data Integration
data_sources
Configuration for external data sources (e.g., accounting systems, APIs).

Columns:

id (uuid, PK) - Source identifier
organization_id (uuid, FK) - Owner organization
business_unit_id (uuid, FK) - Associated business unit
name (text) - Source name
type (text) - Source type (e.g., 'e-conomic', 'csv', 'api')
config (jsonb) - Source-specific configuration
credentials (jsonb) - Access credentials (encrypted)
is_active (boolean) - Active status
created_at, updated_at (timestamptz) - Audit timestamps
Constraints: Unique constraint on (organization_id, name)

data_mappings
Field mapping configurations for data transformation.

Columns:

id (uuid, PK) - Mapping identifier
data_source_id (uuid, FK) - Associated data source
source_field (text) - Original field name
target_field (text) - Mapped field name
transformation (text) - Optional transformation logic
created_at, updated_at (timestamptz) - Audit timestamps
Constraints: Unique constraint on (data_source_id, source_field)

extracted_data
Raw data extracted from sources before processing.

Columns:

id (uuid, PK) - Record identifier
organization_id (uuid, FK) - Owner organization
business_unit_id (uuid, FK) - Associated business unit
data_source_id (uuid, FK) - Source reference
external_id (text) - External system identifier
data (jsonb) - Raw extracted data
metadata (jsonb) - Additional metadata
status (text) - Processing status ('pending', 'processed', 'error')
processed_at (timestamptz) - Processing timestamp
created_at, updated_at (timestamptz) - Audit timestamps
Transaction Data
invoice_lines
Core transactional data - individual line items from invoices and credit notes.

Columns:

id (uuid, PK) - Line item identifier
organization_id (uuid, FK) - Organization context
business_unit_id (uuid, FK) - Business unit context
data_source_id (uuid, FK) - Source system reference
extracted_data_id (uuid, FK) - Raw data reference
Document Information:

invoice_number (text) - Invoice/document number
invoice_date, delivery_date, due_date (date) - Key dates
document_type (text) - Document type (Faktura, Kreditnota)
currency (text) - Transaction currency
Entity References:

supplier_id (uuid, FK) - Standardized supplier
location_id (uuid, FK) - Standardized location
supplier_pending, location_pending (boolean) - Mapping status flags
Product & Pricing:

product_code (text) - Product identifier
description (text) - Product description
product_category (text) - Product classification
quantity (numeric) - Ordered quantity
unit_type, unit_subtype (text) - Unit specifications
sub_quantity (numeric) - Sub-unit quantity
unit_price (numeric) - Original unit price
unit_price_after_discount (numeric) - Discounted unit price
discount_amount, discount_percent (numeric) - Discount details
total_price (numeric) - Line total before discount
total_price_after_discount (numeric) - Final line total
Variant Data (for mapping):

variant_supplier_name, variant_address (text) - Original supplier data
variant_receiver_name, variant_receiver_address (text) - Original location data
Indexes: Comprehensive indexing for performance on common queries.

Analytics & Reporting
dates
Date dimension table for time-based analytics.

Columns:

date_id (date, PK) - Date identifier
year, month, day_in_month, week (integer) - Date components
created_at (timestamptz) - Creation timestamp
pax
Guest count data for efficiency calculations.

Columns:

pax_id (uuid, PK) - Record identifier
date_id (date, FK) - Date reference
location_id (uuid, FK) - Location reference
pax_count (integer) - Guest count (≥ 0)
created_at, updated_at (timestamptz) - Audit timestamps
Constraints: Check constraint ensuring non-negative PAX count.

price_alerts
Price variation tracking and alerts.

Columns:

id (uuid, PK) - Alert identifier
product_code (text) - Product reference
supplier_name (text) - Supplier reference
date (date) - Alert date
min_price, max_price (numeric) - Price range
variation_type (text) - Alert type: 'same_day', 'historical', 'agreement'
resolved_at (timestamptz) - Resolution timestamp
resolution_reason, resolution_note (text) - Resolution details
organization_id, business_unit_id (uuid, FK) - Context
created_at, updated_at (timestamptz) - Audit timestamps
RLS: Row Level Security enabled with policy for authenticated users.

price_negotiations
Negotiated price agreements with suppliers.

Columns:

id (uuid, PK) - Agreement identifier
organization_id (uuid, FK) - Organization context
product_code (text) - Product identifier
description (text) - Product description
unit_type, unit_subtype (text) - Unit specifications
price (numeric) - Negotiated price
supplier (text) - Supplier name
start_date, end_date (date) - Agreement validity period
created_at, updated_at (timestamptz) - Audit timestamps
product_mappings
Product standardization mappings.

Columns:

id (uuid, PK) - Mapping identifier
source_code (text, unique) - Original product code
target_code (text) - Standard product code
organization_id, business_unit_id (uuid, FK) - Context
created_at, updated_at (timestamptz) - Audit timestamps
RLS: Row Level Security enabled.

Specialized Tables
mapping_templates
Reusable field mapping templates.

Columns:

id (uuid, PK) - Template identifier
name (text, unique) - Template name
description (text) - Template description
created_at (timestamptz) - Creation timestamp
mapping_template_entries
Individual field mappings within templates.

Columns:

id (uuid, PK) - Entry identifier
template_id (uuid, FK) - Parent template
source_field (text) - Source field name
target_field (text) - Target field name
transformation (text) - Optional transformation logic
ingestion_runs
Tracking for automated data ingestion processes.

Columns:

id (uuid, PK) - Run identifier
triggered_at (timestamptz) - Start timestamp
completed_at (timestamptz) - Completion timestamp
duration_ms (integer) - Execution duration
source (text) - Source system (default: 'e-conomic')
status (text) - Run status: 'running', 'success', 'error'
error_message (text) - Error details if failed
processed_tracker
Tracking processed documents to prevent duplicates.

Columns:

id (uuid, PK) - Record identifier
document_id (integer) - External document ID
accounting_year (text) - Accounting year
organization_id (text) - Organization identifier
filename (text) - Source filename
status (text) - Processing status: 'pending', 'processed', 'failed'
created_at, updated_at (timestamptz) - Audit timestamps
Constraints: Unique constraint on (document_id, accounting_year, organization_id)

economic_granttokens
Integration tokens for e-conomic API access.

Columns:

id (uuid, PK) - Token identifier
location_id (uuid, FK) - Associated location
location_name (text) - Location name
grant_token (text) - API access token
created_at, updated_at (timestamptz) - Audit timestamps
Materialized Views
restaurant_metrics
Pre-computed restaurant performance metrics.

Columns:

location_id (uuid) - Location identifier
name, address, country (text) - Location details
invoice_count, product_count, supplier_count (bigint) - Counts
total_spend (numeric) - Total spending
supplier_metrics
Pre-computed supplier performance metrics.

Columns:

supplier_id (uuid) - Supplier identifier
name, address, tax_id (text) - Supplier details
invoice_count (bigint) - Transaction count
total_spend (numeric) - Total spending
top_products (text) - Most purchased products
invoice_documents
Document-level aggregations from line items.

Columns:

Document identifiers and dates
Entity references (supplier, location)
Aggregated quantities and pricing
Line item counts
Views
unresolved_invoice_suppliers
Invoice lines with unresolved supplier mappings.

unresolved_invoice_locations
Invoice lines with unresolved location mappings.

Key Features
Multi-tenant Architecture: Complete organization and business unit isolation
Flexible Entity Mapping: Comprehensive variant-to-standard mapping system
Data Lineage: Full traceability from source to processed data
Performance Optimization: Strategic indexing and materialized views
Analytics Support: Purpose-built tables for reporting and insights
Integration Ready: Configurable data sources and field mappings
Audit Trail: Comprehensive timestamp tracking across all tables
Data Quality: Constraints and validation rules ensure data integrity
Security
Row Level Security (RLS) enabled on sensitive tables
Foreign key constraints maintain referential integrity
Check constraints enforce business rules
Unique constraints prevent data duplication
This schema supports complex procurement analytics, price monitoring, supplier management, and multi-location restaurant operations while maintaining data integrity and performance.