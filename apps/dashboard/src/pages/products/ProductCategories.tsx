import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Search, FolderPlus, Edit3, X, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePagination } from '@/hooks/ui/usePagination';
import { Pagination } from '@/components/shared/ui/Pagination';
import { useProductCategoriesSupabase } from '@/hooks/utils/useProductCategoriesSupabase';

export const ProductCategories: React.FC = () => {
  const navigate = useNavigate();
  const {
    categories,
    mappings,
    isLoading,
    error,
    fetchAll,
    createCategory,
    updateCategory,
    deleteCategory,
    createMapping,
    deleteMapping,
    getMappingsForCategory,
    getCategoryName,
    getUnmappedProductNames,
  } = useProductCategoriesSupabase();
  
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [unmappedProducts, setUnmappedProducts] = useState<Array<{name: string, code: string, supplier: string, displayText: string}>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Helper function to get the category for a product (single category only)
  const getProductCategory = (productName: string, productCode: string) => {
    const mapping = mappings.find(mapping => 
      mapping.variant_product_name === productName && 
      (mapping.variant_product_code === productCode || (mapping.variant_product_code === null && productCode === ''))
    );
    
    return mapping ? getCategoryName(mapping.category_id) : null;
  };

  // Load unmapped product names
  React.useEffect(() => {
    const loadUnmappedProducts = async () => {
      const products = await getUnmappedProductNames();
      setUnmappedProducts(products);
    };
    loadUnmappedProducts();
  }, [getUnmappedProductNames, mappings]);

  // Filter products based on search term (searches both name and code)
  // Get unique suppliers from products
  const uniqueSuppliers = React.useMemo(() => {
    const suppliers = new Set<string>();
    unmappedProducts.forEach(product => {
      if (product.supplier && product.supplier.trim()) {
        suppliers.add(product.supplier);
      }
    });
    return Array.from(suppliers).sort();
  }, [unmappedProducts]);

  const filteredProducts = React.useMemo(() => {
    let filtered = unmappedProducts;
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        (product.code && product.code.toLowerCase().includes(searchLower)) ||
        product.displayText.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by supplier
    if (selectedSupplier) {
      filtered = filtered.filter(product => product.supplier === selectedSupplier);
    }
    
    return filtered;
  }, [unmappedProducts, searchTerm, selectedSupplier]);

  // Pagination logic
  const {
    currentPage,
    paginatedItems: paginatedProducts,
    pageSize,
    goToPage,
    changePageSize,
    totalItems,
  } = usePagination(filteredProducts, 20);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      console.log('Creating category:', {
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined
      });
      
      await createCategory(
        newCategoryName.trim(),
        newCategoryDescription.trim() || undefined
      );
      setNewCategoryName('');
      setNewCategoryDescription('');
      // Avoid full reload of mappings to keep UI snappy; categories list is refreshed by createCategory
      // await fetchAll();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? This will remove all product mappings.')) {
      try {
        await deleteCategory(categoryId);
        await fetchAll();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const handleEditCategory = (categoryId: string) => {
    const cat = categories.find(c => c.category_id === categoryId);
    setEditName(cat?.category_name || '');
    setEditDescription(cat?.category_description || '');
    setEditingCategory(categoryId);
  };

  const handleSaveCategoryEdit = async (categoryId: string, newName: string, newDescription: string) => {
    await updateCategory(categoryId, {
      category_name: newName,
      category_description: newDescription,
    });
    setEditingCategory(null);
    setEditName('');
    setEditDescription('');
  };

  const handleProductClick = (product: {name: string, code: string, displayText: string}, index: number, event: React.MouseEvent) => {
    const productKey = `${product.name}|${product.code}`;
    
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      
      if (event.shiftKey && lastClickedIndex !== null) {
        // Shift-click: select range from last clicked to current (within current page)
        const startIndex = Math.min(lastClickedIndex, index);
        const endIndex = Math.max(lastClickedIndex, index);
        
        // Add all products in the range (within current page)
        for (let i = startIndex; i <= endIndex; i++) {
          const rangeProduct = paginatedProducts[i];
          if (rangeProduct) {
            const rangeProductKey = `${rangeProduct.name}|${rangeProduct.code}`;
            newSet.add(rangeProductKey);
          }
        }
      } else {
        // Normal click: toggle individual selection
        if (newSet.has(productKey)) {
          newSet.delete(productKey);
        } else {
          newSet.add(productKey);
        }
      }
      
      return newSet;
    });
    
    // Update last clicked index for future shift-clicks
    setLastClickedIndex(index);
  };

  const handleBulkAssignToCategory = async (categoryId: string) => {
    if (selectedProducts.size === 0) return;
    
    try {
      const promises = Array.from(selectedProducts).map(productKey => {
        const [name, code] = productKey.split('|');
        return createMapping(categoryId, name, code || undefined);
      });
      
      await Promise.all(promises);
      setSelectedProducts(new Set());
      setLastClickedIndex(null);
      
      // Refresh all data including pending mappings
      await fetchAll();
      
      // Reload unmapped products
      const products = await getUnmappedProductNames();
      setUnmappedProducts(products);
    } catch (error) {
      console.error('Error assigning products to category:', error);
    }
  };

  const handleSelectAll = () => {
    const allProductKeys = paginatedProducts.map(product => `${product.name}|${product.code}`);
    setSelectedProducts(new Set(allProductKeys));
    setLastClickedIndex(null);
  };

  const handleClearSelection = () => {
    setSelectedProducts(new Set());
    setLastClickedIndex(null);
  };

  const handleBack = () => {
    navigate('/products');
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Loading product categories...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Error Loading Categories</h2>
          <p className="mt-2 text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleBack}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Categories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize products into categories like Dairy, Meat, Vegetables, etc. Each product belongs to one category.
          </p>
        </div>
      </div>

      {/* Dual Panel Layout */}
      <div className="flex gap-6 min-h-0">
        
        {/* Left Panel: Categories */}
        <div className="w-1/2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Categories</h2>
            
            {/* Create New Category */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Create New Category</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Category name (e.g. Dairy, Meat, Vegetables)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Category
                </button>
              </div>
            </div>

            {/* Existing Categories */}
            <div className="space-y-4">
              {categories.map(category => {
                const categoryMappings = getMappingsForCategory(category.category_id);
                const isEditing = editingCategory === category.category_id;
                const isExpanded = expandedCategories.has(category.category_id);
                
                return (
                  <div key={category.category_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Category name"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Description (optional)"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSaveCategoryEdit(category.category_id, editName.trim(), editDescription.trim())}
                                disabled={!editName.trim()}
                                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingCategory(null); setEditName(''); setEditDescription(''); }}
                                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <button
                              type="button"
                              className="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700"
                              onClick={() => toggleCategoryExpanded(category.category_id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                              {category.category_name}
                            </button>
                            {category.category_description && (
                              <p className="text-sm text-gray-500 mt-1">{category.category_description}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{categoryMappings.length} products</span>
                        <button
                          onClick={() => handleEditCategory(category.category_id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.category_id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bulk Assignment - Always visible when products are selected */}
                    {selectedProducts.size > 0 && (
                      <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-700">
                            {selectedProducts.size} product(s) selected
                          </span>
                          <button
                            onClick={() => handleBulkAssignToCategory(category.category_id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add to {category.category_name}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Category Products */}
                    {isExpanded && (
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {categoryMappings.map(mapping => (
                          <div key={mapping.mapping_id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{mapping.variant_product_name}</span>
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Remove "${mapping.variant_product_name}" from this category?`)) {
                                  return;
                                }
                                
                                try {
                                  await deleteMapping(mapping.mapping_id);
                                  // Refresh unmapped products to show the removed product
                                  const products = await getUnmappedProductNames();
                                  setUnmappedProducts(products);
                                } catch (error) {
                                  console.error('Error removing product from category:', error);
                                  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                                  alert(`Failed to remove product from category: ${errorMessage}`);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Remove from category"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Available Products */}
        <div className="w-1/2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Available Products</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearSelection}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  onClick={async () => {
                    const products = await getUnmappedProductNames();
                    setUnmappedProducts(products);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Selection Info */}
            {selectedProducts.size > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">
                    {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={handleClearSelection}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Supplier Filter */}
              <div className="flex items-center space-x-2">
                <label htmlFor="supplier-filter" className="text-sm font-medium text-gray-700">
                  Filter by supplier:
                </label>
                <select
                  id="supplier-filter"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All suppliers</option>
                  {uniqueSuppliers.map(supplier => (
                    <option key={supplier} value={supplier}>
                      {supplier}
                    </option>
                  ))}
                </select>
                {selectedSupplier && (
                  <button
                    onClick={() => setSelectedSupplier('')}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>


            {/* Instructions */}
            <div className="mb-3 text-xs text-gray-500">
              💡 Tip: Hold Shift and click to select a range of products
            </div>

            {/* Product List */}
            <div className="max-h-[600px] overflow-y-auto space-y-1">
              {paginatedProducts.map((product, index) => {
                const productKey = `${product.name}|${product.code}`;
                const isSelected = selectedProducts.has(productKey);
                
                return (
                  <div
                    key={productKey}
                    className={`p-2 border rounded cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={(event) => handleProductClick(product, index, event)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{product.name}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {product.code && (
                            <span>Code: {product.code}</span>
                          )}
                          {product.supplier && (
                            <span className="text-blue-600 font-medium">Supplier: {product.supplier}</span>
                          )}
                        </div>
                        {(() => {
                          const productCategory = getProductCategory(product.name, product.code || '');
                          return productCategory && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                {productCategory}
                              </span>
                            </div>
                          );
                        })()}
                        
                        {/* Show suggestions if available */}
                        {product.suggestions && product.suggestions.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 mb-1">💡 Suggestions:</div>
                            {product.suggestions.map((suggestion, idx) => (
                              <div key={idx} className="flex items-center gap-2 mb-1">
                                <button
                                  onClick={() => handleBulkAssignToCategory(suggestion.mapping.category_id)}
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    suggestion.confidence === 'high' 
                                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                                      : suggestion.confidence === 'medium'
                                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                  }`}
                                >
                                  {suggestion.confidence === 'high' && '🎯'}
                                  {suggestion.confidence === 'medium' && '⚡'}
                                  {suggestion.confidence === 'low' && '💭'}
                                  {suggestion.categoryName}
                                </button>
                                <span className="text-xs text-gray-400">
                                  {suggestion.reason}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />

          </div>
        </div>
      </div>
    </div>
  );
};
