import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { PriceNegotiation } from '@/hooks/management/usePriceNegotiations';
import { SearchableSelect } from '@/components/common/SearchableSelect';

interface CreateNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (negotiation: Omit<PriceNegotiation, 'id' | 'requestedAt' | 'status'>) => Promise<void>;
  initialData?: {
    productCode: string;
    description: string;
    supplierId: string;
    supplier: string;
    currentPrice: number;
    unitType: string;
  };
}

export const CreateNegotiationModal: React.FC<CreateNegotiationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData
}) => {
  const { user } = useAuth();
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  
  const [productCode, setProductCode] = useState('');
  const [description, setDescription] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number | ''>('');
  const [targetPrice, setTargetPrice] = useState<number | ''>('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [comment, setComment] = useState('');
  const [unitType, setUnitType] = useState('');
  const [unitSubtype, setUnitSubtype] = useState('');
  
  const [suppliers, setSuppliers] = useState<Array<{ supplier_id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ product_code: string; description: string; unit_type: string; unit_subtype?: string }>>([]);
  const [productsData, setProductsData] = useState<Array<{ product_code: string; supplier_id: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Array<{ product_code: string; description: string; unit_type: string; unit_subtype?: string }>>([]);

  // Set initial data if provided
  useEffect(() => {
    if (initialData) {
      setProductCode(initialData.productCode);
      setDescription(initialData.description);
      setSupplierId(initialData.supplierId);
      setSupplier(initialData.supplier);
      setCurrentPrice(initialData.currentPrice);
      setUnitType(initialData.unitType);
      
      // Set default target price 5% lower than current price
      if (initialData.currentPrice) {
        setTargetPrice(Math.round(initialData.currentPrice * 0.95 * 100) / 100);
      }
      
      // Set default effective date to 30 days from now
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      setEffectiveDate(thirtyDaysFromNow.toISOString().split('T')[0]);
    }
  }, [initialData]);

  // Fetch suppliers and products when modal opens
  useEffect(() => {
    if (!isOpen || !currentOrganization) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch suppliers
        let suppliersQuery = supabase
          .from('suppliers')
          .select('supplier_id, name')
          .eq('organization_id', currentOrganization.id);
          
        if (currentBusinessUnit) {
          const { data: supplierIds } = await supabase
            .from('supplier_business_units')
            .select('supplier_id')
            .eq('business_unit_id', currentBusinessUnit.id);
          
          if (supplierIds && supplierIds.length > 0) {
            suppliersQuery = suppliersQuery.in('supplier_id', supplierIds.map(s => s.supplier_id));
          }
        }
        
        const { data: suppliersData, error: suppliersError } = await suppliersQuery;
        
        if (suppliersError) throw suppliersError;
        // Sort suppliers alphabetically by name
        const sortedSuppliers = (suppliersData || []).sort((a, b) => a.name.localeCompare(b.name));
        setSuppliers(sortedSuppliers);
        
        // Fetch products (from invoice_lines for unique product codes)
        let productsQuery = supabase
          .from('invoice_lines')
          .select('product_code, description, unit_type, unit_subtype, supplier_id')
          .eq('organization_id', currentOrganization.id)
          .not('product_code', 'is', null);
          
        if (currentBusinessUnit) {
          productsQuery = productsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }
        
        const { data: productsData, error: productsError } = await productsQuery;
        
        if (productsError) throw productsError;
        
        // Store the raw product data for filtering by supplier
        setProductsData(productsData || []);
        
        // Deduplicate products and sort alphabetically by description
        const uniqueProducts = Array.from(
          new Map(
            (productsData || [])
              .filter(p => p.product_code && p.product_code.trim() !== '')
              .map(p => [p.product_code, p])
          ).values()
        ).sort((a, b) => (a.description || '').localeCompare(b.description || ''));
        
        setProducts(uniqueProducts);
      } catch (err) {
        console.error('Error fetching data for negotiation modal:', err);
        toast.error('Failed to load suppliers and products');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isOpen, currentOrganization, currentBusinessUnit]);

  // Update filtered products when supplier changes
  useEffect(() => {
    if (!supplierId) {
      setFilteredProducts([]);
      return;
    }
    
    // Get all product codes that belong to this supplier
    const supplierProductCodes = productsData
      .filter(item => item.supplier_id === supplierId)
      .map(item => item.product_code);
    
    // Filter the products list to only include products from this supplier and sort alphabetically
    const filtered = products
      .filter(product => supplierProductCodes.includes(product.product_code))
      .sort((a, b) => (a.description || '').localeCompare(b.description || ''));
    
    setFilteredProducts(filtered);
  }, [supplierId, products, productsData]);

  // Search suppliers function - searches all suppliers without limits
  const searchSuppliers = async (searchTerm: string) => {
    if (!currentOrganization || !searchTerm.trim()) {
      return suppliers.map(supplier => ({
        value: supplier.supplier_id,
        label: supplier.name,
        description: 'Supplier'
      }));
    }

    try {
      let suppliersQuery = supabase
        .from('suppliers')
        .select('supplier_id, name')
        .eq('organization_id', currentOrganization.id)
        .ilike('name', `%${searchTerm}%`)
        .order('name');
        
      if (currentBusinessUnit) {
        const { data: supplierIds } = await supabase
          .from('supplier_business_units')
          .select('supplier_id')
          .eq('business_unit_id', currentBusinessUnit.id);
        
        if (supplierIds && supplierIds.length > 0) {
          suppliersQuery = suppliersQuery.in('supplier_id', supplierIds.map(s => s.supplier_id));
        }
      }
      
      const { data: suppliersData, error: suppliersError } = await suppliersQuery;
      
      if (suppliersError) throw suppliersError;
      return (suppliersData || []).sort((a, b) => a.name.localeCompare(b.name)).map(supplier => ({
        value: supplier.supplier_id,
        label: supplier.name,
        description: 'Supplier'
      }));
    } catch (err) {
      console.error('Error searching suppliers:', err);
      return suppliers.map(supplier => ({
        value: supplier.supplier_id,
        label: supplier.name,
        description: 'Supplier'
      }));
    }
  };

  // Search products function - searches all products without limits
  const searchProducts = async (searchTerm: string) => {
    if (!currentOrganization || !searchTerm.trim()) {
      return filteredProducts.map(product => ({
        value: product.product_code,
        label: product.description || product.product_code,
        description: product.description || product.product_code,
        unit_type: product.unit_type,
        unit_subtype: product.unit_subtype
      }));
    }

    try {
      let productsQuery = supabase
        .from('invoice_lines')
        .select('product_code, description, unit_type, unit_subtype')
        .eq('organization_id', currentOrganization.id)
        .not('product_code', 'is', null)
        .or(`product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('description');
        
      if (currentBusinessUnit) {
        productsQuery = productsQuery.eq('business_unit_id', currentBusinessUnit.id);
      }

      // If a supplier is selected, filter by that supplier
      if (supplierId) {
        productsQuery = productsQuery.eq('supplier_id', supplierId);
      }
      
      const { data: productsData, error: productsError } = await productsQuery;
      
      if (productsError) throw productsError;
      
      // Deduplicate products and sort alphabetically by description
      const uniqueProducts = Array.from(
        new Map(
          (productsData || [])
            .filter(p => p.product_code && p.product_code.trim() !== '')
            .map(p => [p.product_code, p])
        ).values()
      ).sort((a, b) => (a.description || '').localeCompare(b.description || ''));
      
      return uniqueProducts.map(product => ({
        value: product.product_code,
        label: product.description || product.product_code,
        description: product.description || product.product_code,
        unit_type: product.unit_type,
        unit_subtype: product.unit_subtype
      }));
    } catch (err) {
      console.error('Error searching products:', err);
      return filteredProducts.map(product => ({
        value: product.product_code,
        label: product.description || product.product_code,
        description: product.description || product.product_code,
        unit_type: product.unit_type,
        unit_subtype: product.unit_subtype
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a negotiation');
      return;
    }
    
    if (!productCode || !supplierId || !targetPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check for existing negotiations with the same product and supplier
    if (effectiveDate) {
      try {
        const { data: existingNegotiations } = await supabase
          .from('price_negotiations')
          .select('id, effective_date, target_price, status')
          .eq('product_code', productCode)
          .eq('supplier_id', supplierId)
          .eq('organization_id', currentOrganization?.id)
          .not('status', 'eq', 'resolved')
          .not('effective_date', 'is', null);

        if (existingNegotiations && existingNegotiations.length > 0) {
          const newEffectiveDate = new Date(effectiveDate);
          const overlappingNegotiations = existingNegotiations.filter(neg => {
            const existingDate = new Date(neg.effective_date);
            return existingDate >= newEffectiveDate;
          });

          if (overlappingNegotiations.length > 0) {
            const confirmMessage = `This will override ${overlappingNegotiations.length} existing negotiation(s) with later effective dates. Continue?`;
            if (!window.confirm(confirmMessage)) {
              return;
            }
          }
        }
      } catch (err) {
        console.error('Error checking for existing negotiations:', err);
        // Continue with creation even if check fails
      }
    }
    
    try {
      await onSubmit({
        productCode,
        description,
        supplierId,
        supplier,
        requestedBy: user.id,
        targetPrice: Number(targetPrice),
        currentPrice: currentPrice ? Number(currentPrice) : 0,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        comment,
        unitType,
        unitSubtype
      });
      
      // Reset form
      setProductCode('');
      setDescription('');
      setSupplierId('');
      setSupplier('');
      setCurrentPrice('');
      setTargetPrice('');
      setEffectiveDate('');
      setComment('');
      setUnitType('');
      setUnitSubtype('');
      
      onClose();
    } catch (err) {
      console.error('Error creating negotiation:', err);
      toast.error('Failed to create negotiation');
    }
  };

  // Handle product selection
  const handleProductChange = (value: string, option: { description?: string; unit_type?: string; unit_subtype?: string } | null) => {
    setProductCode(value);
    
    if (option) {
      setDescription(option.description || '');
      setUnitType(option.unit_type || '');
      setUnitSubtype(option.unit_subtype || '');
    }
  };

  // Handle supplier selection
  const handleSupplierChange = (value: string, option: { label: string } | null) => {
    setSupplierId(value);
    
    if (option) {
      setSupplier(option.label);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create Price Negotiation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={suppliers.map(supplier => ({
                  value: supplier.supplier_id,
                  label: supplier.name,
                  description: 'Supplier'
                }))}
                value={supplierId}
                onChange={handleSupplierChange}
                placeholder="Search for a supplier..."
                searchPlaceholder="Type supplier name..."
                disabled={isLoading}
                required
                onSearch={searchSuppliers}
              />
              <p className="mt-1 text-xs text-gray-500">
                Start typing to search for suppliers
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={filteredProducts.map(product => ({
                  value: product.product_code,
                  label: product.description || product.product_code,
                  description: product.description || product.product_code,
                  unit_type: product.unit_type,
                  unit_subtype: product.unit_subtype
                }))}
                value={productCode}
                onChange={handleProductChange}
                placeholder={!supplierId ? "Select a supplier first" : "Search for a product..."}
                searchPlaceholder="Type product name or code..."
                disabled={isLoading || !supplierId}
                required
                onSearch={searchProducts}
              />
              <p className="mt-1 text-xs text-gray-500">
                Start typing to search for products
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Price
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value ? Number(e.target.value) : '')}
                  step="0.01"
                  min="0"
                  className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="Current price"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value ? Number(e.target.value) : '')}
                  step="0.01"
                  min="0"
                  className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="Target price"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Type
              </label>
              <input
                type="text"
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="e.g., kg, box, each"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="Add context or notes about this negotiation"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Create Negotiation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

