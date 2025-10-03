#!/usr/bin/env python3
"""
Startup script for Nanonets webhook service on Render
"""
import uvicorn
import os
from webhook_listener import app

if __name__ == "__main__":
    # Get port from environment variable (Render sets this)
    port = int(os.getenv("PORT", 10000))
    
    # Start the FastAPI application
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
