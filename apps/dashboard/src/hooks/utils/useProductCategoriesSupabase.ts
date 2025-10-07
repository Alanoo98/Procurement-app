import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cache } from '@/lib/cache';

export interface ProductCategory {
  category_id: string;
  category_name: string;
  category_description?: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCategoryMapping {
  mapping_id: string;
  organization_id: string;
  category_id: string;
  variant_product_name: string;
  variant_product_code?: string;
  variant_supplier_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PendingCategoryMapping {
  id: string;
  organization_id: string;
  variant_product_name: string;
  variant_product_code?: string;
  variant_supplier_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const useProductCategoriesSupabase = () => {
  const { currentOrganization } = useOrganization();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [mappings, setMappings] = useState<ProductCategoryMapping[]>([]);
  const [pendingMappings, setPendingMappings] = useState<PendingCategoryMapping[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create cache key
  const cacheKey = useMemo(() => {
    if (!currentOrganization) return '';
    return `product-categories:${currentOrganization.id}`;
  }, [currentOrganization]);

  // Check cache first
  const getCachedData = useCallback(() => {
    if (!cacheKey) return null;
    return cache.get<ProductCategory[]>(cacheKey);
  }, [cacheKey]);

  // Cache the result
  const setCachedData = useCallback((data: ProductCategory[]) => {
    if (!cacheKey) return;
    cache.set(cacheKey, data, 15 * 60 * 1000); // 15 minutes
  }, [cacheKey]);

  // Fetch all categories for the current organization
  const fetchCategories = useCallback(async () => {
    if (!currentOrganization) return;
    
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      setCategories(cachedData);
      setLoading(false);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('category_name');
      
      if (error) throw error;
      setCategories(data || []);
      setCachedData(data || []); // Cache the result
    } catch (err) {
      setError(err as Error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, getCachedData, setCachedData]);

  // Fetch all category mappings for the current organization
  const fetchMappings = useCallback(async () => {
    if (!currentOrganization) return;
    try {
      const { data, error } = await supabase
        .from('product_category_mappings')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('variant_product_name');
      
      if (error) throw error;
      setMappings(data || []);
    } catch (err) {
      setError(err as Error);
      setMappings([]);
    }
  }, [currentOrganization]);

  // Fetch pending category mappings
  const fetchPendingMappings = useCallback(async () => {
    if (!currentOrganization) return;
    try {
      const { data, error } = await supabase
        .from('pending_category_mappings')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPendingMappings(data || []);
    } catch (err) {
      setError(err as Error);
      setPendingMappings([]);
    }
  }, [currentOrganization]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchCategories(),
      fetchMappings(),
      fetchPendingMappings()
    ]);
  }, [fetchCategories, fetchMappings, fetchPendingMappings]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Create a new category
  const createCategory = async (categoryName: string, description?: string) => {
    if (!currentOrganization) return;
    const { data, error } = await supabase
      .from('product_categories')
      .insert([{
        category_name: categoryName,
        category_description: description,
        organization_id: currentOrganization.id,
      }])
      .select()
      .single();
    
    if (error) throw error;
    // Clear cache and refetch
    cache.delete(cacheKey);
    await fetchCategories();
    return data;
  };

  // Update a category
  const updateCategory = async (categoryId: string, updates: Partial<ProductCategory>) => {
    const { error } = await supabase
      .from('product_categories')
      .update(updates)
      .eq('category_id', categoryId);
    
    if (error) throw error;
    // Clear cache and refetch
    cache.delete(cacheKey);
    await fetchCategories();
  };

  // Delete a category
  const deleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('category_id', categoryId);
    
    if (error) throw error;
    // Clear cache and refetch
    cache.delete(cacheKey);
    await fetchCategories();
  };

  // Create a new category mapping
  const createMapping = async (
    categoryId: string,
    variantName: string,
    variantCode?: string,
    variantSupplier?: string
  ) => {
    if (!currentOrganization) return;

    try {
      // First, check if mapping already exists
      const { data: existingMapping, error: checkError } = await supabase
        .from('product_category_mappings')
        .select('mapping_id')
        .eq('organization_id', currentOrganization.id)
        .eq('category_id', categoryId)
        .eq('variant_product_name', variantName)
        .eq('is_active', true)
        .maybeSingle();

      if (checkError) throw checkError;

      let mappingId: string;

      if (existingMapping) {
        // Use existing mapping
        mappingId = existingMapping.mapping_id;
      } else {
        // Create new mapping
        const { data: newMapping, error: insertError } = await supabase
          .from('product_category_mappings')
          .insert({
            organization_id: currentOrganization.id,
            category_id: categoryId,
            variant_product_name: variantName,
            variant_product_code: variantCode || null,
            variant_supplier_name: variantSupplier || null,
            is_active: true
          })
          .select('mapping_id')
          .single();

        if (insertError) throw insertError;
        mappingId = newMapping.mapping_id;
      }

      // Update invoice_lines to set the category mapping
      const { error: updateError } = await supabase
        .from('invoice_lines')
        .update({
          category_mapping_id: mappingId,
          category_id: categoryId,
          category_pending: false,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', currentOrganization.id)
        .eq('description', variantName)
        .eq('product_code', variantCode || null);

      if (updateError) throw updateError;

      // Refresh both mappings and pending mappings
      await Promise.all([fetchMappings(), fetchPendingMappings()]);
      return { mapping_id: mappingId };
    } catch (error) {
      console.error('Error creating category mapping:', error);
      throw error;
    }
  };

  // Update a mapping
  const updateMapping = async (mappingId: string, updates: Partial<ProductCategoryMapping>) => {
    const { error } = await supabase
      .from('product_category_mappings')
      .update(updates)
      .eq('mapping_id', mappingId);
    
    if (error) throw error;
    await fetchMappings();
  };

  // Delete a mapping
  const deleteMapping = async (mappingId: string) => {
    // First, clear any references in invoice_lines to avoid foreign key constraint violations
    const { error: updateError } = await supabase
      .from('invoice_lines')
      .update({ 
        category_mapping_id: null,
        category_id: null,
        category_pending: true 
      })
      .eq('category_mapping_id', mappingId);
    
    if (updateError) {
      console.error('Error clearing invoice_lines references:', updateError);
      // Continue anyway - the mapping might not be referenced
    }
    
    // Now delete the mapping
    const { data, error } = await supabase
      .from('product_category_mappings')
      .delete()
      .eq('mapping_id', mappingId)
      .select();
    
    if (error) {
      console.error('Delete mapping error:', error);
      throw new Error(`Failed to delete mapping: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('Mapping not found or already deleted');
    }
    
    await fetchMappings();
    return data[0];
  };

  // Approve a pending mapping
  const approvePendingMapping = async (pendingId: string, categoryId: string) => {
    if (!currentOrganization) return;
    
    // Get the pending mapping details
    const pendingMapping = pendingMappings.find(p => p.id === pendingId);
    if (!pendingMapping) throw new Error('Pending mapping not found');

    // Create the actual mapping
    await createMapping(
      categoryId,
      pendingMapping.variant_product_name,
      pendingMapping.variant_product_code,
      pendingMapping.variant_supplier_name
    );

    // Update the pending mapping status
    const { error } = await supabase
      .from('pending_category_mappings')
      .update({ status: 'approved' })
      .eq('id', pendingId);
    
    if (error) throw error;
    await fetchPendingMappings();
  };

  // Reject a pending mapping
  const rejectPendingMapping = async (pendingId: string) => {
    const { error } = await supabase
      .from('pending_category_mappings')
      .update({ status: 'rejected' })
      .eq('id', pendingId);
    
    if (error) throw error;
    await fetchPendingMappings();
  };

  // Get mappings for a specific category
  const getMappingsForCategory = (categoryId: string) => {
    return mappings.filter(m => m.category_id === categoryId);
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.category_id === categoryId);
    return category?.category_name || 'Unknown Category';
  };

  // Get all unique product names and codes from pending category mappings (for suggestions)
  const getUnmappedProductNames = async () => {
    if (!currentOrganization) return [];
    
    try {
      const { data, error } = await supabase
        .from('pending_category_mappings')
        .select('variant_product_name, variant_product_code, variant_supplier_name')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      // Get all mapped variant keys using improved matching strategy
      // Priority: product code + supplier > product code only > name + code > name only
      const mappedVariants = new Set();
      
      // Add exact matches (name + code + supplier)
      mappings.forEach(m => {
        const exactKey = `${m.variant_product_name.toLowerCase()}|${m.variant_product_code || ''}|${m.variant_supplier_name || ''}`;
        mappedVariants.add(exactKey);
      });
      
      // Add code + supplier matches (ignore name variations)
      mappings.forEach(m => {
        if (m.variant_product_code && m.variant_supplier_name) {
          const codeSupplierKey = `CODE_SUPPLIER|${m.variant_product_code}|${m.variant_supplier_name}`;
          mappedVariants.add(codeSupplierKey);
        }
      });
      
      // Add code-only matches (ignore name and supplier variations)
      mappings.forEach(m => {
        if (m.variant_product_code) {
          const codeKey = `CODE_ONLY|${m.variant_product_code}`;
          mappedVariants.add(codeKey);
        }
      });
      
      // Add name + code matches (ignore supplier)
      mappings.forEach(m => {
        if (m.variant_product_code) {
          const nameCodeKey = `NAME_CODE|${m.variant_product_name.toLowerCase()}|${m.variant_product_code}`;
          mappedVariants.add(nameCodeKey);
        }
      });
      
      // Add name-only matches (no code, ignore supplier)
      mappings.forEach(m => {
        if (!m.variant_product_code) {
          const nameOnlyKey = `NAME_ONLY|${m.variant_product_name.toLowerCase()}`;
          mappedVariants.add(nameOnlyKey);
        }
      });
      
      // Create unique products with both name and code (avoid duplicates)
      const uniqueProducts = new Map();
      data.forEach(item => {
        const key = `${item.variant_product_name}|${item.variant_product_code || ''}`;
        if (!uniqueProducts.has(key)) {
          uniqueProducts.set(key, {
            name: item.variant_product_name,
            code: item.variant_product_code || '',
            supplier: item.variant_supplier_name || '',
            displayText: item.variant_product_code ? `${item.variant_product_name} (${item.variant_product_code})` : item.variant_product_name,
            suggestions: [] // Will be populated below
          });
        }
      });
      
      // Generate suggestions for each unmapped product
      const unmappedProducts = Array.from(uniqueProducts.values())
        .filter(product => {
          // Check exact match
          const exactKey = `${product.name.toLowerCase()}|${product.code}|${product.supplier}`;
          if (mappedVariants.has(exactKey)) return false;
          
          // Check code + supplier match (ignore name variations)
          if (product.code && product.supplier) {
            const codeSupplierKey = `CODE_SUPPLIER|${product.code}|${product.supplier}`;
            if (mappedVariants.has(codeSupplierKey)) return false;
          }
          
          // Check code-only match (ignore name and supplier variations)
          if (product.code) {
            const codeKey = `CODE_ONLY|${product.code}`;
            if (mappedVariants.has(codeKey)) return false;
          }
          
          // Check name + code match (ignore supplier)
          if (product.code) {
            const nameCodeKey = `NAME_CODE|${product.name.toLowerCase()}|${product.code}`;
            if (mappedVariants.has(nameCodeKey)) return false;
          }
          
          // Check name-only match (no code)
          if (!product.code) {
            const nameOnlyKey = `NAME_ONLY|${product.name.toLowerCase()}`;
            if (mappedVariants.has(nameOnlyKey)) return false;
          }
          
          return true;
        })
        .map(product => {
          // Generate suggestions based on similar products
          const suggestions = generateProductSuggestions(product, mappings);
          return {
            ...product,
            suggestions
          };
        })
        .sort((a, b) => a.displayText.toLowerCase().localeCompare(b.displayText.toLowerCase()));
      
      return unmappedProducts;
    } catch (err) {
      console.error('Error fetching unmapped product names:', err);
      return [];
    }
  };

  // Generate suggestions for similar products
  type MinimalProduct = { name: string; code: string; supplier: string };
  const generateProductSuggestions = (product: MinimalProduct, mappings: ProductCategoryMapping[]) => {
    const suggestions: Array<{
      mapping: ProductCategoryMapping;
      categoryName: string;
      reason: string;
      confidence: 'high' | 'medium' | 'low';
    }> = [];

    // 1. High confidence: Same product code (regardless of name/supplier)
    if (product.code) {
      const codeMatches = mappings.filter(m => m.variant_product_code === product.code);
      codeMatches.forEach(mapping => {
        const categoryName = getCategoryName(mapping.category_id);
        suggestions.push({
          mapping,
          categoryName,
          reason: `Same product code: ${product.code}`,
          confidence: 'high'
        });
      });
    }

    // 2. Medium confidence: Same supplier + similar name
    if (product.supplier) {
      const supplierMatches = mappings.filter(m => 
        m.variant_supplier_name === product.supplier &&
        calculateSimilarity(product.name, m.variant_product_name) > 0.6
      );
      supplierMatches.forEach(mapping => {
        const categoryName = getCategoryName(mapping.category_id);
        suggestions.push({
          mapping,
          categoryName,
          reason: `Same supplier + similar name: ${mapping.variant_product_name}`,
          confidence: 'medium'
        });
      });
    }

    // 3. Low confidence: Similar name only
    const nameMatches = mappings.filter(m => 
      calculateSimilarity(product.name, m.variant_product_name) > 0.7
    );
    nameMatches.forEach(mapping => {
      const categoryName = getCategoryName(mapping.category_id);
      suggestions.push({
        mapping,
        categoryName,
        reason: `Similar name: ${mapping.variant_product_name}`,
        confidence: 'low'
      });
    });

    // Remove duplicates and sort by confidence
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.mapping.mapping_id === suggestion.mapping.mapping_id)
    );

    return uniqueSuggestions
      .sort((a, b) => {
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      })
      .slice(0, 3); // Limit to top 3 suggestions
  };

  // Simple string similarity calculation
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Simple word overlap
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    
    if (commonWords.length === 0) return 0;
    
    return commonWords.length / Math.max(words1.length, words2.length);
  };

  return {
    categories,
    mappings,
    pendingMappings,
    isLoading,
    error,
    fetchAll,
    fetchCategories,
    fetchMappings,
    fetchPendingMappings,
    createCategory,
    updateCategory,
    deleteCategory,
    createMapping,
    updateMapping,
    deleteMapping,
    approvePendingMapping,
    rejectPendingMapping,
    getMappingsForCategory,
    getCategoryName,
    getUnmappedProductNames,
  };
};
