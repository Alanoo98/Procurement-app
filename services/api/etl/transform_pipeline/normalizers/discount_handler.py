"""
Optimized Discount Handler
Consolidates all discount-related functionality into a single, comprehensive module.
Handles parsing, calculation, and flexible discount scenarios for OCR data.
Implements supplier consistency approach to determine discount patterns across invoice lines.
"""

import re
from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple, Optional, Dict, Any, List

def analyze_discount_pattern(invoice_lines: List[Dict[str, Any]]) -> str:
    """
    Analyze all lines in an invoice to determine the discount pattern.
    Uses supplier consistency approach - suppliers typically use the same format throughout an invoice.
    
    Args:
        invoice_lines: List of line item dictionaries from the same invoice
    
    Returns:
        'per_unit', 'total_line', or 'mixed' (fallback to individual analysis)
    """
    if not invoice_lines or len(invoice_lines) < 2:
        return 'mixed'  # Not enough data to determine pattern
    
    per_unit_matches = 0
    total_line_matches = 0
    valid_lines = 0
    
    print(f"   📊 Analyzing discount pattern across {len(invoice_lines)} lines...")
    
    for i, line in enumerate(invoice_lines):
        # Check if this line has the necessary data for pattern analysis
        unit_price = line.get("unit_price")
        discount_amount = line.get("discount_amount")
        quantity = line.get("quantity", 1)
        unit_price_after_discount = line.get("unit_price_after_discount")
        
        # Skip lines without sufficient data for cross-validation
        if (unit_price is None or discount_amount is None or 
            quantity is None or quantity <= 1 or 
            unit_price_after_discount is None):
            continue
        
        try:
            # Test per-unit interpretation
            per_unit_discount = Decimal(str(discount_amount))
            test_unit_price_per_unit = Decimal(str(unit_price)) - per_unit_discount
            per_unit_error = abs(test_unit_price_per_unit - Decimal(str(unit_price_after_discount)))
            
            # Test total-line interpretation
            total_line_discount = per_unit_discount / Decimal(str(quantity))
            test_unit_price_total_line = Decimal(str(unit_price)) - total_line_discount
            total_line_error = abs(test_unit_price_total_line - Decimal(str(unit_price_after_discount)))
            
            # Determine which interpretation is more accurate
            if per_unit_error < total_line_error:
                per_unit_matches += 1
                print(f"     Line {i+1}: Per-unit interpretation (error: {per_unit_error:.2f} vs {total_line_error:.2f})")
            else:
                total_line_matches += 1
                print(f"     Line {i+1}: Total-line interpretation (error: {total_line_error:.2f} vs {per_unit_error:.2f})")
            
            valid_lines += 1
            
        except (ValueError, TypeError, ArithmeticError) as e:
            print(f"     Line {i+1}: Error in pattern analysis: {e}")
            continue
    
    if valid_lines == 0:
        print(f"   📊 No valid lines for pattern analysis, using mixed approach")
        return 'mixed'
    
    # Determine pattern based on majority
    if per_unit_matches > total_line_matches:
        pattern = 'per_unit'
        print(f"   📊 Pattern determined: PER-UNIT ({per_unit_matches}/{valid_lines} lines)")
    elif total_line_matches > per_unit_matches:
        pattern = 'total_line'
        print(f"   📊 Pattern determined: TOTAL-LINE ({total_line_matches}/{valid_lines} lines)")
    else:
        pattern = 'mixed'
        print(f"   📊 Pattern determined: MIXED ({per_unit_matches} per-unit, {total_line_matches} total-line)")
    
    return pattern

def parse_discount_value_with_context(value: Any, unit_price: Optional[float] = None, total_price: Optional[float] = None) -> Tuple[Optional[float], Optional[float]]:
    """
    Parse discount value from OCR text with context awareness.
    
    Args:
        value: Discount value from OCR (string, number, or None)
        unit_price: Unit price for context (helps determine if discount is reasonable as amount vs percentage)
        total_price: Total price for context
    
    Returns:
        Tuple of (discount_amount, discount_percentage)
    """
    if not value:
        return (None, None)
    
    try:
        val = str(value).strip()
        if val.endswith("%"):
            # Percentage discount
            percent = Decimal(val.replace("%", "").strip())
            return (None, float(percent))
        elif re.search(r"\d", val):
            # Extract numeric value
            numeric_val = Decimal(re.sub(r"[^\d.,-]", "", val).replace(",", "."))
            
            # Context-aware interpretation
            if unit_price is not None and unit_price > 0:
                # If we have unit price context, check if the discount makes sense as percentage vs amount
                percentage_interpretation = float(numeric_val)
                amount_interpretation = float(numeric_val)
                
                # Calculate what the unit price would be with each interpretation
                unit_price_decimal = Decimal(str(unit_price))
                
                # As percentage: unit_price * (1 - percentage/100)
                unit_price_as_percentage = unit_price_decimal * (1 - (Decimal(str(percentage_interpretation)) / Decimal('100')))
                
                # As amount: unit_price - amount
                unit_price_as_amount = unit_price_decimal - Decimal(str(amount_interpretation))
                
                # If the percentage interpretation results in a reasonable unit price (> 0 and < original)
                if 0 < unit_price_as_percentage < unit_price_decimal:
                    # Check if the amount interpretation would result in negative or very low unit price
                    if unit_price_as_amount <= 0 or unit_price_as_amount < (unit_price_decimal * Decimal('0.1')):
                        print(f"   📊 Context-aware: '{val}' interpreted as percentage {percentage_interpretation}% (unit price would be {unit_price_as_percentage:.2f})")
                        return (None, percentage_interpretation)
                
                # If amount interpretation is reasonable
                if 0 < unit_price_as_amount < unit_price_decimal:
                    print(f"   📊 Context-aware: '{val}' interpreted as amount {amount_interpretation} (unit price would be {unit_price_as_amount:.2f})")
                    return (amount_interpretation, None)
            
            # Fallback to heuristic approach
            if 0 <= numeric_val <= 100:
                # Check if this looks like a percentage (common discount percentages)
                if numeric_val in [2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]:
                    print(f"   📊 Heuristic: Interpreting '{val}' as percentage discount: {numeric_val}%")
                    return (None, float(numeric_val))
                # For other values 0-100, still treat as percentage if it's a reasonable discount
                elif numeric_val <= 50:  # Most discounts are under 50%
                    print(f"   📊 Heuristic: Interpreting '{val}' as percentage discount: {numeric_val}%")
                    return (None, float(numeric_val))
            
            # If value is > 100 or doesn't match percentage patterns, treat as amount
            print(f"   📊 Heuristic: Interpreting '{val}' as discount amount: {numeric_val}")
            return (float(numeric_val), None)
    except (ValueError, TypeError, ArithmeticError):
        pass
    
    return (None, None)

def parse_discount_value(value: Any) -> Tuple[Optional[float], Optional[float]]:
    """
    Parse discount value from OCR text.
    
    Args:
        value: Discount value from OCR (string, number, or None)
    
    Returns:
        Tuple of (discount_amount, discount_percentage)
    """
    if not value:
        return (None, None)
    
    try:
        val = str(value).strip()
        if val.endswith("%"):
            # Percentage discount
            percent = Decimal(val.replace("%", "").strip())
            return (None, float(percent))
        elif re.search(r"\d", val):
            # Extract numeric value
            numeric_val = Decimal(re.sub(r"[^\d.,-]", "", val).replace(",", "."))
            
            # Heuristic: If the value is between 0 and 100, it's likely a percentage
            # This handles cases like "5.0" or "5,0" which should be interpreted as 5%
            if 0 <= numeric_val <= 100:
                # Check if this looks like a percentage (common discount percentages)
                if numeric_val in [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]:
                    print(f"   📊 Heuristic: Interpreting '{val}' as percentage discount: {numeric_val}%")
                    return (None, float(numeric_val))
                # For other values 0-100, still treat as percentage if it's a reasonable discount
                elif numeric_val <= 50:  # Most discounts are under 50%
                    print(f"   📊 Heuristic: Interpreting '{val}' as percentage discount: {numeric_val}%")
                    return (None, float(numeric_val))
            
            # If value is > 100 or doesn't match percentage patterns, treat as amount
            print(f"   📊 Heuristic: Interpreting '{val}' as discount amount: {numeric_val}")
            return (float(numeric_val), None)
    except (ValueError, TypeError, ArithmeticError):
        pass
    
    return (None, None)

def calculate_discount_from_price_difference(
    original_price: Optional[float], 
    discounted_price: Optional[float]
) -> Optional[float]:
    """
    Calculate discount amount from the difference between original and discounted prices.
    
    Args:
        original_price: Original price (unit_price or total_price)
        discounted_price: Price after discount (unit_price_after_discount or total_price_after_discount)
    
    Returns:
        Discount amount, or None if calculation not possible
    """
    if original_price is None or discounted_price is None:
        return None
    
    try:
        original_decimal = Decimal(str(original_price))
        discounted_decimal = Decimal(str(discounted_price))
        
        discount_amount = original_decimal - discounted_decimal
        
        # Round to 2 decimal places for currency
        discount_amount = discount_amount.quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        return float(discount_amount)
        
    except (ValueError, TypeError, ArithmeticError) as e:
        print(f"   ⚠️ Error calculating discount from price difference: {e}")
        return None

def calculate_unit_price_from_total_and_quantity(
    total_price: Optional[float], 
    quantity: Optional[float]
) -> Optional[float]:
    """
    Calculate unit price from total price and quantity.
    
    Args:
        total_price: Total price
        quantity: Item quantity
    
    Returns:
        Unit price, or None if calculation not possible
    """
    if total_price is None or quantity is None or quantity == 0:
        return None
    
    try:
        total_decimal = Decimal(str(total_price))
        quantity_decimal = Decimal(str(quantity))
        
        unit_price = total_decimal / quantity_decimal
        
        # Round to 2 decimal places for currency
        unit_price = unit_price.quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        return float(unit_price)
        
    except (ValueError, TypeError, ArithmeticError) as e:
        print(f"   ⚠️ Error calculating unit price from total and quantity: {e}")
        return None

def calculate_unit_price_after_discount(
    unit_price: Optional[float], 
    discount_amount: Optional[float], 
    discount_percentage: Optional[float],
    fields: Optional[Dict[str, Any]] = None,
    invoice_discount_pattern: Optional[str] = None
) -> Optional[float]:
    """
    Calculate unit_price_after_discount based on unit_price and discount information.
    Uses supplier consistency approach when invoice_discount_pattern is provided.
    
    Args:
        unit_price: Original unit price
        discount_amount: Absolute discount amount
        discount_percentage: Percentage discount (e.g., 10.0 for 10%)
        fields: Dictionary containing all price fields from OCR (used for quantity)
        invoice_discount_pattern: 'per_unit', 'total_line', or 'mixed' - determined by analyze_discount_pattern()
    
    Returns:
        Calculated unit price after discount, or None if calculation not possible
    """
    if unit_price is None or unit_price == 0:
        return None
    
    try:
        # Convert to Decimal for precise calculations
        unit_price_decimal = Decimal(str(unit_price))
        
        if discount_percentage is not None and discount_percentage != 0:
            # Calculate discount from percentage
            discount_percent = Decimal(str(discount_percentage))
            
            # Handle negative percentages (for credit notes)
            if discount_percent < 0:
                # For credit notes, negative percentage means additional charge
                unit_price_after_discount = unit_price_decimal * (1 + (abs(discount_percent) / Decimal('100')))
            else:
                # Normal discount
                unit_price_after_discount = unit_price_decimal * (1 - (discount_percent / Decimal('100')))
            
        elif discount_amount is not None and discount_amount != 0:
            # Use absolute discount amount
            discount_amount_decimal = Decimal(str(discount_amount))
            quantity = fields.get("quantity", 1) if fields else 1
            ocr_unit_price_after_discount = fields.get("unit_price_after_discount") if fields else None
            
            # Use invoice-level pattern if available (supplier consistency approach)
            if invoice_discount_pattern and invoice_discount_pattern != 'mixed':
                if invoice_discount_pattern == 'per_unit':
                    per_unit_discount = discount_amount_decimal
                    print(f"   📊 Invoice pattern: Per-unit discount {per_unit_discount}")
                elif invoice_discount_pattern == 'total_line':
                    per_unit_discount = discount_amount_decimal / Decimal(str(quantity))
                    print(f"   📊 Invoice pattern: Total-line discount {discount_amount_decimal} → per-unit {per_unit_discount}")
            else:
                # Fall back to individual line cross-validation
                if quantity and quantity > 1 and ocr_unit_price_after_discount is not None:
                    # We have OCR data to validate against - use cross-validation
                    ocr_unit_price_after_discount_decimal = Decimal(str(ocr_unit_price_after_discount))
                    
                    # Test per-unit interpretation
                    per_unit_discount_test = discount_amount_decimal
                    test_unit_price_per_unit = unit_price_decimal - per_unit_discount_test
                    per_unit_error = abs(test_unit_price_per_unit - ocr_unit_price_after_discount_decimal)
                    
                    # Test total-line interpretation
                    total_line_discount_test = discount_amount_decimal / Decimal(str(quantity))
                    test_unit_price_total_line = unit_price_decimal - total_line_discount_test
                    total_line_error = abs(test_unit_price_total_line - ocr_unit_price_after_discount_decimal)
                    
                    # Choose the interpretation with smaller error
                    if per_unit_error < total_line_error:
                        # Per-unit interpretation is more accurate
                        per_unit_discount = per_unit_discount_test
                        print(f"   ✅ Cross-validation: Per-unit discount {per_unit_discount} (error: {per_unit_error:.2f} vs {total_line_error:.2f})")
                    else:
                        # Total-line interpretation is more accurate
                        per_unit_discount = total_line_discount_test
                        print(f"   ✅ Cross-validation: Total-line discount {discount_amount_decimal} → per-unit {per_unit_discount} (error: {total_line_error:.2f} vs {per_unit_error:.2f})")
                else:
                    # No OCR data to validate against - use heuristic approach
                    if quantity and quantity > 1:
                        # Check if discount_amount is more than 50% of unit_price * quantity
                        total_line_value = unit_price_decimal * Decimal(str(quantity))
                        if abs(discount_amount_decimal) > (total_line_value * Decimal('0.5')):
                            # This appears to be a total line discount, convert to per-unit
                            per_unit_discount = discount_amount_decimal / Decimal(str(quantity))
                            print(f"   🔧 Heuristic: Detected total line discount {discount_amount_decimal}, converting to per-unit: {per_unit_discount}")
                        else:
                            # This appears to be a per-unit discount
                            per_unit_discount = discount_amount_decimal
                            print(f"   🔧 Heuristic: Using per-unit discount: {per_unit_discount}")
                    else:
                        # No quantity or quantity = 1, treat as per-unit discount
                        per_unit_discount = discount_amount_decimal
                        print(f"   🔧 No quantity or qty=1: Using per-unit discount: {per_unit_discount}")
            
            # Handle negative amounts (for credit notes)
            if per_unit_discount < 0:
                # For credit notes, negative amount means additional charge
                unit_price_after_discount = unit_price_decimal + abs(per_unit_discount)
            else:
                # Normal discount
                unit_price_after_discount = unit_price_decimal - per_unit_discount
            
        else:
            # No discount information available
            return None
        
        # Round to 2 decimal places for currency
        unit_price_after_discount = unit_price_after_discount.quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        return float(unit_price_after_discount)
        
    except (ValueError, TypeError, ArithmeticError) as e:
        print(f"   ⚠️ Error calculating unit_price_after_discount: {e}")
        return None

def calculate_total_price_after_discount(
    total_price: Optional[float],
    quantity: Optional[float],
    unit_price_after_discount: Optional[float]
) -> Optional[float]:
    """
    Calculate total_price_after_discount based on quantity and unit_price_after_discount.
    
    Args:
        total_price: Original total price
        quantity: Item quantity
        unit_price_after_discount: Unit price after discount
    
    Returns:
        Calculated total price after discount, or None if calculation not possible
    """
    if unit_price_after_discount is not None and quantity is not None and quantity > 0:
        try:
            # Calculate from unit price and quantity
            total_after_discount = Decimal(str(unit_price_after_discount)) * Decimal(str(quantity))
            total_after_discount = total_after_discount.quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            return float(total_after_discount)
        except (ValueError, TypeError, ArithmeticError) as e:
            print(f"   ⚠️ Error calculating total_price_after_discount: {e}")
    
    # Fallback: if we have total_price and can calculate discount amount
    if total_price is not None:
        try:
            total_price_decimal = Decimal(str(total_price))
            # This is a simplified fallback - in practice, you'd need the original unit price
            # to calculate the discount amount properly
            return float(total_price_decimal)
        except (ValueError, TypeError, ArithmeticError):
            pass
    
    return None

def validate_discount_consistency(fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and fix discount consistency issues.
    Ensures that discount_amount and discount_percentage are not both set simultaneously.
    Priority rule: If both are present, prioritize discount_percentage over discount_amount.
    
    Args:
        fields: Dictionary containing all price fields from OCR
    
    Returns:
        Updated fields dictionary with consistent discount information
    """
    discount_amount = fields.get("discount_amount")
    discount_percentage = fields.get("discount_percentage")
    
    # Check if both discount types are set (inconsistent state)
    if ((discount_amount is not None and discount_amount != 0) and 
        (discount_percentage is not None and discount_percentage != 0)):
        
        print(f"   ⚠️ Inconsistent discount data detected: amount={discount_amount}, percentage={discount_percentage}")
        
        # Business rule: When both are present, prioritize percentage and set amount to 0
        # This aligns with the invoice format where percentage discounts should override amount discounts
        fields["discount_amount"] = 0
        print(f"   🔧 Fixed: Prioritizing discount_percentage={discount_percentage}%, set discount_amount to 0")
    
    return fields

def process_discount_calculations(fields: Dict[str, Any], invoice_discount_pattern: Optional[str] = None) -> Dict[str, Any]:
    """
    Comprehensive discount calculation that handles all possible OCR data scenarios:
    
    Scenario 1: OCR extracts discount_amount directly
    Scenario 2: OCR extracts unit_price and unit_price_after_discount
    Scenario 3: OCR extracts total_price and total_price_after_discount
    Scenario 4: OCR extracts unit_price_after_discount and total_price_after_discount (no original prices)
    Scenario 5: OCR extracts unit_price and total_price (no discounted prices)
    Scenario 6: Mixed scenarios with some fields missing
    Scenario 7: OCR extracts discount_percentage only (NEW)
    
    Args:
        fields: Dictionary containing all price fields from OCR
    
    Returns:
        Updated fields dictionary with calculated discount information
    """
    # Extract all possible price fields
    unit_price = fields.get("unit_price")
    unit_price_after_discount = fields.get("unit_price_after_discount")
    total_price = fields.get("total_price")
    total_price_after_discount = fields.get("total_price_after_discount")
    quantity = fields.get("quantity")
    discount_amount = fields.get("discount_amount")
    discount_percentage = fields.get("discount_percentage")
    
    # PRIORITY CHECK: If both discount_percentage and discount_amount are present,
    # prioritize percentage and set amount to 0 (this handles cases where OCR extracts both)
    if ((discount_percentage is not None and discount_percentage != 0) and 
        (discount_amount is not None and discount_amount != 0)):
        print(f"   📊 Priority check: Both discount types present - prioritizing percentage {discount_percentage}% over amount {discount_amount}")
        fields["discount_amount"] = 0
        discount_amount = 0  # Update local variable for subsequent logic
    
    # Removed verbose logging for cleaner output
    
    # Scenario 7: We have discount_percentage only (NEW - handles percentage-only discounts)
    if discount_percentage is not None and discount_percentage != 0 and (discount_amount is None or discount_amount == 0):
        print(f"   📊 Scenario 7: Processing percentage-only discount: {discount_percentage}%")
        
        # Calculate unit_price_after_discount from percentage
        if unit_price is not None and unit_price != 0:
            calculated_unit_price_after_discount = calculate_unit_price_after_discount(
                unit_price, None, discount_percentage, fields, invoice_discount_pattern
            )
            if calculated_unit_price_after_discount is not None:
                fields["unit_price_after_discount"] = calculated_unit_price_after_discount
                print(f"   💰 Calculated unit_price_after_discount: {unit_price} × (1 - {discount_percentage}%) = {calculated_unit_price_after_discount}")
        
        # Calculate total_price_after_discount from unit_price_after_discount and quantity
        if quantity is not None and quantity > 0 and fields.get("unit_price_after_discount") is not None:
            calculated_total_price_after_discount = calculate_total_price_after_discount(
                total_price, quantity, fields.get("unit_price_after_discount")
            )
            if calculated_total_price_after_discount is not None:
                fields["total_price_after_discount"] = calculated_total_price_after_discount
                print(f"   💰 Calculated total_price_after_discount: {fields.get('unit_price_after_discount')} × {quantity} = {calculated_total_price_after_discount}")
        
        # For percentage-only discounts, set discount_amount to 0 (not a flat amount)
        fields["discount_amount"] = 0
        print(f"   📊 Percentage-only discount: discount_amount set to 0, discount_percentage = {discount_percentage}%")
        
        return fields
    
    # Scenario 1: We already have discount_amount directly from OCR
    if discount_amount is not None and discount_amount != 0:
        # Scenario 1: Using discount_amount directly from OCR
        # Calculate unit_price_after_discount if we have unit_price
        if unit_price is not None and unit_price != 0:
            calculated_unit_price_after_discount = calculate_unit_price_after_discount(
                unit_price, discount_amount, None, fields, invoice_discount_pattern
            )
            if fields.get("unit_price_after_discount") is None and calculated_unit_price_after_discount is not None:
                fields["unit_price_after_discount"] = calculated_unit_price_after_discount
                # Calculated unit_price_after_discount
        
        # Calculate total_price_after_discount if we have total_price
        if total_price is not None and total_price != 0:
            calculated_total_price_after_discount = calculate_total_price_after_discount(
                total_price, quantity, fields.get("unit_price_after_discount")
            )
            if fields.get("total_price_after_discount") is None and calculated_total_price_after_discount is not None:
                fields["total_price_after_discount"] = calculated_total_price_after_discount
                # Calculated total_price_after_discount
        
        return fields
    
    # Scenario 2: We have unit_price and unit_price_after_discount
    if unit_price is not None and unit_price_after_discount is not None:
        calculated_discount_amount = calculate_discount_from_price_difference(unit_price, unit_price_after_discount)
        if calculated_discount_amount is not None and calculated_discount_amount > 0:
            print(f"   ✅ Scenario 2: Calculated discount_amount from unit prices: {calculated_discount_amount}")
            fields["discount_amount"] = calculated_discount_amount
            
            # Calculate total_price_after_discount if we have total_price
            if total_price is not None and quantity is not None:
                # Convert all values to Decimal for consistent calculations
                total_price_decimal = Decimal(str(total_price))
                discount_amount_decimal = Decimal(str(calculated_discount_amount))
                quantity_decimal = Decimal(str(quantity))
                
                calculated_total_price_after_discount = total_price_decimal - (discount_amount_decimal * quantity_decimal)
                calculated_total_price_after_discount = calculated_total_price_after_discount.quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )
                
                if fields.get("total_price_after_discount") is None:
                    fields["total_price_after_discount"] = float(calculated_total_price_after_discount)
                    print(f"   💰 Calculated total_price_after_discount: {total_price} - ({calculated_discount_amount} × {quantity}) = {calculated_total_price_after_discount}")
            
            return fields
    
    # Scenario 3: We have total_price and total_price_after_discount
    if total_price is not None and total_price_after_discount is not None and quantity is not None and quantity > 0:
        total_discount = calculate_discount_from_price_difference(total_price, total_price_after_discount)
        if total_discount is not None and total_discount > 0:
            # Convert both values to Decimal for consistent arithmetic
            total_discount_decimal = Decimal(str(total_discount))
            quantity_decimal = Decimal(str(quantity))
            calculated_discount_amount = float(total_discount_decimal / quantity_decimal)
            # Scenario 3: Calculated discount_amount from total prices
            fields["discount_amount"] = calculated_discount_amount
            
            # Calculate unit_price_after_discount if we have unit_price
            if unit_price is not None:
                calculated_unit_price_after_discount = unit_price - calculated_discount_amount
                if fields.get("unit_price_after_discount") is None:
                    fields["unit_price_after_discount"] = calculated_unit_price_after_discount
                    # Calculated unit_price_after_discount
            
            return fields
    
    # Scenario 4: We have unit_price_after_discount and total_price_after_discount but no original prices
    if unit_price_after_discount is not None and total_price_after_discount is not None and quantity is not None and quantity > 0:
        # Calculate unit_price from total_price_after_discount and quantity
        calculated_unit_price = calculate_unit_price_from_total_and_quantity(total_price_after_discount, quantity)
        if calculated_unit_price is not None:
            # Check if this matches unit_price_after_discount (within reasonable tolerance)
            tolerance = Decimal('0.01')
            if abs(Decimal(str(calculated_unit_price)) - Decimal(str(unit_price_after_discount))) <= tolerance:
                # Scenario 4: Prices are consistent, but no discount information available
                # No discount in this case
                fields["discount_amount"] = 0
                return fields
    
    # Scenario 5: We have unit_price and total_price but no discounted prices
    if unit_price is not None and total_price is not None and quantity is not None and quantity > 0:
        # Check if unit_price * quantity matches total_price
        calculated_total = unit_price * quantity
        tolerance = Decimal('0.01')
        if abs(Decimal(str(calculated_total)) - Decimal(str(total_price))) <= tolerance:
            # Scenario 5: No discount detected - prices are consistent
            fields["discount_amount"] = 0
            fields["unit_price_after_discount"] = unit_price
            fields["total_price_after_discount"] = total_price
            return fields
    
    # Scenario 6: Mixed or incomplete data - try to fill in missing pieces
    # Scenario 6: Mixed/incomplete data - attempting to fill missing pieces
    
    # If we have unit_price_after_discount but no unit_price, and we have discount_amount
    if unit_price_after_discount is not None and discount_amount is not None:
        calculated_unit_price = unit_price_after_discount + discount_amount
        if fields.get("unit_price") is None:
            fields["unit_price"] = calculated_unit_price
            # Calculated unit_price
    
    # If we have total_price_after_discount but no total_price, and we have discount_amount and quantity
    if total_price_after_discount is not None and discount_amount is not None and quantity is not None:
        # Convert all values to Decimal for consistent calculations
        total_price_after_discount_decimal = Decimal(str(total_price_after_discount))
        discount_amount_decimal = Decimal(str(discount_amount))
        quantity_decimal = Decimal(str(quantity))
        
        calculated_total_price = total_price_after_discount_decimal + (discount_amount_decimal * quantity_decimal)
        calculated_total_price = calculated_total_price.quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        if fields.get("total_price") is None:
            fields["total_price"] = float(calculated_total_price)
            print(f"   💰 Calculated total_price: {total_price_after_discount} + ({discount_amount} × {quantity}) = {calculated_total_price}")
    
    # If we still don't have discount_amount, set it to 0
    if fields.get("discount_amount") is None:
        fields["discount_amount"] = 0
        # No discount detected, setting discount_amount to 0
    
    return fields
