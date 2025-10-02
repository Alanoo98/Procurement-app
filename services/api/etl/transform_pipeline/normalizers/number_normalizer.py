import re
from decimal import Decimal

def normalize_number(val: str, locale: str = "da") -> Decimal:
    if not val:
        return None
    try:
        val = str(val)
        # Remove currency symbols and spaces
        val = re.sub(r"[^\d.,-]", "", val)

        # Danish format: 1.000,25
        if locale == "da":
            if "," in val and "." in val:
                val = val.replace(".", "").replace(",", ".")
            elif "," in val:
                val = val.replace(",", ".")
        # English format: 1,000.25
        elif locale == "en":
            val = val.replace(",", "")  # strip thousand separator

        return Decimal(val)
    except:
        return None
