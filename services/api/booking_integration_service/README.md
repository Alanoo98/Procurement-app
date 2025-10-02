# DiningSix Booking Integration Service

A FastAPI service that syncs booking data from Azure SQL database to Supabase PAX table for CPG (Cost Per Guest) analytics.

## 🚀 Quick Start

### 1. Setup
```bash
cd procurement-system/booking_integration_service
python setup.py
```

### 2. Test Connection
```bash
python test.py
```
This will:
- Test your Azure SQL connection
- Export sample booking data to CSV
- Show restaurant information

### 3. Start API Service
```bash
python main.py
```

### 4. Access API
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 📊 API Endpoints

### Booking Sync
- `POST /api/booking-sync` - Trigger booking data sync
- `GET /api/booking-sync/status` - Get sync status

### CPG Analytics
- `GET /api/cpg/current` - Get current CPG metrics
- `GET /api/cpg/trends` - Get CPG trends
- `GET /api/cpg/locations` - Get location breakdown

### Restaurant Data
- `GET /api/restaurants` - Get restaurant list
- `GET /api/booking-summary` - Get booking summary

### Performance Monitoring
- `GET /api/performance/metrics` - Database performance
- `GET /api/cache/stats` - Cache statistics
- `POST /api/cache/clear` - Clear cache

## 🔧 Configuration

### Environment Variables

```bash
# Azure SQL Database (Required)
AZURE_SQL_CONNECTION_STRING="Driver={ODBC Driver 18 for SQL Server};Server=your-server.database.windows.net;Database=your-db;UID=your-username;PWD=your-password;Encrypt=yes;TrustServerCertificate=no;"

# Supabase (Required)
SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Application Settings (Optional)
LOG_LEVEL=INFO
CACHE_TTL=900
API_HOST=0.0.0.0
API_PORT=8000
DEFAULT_ORGANIZATION_ID="dining-six-org-id"
```

### Database Schema

The service expects the following Azure SQL tables:

```sql
-- stg.easytable_bookings (existing)
-- stg.easytable_restauranter (existing)
```

And the following Supabase table:

```sql
-- public.pax (existing)
```

## 🔄 GitHub Actions Integration

The service includes a GitHub Actions workflow for automated booking sync:

```yaml
# .github/workflows/booking-sync.yml
```

**Manual trigger:**
1. Go to Actions tab in GitHub
2. Select "DiningSix Booking Sync"
3. Click "Run workflow"
4. Configure parameters (optional)

**Parameters:**
- `place_id`: Specific restaurant ID (optional)
- `days_back`: Number of days to sync (default: 30)
- `organization_id`: Organization ID for PAX records

## 📈 Performance Optimization

### Database Indexes
The service uses existing optimized indexes:
- `IX_easytable_bookings_cpg_calc` - CPG calculations
- `IX_easytable_bookings_date_range` - Date filtering
- `IX_easytable_bookings_place_date` - Location queries

### Caching Strategy
- **Query results**: 15-minute TTL
- **CPG calculations**: 15-minute TTL
- **Restaurant lists**: 10-minute TTL
- **Performance metrics**: 5-minute TTL

### Query Optimization
- **Date range filtering**: Never queries full table
- **Status filtering**: Only confirmed bookings
- **Pagination**: Limits result sets
- **Index usage**: Optimized for common queries

## 🏗️ Architecture

```
Azure SQL Database → FastAPI Service → Supabase PAX Table
       ↓                    ↓                ↓
   Booking Data      CPG Calculations    PAX Records
       ↓                    ↓                ↓
   Real-time         Caching Layer      Frontend
```

### Components

1. **AzureSQLAdapter** - Direct database queries
2. **CPGService** - Cost per guest calculations
3. **CacheService** - In-memory caching
4. **QueryOptimizer** - Optimized SQL queries
5. **FastAPI App** - RESTful API endpoints

## 🔍 Monitoring

### Health Checks
- Database connectivity
- Query performance
- Cache effectiveness
- Sync status

### Metrics
- Query execution times
- Cache hit rates
- Records processed
- Error rates

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check Azure SQL connection string
   - Verify ODBC driver installation
   - Test network connectivity

2. **Slow Query Performance**
   - Check database indexes
   - Verify date range filtering
   - Monitor query execution plans

3. **Cache Not Working**
   - Check cache service logs
   - Verify TTL settings
   - Monitor memory usage

4. **Sync Failures**
   - Check Supabase credentials
   - Verify PAX table schema
   - Review error logs

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
python main.py
```

## 📚 Development

### Project Structure
```
booking_integration_service/
├── booking_integration/
│   ├── adapters/
│   │   └── azure_sql_adapter.py
│   └── services/
│       ├── cpg_service.py
│       ├── cache_service.py
│       └── query_optimizer.py
├── main.py
├── requirements.txt
├── setup.py
└── README.md
```

### Adding New Features

1. **New API endpoints**: Add to `main.py`
2. **Database queries**: Extend `AzureSQLAdapter`
3. **Business logic**: Add to `CPGService`
4. **Caching**: Use `CacheService`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is part of the Procurement System and follows the same license terms.

---

**Ready to sync your booking data?** Start with the setup script and configure your environment variables!