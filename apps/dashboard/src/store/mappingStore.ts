import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { MappingStore, NameMapping, RestaurantConfig } from '../types';
import { useImportStore } from './importStore';

export const useMappingStore = create<MappingStore>()(
  persist(
    (set, get) => ({
      supplierMappings: [],
      restaurantMappings: [],
      productMappings: [],
      restaurantConfigs: [],

      addMapping: (type, mapping) => {
        set((state) => ({
          [type + 'Mappings']: [...state[type + 'Mappings'], mapping],
        }));
        toast.success('New mapping added');
      },

      removeMapping: (type, id) => {
        set((state) => ({
          [type + 'Mappings']: state[type + 'Mappings'].filter(
            (mapping) => mapping.id !== id
          ),
        }));
        toast.success('Mapping removed');
      },

      updateMapping: (type, mapping) => {
        set((state) => ({
          [type + 'Mappings']: state[type + 'Mappings'].map((m) =>
            m.id === mapping.id ? mapping : m
          ),
        }));
        toast.success('Mapping updated');
      },

      addRestaurantConfig: (config) => {
        set((state) => ({
          restaurantConfigs: [...state.restaurantConfigs, config],
        }));
        toast.success('Restaurant currency added');
      },

      removeRestaurantConfig: (id) => {
        set((state) => ({
          restaurantConfigs: state.restaurantConfigs.filter((config) => config.id !== id),
        }));
        toast.success('Restaurant currency removed');
      },

      updateRestaurantConfig: (config) => {
        set((state) => ({
          restaurantConfigs: state.restaurantConfigs.map((c) =>
            c.id === config.id ? config : c
          ),
        }));
        toast.success('Restaurant currency updated');
      },

      refreshData: () => {
        toast.promise(
          new Promise((resolve) => {
            const importStore = useImportStore.getState();
            if (importStore.data) {
              const newData = importStore.data.map(invoice => ({
                ...invoice,
                supplier: {
                  ...invoice.supplier,
                  name: normalizeSupplierName(invoice.supplier.name, invoice.supplier.address),
                },
                receiver: {
                  ...invoice.receiver,
                  name: normalizeRestaurantName(invoice.receiver.name, invoice.receiver.address),
                },
                items: invoice.items.map(item => ({
                  ...item,
                  description: normalizeProductName(item.description),
                })),
              }));
              importStore.setData(newData);
              setTimeout(resolve, 500); // Add slight delay for better UX
            }
          }),
          {
            loading: 'Refreshing data...',
            success: 'Data refreshed successfully',
            error: 'Failed to refresh data',
          }
        );
      },
    }),
    {
      name: 'mapping-storage',
    }
  )
);

export const normalizeSupplierName = (name: string, address?: string): string => {
  const store = useMappingStore.getState();
  const mapping = store.supplierMappings.find((m) =>
    m.variants.some((v) => 
      (v.name && v.name.toLowerCase() === name.toLowerCase()) ||
      (v.address && address && v.address.toLowerCase() === address.toLowerCase())
    )
  );
  return mapping ? mapping.standardName : name;
};

export const normalizeRestaurantName = (name: string, address?: string): string => {
  const store = useMappingStore.getState();
  const mapping = store.restaurantMappings.find((m) =>
    m.variants.some((v) => 
      (v.name && v.name.toLowerCase() === name.toLowerCase()) ||
      (v.address && address && v.address.toLowerCase() === address.toLowerCase())
    )
  );
  return mapping ? mapping.standardName : name;
};

export const normalizeProductName = (name: string): string => {
  const store = useMappingStore.getState();
  const mapping = store.productMappings.find((m) =>
    m.variants.some((v) => v.name && v.name.toLowerCase() === name.toLowerCase())
  );
  return mapping ? mapping.standardName : name;
};

export const getRestaurantCurrency = (name: string): { code: string; symbol: string } => {
  const store = useMappingStore.getState();
  const config = store.restaurantConfigs.find((c) => c.name === name);
  return config?.currency || { code: 'EUR', symbol: '€' };
};