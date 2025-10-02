export interface Currency {
    id: string;
    code: string;
    name: string;
    symbol: string;
    symbol_position: 'before' | 'after';
    decimal_places: number;
    is_active: boolean;
  }
  
  export interface CurrencyFormatOptions {
    showSymbol?: boolean;
    showCode?: boolean;
    locale?: string;
  }
  
  /**
   * Format a currency amount with proper symbol placement and decimal places
   */
  export const formatCurrency = (
    amount: number, 
    currency: Currency, 
    options: CurrencyFormatOptions = {}
  ): string => {
    const { showSymbol = true, showCode = false, locale = 'en-US' } = options;
    
    // Format the number with proper decimal places
    const formattedNumber = amount.toLocaleString(locale, {
      minimumFractionDigits: currency.decimal_places,
      maximumFractionDigits: currency.decimal_places
    });
  
    // Build the formatted string
    let result = formattedNumber;
    
    if (showSymbol) {
      if (currency.symbol_position === 'before') {
        result = `${currency.symbol}${result}`;
      } else {
        result = `${result} ${currency.symbol}`;
      }
    }
    
    if (showCode) {
      result = `${result} (${currency.code})`;
    }
    
    return result;
  };
  
  /**
   * Simple currency formatter for currency codes (DKK, NOK, GBP)
   */
  export const formatCurrencyByCode = (
    amount: number, 
    currencyCode: string, 
    options: CurrencyFormatOptions = {}
  ): string => {
    const { showSymbol = true, showCode = false, locale = 'en-US' } = options;
    
    // Currency configuration
    const currencyConfig = {
      DKK: { symbol: 'kr', position: 'after', decimals: 0, name: 'Danish Krone' },
      NOK: { symbol: 'kr', position: 'after', decimals: 0, name: 'Norwegian Krone' },
      GBP: { symbol: '£', position: 'before', decimals: 0, name: 'British Pound Sterling' }
    };
    
    const config = currencyConfig[currencyCode as keyof typeof currencyConfig] || currencyConfig.DKK;
    
    // Format the number with proper decimal places
    const formattedNumber = amount.toLocaleString(locale, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals
    });
  
    // Build the formatted string
    let result = formattedNumber;
    
    if (showSymbol) {
      if (config.position === 'before') {
        result = `${config.symbol}${result}`;
      } else {
        result = `${result} ${config.symbol}`;
      }
    }
    
    if (showCode) {
      result = `${result} (${currencyCode})`;
    }
    
    return result;
  };
  
  /**
   * Parse a currency string back to a number
   */
  export const parseCurrency = (value: string, currency: Currency): number => {
    // Remove currency symbol and code
    let cleanValue = value
      .replace(currency.symbol, '')
      .replace(currency.code, '')
      .replace(/[^\d.,-]/g, '')
      .trim();
    
    // Handle different decimal separators
    if (cleanValue.includes(',') && !cleanValue.includes('.')) {
      // European format: 1.234,56
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else if (cleanValue.includes(',')) {
      // Mixed format: 1,234.56
      cleanValue = cleanValue.replace(/,/g, '');
    }
    
    return parseFloat(cleanValue) || 0;
  };
  
  /**
   * Get currency by code
   */
  export const getCurrencyByCode = (currencies: Currency[], code: string): Currency | undefined => {
    return currencies.find(c => c.code === code);
  };
  
  /**
   * Get default currency (DKK)
   */
  export const getDefaultCurrency = (currencies: Currency[]): Currency | undefined => {
    return getCurrencyByCode(currencies, 'DKK');
  };
  
  /**
   * Validate currency amount
   */
  export const validateCurrencyAmount = (amount: number, currency: Currency): boolean => {
    if (isNaN(amount) || amount < 0) {
      return false;
    }
    
    // Check if amount has too many decimal places
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    return decimalPlaces <= currency.decimal_places;
  };
  
  /**
   * Convert amount between currencies (placeholder for future implementation)
   * This would integrate with a currency conversion API
   */
  export const convertCurrency = async (
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency
  ): Promise<number> => {
    // For now, return the same amount
    // In the future, this would call a currency conversion API
    console.warn('Currency conversion not implemented yet');
    return amount;
  };
  
  /**
   * Get currency display name with symbol
   */
  export const getCurrencyDisplayName = (currency: Currency): string => {
    return `${currency.name} (${currency.symbol})`;
  };
  
  /**
   * Sort currencies by code
   */
  export const sortCurrencies = (currencies: Currency[]): Currency[] => {
    return [...currencies].sort((a, b) => a.code.localeCompare(b.code));
  };
  
  /**
   * Filter active currencies
   */
  export const getActiveCurrencies = (currencies: Currency[]): Currency[] => {
    return currencies.filter(c => c.is_active);
  };
  