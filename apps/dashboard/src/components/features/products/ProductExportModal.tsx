import React, { useState } from 'react';
import { Download, X, FileText, FileSpreadsheet, FileJson, Settings, Calendar, Building2, Package, TrendingUp } from 'lucide-react';
import { useProductExport, ExportOptions } from '@/hooks/data/useProductExport';
import { useFilterStore } from '@/store/filterStore';
import { toast } from 'sonner';

interface ProductExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  productKeys?: string[]; // product_code|supplier_id keys from UI (pre-pagination)
  searchTerm?: string; // current UI search term
}

export const ProductExportModal: React.FC<ProductExportModalProps> = ({ isOpen, onClose, productKeys, searchTerm }) => {
  const { exportProducts, isExporting, exportProgress } = useProductExport();
  const { dateRange, restaurants, suppliers, categories } = useFilterStore();
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeMetrics: true,
    includePriceHistory: false,
    includeLocations: true,
    includeCategories: true,
    dateRange: dateRange ? {
      start: dateRange.start,
      end: dateRange.end
    } : undefined,
    suppliers: suppliers.length > 0 ? suppliers : undefined,
    locations: restaurants.length > 0 ? restaurants : undefined,
    categories: categories.length > 0 ? categories : undefined,
    productKeys: productKeys && productKeys.length > 0 ? productKeys : undefined,
    searchTerm: searchTerm && searchTerm.length > 0 ? searchTerm : undefined,
  });

  // Keep export options in sync when props or global filters change while modal is open
  React.useEffect(() => {
    setExportOptions(prev => ({
      ...prev,
      dateRange: dateRange ? { start: dateRange.start, end: dateRange.end } : undefined,
      suppliers: suppliers.length > 0 ? suppliers : undefined,
      locations: restaurants.length > 0 ? restaurants : undefined,
      categories: categories.length > 0 ? categories : undefined,
      productKeys: productKeys && productKeys.length > 0 ? productKeys : undefined,
      searchTerm: searchTerm && searchTerm.length > 0 ? searchTerm : undefined,
    }));
  }, [dateRange, suppliers, restaurants, categories, productKeys, searchTerm]);

  const handleExport = async () => {
    try {
      const result = await exportProducts(exportOptions);
      
      if (result.success) {
        toast.success(`Exported ${result.productCount} products`);
        onClose();
      } else {
        toast.error(`Export failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Export failed. Please try again.');
      console.error('Export error:', error);
    }
  };

  const handleOptionChange = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Download className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Export Products</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'csv', label: 'CSV', icon: FileText, description: 'Comma-separated values' },
                { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Spreadsheet format' },
                { value: 'json', label: 'JSON', icon: FileJson, description: 'Structured data' }
              ].map(({ value, label, icon: Icon, description }) => (
                <button
                  key={value}
                  onClick={() => handleOptionChange('format', value)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    exportOptions.format === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-6 w-6 mb-2" />
                  <div className="font-medium">{label}</div>
                  <div className="text-sm text-gray-500">{description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Data Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Include Data
            </label>
            <div className="space-y-3">
              {[
                { key: 'includeMetrics', label: 'Product Metrics', description: 'Quantities, spend, and price statistics', icon: TrendingUp },
                { key: 'includeLocations', label: 'Location Information', description: 'Where products are purchased', icon: Building2 },
                { key: 'includeCategories', label: 'Category Information', description: 'Product categories and classifications', icon: Package },
                { key: 'includePriceHistory', label: 'Price History', description: 'Historical price data (may increase file size)', icon: Calendar }
              ].map(({ key, label, description, icon: Icon }) => (
                <label key={key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={exportOptions[key as keyof ExportOptions] as boolean}
                    onChange={(e) => handleOptionChange(key as keyof ExportOptions, e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">{label}</div>
                    <div className="text-sm text-gray-500">{description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Current Filters Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Current Filters Applied</h3>
            <div className="space-y-1 text-sm text-gray-600">
              {dateRange && (
                <div>📅 Date Range: {dateRange.start} to {dateRange.end}</div>
              )}
              {suppliers.length > 0 && (
                <div>🏢 Suppliers: {suppliers.length} selected</div>
              )}
              {restaurants.length > 0 && (
                <div>📍 Locations: {restaurants.length} selected</div>
              )}
              {categories.length > 0 && (
                <div>📦 Categories: {categories.length} selected</div>
              )}
              {!dateRange && suppliers.length === 0 && restaurants.length === 0 && categories.length === 0 && (
                <div>ℹ️ No filters applied - all products will be exported</div>
              )}
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-700 font-medium">Exporting products...</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              <div className="text-sm text-blue-600 mt-1">{exportProgress}% complete</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Products'}
          </button>
        </div>
      </div>
    </div>
  );
};
