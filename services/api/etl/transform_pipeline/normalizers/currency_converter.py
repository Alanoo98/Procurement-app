from decimal import Decimal

# Stub: In real use, pull from API or a table
EXCHANGE_RATES = {
    "USD": Decimal("6.80"),   # 1 USD = 6.80 DKK
    "EUR": Decimal("7.45"),   # 1 EUR = 7.45 DKK
    "NOK": Decimal("0.64"),   # 1 NOK = 0.64 DKK
    "SEK": Decimal("0.66"),   # 1 SEK = 0.66 DKK
    "GBP": Decimal("8.75"),   # 1 GBP = 8.75 DKK
    "DKK": Decimal("1.00")    # base currency
}

def convert_to_dkk(amount, currency):
    if not amount or not currency:
        return None
    currency = currency.upper().strip()
    rate = EXCHANGE_RATES.get(currency)
    if not rate:
        return None
    return amount * rate