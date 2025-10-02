import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DateRange {
  start: string;
  end: string;
}

interface ProductSearch {
  terms: string[];
  mode: 'AND' | 'OR';
}

interface FilterState {
  dateRange: DateRange | null;
  restaurants: string[];
  suppliers: string[];
  categories: string[];
  documentType: 'all' | 'Faktura' | 'Kreditnota';
  productSearch: ProductSearch;
  productCodeFilter: 'all' | 'with_codes' | 'without_codes';
  isFiltersOpen: boolean;
  setDateRange: (range: DateRange | null) => void;
  setRestaurants: (restaurants: string[]) => void;
  setSuppliers: (suppliers: string[]) => void;
  setCategories: (categories: string[]) => void;
  setDocumentType: (type: 'all' | 'Faktura' | 'Kreditnota') => void;
  addProductSearchTerm: (term: string) => void;
  removeProductSearchTerm: (term: string) => void;
  setProductSearchMode: (mode: 'AND' | 'OR') => void;
  setProductCodeFilter: (filter: 'all' | 'with_codes' | 'without_codes') => void;
  clearFilters: () => void;
  toggleFilters: () => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      dateRange: null,
      restaurants: [],
      suppliers: [],
      categories: [],
      documentType: 'all',
      productSearch: {
        terms: [],
        mode: 'OR'
      },
      productCodeFilter: 'all',
      isFiltersOpen: false,
      setDateRange: (range) => set({ dateRange: range }),
      setRestaurants: (restaurants) => set({ restaurants }),
      setSuppliers: (suppliers) => set({ suppliers }),
      setCategories: (categories) => set({ categories }),
      setDocumentType: (documentType) => set({ documentType }),
      addProductSearchTerm: (term) => set((state) => ({
        productSearch: {
          ...state.productSearch,
          terms: state.productSearch.terms.includes(term) 
            ? state.productSearch.terms 
            : [...state.productSearch.terms, term]
        }
      })),
      removeProductSearchTerm: (term) => set((state) => {
        return {
          productSearch: {
            ...state.productSearch,
            terms: state.productSearch.terms.filter(t => t !== term)
          }
        }
      }),
      setProductSearchMode: (mode) => set((state) => ({
        productSearch: {
          ...state.productSearch,
          mode
        }
      })),
      setProductCodeFilter: (filter) => set({ productCodeFilter: filter }),
      clearFilters: () => set({ 
        dateRange: null, 
        restaurants: [], 
        suppliers: [], 
        categories: [],
        documentType: 'all',
        productSearch: { terms: [], mode: 'OR' },
        productCodeFilter: 'all',
        isFiltersOpen: false
      }),
      toggleFilters: () => set((state) => ({ isFiltersOpen: !state.isFiltersOpen })),
    }),
    {
      name: 'filter-storage',
    }
  )
);