import re

def normalize_supplier_address(address):
    if not address:
        return None
    # Trim, remove extra whitespace and line breaks
    address = re.sub(r"\\s+", " ", address).strip()
    address = address.replace("\\n", ", ").replace("  ", " ")
    return address
