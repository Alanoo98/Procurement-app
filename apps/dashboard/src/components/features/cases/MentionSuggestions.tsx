import React, { useState, useEffect, useRef } from 'react';
import { User, Package, Building2, MapPin, FileText, Search } from 'lucide-react';
// Removed useOrganizationUsers import - not needed for mentions
import { useLocations } from '@/hooks/data/useLocations';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface MentionSuggestion {
  id: string;
  type: 'user' | 'product' | 'supplier' | 'location' | 'invoice';
  label: string;
  description?: string;
  icon: React.ReactNode;
}

interface MentionSuggestionsProps {
  query: string;
  onSelect: (suggestion: MentionSuggestion) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  query,
  onSelect,
  onClose,
  position,
}) => {
  const { data: locations } = useLocations();
  const { currentOrganization } = useOrganization();
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [products, setProducts] = useState<Array<{ product_code: string; description: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ supplier_id: string; name: string }>>([]);
  const [invoices, setInvoices] = useState<Array<{ invoice_number: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch data for suggestions
  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrganization || !query.trim()) return;

      setIsLoading(true);
      try {
        // Fetch products
        const { data: productsData } = await supabase
          .from('invoice_lines')
          .select('product_code, description')
          .eq('organization_id', currentOrganization.id)
          .not('product_code', 'is', null)
          .neq('product_code', '')
          .ilike('description', `%${query}%`)
          .limit(10);

        // Fetch suppliers
        const { data: suppliersData } = await supabase
          .from('suppliers')
          .select('supplier_id, name')
          .eq('organization_id', currentOrganization.id)
          .ilike('name', `%${query}%`)
          .limit(10);

        // Fetch invoice numbers
        const { data: invoicesData } = await supabase
          .from('invoice_lines')
          .select('invoice_number')
          .eq('organization_id', currentOrganization.id)
          .ilike('invoice_number', `%${query}%`)
          .limit(10);

        setProducts(productsData || []);
        setSuppliers(suppliersData || []);
        setInvoices(invoicesData || []);
      } catch (error) {
        console.error('Error fetching mention data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [query, currentOrganization]);

  // Generate suggestions based on query
  useEffect(() => {
    const newSuggestions: MentionSuggestion[] = [];

    // User suggestions removed - no user data available

    // Product suggestions
    products.forEach(product => {
      newSuggestions.push({
        id: product.product_code,
        type: 'product',
        label: product.description,
        description: `Product Code: ${product.product_code}`,
        icon: <Package className="h-4 w-4" />
      });
    });

    // Supplier suggestions
    suppliers.forEach(supplier => {
      newSuggestions.push({
        id: supplier.supplier_id,
        type: 'supplier',
        label: supplier.name,
        description: 'Supplier',
        icon: <Building2 className="h-4 w-4" />
      });
    });

    // Location suggestions
    const filteredLocations = locations?.filter(location => 
      location.name.toLowerCase().includes(query.toLowerCase())
    ) || [];
    filteredLocations.forEach(location => {
      newSuggestions.push({
        id: location.location_id,
        type: 'location',
        label: location.name,
        description: location.address,
        icon: <MapPin className="h-4 w-4" />
      });
    });

    // Invoice suggestions
    invoices.forEach(invoice => {
      newSuggestions.push({
        id: invoice.invoice_number,
        type: 'invoice',
        label: invoice.invoice_number,
        description: 'Invoice Number',
        icon: <FileText className="h-4 w-4" />
      });
    });

    setSuggestions(newSuggestions.slice(0, 8)); // Limit to 8 suggestions
    setSelectedIndex(0);
  }, [products, suppliers, locations, invoices, query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(suggestions[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto min-w-64 max-w-80"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {isLoading ? (
        <div className="p-3 text-center text-gray-500">
          <Search className="h-4 w-4 mx-auto mb-1" />
          <div className="text-sm">Searching...</div>
        </div>
      ) : (
        <>
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              onClick={() => onSelect(suggestion)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className={`flex-shrink-0 ${
                suggestion.type === 'user' ? 'text-blue-600' :
                suggestion.type === 'product' ? 'text-green-600' :
                suggestion.type === 'supplier' ? 'text-purple-600' :
                suggestion.type === 'location' ? 'text-orange-600' :
                'text-gray-600'
              }`}>
                {suggestion.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {suggestion.label}
                </div>
                {suggestion.description && (
                  <div className="text-xs text-gray-500 truncate">
                    {suggestion.description}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  suggestion.type === 'user' ? 'bg-blue-100 text-blue-800' :
                  suggestion.type === 'product' ? 'bg-green-100 text-green-800' :
                  suggestion.type === 'supplier' ? 'bg-purple-100 text-purple-800' :
                  suggestion.type === 'location' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {suggestion.type}
                </span>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
};
