LOCALE_CONFIG = {
    "da": {
        "decimal_separator": ",",
        "thousands_separator": ".",
        "currency": "DKK",
        "language": "Danish",
        "country": "Denmark"
    },
    "en": {
        "decimal_separator": ".",
        "thousands_separator": ",",
        "currency": "USD",
        "language": "English",
        "country": "United States"
    },
    "no": {
        "decimal_separator": ",",
        "thousands_separator": ".",
        "currency": "NOK",
        "language": "Norwegian",
        "country": "Norway"
    },
    "sv": {
        "decimal_separator": ",",
        "thousands_separator": " ",
        "currency": "SEK",
        "language": "Swedish",
        "country": "Sweden"
    },
    "gb": {
        "decimal_separator": ".",
        "thousands_separator": ",",
        "currency": "GBP",
        "language": "English",
        "country": "United Kingdom"
    },
    "eu": {
        "decimal_separator": ",",
        "thousands_separator": ".",
        "currency": "EUR",
        "language": "Multilingual",
        "country": "European Union"
    }
}

def get_locale_settings(locale):
    return LOCALE_CONFIG.get(locale, LOCALE_CONFIG["da"])
