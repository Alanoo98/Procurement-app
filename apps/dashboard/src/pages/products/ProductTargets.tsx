import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductTargets } from '@/hooks/management';
import { supabase } from '@/lib/supabase';
import { ExternalLink } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useProductMetrics } from '@/hooks/metrics';
import { useSupplierMetricsAnalysis } from '@/hooks/metrics';
import { formatCurrency } from '@/utils/format';

// Utility functions for number formatting
const formatQuantity = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString('da-DK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  return Number(value).toFixed(1);
};

function getStatus(quantityPct?: number, spendPct?: number, contractPct?: number) {
  if (contractPct === undefined) return '';
  const progress = Math.max(quantityPct || 0, spendPct || 0);
  if (progress >= contractPct) return 'On Track';
  if (progress >= contractPct * 0.8) return 'At Risk';
  return 'Behind';
}

function daysLeft(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getBenchmarkPosition(contractPct?: number) {
  // Clamp between 0 and 100
  return `${Math.min(Math.max(contractPct || 0, 0), 100)}%`;
}
function getProgressColor(pct?: number) {
  if (pct == null) return 'bg-gray-200';
  if (pct >= 90) return 'bg-green-500';
  if (pct >= 70) return 'bg-yellow-400';
  return 'bg-red-500';
}

export const ProductTargets: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading, error } = useProductTargets();
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<Array<{ product_code: string; description: string; supplier_id: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ supplier_id: string; name: string }>>([]);
  const [form, setForm] = useState({
    product_code: '',
    supplier_id: '',
    target_quantity: '',
    target_spend: '',
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productsData, setProductsData] = useState<Array<{ product_code: string; description: string; supplier_id: string }>>([]);
  const [filteredProducts, setFilteredProducts] = useState<Array<{ product_code: string; description: string; supplier_id: string }>>([]);
  const [showProductInfo, setShowProductInfo] = useState(false);
  const { currentOrganization } = useOrganization();
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [sortField, setSortField] = useState<string>('product');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: productMetrics } = useProductMetrics();
  const { data: supplierMetrics } = useSupplierMetricsAnalysis();
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [supplierNames, setSupplierNames] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<Array<{ location_id: string; name: string }>>([]);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const { data: targets, isLoading: loadingTargets, error: errorTargets, fetchTargets } = useProductTargets();
  const fetchTargetsRef = useRef<() => void>();

  useEffect(() => {
    fetchTargetsRef.current = fetchTargets;
  }, [fetchTargets]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  // Fetch products and suppliers for the dropdowns
  useEffect(() => {
    if (!showModal && !editTarget) return;
    (async () => {
      // Fetch unique products from invoice_lines (including those without product codes)
      const { data: prodData } = await supabase
        .from('invoice_lines')
        .select('product_code, description, supplier_id');
      setProductsData(prodData || []);
      // Deduplicate products (handle null product codes)
      const uniqueProducts = Array.from(
        new Map((prodData || []).map(p => [p.product_code || `no-code-${p.description}-${p.supplier_id}`, p])).values()
      ).sort((a, b) => (a.description || '').localeCompare(b.description || ''));
      setProducts(uniqueProducts);
      setFilteredProducts(uniqueProducts);
      // Fetch suppliers
      const { data: supData } = await supabase
        .from('suppliers')
        .select('supplier_id, name');
      setSuppliers((supData || []).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    })();
  }, [showModal, editTarget]);

  // Filter products by supplier and search
  useEffect(() => {
    let filtered = products;
    if (form.supplier_id) {
      const supplierProductCodes = productsData
        .filter(item => item.supplier_id === form.supplier_id)
        .map(item => item.product_code);
      filtered = products.filter(product => supplierProductCodes.includes(product.product_code));
    }
    if (productSearch.trim()) {
      const search = productSearch.trim().toLowerCase();
      filtered = filtered.filter(p =>
        (p.description || '').toLowerCase().includes(search) ||
        (p.product_code ? p.product_code.toLowerCase().includes(search) : false)
      );
    }
    setFilteredProducts(filtered);
  }, [form.supplier_id, productSearch, products, productsData]);

  // Refresh product targets after adding
  // const { data: targets, isLoading: loadingTargets, error: errorTargets } = useProductTargets(); // This line is now redundant

  // Filter and sort the targets
  const filteredAndSortedTargets = useMemo(() => {
    if (!targets) return [];
    
    // Apply search filter
    let filtered = targets;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = targets.filter(target => 
        (target.product_name || target.product_code || '').toLowerCase().includes(search) ||
        (target.supplier_name || '').toLowerCase().includes(search) ||
        (locationNames[target.location_id] || '').toLowerCase().includes(search)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(target => {
        const status = getStatus(target.quantity_progress_pct, target.spend_progress_pct, target.contract_time_progress_pct);
        return status === statusFilter;
      });
    }
    
    // Sort the filtered results
    return [...filtered].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;
      
      switch (sortField) {
        case 'product':
          aValue = (a.product_code || '').toLowerCase();
          bValue = (b.product_code || '').toLowerCase();
          break;
        case 'supplier':
          aValue = (a.supplier_id || '').toLowerCase();
          bValue = (b.supplier_id || '').toLowerCase();
          break;
        case 'location':
          aValue = (a.location_id || '').toLowerCase();
          bValue = (b.location_id || '').toLowerCase();
          break;
        case 'target_quantity':
          aValue = a.target_quantity || 0;
          bValue = b.target_quantity || 0;
          break;
        case 'quantity_sold':
          aValue = a.quantity_sold || 0;
          bValue = b.quantity_sold || 0;
          break;
        case 'qty_pct':
          aValue = a.quantity_progress_pct || 0;
          bValue = b.quantity_progress_pct || 0;
          break;
        case 'target_spend':
          aValue = a.target_spend || 0;
          bValue = b.target_spend || 0;
          break;
        case 'spend_achieved':
          aValue = a.spend_achieved || 0;
          bValue = b.spend_achieved || 0;
          break;
        case 'spend_pct':
          aValue = a.spend_progress_pct || 0;
          bValue = b.spend_progress_pct || 0;
          break;
        case 'end_date':
          aValue = new Date(a.end_date);
          bValue = new Date(b.end_date);
          break;
        case 'days_left':
          aValue = daysLeft(a.end_date);
          bValue = daysLeft(b.end_date);
          break;
        case 'status':
          aValue = getStatus(a.quantity_progress_pct, a.spend_progress_pct, a.contract_time_progress_pct);
          bValue = getStatus(b.quantity_progress_pct, b.spend_progress_pct, b.contract_time_progress_pct);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [targets, sortField, sortDirection, searchTerm, statusFilter, locationNames]);

  // Fetch product names for all unique product_codes in targets
  useEffect(() => {
    if (!targets || targets.length === 0) return;
    const uniqueProductCodes = Array.from(new Set(targets.map(t => t.product_code).filter(Boolean)));
    if (uniqueProductCodes.length === 0) return;
    supabase
      .from('invoice_lines')
      .select('product_code, description')
      .in('product_code', uniqueProductCodes)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach(row => { map[row.product_code] = row.description; });
        setProductNames(map);
      });
  }, [targets]);

  // Fetch supplier names for all unique supplier_ids in targets
  useEffect(() => {
    if (!targets || targets.length === 0) return;
    const uniqueSupplierIds = Array.from(new Set(targets.map(t => t.supplier_id).filter(Boolean))).filter(id => id !== null);
    if (uniqueSupplierIds.length === 0) return;
    supabase
      .from('suppliers')
      .select('supplier_id, name')
      .in('supplier_id', uniqueSupplierIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach(row => { map[row.supplier_id] = row.name; });
        setSupplierNames(map);
      });
  }, [targets]);

  // Fetch location (business unit) names for all unique business_unit_ids in targets
  useEffect(() => {
    if (!targets || targets.length === 0) return;
    const uniqueLocationIds = Array.from(new Set(targets.map(t => t.location_id).filter(Boolean)));
    if (uniqueLocationIds.length === 0) return;
    supabase
      .from('locations')
      .select('location_id, name')
      .in('location_id', uniqueLocationIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach(row => { map[row.location_id] = row.name; });
        setLocationNames(map);
      });
  }, [targets]);

  // Fetch locations for dropdown
  useEffect(() => {
    supabase
      .from('locations')
      .select('location_id, name')
      .then(({ data }) => {
        const sorted = (data || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setLocations(sorted);
        const map: Record<string, string> = {};
        sorted.forEach(row => { map[row.location_id] = row.name; });
        setLocationNames(map);
      });
  }, []);

  // Initialize edit form when editTarget is set
  useEffect(() => {
    if (editTarget) {
      // Set productSearch to show the current product description
      const currentProduct = productsData.find(p => p.product_code === editTarget.product_code);
      const productDescription = currentProduct?.description || editTarget.product_code || '';
      if (editTarget.productSearch !== productDescription) {
        setEditTarget({
          ...editTarget,
          productSearch: productDescription
        });
      }
    }
  }, [editTarget, productsData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'product_code') {
      // When product is selected, set supplier_id automatically
      const selectedProduct = productsData.find(p => p.product_code === value);
      setForm({
        ...form,
        product_code: value,
        supplier_id: selectedProduct?.supplier_id || '',
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.product_code || !form.start_date || !form.end_date) {
      setFormError('Product, start date, and end date are required.');
      return;
    }
    if (!currentOrganization?.id) {
      setFormError('No organization selected.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('product_targets').insert({
      product_code: form.product_code,
      supplier_id: form.supplier_id || null,
      target_quantity: form.target_quantity ? Number(form.target_quantity) : null,
      target_spend: form.target_spend ? Number(form.target_spend) : null,
      start_date: form.start_date,
      end_date: form.end_date,
      notes: form.notes || null,
      organization_id: currentOrganization.id,
      location_id: businessUnitId || null,
    });
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    if (typeof fetchTargetsRef.current === 'function') fetchTargetsRef.current();
    setShowModal(false);
    setForm({ product_code: '', supplier_id: '', target_quantity: '', target_spend: '', start_date: '', end_date: '', notes: '' });
  };

  // Find selected product details
  const selectedProduct = form.product_code ? productsData.find(p => p.product_code === form.product_code) : null;

  // Fetch business units for dropdown
  const { businessUnits } = useOrganization();

  // Helper maps
  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    (productMetrics || []).forEach(p => map.set(p.productCode, p.description));
    return map;
  }, [productMetrics]);
  const supplierMap = useMemo(() => {
    const map = new Map<string, string>();
    (supplierMetrics || []).forEach(s => map.set(s.supplier_id, s.name));
    return map;
  }, [supplierMetrics]);
  const businessUnitMap = useMemo(() => {
    const map = new Map<string, string>();
    businessUnits.forEach(bu => map.set(bu.id, bu.name));
    return map;
  }, [businessUnits]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Targets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track progress toward your product kickback and rebate agreements.
          </p>
        </div>
        <button
          className="bg-emerald-600 text-white px-4 py-2 rounded shadow hover:bg-emerald-700"
          onClick={() => setShowModal(true)}
        >
          Add Product Target
        </button>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products, suppliers, or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="On Track">On Track</option>
            <option value="At Risk">At Risk</option>
            <option value="Behind">Behind</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">View:</span>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'cards' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'table' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Table
          </button>
        </div>
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {isLoading || loadingTargets ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : error || errorTargets ? (
          <div className="p-8 text-center text-red-500">{error?.message || errorTargets?.message}</div>
        ) : !targets || targets.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No product targets found.</div>
        ) : filteredAndSortedTargets.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No targets match your search criteria.</div>
        ) : viewMode === 'cards' ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedTargets.map((target) => {
                const status = getStatus(target.quantity_progress_pct, target.spend_progress_pct, target.contract_time_progress_pct);
                const daysRemaining = daysLeft(target.end_date);
                const statusColor = status === 'On Track' ? 'green' : status === 'At Risk' ? 'yellow' : 'red';
                
                return (
                  <div key={target.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <button
                          onClick={() => navigate(`/products/${encodeURIComponent(target.product_code + '|' + (target.supplier_id || ''))}`)}
                          className="text-emerald-700 hover:underline font-semibold text-left"
                        >
                          {target.product_name || target.product_code}
                        </button>
                        <div className="text-sm text-gray-500 mt-1">{target.product_code}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColor === 'green' ? 'bg-green-100 text-green-800' :
                          statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Supplier and Location */}
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-16">Supplier:</span>
                        <span>{target.supplier_name || '-'}</span>
                      </div>
                      {target.location_id && locationNames[target.location_id] ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-16">Location:</span>
                          <span>{locationNames[target.location_id]}</span>
                        </div>
                      ) : null}
                    </div>
                    
                    {/* Progress Bars */}
                    <div className="space-y-4 mb-4">
                      {/* Quantity Progress */}
                      {target.target_quantity && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Quantity</span>
                            <span className="text-sm text-gray-600">
                              {formatQuantity(target.quantity_sold)} / {formatQuantity(target.target_quantity)}
                            </span>
                          </div>
                          <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                            {target.contract_time_progress_pct != null && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-gray-400/60"
                                style={{ left: getBenchmarkPosition(target.contract_time_progress_pct) }}
                              />
                            )}
                            <div
                              className={`absolute left-0 top-0 h-full rounded-full ${getProgressColor(target.quantity_progress_pct)}`}
                              style={{ width: `${Math.min(target.quantity_progress_pct || 0, 100)}%` }}
                            />
                          </div>
                          <div className="text-right text-sm font-semibold mt-1">
                            {target.quantity_progress_pct != null ? `${formatPercentage(target.quantity_progress_pct)}%` : '-'}
                          </div>
                        </div>
                      )}
                      
                      {/* Spend Progress */}
                      {target.target_spend && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Spend</span>
                            <span className="text-sm text-gray-600">
                              {target.spend_achieved?.toLocaleString()} / {target.target_spend?.toLocaleString()}
                            </span>
                          </div>
                          <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                            {target.contract_time_progress_pct != null && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-gray-400/60"
                                style={{ left: getBenchmarkPosition(target.contract_time_progress_pct) }}
                              />
                            )}
                            <div
                              className={`absolute left-0 top-0 h-full rounded-full ${getProgressColor(target.spend_progress_pct)}`}
                              style={{ width: `${Math.min(target.spend_progress_pct || 0, 100)}%` }}
                            />
                          </div>
                          <div className="text-right text-sm font-semibold mt-1">
                            {target.spend_progress_pct != null ? `${formatPercentage(target.spend_progress_pct)}%` : '-'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Contract Info */}
                    <div className="border-t pt-4 flex justify-between items-center text-sm text-gray-600">
                      <div>
                        <div>Ends: {target.end_date}</div>
                        <div className={daysRemaining < 0 ? 'text-red-600' : daysRemaining < 30 ? 'text-yellow-600' : 'text-gray-600'}>
                          {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : 
                           daysRemaining === 0 ? 'Ends today' : 
                           `${daysRemaining} days left`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          className="text-blue-600 hover:underline text-sm" 
                          onClick={() => setEditTarget(target)}
                        >
                          Edit
                        </button>
                        <button 
                          className="text-red-600 hover:underline text-sm" 
                          onClick={() => setDeleteTarget(target)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('product')}>
                    Product {sortField === 'product' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('supplier')}>
                    Supplier {sortField === 'supplier' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('location')}>
                    Location {sortField === 'location' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('target_quantity')}>
                    Target Qty {sortField === 'target_quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('quantity_sold')}>
                    Qty Sold {sortField === 'quantity_sold' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('qty_pct')}>
                    Qty % {sortField === 'qty_pct' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('target_spend')}>
                    Target Spend {sortField === 'target_spend' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('spend_achieved')}>
                    Spend {sortField === 'spend_achieved' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('spend_pct')}>
                    Spend % {sortField === 'spend_pct' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('end_date')}>
                    Contract End {sortField === 'end_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('days_left')}>
                    Days Left {sortField === 'days_left' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                    Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedTargets.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/products/${encodeURIComponent(row.product_code + '|' + (row.supplier_id || ''))}`)}
                        className="text-emerald-700 hover:underline font-medium text-left"
                      >
                        {row.product_name || row.product_code}
                      </button>
                      <div className="text-xs text-gray-500">{row.product_code}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.supplier_name || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{locationNames[row.location_id] || ''}</td>
                    <td className="px-4 py-2 text-right">{row.target_quantity ? formatQuantity(row.target_quantity) : '-'}</td>
                    <td className="px-4 py-2 text-right">{formatQuantity(row.quantity_sold)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center gap-2">
                        <div className="relative w-24 h-3 bg-gray-100 rounded-full overflow-hidden">
                          {/* Benchmark line */}
                          {row.contract_time_progress_pct != null && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-gray-400/60"
                              style={{ left: getBenchmarkPosition(row.contract_time_progress_pct) }}
                            />
                          )}
                          <div
                            className={`absolute left-0 top-0 h-full rounded-full ${getProgressColor(row.quantity_progress_pct)}`}
                            style={{ width: `${Math.min(row.quantity_progress_pct || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold" style={{ minWidth: 32 }}>
                          {row.quantity_progress_pct != null ? `${formatPercentage(row.quantity_progress_pct)}%` : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">{row.target_spend ? formatCurrency(row.target_spend) : '-'}</td>
                    <td className="px-4 py-2 text-right">{row.spend_achieved ? formatCurrency(row.spend_achieved) : '-'}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center gap-2">
                        <div className="relative w-24 h-3 bg-gray-100 rounded-full overflow-hidden">
                          {/* Benchmark line */}
                          {row.contract_time_progress_pct != null && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-gray-400/60"
                              style={{ left: getBenchmarkPosition(row.contract_time_progress_pct) }}
                            />
                          )}
                          <div
                            className={`absolute left-0 top-0 h-full rounded-full ${getProgressColor(row.spend_progress_pct)}`}
                            style={{ width: `${Math.min(row.spend_progress_pct || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold" style={{ minWidth: 32 }}>
                          {row.spend_progress_pct != null ? `${formatPercentage(row.spend_progress_pct)}%` : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">{row.end_date}</td>
                    <td className="px-4 py-2 text-center">{daysLeft(row.end_date)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={
                        getStatus(row.quantity_progress_pct, row.spend_progress_pct, row.contract_time_progress_pct) === 'On Track' ? 'text-green-600' :
                        getStatus(row.quantity_progress_pct, row.spend_progress_pct, row.contract_time_progress_pct) === 'At Risk' ? 'text-yellow-600' :
                        'text-red-600'
                      }>
                        {getStatus(row.quantity_progress_pct, row.spend_progress_pct, row.contract_time_progress_pct)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button className="text-blue-600 hover:underline mr-2" onClick={() => setEditTarget(row)}>Edit</button>
                      <button className="text-red-600 hover:underline" onClick={() => setDeleteTarget(row)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal for adding product target */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-xl w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">Add Product Target</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  Product *
                  {form.product_code && (
                    <button
                      type="button"
                      className="text-emerald-600 hover:text-emerald-800 ml-1"
                      onClick={() => navigate(`/products/${encodeURIComponent(form.product_code + '|' + (selectedProduct?.supplier_id || ''))}`)}
                      tabIndex={-1}
                    >
                      <ExternalLink className="inline h-4 w-4" />
                    </button>
                  )}
                </label>
                {showProductInfo && selectedProduct && (
                  <div className="absolute z-50 left-0 mt-1 w-72 bg-white border border-gray-200 shadow-lg rounded p-4 text-xs text-gray-700">
                    <div className="mb-1 font-semibold">Product Info</div>
                    <div><span className="font-medium">Product Code:</span> {selectedProduct.product_code}</div>
                    <div><span className="font-medium">Supplier:</span> {suppliers.find(s => s.supplier_id === selectedProduct.supplier_id)?.name || '-'}</div>
                    {/* Add more info here if available, e.g. unit price, total price, restaurants */}
                    <div className="mt-2 text-right">
                      <button className="text-xs text-emerald-600 hover:underline" onClick={() => setShowProductInfo(false)}>Close</button>
                    </div>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Search product..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full border rounded px-3 py-2 mb-2"
                />
                <select
                  name="product_code"
                  value={form.product_code}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select a product</option>
                  {filteredProducts.map((p) => (
                    <option key={p.product_code || `no-code-${p.description}-${p.supplier_id}`} value={p.product_code || ''}>
                      {(p.description || 'No Description') + ' (' + (p.product_code || 'No Product Code') + ')'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  name="supplier_id"
                  value={form.supplier_id}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  disabled={!!form.product_code}
                >
                  <option value="">Select a supplier{form.product_code ? ' (auto-selected)' : ' (optional)'}</option>
                  {form.product_code
                    ? (() => {
                        const selectedProduct = productsData.find(p => p.product_code === form.product_code);
                        const supplier = suppliers.find(s => s.supplier_id === selectedProduct?.supplier_id);
                        return supplier ? (
                          <option key={supplier.supplier_id} value={supplier.supplier_id}>
                            {supplier.name}
                          </option>
                        ) : null;
                      })()
                    : suppliers.map((s) => (
                        <option key={s.supplier_id} value={s.supplier_id}>
                          {s.name}
                        </option>
                      ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Quantity</label>
                  <input
                    type="number"
                    name="target_quantity"
                    value={form.target_quantity}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Spend</label>
                  <input
                    type="number"
                    name="target_spend"
                    value={form.target_spend}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={businessUnitId}
                  onChange={e => setBusinessUnitId(e.target.value)}
                  className="w-full border rounded px-3 py-2 mb-2"
                >
                  <option value="">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              {formError && <div className="text-red-500 text-sm">{formError}</div>}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 text-sm"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded text-sm"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-xl w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">Edit Product Target</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editTarget.product_code || !editTarget.start_date || !editTarget.end_date) {
                  alert('Product, start date, and end date are required.');
                  return;
                }
                const { error } = await supabase
                  .from('product_targets')
                  .update({
                    product_code: editTarget.product_code,
                    supplier_id: editTarget.supplier_id || null,
                    target_quantity: editTarget.target_quantity ? Number(editTarget.target_quantity) : null,
                    target_spend: editTarget.target_spend ? Number(editTarget.target_spend) : null,
                    start_date: editTarget.start_date,
                    end_date: editTarget.end_date,
                    notes: editTarget.notes || null,
                    location_id: editTarget.location_id || null,
                  })
                  .eq('id', editTarget.id);
                if (error) {
                  alert('Error updating product target: ' + error.message);
                } else {
                  if (typeof fetchTargetsRef.current === 'function') fetchTargetsRef.current();
                  setEditTarget(null);
                }
              }}
              className="space-y-4"
            >
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  Product *
                  {editTarget.product_code && (
                    <button
                      type="button"
                      className="text-emerald-600 hover:text-emerald-800 ml-1"
                      onClick={() => navigate(`/products/${encodeURIComponent(editTarget.product_code + '|' + (editTarget.supplier_id || ''))}`)}
                      tabIndex={-1}
                    >
                      <ExternalLink className="inline h-4 w-4" />
                    </button>
                  )}
                </label>
                {showProductInfo && editTarget.product_code && (
                  <div className="absolute z-50 left-0 mt-1 w-72 bg-white border border-gray-200 shadow-lg rounded p-4 text-xs text-gray-700">
                    <div className="mb-1 font-semibold">Product Info</div>
                    <div><span className="font-medium">Product Code:</span> {editTarget.product_code}</div>
                    <div><span className="font-medium">Supplier:</span> {suppliers.find(s => s.supplier_id === editTarget.supplier_id)?.name || '-'}</div>
                    {/* Add more info here if available, e.g. unit price, total price, restaurants */}
                    <div className="mt-2 text-right">
                      <button className="text-xs text-emerald-600 hover:underline" onClick={() => setShowProductInfo(false)}>Close</button>
                    </div>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Search product..."
                  value={editTarget.productSearch || ''}
                  onChange={e => {
                    setEditTarget({ ...editTarget, productSearch: e.target.value });
                  }}
                  className="w-full border rounded px-3 py-2 mb-2"
                />
                <select
                  name="product_code"
                  value={editTarget.product_code}
                  onChange={e => {
                    const value = e.target.value;
                    const selectedProduct = productsData.find(p => p.product_code === value);
                    setEditTarget({
                      ...editTarget,
                      product_code: value,
                      supplier_id: selectedProduct?.supplier_id || '',
                    });
                  }}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select a product</option>
                  {(() => {
                    // Filter products by search and supplier (if set)
                    let filtered = products;
                    if (editTarget.supplier_id) {
                      const supplierProductCodes = productsData
                        .filter(item => item.supplier_id === editTarget.supplier_id)
                        .map(item => item.product_code);
                      filtered = products.filter(product => supplierProductCodes.includes(product.product_code));
                    }
                    if ((editTarget.productSearch || '').trim()) {
                      const search = (editTarget.productSearch || '').trim().toLowerCase();
                      filtered = filtered.filter(p =>
                        (p.description || '').toLowerCase().includes(search) ||
                        (p.product_code ? p.product_code.toLowerCase().includes(search) : false)
                      );
                    }
                    // Always include the current product as an option
                    const current = productsData.find(p => p.product_code === editTarget.product_code);
                    const alreadyIncluded = filtered.some(p => p.product_code === editTarget.product_code);
                    const options = [...filtered];
                    if (current && !alreadyIncluded) options.unshift(current);
                    return options.map((p) => (
                      <option key={p.product_code || `no-code-${p.description}-${p.supplier_id}`} value={p.product_code || ''}>
                        {(p.description || 'No Description') + ' (' + (p.product_code || 'No Product Code') + ')'}
                      </option>
                    ));
                  })()}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  name="supplier_id"
                  value={editTarget.supplier_id}
                  onChange={e => setEditTarget({ ...editTarget, supplier_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  disabled={!!editTarget.product_code}
                >
                  <option value="">Select a supplier{editTarget.product_code ? ' (auto-selected)' : ' (optional)'}</option>
                  {(() => {
                    if (editTarget.product_code) {
                      const selectedProduct = productsData.find(p => p.product_code === editTarget.product_code);
                      const supplier = suppliers.find(s => s.supplier_id === selectedProduct?.supplier_id);
                      // Always include the current supplier as an option
                      const current = suppliers.find(s => s.supplier_id === editTarget.supplier_id);
                      const alreadyIncluded = suppliers.some(s => s.supplier_id === editTarget.supplier_id);
                      const options = supplier ? [supplier] : [];
                      if (editTarget.supplier_id && !alreadyIncluded && current) options.unshift(current);
                      return options.map((s) => (
                        <option key={s.supplier_id} value={s.supplier_id}>
                          {s.name}
                        </option>
                      ));
                    } else {
                      // Always include the current supplier as an option
                      const current = suppliers.find(s => s.supplier_id === editTarget.supplier_id);
                      const alreadyIncluded = suppliers.some(s => s.supplier_id === editTarget.supplier_id);
                      const options = [...suppliers];
                      if (editTarget.supplier_id && !alreadyIncluded && current) options.unshift(current);
                      return options.map((s) => (
                        <option key={s.supplier_id} value={s.supplier_id}>
                          {s.name}
                        </option>
                      ));
                    }
                  })()}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Quantity</label>
                  <input
                    type="number"
                    name="target_quantity"
                    value={editTarget.target_quantity ?? ''}
                    onChange={e => setEditTarget({ ...editTarget, target_quantity: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Spend</label>
                  <input
                    type="number"
                    name="target_spend"
                    value={editTarget.target_spend ?? ''}
                    onChange={e => setEditTarget({ ...editTarget, target_spend: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={editTarget.start_date}
                    onChange={e => setEditTarget({ ...editTarget, start_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    name="end_date"
                    value={editTarget.end_date}
                    onChange={e => setEditTarget({ ...editTarget, end_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={editTarget.notes ?? ''}
                  onChange={e => setEditTarget({ ...editTarget, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  name="location_id"
                  value={editTarget.location_id || ''}
                  onChange={e => setEditTarget({ ...editTarget, location_id: e.target.value })}
                  className="w-full border rounded px-3 py-2 mb-2"
                >
                  <option value="">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="text-gray-500 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded text-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-xl w-full max-w-sm text-center">
            <h2 className="text-lg font-bold mb-4">Delete Product Target?</h2>
            <p>Are you sure you want to delete this product target?</p>
            <div className="flex justify-center gap-4 mt-6">
              <button
                className="text-gray-500 px-4 py-2 rounded"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded"
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('product_targets')
                      .delete()
                      .eq('id', deleteTarget.id);
                    if (error) {
                      alert(`Error deleting target: ${error.message}`);
                    } else {
                      alert('Product target deleted successfully!');
                      if (typeof fetchTargetsRef.current === 'function') fetchTargetsRef.current();
                      setDeleteTarget(null);
                    }
                  } catch (err) {
                    alert(`Error deleting target: ${err}`);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 

