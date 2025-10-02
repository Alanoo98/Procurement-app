import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from './OrganizationContext';
import { toast } from 'sonner';

// Stock Management Types
export interface StockUnit {
  id: string;
  name: string;
  description?: string;
  location_id: string;
  created_at: string;
  updated_at: string;
}

export interface PurchasableProduct {
  location_id: string;
  product_code: string;
  description: string;
  supplier_id?: string;
  latest_price?: number;
  as_of_date?: string;
}

export interface StockUnitProduct {
  id: string;
  stock_unit_id: string;
  product_code: string;
  location_id: string;
  created_at: string;
}

export interface StockItem {
  id: string;
  product_code: string;
  product_description: string;
  location_id: string;
  stock_unit_id: string;
  current_quantity: number;
  last_count_date?: string;
  last_delivery_date?: string;
  created_at: string;
  updated_at: string;
  stock_unit?: StockUnit;
  location?: {
    name: string;
    address?: string;
  };
}

export interface StockCount {
  id: string;
  location_id: string;
  count_date: string;
  status: 'draft' | 'confirmed' | 'sent';
  created_by: string;
  created_at: string;
  updated_at: string;
  items: StockCountItem[];
  location?: {
    name: string;
    address?: string;
  };
}

export interface StockCountItem {
  id: string;
  stock_count_id: string;
  stock_item_id: string;
  counted_quantity: number;
  notes?: string;
  stock_item?: StockItem;
}

export interface DeliveryRecord {
  id: string;
  invoice_number: string;
  invoice_date: string;
  delivery_date: string;
  location_id: string;
  supplier_id: string;
  total_amount: number;
  status: 'pending' | 'received' | 'verified';
  created_at: string;
  updated_at: string;
  location?: {
    name: string;
    address?: string;
  };
  supplier?: {
    name: string;
    address?: string;
  };
}

interface StockContextType {
  // Stock Units
  stockUnits: StockUnit[];
  loadingStockUnits: boolean;
  createStockUnit: (unit: Omit<StockUnit, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateStockUnit: (id: string, unit: Partial<StockUnit>) => Promise<void>;
  deleteStockUnit: (id: string) => Promise<void>;
  
  // Stock Items
  stockItems: StockItem[];
  loadingStockItems: boolean;
  createStockItem: (item: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateStockItem: (id: string, item: Partial<StockItem>) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;

  // Purchasable products (from invoice lines view)
  purchasableByLocation: Record<string, PurchasableProduct[]>;
  fetchPurchasableForLocation: (locationId: string) => Promise<PurchasableProduct[]>;

  // Stock Unit product assignments
  unitProducts: Record<string, StockUnitProduct[]>; // key: stock_unit_id
  addProductsToUnit: (unitId: string, locationId: string, productCodes: string[]) => Promise<void>;
  removeProductFromUnit: (unitId: string, productCode: string) => Promise<void>;
  
  // Stock Counts
  stockCounts: StockCount[];
  loadingStockCounts: boolean;
  createStockCount: (count: Omit<StockCount, 'id' | 'created_at' | 'updated_at' | 'items'>) => Promise<string>;
  updateStockCount: (id: string, count: Partial<StockCount>) => Promise<void>;
  confirmStockCount: (id: string) => Promise<void>;
  sendStockCount: (id: string) => Promise<void>;
  
  // Delivery Records
  deliveryRecords: DeliveryRecord[];
  loadingDeliveryRecords: boolean;
  createDeliveryRecord: (record: Omit<DeliveryRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateDeliveryRecord: (id: string, record: Partial<DeliveryRecord>) => Promise<void>;
  
  // Utility functions
  getStockItemsByLocation: (locationId: string) => StockItem[];
  getStockCountsByLocation: (locationId: string) => StockCount[];
  refreshData: () => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
};

interface StockProviderProps {
  children: ReactNode;
}

export const StockProvider: React.FC<StockProviderProps> = ({ children }) => {
  const { currentOrganization } = useOrganization();
  
  // State
  const [stockUnits, setStockUnits] = useState<StockUnit[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [purchasableByLocation, setPurchasableByLocation] = useState<Record<string, PurchasableProduct[]>>({});
  const [unitProducts, setUnitProducts] = useState<Record<string, StockUnitProduct[]>>({});
  
  const [loadingStockUnits, setLoadingStockUnits] = useState(false);
  const [loadingStockItems, setLoadingStockItems] = useState(false);
  const [loadingStockCounts, setLoadingStockCounts] = useState(false);
  const [loadingDeliveryRecords, setLoadingDeliveryRecords] = useState(false);

  // Fetch stock units
  const fetchStockUnits = async () => {
    if (!currentOrganization) return;
    
    setLoadingStockUnits(true);
    try {
      const { data, error } = await supabase
        .from('stock_units')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (error) throw error;
      setStockUnits(data || []);
    } catch (error: unknown) {
      console.error('Error fetching stock units:', error);
      toast.error('Failed to fetch stock units');
    } finally {
      setLoadingStockUnits(false);
    }
  };

  // Fetch stock items
  const fetchStockItems = async () => {
    if (!currentOrganization) return;
    
    setLoadingStockItems(true);
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select(`
          *,
          stock_unit:stock_units(*),
          location:locations(name, address)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('product_description');

      if (error) throw error;
      setStockItems(data || []);
    } catch (error: unknown) {
      console.error('Error fetching stock items:', error);
      toast.error('Failed to fetch stock items');
    } finally {
      setLoadingStockItems(false);
    }
  };

  // Fetch stock counts
  const fetchStockCounts = async () => {
    if (!currentOrganization) return;
    
    setLoadingStockCounts(true);
    try {
      const { data, error } = await supabase
        .from('stock_counts')
        .select(`
          *,
          location:locations(name, address),
          items:stock_count_items(
            *,
            stock_item:stock_items(*)
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('count_date', { ascending: false });

      if (error) throw error;
      setStockCounts(data || []);
    } catch (error: unknown) {
      console.error('Error fetching stock counts:', error);
      toast.error('Failed to fetch stock counts');
    } finally {
      setLoadingStockCounts(false);
    }
  };

  // Fetch delivery records
  const fetchDeliveryRecords = async () => {
    if (!currentOrganization) return;
    
    setLoadingDeliveryRecords(true);
    try {
      const { data, error } = await supabase
        .from('delivery_records')
        .select(`
          *,
          location:locations(name, address),
          supplier:suppliers(name, address)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('delivery_date', { ascending: false });

      if (error) throw error;
      setDeliveryRecords(data || []);
    } catch (error: unknown) {
      console.error('Error fetching delivery records:', error);
      toast.error('Failed to fetch delivery records');
    } finally {
      setLoadingDeliveryRecords(false);
    }
  };

  // Fetch purchasable products for a location
  const fetchPurchasableForLocation = async (locationId: string) => {
    if (!locationId) return [] as PurchasableProduct[];
    try {
      const { data, error } = await supabase
        .from('purchasable_products_by_location')
        .select('*')
        .eq('location_id', locationId)
        .order('description');
      if (error) throw error;
      const list = (data || []) as PurchasableProduct[];
      setPurchasableByLocation(prev => ({ ...prev, [locationId]: list }));
      return list;
    } catch (error: unknown) {
      console.error('Error fetching purchasable products:', error);
      toast.error('Failed to load purchasable products');
      return [];
    }
  };

  // Unit product assignment helpers (MVP: store in simple table stock_unit_products)
  const addProductsToUnit = async (unitId: string, locationId: string, productCodes: string[]) => {
    try {
      const payload = productCodes.map(code => ({ stock_unit_id: unitId, location_id: locationId, product_code: code }));
      const { data, error } = await supabase
        .from('stock_unit_products')
        .insert(payload)
        .select('*');
      if (error) throw error;
      setUnitProducts(prev => ({ ...prev, [unitId]: [ ...(prev[unitId] || []), ...(data as StockUnitProduct[]) ] }));
      toast.success('Products added to unit');
    } catch (error: unknown) {
      console.error('Error assigning products to unit:', error);
      toast.error('Failed adding products to unit');
    }
  };

  const removeProductFromUnit = async (unitId: string, productCode: string) => {
    try {
      const { error } = await supabase
        .from('stock_unit_products')
        .delete()
        .eq('stock_unit_id', unitId)
        .eq('product_code', productCode);
      if (error) throw error;
      setUnitProducts(prev => ({ ...prev, [unitId]: (prev[unitId] || []).filter(p => p.product_code !== productCode) }));
      toast.success('Product removed from unit');
    } catch (error: unknown) {
      console.error('Error removing product from unit:', error);
      toast.error('Failed removing product from unit');
    }
  };

  // Create stock unit
  const createStockUnit = async (unit: Omit<StockUnit, 'id' | 'created_at' | 'updated_at'>) => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('stock_units')
        .insert([{
          ...unit,
          organization_id: currentOrganization.id
        }])
        .select()
        .single();

      if (error) throw error;
      setStockUnits(prev => [...prev, data]);
      toast.success('Stock unit created successfully');
    } catch (error: unknown) {
      console.error('Error creating stock unit:', error);
      toast.error('Failed to create stock unit');
      throw error;
    }
  };

  // Update stock unit
  const updateStockUnit = async (id: string, unit: Partial<StockUnit>) => {
    try {
      const { data, error } = await supabase
        .from('stock_units')
        .update(unit)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setStockUnits(prev => prev.map(u => u.id === id ? data : u));
      toast.success('Stock unit updated successfully');
    } catch (error: unknown) {
      console.error('Error updating stock unit:', error);
      toast.error('Failed to update stock unit');
      throw error;
    }
  };

  // Delete stock unit
  const deleteStockUnit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stock_units')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setStockUnits(prev => prev.filter(u => u.id !== id));
      toast.success('Stock unit deleted successfully');
    } catch (error: unknown) {
      console.error('Error deleting stock unit:', error);
      toast.error('Failed to delete stock unit');
      throw error;
    }
  };

  // Create stock item
  const createStockItem = async (item: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>) => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .insert([{
          ...item,
          organization_id: currentOrganization.id
        }])
        .select(`
          *,
          stock_unit:stock_units(*),
          location:locations(name, address)
        `)
        .single();

      if (error) throw error;
      setStockItems(prev => [...prev, data]);
      toast.success('Stock item created successfully');
    } catch (error: unknown) {
      console.error('Error creating stock item:', error);
      toast.error('Failed to create stock item');
      throw error;
    }
  };

  // Update stock item
  const updateStockItem = async (id: string, item: Partial<StockItem>) => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .update(item)
        .eq('id', id)
        .select(`
          *,
          stock_unit:stock_units(*),
          location:locations(name, address)
        `)
        .single();

      if (error) throw error;
      setStockItems(prev => prev.map(i => i.id === id ? data : i));
      toast.success('Stock item updated successfully');
    } catch (error: unknown) {
      console.error('Error updating stock item:', error);
      toast.error('Failed to update stock item');
      throw error;
    }
  };

  // Delete stock item
  const deleteStockItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setStockItems(prev => prev.filter(i => i.id !== id));
      toast.success('Stock item deleted successfully');
    } catch (error: unknown) {
      console.error('Error deleting stock item:', error);
      toast.error('Failed to delete stock item');
      throw error;
    }
  };

  // Create stock count
  const createStockCount = async (count: Omit<StockCount, 'id' | 'created_at' | 'updated_at' | 'items'>): Promise<string> => {
    if (!currentOrganization) return '';
    
    try {
      const { data, error } = await supabase
        .from('stock_counts')
        .insert([{
          ...count,
          organization_id: currentOrganization.id
        }])
        .select()
        .single();

      if (error) throw error;
      setStockCounts(prev => [data, ...prev]);
      toast.success('Stock count created successfully');
      return data.id;
    } catch (error: unknown) {
      console.error('Error creating stock count:', error);
      toast.error('Failed to create stock count');
      throw error;
    }
  };

  // Update stock count
  const updateStockCount = async (id: string, count: Partial<StockCount>) => {
    try {
      const { data, error } = await supabase
        .from('stock_counts')
        .update(count)
        .eq('id', id)
        .select(`
          *,
          location:locations(name, address),
          items:stock_count_items(
            *,
            stock_item:stock_items(*)
          )
        `)
        .single();

      if (error) throw error;
      setStockCounts(prev => prev.map(c => c.id === id ? data : c));
      toast.success('Stock count updated successfully');
    } catch (error: unknown) {
      console.error('Error updating stock count:', error);
      toast.error('Failed to update stock count');
      throw error;
    }
  };

  // Confirm stock count
  const confirmStockCount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stock_counts')
        .update({ status: 'confirmed' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setStockCounts(prev => prev.map(c => c.id === id ? { ...c, status: 'confirmed' } : c));
      toast.success('Stock count confirmed successfully');
    } catch (error: unknown) {
      console.error('Error confirming stock count:', error);
      toast.error('Failed to confirm stock count');
      throw error;
    }
  };

  // Send stock count
  const sendStockCount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stock_counts')
        .update({ status: 'sent' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setStockCounts(prev => prev.map(c => c.id === id ? { ...c, status: 'sent' } : c));
      toast.success('Stock count sent successfully');
    } catch (error: unknown) {
      console.error('Error sending stock count:', error);
      toast.error('Failed to send stock count');
      throw error;
    }
  };

  // Create delivery record
  const createDeliveryRecord = async (record: Omit<DeliveryRecord, 'id' | 'created_at' | 'updated_at'>) => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('delivery_records')
        .insert([{
          ...record,
          organization_id: currentOrganization.id
        }])
        .select(`
          *,
          location:locations(name, address),
          supplier:suppliers(name, address)
        `)
        .single();

      if (error) throw error;
      setDeliveryRecords(prev => [data, ...prev]);
      toast.success('Delivery record created successfully');
    } catch (error: unknown) {
      console.error('Error creating delivery record:', error);
      toast.error('Failed to create delivery record');
      throw error;
    }
  };

  // Update delivery record
  const updateDeliveryRecord = async (id: string, record: Partial<DeliveryRecord>) => {
    try {
      const { data, error } = await supabase
        .from('delivery_records')
        .update(record)
        .eq('id', id)
        .select(`
          *,
          location:locations(name, address),
          supplier:suppliers(name, address)
        `)
        .single();

      if (error) throw error;
      setDeliveryRecords(prev => prev.map(r => r.id === id ? data : r));
      toast.success('Delivery record updated successfully');
    } catch (error: unknown) {
      console.error('Error updating delivery record:', error);
      toast.error('Failed to update delivery record');
      throw error;
    }
  };

  // Utility functions
  const getStockItemsByLocation = (locationId: string) => {
    return stockItems.filter(item => item.location_id === locationId);
  };

  const getStockCountsByLocation = (locationId: string) => {
    return stockCounts.filter(count => count.location_id === locationId);
  };

  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchStockUnits(),
      fetchStockItems(),
      fetchStockCounts(),
      fetchDeliveryRecords()
    ]);
  }, []);

  // Load data on mount and when organization changes
  useEffect(() => {
    if (currentOrganization) {
      refreshData();
    }
  }, [currentOrganization, refreshData]);

  const value: StockContextType = {
    stockUnits,
    loadingStockUnits,
    createStockUnit,
    updateStockUnit,
    deleteStockUnit,
    
    stockItems,
    loadingStockItems,
    createStockItem,
    updateStockItem,
    deleteStockItem,
    
    stockCounts,
    loadingStockCounts,
    createStockCount,
    updateStockCount,
    confirmStockCount,
    sendStockCount,
    
    deliveryRecords,
    loadingDeliveryRecords,
    createDeliveryRecord,
    updateDeliveryRecord,
    
    getStockItemsByLocation,
    getStockCountsByLocation,
    refreshData,
    purchasableByLocation,
    fetchPurchasableForLocation,
    unitProducts,
    addProductsToUnit,
    removeProductFromUnit
  };

  return (
    <StockContext.Provider value={value}>
      {children}
    </StockContext.Provider>
  );
};
