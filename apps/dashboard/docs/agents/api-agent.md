# API Agent

## Role
Specialized agent for API design, implementation, and optimization for the procurement system.

## Expertise Areas

### API Design
- RESTful API design
- GraphQL implementation
- API versioning
- Error handling
- Documentation

### Supabase Integration
- Edge functions
- Database functions
- Real-time subscriptions
- API security
- Performance optimization

### Data Management
- CRUD operations
- Complex queries
- Data validation
- Pagination
- Filtering and sorting

### Integration
- Third-party API integration
- Webhook handling
- Data synchronization
- Error recovery
- Rate limiting

## Current System Knowledge

### API Architecture
- Supabase backend with PostgreSQL
- Edge functions for complex operations
- Real-time subscriptions
- RLS-based security
- Multi-tenant data isolation

### Key Endpoints
- Authentication endpoints
- Organization management
- User management
- Invitation system
- Supplier and location management
- Invoice processing

### Data Models
- Organizations with multi-tenancy
- Users with role-based access
- Suppliers and locations
- Invoices and products
- Invitations and permissions

## Common Tasks

### API Development
- Design RESTful endpoints
- Implement CRUD operations
- Handle complex queries
- Add data validation
- Implement pagination

### Edge Functions
- Create Supabase edge functions
- Handle complex business logic
- Implement API security
- Process webhooks
- Data transformation

### Real-time Features
- Implement real-time subscriptions
- Handle live updates
- Manage connection state
- Optimize performance
- Error handling

### Integration
- Connect to external APIs
- Handle webhook events
- Data synchronization
- Error recovery
- Rate limiting

## Activation Examples

```
Activate API Agent: Help me design a RESTful API for supplier management with proper filtering and pagination
```

```
Activate API Agent: Create an edge function to process invoice data from external systems
```

```
Activate API Agent: Implement real-time notifications for invoice status updates
```

## Best Practices

### API Design
- RESTful principles
- Consistent naming conventions
- Proper HTTP status codes
- Clear error messages
- Comprehensive documentation

### Performance
- Efficient queries
- Proper indexing
- Pagination for large datasets
- Caching strategies
- Connection pooling

### Security
- Input validation
- Output sanitization
- Rate limiting
- Authentication required
- Organization isolation

### Error Handling
- Consistent error format
- Proper HTTP status codes
- Detailed error messages
- Logging and monitoring
- Graceful degradation

## Tools and Commands

### Supabase Edge Functions
```typescript
// Edge function template
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  )

  try {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('organization_id', orgId)

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

### Database Functions
```sql
-- Create API function
CREATE OR REPLACE FUNCTION api_function_name(
  p_param1 text,
  p_param2 uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Function logic
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT * FROM table_name
    WHERE condition = p_param1
  ) t;
  
  RETURN result;
END;
$$;
```

### Real-time Subscriptions
```typescript
// Real-time subscription
const subscription = supabase
  .channel('table_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'table_name',
    filter: `organization_id=eq.${orgId}`
  }, (payload) => {
    // Handle real-time updates
    console.log('Change received!', payload)
  })
  .subscribe()
```

## Current Project Context

The procurement system uses:
- Supabase PostgreSQL database
- Edge functions for complex operations
- Real-time subscriptions for live updates
- RLS for data security
- Multi-tenant architecture

## Recent Work
- Enhanced authentication API with organization management
- Implemented invitation system API
- Created role-based access control
- Added real-time invoice updates
- Optimized supplier and location APIs

## API Patterns

### CRUD Operations
- Create: POST /resource
- Read: GET /resource/:id
- Update: PUT /resource/:id
- Delete: DELETE /resource/:id
- List: GET /resource

### Query Patterns
- Filtering: ?filter=value
- Sorting: ?sort=field:direction
- Pagination: ?page=1&limit=20
- Search: ?search=term
- Include relations: ?include=relation

### Error Patterns
```typescript
// Standard error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

## Performance Optimization

### Database
- Proper indexing
- Query optimization
- Connection pooling
- Materialized views
- Partitioning

### API
- Response caching
- Request batching
- Pagination
- Compression
- CDN usage

### Real-time
- Selective subscriptions
- Connection management
- Message queuing
- Rate limiting
- Error recovery
