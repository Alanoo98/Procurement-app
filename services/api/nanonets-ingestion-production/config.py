import os

# e-conomic
ECONOMIC_APP_SECRET = os.getenv('ECONOMIC_APP_SECRET')
ECONOMIC_BASE_URL = os.getenv('ECONOMIC_BASE_URL', 'https://apis.e-conomic.com/documentsapi/v2.0.0')

# Nanonets
NANONETS_API_KEY = os.getenv('NANONETS_API_KEY')
NANONETS_MODEL_ID = os.getenv('NANONETS_MODEL_ID')

def get_grant_tokens():
    # Collect all ECONOMIC_GRANT_TOKEN_X from environment
    return [v for k, v in os.environ.items() if k.startswith('ECONOMIC_GRANT_TOKEN_')] 