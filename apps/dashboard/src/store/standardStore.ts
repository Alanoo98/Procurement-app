import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StandardSupplier {
  id: string;
  name: string;
  taxId?: string;
  address?: string;
}

interface StandardRestaurant {
  id: string;
  name: string;
  address?: string;
  firmId?: string;
}

interface SupplierMapping {
  supplierId: string;
  variantName: string;
  variantAddress?: string;
}

interface RestaurantMapping {
  restaurantId: string;
  variantName: string;
  variantAddress?: string;
}

interface StandardState {
  suppliers: StandardSupplier[];
  restaurants: StandardRestaurant[];
  supplierMappings: SupplierMapping[];
  restaurantMappings: RestaurantMapping[];
  
  // Supplier actions
  addSupplier: (supplier: StandardSupplier) => void;
  updateSupplier: (id: string, supplier: Partial<StandardSupplier>) => void;
  removeSupplier: (id: string) => void;
  
  // Restaurant actions
  addRestaurant: (restaurant: StandardRestaurant) => void;
  updateRestaurant: (id: string, restaurant: Partial<StandardRestaurant>) => void;
  removeRestaurant: (id: string) => void;
  
  // Mapping actions
  addSupplierMapping: (mapping: SupplierMapping) => void;
  removeSupplierMapping: (variantName: string) => void;
  addRestaurantMapping: (mapping: RestaurantMapping) => void;
  removeRestaurantMapping: (variantName: string) => void;
  
  // Helper functions
  getStandardSupplier: (variantName: string, variantAddress?: string) => StandardSupplier | undefined;
  getStandardRestaurant: (variantName: string, variantAddress?: string) => StandardRestaurant | undefined;
}

export const useStandardStore = create<StandardState>()(
  persist(
    (set, get) => ({
      suppliers: [],
      restaurants: [],
      supplierMappings: [],
      restaurantMappings: [],
      
      addSupplier: (supplier) => set((state) => ({
        suppliers: [...state.suppliers, supplier]
      })),
      
      updateSupplier: (id, supplier) => set((state) => ({
        suppliers: state.suppliers.map(s => 
          s.id === id ? { ...s, ...supplier } : s
        )
      })),
      
      removeSupplier: (id) => set((state) => ({
        suppliers: state.suppliers.filter(s => s.id !== id),
        supplierMappings: state.supplierMappings.filter(m => m.supplierId !== id)
      })),
      
      addRestaurant: (restaurant) => set((state) => ({
        restaurants: [...state.restaurants, restaurant]
      })),
      
      updateRestaurant: (id, restaurant) => set((state) => ({
        restaurants: state.restaurants.map(r => 
          r.id === id ? { ...r, ...restaurant } : r
        )
      })),
      
      removeRestaurant: (id) => set((state) => ({
        restaurants: state.restaurants.filter(r => r.id !== id),
        restaurantMappings: state.restaurantMappings.filter(m => m.restaurantId !== id)
      })),
      
      addSupplierMapping: (mapping) => set((state) => ({
        supplierMappings: [...state.supplierMappings, mapping]
      })),
      
      removeSupplierMapping: (variantName) => set((state) => ({
        supplierMappings: state.supplierMappings.filter(m => 
          m.variantName.toLowerCase() !== variantName.toLowerCase()
        )
      })),
      
      addRestaurantMapping: (mapping) => set((state) => ({
        restaurantMappings: [...state.restaurantMappings, mapping]
      })),
      
      removeRestaurantMapping: (variantName) => set((state) => ({
        restaurantMappings: state.restaurantMappings.filter(m => 
          m.variantName.toLowerCase() !== variantName.toLowerCase()
        )
      })),
      
      getStandardSupplier: (variantName, variantAddress) => {
        const mapping = get().supplierMappings.find(m => 
          m.variantName.toLowerCase() === variantName.toLowerCase() &&
          (!variantAddress || !m.variantAddress || 
           m.variantAddress.toLowerCase() === variantAddress.toLowerCase())
        );
        if (!mapping) return undefined;
        return get().suppliers.find(s => s.id === mapping.supplierId);
      },
      
      getStandardRestaurant: (variantName, variantAddress) => {
        const mapping = get().restaurantMappings.find(m => 
          m.variantName.toLowerCase() === variantName.toLowerCase() &&
          (!variantAddress || !m.variantAddress || 
           m.variantAddress.toLowerCase() === variantAddress.toLowerCase())
        );
        if (!mapping) return undefined;
        return get().restaurants.find(r => r.id === mapping.restaurantId);
      }
    }),
    {
      name: 'standard-storage'
    }
  )
);