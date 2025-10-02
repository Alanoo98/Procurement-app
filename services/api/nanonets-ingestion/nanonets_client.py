import requests
import time
from config import NANONETS_API_KEY, NANONETS_MODEL_ID

def send_pdf_to_nanonets(pdf_data: bytes, filename: str, async_mode: bool = True, retries: int = 5, delay: float = 30.0):
    """
    Send PDF to Nanonets with proper rate limiting handling.
    
    Args:
        pdf_data: PDF file bytes
        filename: Name of the file
        async_mode: Whether to use async processing
        retries: Maximum number of retry attempts
        delay: Initial delay in seconds (will be exponentially increased)
    """
    async_str = "true" if async_mode else "false"
    url = f'https://app.nanonets.com/api/v2/OCR/Model/{NANONETS_MODEL_ID}/LabelFile/?async={async_str}'

    files = {
        'file': (filename, pdf_data, 'application/pdf')
    }

    for attempt in range(retries):
        try:
            response = requests.post(
                url,
                auth=requests.auth.HTTPBasicAuth(NANONETS_API_KEY, ''),
                files=files,
                timeout=30
            )

            # Handle rate limiting (429) with exponential backoff
            if response.status_code == 429:
                if attempt == retries - 1:
                    raise Exception(f"Rate limit exceeded after {retries} retries for {filename}")
                
                # Exponential backoff: 30s, 60s, 120s, 240s, 480s
                wait_time = delay * (2 ** attempt)
                print(f"⚠️ Rate limit hit for {filename}. Retrying after {wait_time:.1f}s (attempt {attempt + 1}/{retries})")
                time.sleep(wait_time)
                continue

            # Handle other server errors (502, 503) with shorter delays
            if response.status_code in (502, 503):
                wait_time = 5 * (2 ** attempt)  # 5s, 10s, 20s, 40s, 80s
                print(f"⚠️ Server error {response.status_code} for {filename}. Retrying after {wait_time:.1f}s (attempt {attempt + 1}/{retries})")
                time.sleep(wait_time)
                continue

            response.raise_for_status()
            
            # Small delay between successful requests to avoid hitting rate limits
            if attempt > 0:
                time.sleep(1)
                
            print(f"✅ Upload succeeded for {filename} on attempt {attempt + 1}")
            return response.json()

        except requests.exceptions.ReadTimeout:
            print(f"⚠️ Read timeout on attempt {attempt + 1} for {filename} — assuming success")
            return {"message": "TimeoutAssumedSuccess"}

        except requests.exceptions.RequestException as e:
            if attempt == retries - 1:
                raise Exception(f"❌ Failed to upload {filename} to Nanonets after {retries} attempts: {e}")
            
            wait_time = delay * (2 ** attempt)
            print(f"⚠️ Request error on attempt {attempt + 1} for {filename}: {e}")
            print(f"   Retrying after {wait_time:.1f}s...")
            time.sleep(wait_time)

    raise Exception(f"❌ Failed to upload {filename} to Nanonets after {retries} attempts.")
