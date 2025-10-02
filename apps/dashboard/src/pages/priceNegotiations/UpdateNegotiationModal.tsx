import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign } from 'lucide-react';
import { PriceNegotiation } from '@/hooks/management/usePriceNegotiations';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

interface UpdateNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, updates: Partial<PriceNegotiation>) => Promise<void>;
  negotiation: PriceNegotiation;
}

export const UpdateNegotiationModal: React.FC<UpdateNegotiationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  negotiation
}) => {
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  
  const [productCode, setProductCode] = useState(negotiation.productCode);
  const [description, setDescription] = useState(negotiation.description);
  const [supplierId, setSupplierId] = useState(negotiation.supplierId);
  const [supplier, setSupplier] = useState(negotiation.supplier);
  const [currentPrice, setCurrentPrice] = useState<number | ''>(negotiation.currentPrice);
  const [targetPrice, setTargetPrice] = useState<number | ''>(negotiation.targetPrice);
  const [effectiveDate, setEffectiveDate] = useState(
    negotiation.effectiveDate 
      ? negotiation.effectiveDate.toISOString().split('T')[0] 
      : ''
  );
  const [comment, setComment] = useState(negotiation.comment || '');
  const [unitType, setUnitType] = useState(negotiation.unitType || '');
  const [unitSubtype, setUnitSubtype] = useState(negotiation.unitSubtype || '');
  const [status, setStatus] = useState<'active' | 'resolved'>(
    (negotiation.status as string) === 'active' ? 'active' : 'resolved'
  );
  const [resolutionNote, setResolutionNote] = useState(negotiation.resolutionNote || '');
  
  const [suppliers, setSuppliers] = useState<Array<{ supplier_id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ product_code: string; description: string; unit_type: string; unit_subtype?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

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
          .eq('organization_id', currentOrganization.id)
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
        setSuppliers(suppliersData || []);
        
        // Fetch products
        let productsQuery = supabase
          .from('invoice_lines')
          .select('product_code, description, unit_type, unit_subtype')
          .eq('organization_id', currentOrganization.id)
          .not('product_code', 'is', null)
          .order('description');
          
        if (currentBusinessUnit) {
          productsQuery = productsQuery.eq('business_unit_id', currentBusinessUnit.id);
        }
        
        const { data: productsData, error: productsError } = await productsQuery;
        
        if (productsError) throw productsError;
        
        // Deduplicate products
        const uniqueProducts = Array.from(
          new Map(
            (productsData || [])
              .filter(p => p.product_code && p.product_code.trim() !== '')
              .map(p => [p.product_code, p])
          ).values()
        );
        
        setProducts(uniqueProducts);
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isOpen, currentOrganization, currentBusinessUnit]);

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
      return products.map(product => ({
        value: product.product_code,
        label: product.description || product.product_code,
        description: `Product Code: ${product.product_code}`
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
        description: `Product Code: ${product.product_code}`
      }));
    } catch (err) {
      console.error('Error searching products:', err);
      return products.map(product => ({
        value: product.product_code,
        label: product.description || product.product_code,
        description: `Product Code: ${product.product_code}`
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productCode || !supplierId || !targetPrice) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Validate effective date if status is resolved
    if (status === 'resolved' && !effectiveDate) {
      toast.error('Please set an effective date for the resolved negotiation');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const updates: Partial<PriceNegotiation> = {
        productCode,
        description,
        supplierId,
        supplier,
        currentPrice: currentPrice ? Number(currentPrice) : 0,
        targetPrice: Number(targetPrice),
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        comment,
        unitType,
        unitSubtype,
        status,
        resolutionNote: status === 'resolved' ? resolutionNote : undefined
      };
      
      if (status === 'resolved') {
        updates.resolvedAt = new Date();
      }
      
      await onSubmit(negotiation.id, updates);
      onClose();
    } catch (err) {
      console.error('Error updating negotiation:', err);
      toast.error('Failed to update negotiation');
    } finally {
      setIsLoading(false);
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
          <h2 className="text-xl font-semibold text-gray-900">Edit Price Negotiation</h2>
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
                disabled={true}
                required
                onSearch={searchSuppliers}
              />
              <p className="mt-1 text-xs text-gray-500">
                Supplier cannot be changed when editing
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={products.map(product => ({
                  value: product.product_code,
                  label: product.description || product.product_code,
                  description: `Product Code: ${product.product_code}`
                }))}
                value={productCode}
                onChange={handleProductChange}
                placeholder="Search for a product..."
                searchPlaceholder="Type product name or code..."
                disabled={true}
                required
                onSearch={searchProducts}
              />
              <p className="mt-1 text-xs text-gray-500">
                Product cannot be changed when editing
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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'resolved')}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
              </select>
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

          {status === 'resolved' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Note
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Add notes about the resolution..."
              />
            </div>
          )}

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
              {isLoading ? 'Updating...' : 'Update Negotiation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

