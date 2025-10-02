import re

def normalize_unit(unit):
    if not unit:
        return None
    unit = re.sub(r"[^\w\s]", "", unit).strip().lower()

    known_units = {
        # pieces
        "stk": "pcs", "styk": "pcs", "styks": "pcs",
        "piece": "pcs", "pieces": "pcs", "pcs": "pcs",
        "unit": "pcs", "units": "pcs", "ea": "pcs", "each": "pcs",
        "enhet": "pcs", "enheter": "pcs",

        # weight
        "kg": "kg", "kgs": "kg", "kilo": "kg", "kilos": "kg",
        "kilogram": "kg", "kilograms": "kg", "kilogramme": "kg", "kilogrammes": "kg",
        "g": "g", "gram": "g", "grams": "g", "gramme": "g", "grammes": "g",
        "mg": "mg", "milligram": "mg", "milligrams": "mg",
        "gramm": "g", "grammer": "g",  

        # volume
        "l": "l", "ltr": "l", "litre": "l", "liter": "l",
        "liters": "l", "litres": "l", "literen": "l", "literer": "l",
        "ml": "ml", "milliliter": "ml", "milliliters": "ml",
        "millilitre": "ml", "millilitres": "ml", "milliliteren": "ml", "milliliterer": "ml",
        "cl": "cl", "centiliter": "cl", "centiliters": "cl", "centilitre": "cl",
        
        # container sizes
        "bottle": "btl", "bottles": "btl", "btl": "btl",
        "can": "can", "cans": "can", "jar": "jar", "jars": "jar",
        "tin": "tin", "tins": "tin", "tub": "tub", "tubs": "tub",
        "bag": "bag", "bags": "bag", "box": "box", "boxes": "box",

        # others
        "roll": "roll", "rolls": "roll",
        "sheet": "sheet", "sheets": "sheet",
        "tray": "tray", "trays": "tray",
        "set": "set", "sets": "set",
        "pair": "pair", "pairs": "pair",
        "dozen": "dozen", "dozens": "dozen",
        "pack": "pack", "packs": "pack",
        "pallet": "pallet", "pallets": "pallet",
        "case": "case", "cases": "case",
        "piece": "pcs", "pieces": "pcs",
    }

    return known_units.get(unit, unit)