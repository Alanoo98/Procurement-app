import { z } from 'zod';

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatCurrency = (amount: number, locale = 'da-DK', currency = 'DKK'): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return '0,00 kr.';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const parseNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  
  // Convert to string and trim whitespace
  const strValue = String(value).trim();
  
  // Handle empty or invalid input
  if (!strValue || strValue === '-' || strValue.toLowerCase() === 'na') return 0;
  
  try {
    // Remove currency symbols, spaces, and other non-essential characters
    let cleaned = strValue.replace(/[^0-9,.,-]/g, '');
    
    // Handle negative values
    const isNegative = cleaned.startsWith('-');
    cleaned = cleaned.replace(/-/g, '');
    
    // If we have both dots and commas, assume Danish format (1.234,56)
    if (cleaned.includes('.') && cleaned.includes(',')) {
      // Remove dots (thousand separators) and replace comma with dot
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } 
    // If we only have a comma, treat it as decimal separator
    else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    
    // Parse to number
    const number = Number(cleaned);
    
    // Return 0 if parsing failed
    if (isNaN(number)) return 0;
    
    // Apply negative sign if needed
    return isNegative ? -number : number;
  } catch (error) {
    console.error('Error parsing number:', error);
    return 0;
  }
};

// Schema for validating and parsing numbers in Danish format
export const danishNumberSchema = z.union([
  z.number(),
  z.string(),
  z.null(),
  z.undefined()
]).transform(val => parseNumber(val));

// Convert Excel serial number to Date
const excelSerialDateToJSDate = (serial: number): Date => {
  // Excel's epoch starts at January 0, 1900
  // 1900 is incorrectly treated as a leap year, so we need to adjust
  const EXCEL_EPOCH = new Date(1899, 11, 30);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  
  // Convert Excel serial to milliseconds and add to epoch
  return new Date(EXCEL_EPOCH.getTime() + serial * MS_PER_DAY);
};

// Function to parse various date formats to a JavaScript Date
export const parseDanishDate = (value: unknown): Date => {
  if (!value) return new Date();

  try {
    // If it's already a Date object
    if (value instanceof Date) {
      return value;
    }

    // If it's a number, treat it as an Excel serial date
    if (typeof value === 'number') {
      return excelSerialDateToJSDate(value);
    }

    // Convert to string and trim
    const strValue = String(value).trim();

    // Handle Excel serial number as string
    if (/^\d+$/.test(strValue)) {
      const serial = parseInt(strValue, 10);
      if (serial > 1000) { // Likely an Excel serial date
        return excelSerialDateToJSDate(serial);
      }
    }

    // Try parsing DD-MM-YYYY format
    const ddmmyyyyMatch = strValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const date = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10)
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try parsing ISO format (YYYY-MM-DD or with time)
    const isoDate = new Date(strValue);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // If all parsing attempts fail, return current date
    console.warn(`Unable to parse date: ${value}`);
    return new Date();
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date();
  }
};

// Function to format date to Danish format (DD-MM-YYYY)
export const formatDanishDate = (date: Date): string => {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};