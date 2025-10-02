import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProductMapping {
  sourceCode: string;
  targetCode: string;
  description: string;
  createdAt: Date;
}

interface ProductMappingState {
  mappings: ProductMapping[];
  addMapping: (sourceCode: string, targetCode: string) => void;
  removeMapping: (sourceCode: string) => void;
  resetMappings: () => void;
  getMappedProduct: (productCode: string) => string | null;
  getMappedProducts: (productCode: string) => ProductMapping[];
  consolidateProducts: <T extends { productCode: string }>(products: T[]) => T[];
}

export const useProductMappingStore = create<ProductMappingState>()(
  persist(
    (set, get) => ({
      mappings: [],
      
      addMapping: (sourceCode, targetCode) => {
        set((state) => ({
          mappings: [
            ...state.mappings,
            { 
              sourceCode, 
              targetCode, 
              description: '', // Will be populated when consolidating
              createdAt: new Date() 
            }
          ],
        }));
      },
      
      removeMapping: (sourceCode) => {
        set((state) => ({
          mappings: state.mappings.filter(m => m.sourceCode !== sourceCode),
        }));
      },

      resetMappings: () => {
        set({ mappings: [] });
      },
      
      getMappedProduct: (productCode) => {
        const mapping = get().mappings.find(m => m.sourceCode === productCode);
        return mapping ? mapping.targetCode : null;
      },

      getMappedProducts: (productCode) => {
        return get().mappings.filter(m => m.targetCode === productCode);
      },
      
      consolidateProducts: (products) => {
        const mappings = get().mappings;
        const consolidated = new Map<string, typeof products[0]>();
        const sourceProducts = new Map<string, typeof products[0]>();
        
        products.forEach(product => {
          // Store all products in a map for easy lookup
          sourceProducts.set(product.productCode, product);
        });

        // Process each product
        products.forEach(product => {
          // Check if this product is mapped to another product
          const mapping = mappings.find(m => m.sourceCode === product.productCode);

          if (mapping) {
            // This is a source product, add its metrics to the target
            const targetProduct = sourceProducts.get(mapping.targetCode);
            if (targetProduct && !consolidated.has(mapping.targetCode)) {
              const consolidatedProduct = { ...targetProduct };
              consolidated.set(mapping.targetCode, consolidatedProduct);
            }

            if (consolidated.has(mapping.targetCode)) {
              const target = consolidated.get(mapping.targetCode)!;
              // Add source metrics to target
              if ('total' in product && 'total' in target) {
                (target as any).total += (product as any).total;
              }
              if ('quantity' in product && 'quantity' in target) {
                (target as any).quantity += (product as any).quantity;
              }
              // Update description to show mapping
              (target as any).description = `${(target as any).description} / ${product.description} (${product.productCode})`;
            }
          } else if (!mappings.some(m => m.sourceCode === product.productCode)) {
            // This is either a target product or an unmapped product
            if (!consolidated.has(product.productCode)) {
              consolidated.set(product.productCode, { ...product });
            }
          }
        });
        
        return Array.from(consolidated.values());
      }
    }),
    {
      name: 'product-mapping-storage',
    }
  )
);