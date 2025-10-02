import { create } from 'zustand';
import { ImportState, ProcessedInvoiceData, ImportedData, PriceAgreement, PaxData } from '../types';
import { normalizeSupplierName, normalizeRestaurantName } from './mappingStore';
import { parseNumber, parseDanishDate } from '@/utils/format';

export const useImportStore = create<ImportState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
  setError: (error) => set({ status: 'error', error }),
  setData: (data) => set({ status: 'success', data, lastImport: new Date() }),
  setPriceAgreements: (priceAgreements) => set({ priceAgreements }),
  setPaxData: (paxData) => set({ paxData }),
  reset: () => set({ status: 'idle', error: undefined, data: undefined, priceAgreements: undefined, paxData: undefined }),
}));

const normalizeColumnName = (name: string): string => name.toLowerCase().trim();

const normalizeRowData = (row: Record<string, any>): Record<string, any> => {
  const normalizedRow: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeColumnName(key)] = value;
  }
  return normalizedRow;
};

export const processImportedData = (data: ImportedData): ProcessedInvoiceData[] => {
  if (!data.extractions) return [];

  const invoiceGroups = data.extractions.reduce((groups, rawRow) => {
    const row = normalizeRowData(rawRow);
    const invoiceNumber = row['invoice number'];

    if (!groups[invoiceNumber]) {
      groups[invoiceNumber] = {
        invoiceNumber: invoiceNumber,
        documentType: row['document type'] || 'Faktura',
        supplier: {
          name: normalizeSupplierName(row['supplier'] || ''),
          address: row['supplier address'] || '',
          taxId: row['supplier tax id'] || '',
        },
        receiver: {
          name: normalizeRestaurantName(row['receiver name'] || ''),
          address: row['receiver address'] || '',
          firmId: row['dw_dimfirma_ek'] || '',
        },
        dates: {
          invoice: parseDanishDate(row['invoice date']),
          delivery: parseDanishDate(row['delivery date']),
          due: parseDanishDate(row['due date']),
        },
        amounts: {
          subtotal: parseNumber(row['sub total']),
          tax: parseNumber(row['total tax']),
          total: parseNumber(row['total amount']),
        },
        items: [],
        poNumber: row['po number'] || '',
      };
    }

    const quantity = parseNumber(row['quantity']);
    const total = parseNumber(row['total']);
    const unitPrice = parseNumber(row['unit price'] || '0');

    groups[invoiceNumber].items.push({
      description: row['description'] || '',
      productCode: row['product code'] || '',
      quantity,
      unitType: row['unit type'] || '',
      unitSubtype: row['unit subtype'] || '',
      subquantity: parseNumber(row['subquantity']),
      unitPrice: unitPrice || (quantity !== 0 ? total / quantity : 0),
      total,
    });

    return groups;
  }, {} as Record<string, ProcessedInvoiceData>);

  return Object.values(invoiceGroups);
};

export const processPriceAgreements = (data: ImportedData): PriceAgreement[] => {
  if (!data.priceAgreements) return [];

  return data.priceAgreements.map(row => {
    const normalizedRow = normalizeRowData(row);
    return {
      description: normalizedRow['description'] || '',
      productCode: normalizedRow['product code'] || '',
      unitType: normalizedRow['unit type'] || '',
      unitSubtype: normalizedRow['unit subtype'] || '',
      price: parseNumber(normalizedRow['price']),
      supplier: normalizeSupplierName(normalizedRow['supplier'] || ''),
    };
  });
};

export const processPaxData = (data: any[]): PaxData[] => {
  return data.map(row => {
    const normalizedRow = normalizeRowData(row);
    return {
      date: parseDanishDate(normalizedRow['date']),
      pax: parseNumber(normalizedRow['pax']),
      restaurant: normalizeRestaurantName(normalizedRow['restaurant'] || ''),
    };
  });
};