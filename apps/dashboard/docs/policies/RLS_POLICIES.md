# Row Level Security (RLS) Policies Documentation

This document outlines all Row Level Security policies implemented in the DiningSix Procurement database.

## Overview

Row Level Security (RLS) is enabled on all sensitive tables to ensure data isolation between organizations and proper access control based on user roles and business unit assignments.

## Core Security Functions

### `uid()`
Returns the authenticated user's ID from Supabase Auth.

### `user_belongs_to_organization(org_id)`
Custom function that checks if the current user belongs to a specific organization.

### User Business Unit Access
The `user_business_unit_access` table controls which business units a user can access within an organization, with role-based permissions.

---

## Table-by-Table RLS Policies

### 1. `users`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view their own profile | SELECT | Users can only see their own user record | `uid() = id` |
| Users can update their own profile | UPDATE | Users can only modify their own profile | `uid() = id` (both qual and with_check) |

### 2. `organizations`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view their own organizations | SELECT | Users can view organizations they belong to | User exists in `organization_users` for this organization |
| Organization owners can update their organization | UPDATE | Only owners/admins can modify organization settings | User has 'owner' or 'admin' role in `organization_users` |

### 3. `organization_users`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can read their own organization memberships | SELECT | Users can see their own organization memberships | `uid() = user_id` |

### 4. `business_units`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view business units in their organization | SELECT | View business units using `user_belongs_to_organization()` | `user_belongs_to_organization(organization_id)` |
| Admins can manage business units in their organization | ALL | Full CRUD access for organization admins | User has 'owner' or 'admin' role in the organization |

### 5. `user_business_unit_access`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view their own access | SELECT | Users can see their own access permissions | `uid() = user_id` |
| Organization admins can manage user access | ALL | Admins can grant/revoke access to business units | User has 'owner' or 'admin' role in the organization |

### 6. `locations`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view locations in their organization | SELECT | View locations using organization membership | `user_belongs_to_organization(organization_id)` |
| Scoped access - locations | SELECT | View locations based on business unit access | User has access to the location's business unit via `user_business_unit_access` |
| Admins can manage locations in their organization | ALL | Full CRUD access for organization admins | User has 'owner' or 'admin' role in the organization |

### 7. `location_mappings`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view location mappings in their organization | SELECT | View mappings using organization membership | `user_belongs_to_organization(organization_id)` |
| Scoped access - location_mappings | SELECT | View mappings based on business unit access | User has access via `user_business_unit_access` |
| Admins can manage location mappings in their organization | ALL | Full CRUD access for organization admins | User has 'owner' or 'admin' role in the organization |

### 8. `pending_location_mappings`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view pending location mappings in their organization | SELECT | View pending mappings using organization membership | `user_belongs_to_organization(organization_id)` |
| Scoped access - pending_location_mappings | SELECT | View pending mappings based on business unit access | User has access via `user_business_unit_access` |

### 9. `suppliers`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view suppliers in their organization | SELECT | View suppliers using organization membership | `user_belongs_to_organization(organization_id)` |
| Scoped access - suppliers | SELECT | View suppliers based on business unit access | User has access via `user_business_unit_access` |
| Admins can manage suppliers in their organization | ALL | Full CRUD access for organization admins | User has 'owner' or 'admin' role in the organization |

### 10. `supplier_mappings`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view supplier mappings in their organization | SELECT | View mappings using organization membership | `user_belongs_to_organization(organization_id)` |
| Scoped access - supplier_mappings | SELECT | View mappings based on business unit access | User has access via `user_business_unit_access` |
| Admins can manage supplier mappings in their organization | ALL | Full CRUD access for organization admins | User has 'owner' or 'admin' role in the organization |

### 11. `pending_supplier_mappings`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view pending supplier mappings in their organization | SELECT | View pending mappings using organization membership | `user_belongs_to_organization(organization_id)` |
| Scoped access - pending_supplier_mappings | SELECT | View pending mappings based on business unit access | User has access via `user_business_unit_access` |

### 12. `supplier_business_units`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view SBUs in their org | SELECT | View supplier-business unit relationships | User has access via `user_business_unit_access` joined with suppliers |

### 13. `data_sources`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view data sources in their organization | SELECT | View data sources using organization membership | `user_belongs_to_organization(organization_id)` |
| Scoped access - data_sources | SELECT | View data sources based on business unit access | User has access via `user_business_unit_access` |
| Admins can manage data sources in their organization | ALL | Full CRUD access for organization admins | User has 'owner' or 'admin' role in the organization |

### 14. `data_mappings`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view data mappings for their data sources | SELECT | View mappings using organization membership via data sources | User belongs to organization that owns the data source |
| Scoped access - data_mappings | SELECT | View mappings based on business unit access | User has access via `user_business_unit_access` joined with data sources |

### 15. `extracted_data`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view extracted data in their organization | SELECT | View extracted data using organization membership | `user_belongs_to_organization(organization_id)` |
| Users can insert extracted data in their organization | INSERT | Insert data for their organization | `user_belongs_to_organization(organization_id)` (with_check) |
| Scoped access - extracted_data | SELECT | View extracted data based on business unit access | User has access via `user_business_unit_access` |

### 16. `invoice_lines`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view invoice lines in their organization | SELECT | View invoice lines using organization membership | `user_belongs_to_organization(organization_id)` |
| Users can view invoice lines scoped to their access | SELECT | View invoice lines based on business unit access | User has access via `user_business_unit_access` |
| Users can read their organization's invoice_lines | SELECT | Alternative organization-based access | User has access via `user_business_unit_access` |
| Users can insert invoice lines in their organization | INSERT | Insert invoice lines for their organization | `user_belongs_to_organization(organization_id)` (with_check) |
| Scoped access - invoice_lines | SELECT | View invoice lines based on business unit access | User has access via `user_business_unit_access` |

### 17. `pax`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view PAX data for locations in their organization | SELECT | View PAX data using organization membership via locations | User belongs to organization that owns the location |
| Users can view PAX scoped to their access | SELECT | View PAX data based on business unit access | User has access via `user_business_unit_access` joined with locations |
| Users can access their organization's pax data | ALL | Full access to PAX data for organization members | User is member of the organization |
| Users can manage PAX data for locations in their organization | ALL | Full CRUD access for organization members | User belongs to organization that owns the location |
| Scoped access - pax | SELECT | View PAX data based on business unit access | User has access via `user_business_unit_access` joined with locations |

### 18. `price_negotiations`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can access their organization's price negotiations | ALL | Full access to price negotiations for organization members | User is member of the organization |
| Scoped access - price_negotiations | SELECT | View price negotiations based on business unit access | User has access via `user_business_unit_access` |

### 19. `price_alerts`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Allow full access to authenticated users | ALL | Full access for all authenticated users | `true` |
| Scoped access - price_alerts | SELECT | View price alerts based on business unit access | User has access via `user_business_unit_access` |

### 20. `product_mappings`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Allow full access to authenticated users | ALL | Full access for all authenticated users | `true` |
| Scoped access - product_mappings | SELECT | View product mappings based on business unit access | User has access via `user_business_unit_access` |

### 21. `processed_tracker`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view processed tracker for their organization | SELECT | View processed tracker using organization membership | `organization_id = (get_user_organization_id())::text` |
| Scoped access - processed_tracker | SELECT | View processed tracker based on business unit access | User has access via `user_business_unit_access` |

### 22. `dates`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Allow read access to dates | SELECT | All authenticated users can read the dates dimension table | `true` |

### 23. `economic_granttokens`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Users can view tokens for their locations | SELECT | View tokens based on location access | User has access via `user_business_unit_access` joined with locations |

### 24. `ingestion_runs`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Admins can view ingestion runs | SELECT | Only admins can view ingestion run history | User has 'owner' or 'admin' role in `user_business_unit_access` |

### 25. `mapping_templates` and `mapping_template_entries`
**RLS Enabled:** Yes

| Policy Name | Command | Description | Condition |
|-------------|---------|-------------|-----------|
| Allow all authenticated users to view | SELECT | All authenticated users can view mapping templates | `true` |

---

## Security Best Practices

1. **Principle of Least Privilege**: Users only have access to data they need for their role
2. **Organization Isolation**: Data is strictly isolated between organizations
3. **Role-Based Access**: Different permissions based on user roles
4. **Business Unit Scoping**: Further refinement of access based on business unit assignments
5. **Consistent Policy Naming**: Policies follow consistent naming conventions for clarity
6. **Hierarchical Access**: Organization admins have broader access than regular members

## Common RLS Patterns

1. **Organization Membership**: `user_belongs_to_organization(organization_id)`
2. **Role-Based Control**: `organization_users.role = ANY (ARRAY['owner', 'admin'])`
3. **Business Unit Scoping**: `user_business_unit_access` join conditions
4. **Self-Access Only**: `uid() = user_id`