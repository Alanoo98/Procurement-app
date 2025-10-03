# Nanonets Webhook Service - Render Deployment Guide

## 🚀 Quick Setup Instructions

### 1. Update Your Render Service Configuration

Go to your Render dashboard and update the following settings:

#### General Settings
- **Name**: `nanonets-webhook` (or keep existing name)
- **Region**: `Frankfurt (EU Central)`
- **Instance Type**: `Free`

#### Build & Deploy Settings
- **Repository**: `https://github.com/Alanoo98/Procurement-app`
- **Branch**: `main`
- **Root Directory**: `services/api/nanonets-webhook`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python start.py`
- **Health Check Path**: `/healthz`

#### Environment Variables
Make sure these environment variables are set in your Render service:

```
DATABASE_URL=your_supabase_database_url
NANONETS_MODEL_ID=your_nanonets_model_id
DEFAULT_ORG_ID=your_default_organization_id
```

### 2. Key Changes Made

#### ✅ Fixed Start Command
- **Old**: `uvicorn nanonets-webhook.webhook_listener:app --host 0.0.0.0 --port 10000`
- **New**: `python start.py`

#### ✅ Added Health Check Endpoint
- Added `/healthz` endpoint for Render monitoring
- Tests database connectivity
- Returns health status

#### ✅ Updated Requirements
- Added `pydantic` dependency
- All necessary packages included

#### ✅ Created Startup Script
- `start.py` handles proper port configuration
- Uses Render's PORT environment variable
- Proper logging configuration

### 3. Deployment Steps

1. **Update Render Service Settings**:
   - Go to your Render dashboard
   - Navigate to your `procurement-api` service
   - Update the settings as specified above

2. **Deploy**:
   - Click "Save Changes" in Render
   - The service will automatically redeploy
   - Monitor the build logs for any issues

3. **Verify Deployment**:
   - Check that the service is running
   - Visit `https://your-service-url.onrender.com/` - should show "Nanonets webhook is live!"
   - Visit `https://your-service-url.onrender.com/healthz` - should show health status

### 4. Testing the Webhook

Once deployed, you can test the webhook endpoint:

```bash
# Test the root endpoint
curl https://your-service-url.onrender.com/

# Test the health check
curl https://your-service-url.onrender.com/healthz

# Test the webhook endpoint (with proper payload)
curl -X POST https://your-service-url.onrender.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"result": {"input": "test.pdf", "prediction": []}}'
```

### 5. Monitoring

- **Health Checks**: Render will automatically monitor `/healthz`
- **Logs**: Check Render dashboard for application logs
- **Database**: Monitor database connectivity through health endpoint

### 6. Troubleshooting

#### Common Issues:

1. **Build Failures**:
   - Check that all dependencies are in `requirements.txt`
   - Verify Python version compatibility

2. **Startup Failures**:
   - Check environment variables are set correctly
   - Verify database connection string
   - Check application logs in Render dashboard

3. **Health Check Failures**:
   - Verify database connectivity
   - Check that all required environment variables are set
   - Review application logs for errors

#### Debug Commands:

```bash
# Check service status
curl https://your-service-url.onrender.com/healthz

# View logs in Render dashboard
# Go to your service → Logs tab
```

### 7. Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Supabase database connection string | Yes |
| `NANONETS_MODEL_ID` | Nanonets model ID for webhook processing | Yes |
| `DEFAULT_ORG_ID` | Default organization ID for new documents | Yes |

### 8. Service Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Nanonets      │───▶│   Render         │───▶│   Supabase      │
│   Webhook       │    │   Web Service    │    │   Database      │
│   (External)    │    │   (FastAPI)      │    │   (PostgreSQL)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

The webhook service receives document processing results from Nanonets, processes them, and stores the extracted data in your Supabase database.

### 9. Next Steps

1. **Configure Nanonets**: Update your Nanonets webhook URL to point to your new Render service
2. **Test Integration**: Process a test document through Nanonets
3. **Monitor Performance**: Set up monitoring and alerting
4. **Scale if Needed**: Upgrade to paid plan if you need more resources

## 📞 Support

If you encounter any issues:
1. Check the Render service logs
2. Verify all environment variables are set
3. Test the health endpoint
4. Review the application code for any errors

The service should now be properly configured and ready for production use!
