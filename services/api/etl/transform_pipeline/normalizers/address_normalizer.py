import re

def normalize_address(address):
    if not address:
        return None
    address = address.strip()

    # Basic cleanup
    address = re.sub(r"\s+", " ", address)
    address = address.replace("\n", ", ").strip()

    return address