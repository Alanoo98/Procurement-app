import { z } from 'zod';
import { danishNumberSchema, parseDanishDate, formatDanishDate } from './utils/format';

export interface CSVImportData {
  description: string;
  'product code': string;
  quantity: number;
  total: number;
  'unit type': string;
  'unit subtype': string;
  subquantity: number;
  'sub total': number;
  'total tax': number;
  'total amount': number;
  'receiver name': string;
  'document type': 'Faktura' | 'Kreditnota';
  'dw_dimfirma_ek': string;
  supplier: string;
  'supplier address': string;
  'matched supplier': string;
  'matched restaurant name': string;
  'po number': string;
  'invoice number': string;
  'supplier tax id': string;
  'receiver address': string;
  'invoice date': string;
  'delivery date': string;
  'due date': string;
  'unit price': string;
}

export interface PriceAgreement {
  description: string;
  productCode: string;
  unitType: string;
  unitSubtype: string;
  price: number;
  supplier: string;
}

export interface ProcessedInvoiceData {
  invoiceNumber: string;
  documentType: 'Faktura' | 'Kreditnota';
  supplier: {
    name: string;
    address: string;
    taxId: string;
  };
  receiver: {
    name: string;
    address: string;
    firmId: string;
  };
  dates: {
    invoice: Date;
    delivery: Date;
    due: Date;
  };
  amounts: {
    subtotal: number;
    tax: number;
    total: number;
  };
  items: Array<{
    description: string;
    productCode: string;
    quantity: number;
    unitType: string;
    unitSubtype: string;
    subquantity: number;
    unitPrice: number;
    total: number;
  }>;
  poNumber: string;
}

export interface PaxData {
  date: Date;
  pax: number;
  restaurant: string;
}

export interface ImportState {
  status: 'idle' | 'processing' | 'success' | 'error';
  error?: string;
  data?: ProcessedInvoiceData[];
  priceAgreements?: PriceAgreement[];
  paxData?: PaxData[];
  lastImport?: Date;
  setStatus: (status: ImportState['status']) => void;
  setError: (error: string) => void;
  setData: (data: ProcessedInvoiceData[]) => void;
  setPriceAgreements: (priceAgreements: PriceAgreement[]) => void;
  setPaxData: (paxData: PaxData[]) => void;
  reset: () => void;
}

export interface PriceVariationSettings {
  minPriceDifference: number;
  historicalPeriodDays: number;
  // New percentage-based settings
  usePercentageBased: boolean;
  minPriceVariationPercentage: number;
}

const nullableNumberSchema = z.union([
  danishNumberSchema,
  z.undefined(),
  z.null()
]).transform(val => val ?? 0);

const invoiceNumberSchema = z.any().transform(val => val ? String(val).trim() : '');

const danishDateSchema = z.union([
  z.string(),
  z.number(),
  z.date(),
  z.null(),
  z.undefined()
]).transform(val => {
  if (!val) return '';
  const date = parseDanishDate(val);
  return formatDanishDate(date);
}).refine(
  val => !val || /^\d{2}-\d{2}-\d{4}$/.test(val),
  { message: 'Date must be in DD-MM-YYYY format' }
);

export const extractionsSchema = z.array(z.object({
  description: z.string(),
  'product code': z.string(),
  quantity: nullableNumberSchema,
  'unit price': nullableNumberSchema.optional(),
  total: nullableNumberSchema,
  'unit type': z.string(),
  'unit subtype': z.string().optional(),
  subquantity: nullableNumberSchema,
  'sub total': nullableNumberSchema,
  'total tax': nullableNumberSchema,
  'total amount': nullableNumberSchema,
  'receiver name': z.string(),
  'document type': z.enum(['Faktura', 'Kreditnota']).optional().default('Faktura'),
  'dw_dimfirma_ek': z.any().transform(val => String(val)),
  supplier: z.string(),
  'supplier address': z.string(),
  'matched supplier': z.string().optional(),
  'matched restaurant name': z.string().optional(),
  'po number': z.string().optional().default(''),
  'invoice number': invoiceNumberSchema,
  'supplier tax id': z.string(),
  'receiver address': z.string(),
  'invoice date': danishDateSchema,
  'delivery date': danishDateSchema,
  'due date': danishDateSchema,
}).passthrough());

const productCodeSchema = z.union([
  z.string(),
  z.number()
]).transform(val => String(val));

export const priceAgreementsSchema = z.array(z.object({
  description: z.string().optional().default(''),
  'product code': productCodeSchema.optional().default(''),
  'unit type': z.string().optional().default(''),
  'unit subtype': z.string().optional().default(''),
  price: danishNumberSchema,
  supplier: z.string().optional().default(''),
}).passthrough());

export const paxDataSchema = z.array(z.object({
  date: danishDateSchema,
  pax: danishNumberSchema,
  restaurant: z.string(),
}));

export type ExtractionsData = z.infer<typeof extractionsSchema>;
export type PriceAgreementsData = z.infer<typeof priceAgreementsSchema>;

export interface ImportedData {
  extractions?: ExtractionsData;
  priceAgreements?: PriceAgreementsData;
}

export interface NameMapping {
  id: string;
  standardName: string;
  variants: Array<{
    name?: string;
    address?: string;
  }>;
}

export interface RestaurantConfig {
  id: string;
  name: string;
  currency: {
    code: string;
    symbol: string;
  };
}

export interface MappingStore {
  supplierMappings: NameMapping[];
  restaurantMappings: NameMapping[];
  productMappings: NameMapping[];
  restaurantConfigs: RestaurantConfig[];
  addMapping: (type: 'supplier' | 'restaurant' | 'product', mapping: NameMapping) => void;
  removeMapping: (type: 'supplier' | 'restaurant' | 'product', id: string) => void;
  updateMapping: (type: 'supplier' | 'restaurant' | 'product', mapping: NameMapping) => void;
  addRestaurantConfig: (config: RestaurantConfig) => void;
  removeRestaurantConfig: (id: string) => void;
  updateRestaurantConfig: (config: RestaurantConfig) => void;
  refreshData: () => void;
}

// Simple Cases of Concern Types
export type ConcernType = 
  | 'product' 
  | 'supplier' 
  | 'spend_per_pax' 
  | 'price_variation' 
  | 'efficiency' 
  | 'quality' 
  | 'delivery' 
  | 'contract' 
  | 'other';

export type ConcernStatus = 'open' | 'resolved';

export interface CaseOfConcern {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  concern_type: ConcernType;
  status: ConcernStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCaseOfConcernInput {
  title: string;
  description?: string;
  concern_type?: ConcernType;
}

export interface UpdateCaseOfConcernInput {
  title?: string;
  description?: string;
  concern_type?: ConcernType;
  status?: ConcernStatus;
}

// Comments for cases
export interface CaseComment {
  id: string;
  case_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export interface CreateCaseCommentInput {
  case_id: string;
  comment: string;
}