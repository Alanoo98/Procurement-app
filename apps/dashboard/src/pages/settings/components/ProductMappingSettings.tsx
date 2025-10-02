import React from 'react';
import { useFilteredData } from '@/hooks/useFilteredData';
import { ProductMapping } from '@/components/features/products/ProductMapping';

export const ProductMappingSettings: React.FC = () => {
  const filteredData = useFilteredData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Product Mapping</h2>
        <div className="text-sm text-gray-500">Map similar products together</div>
      </div>
      
      <ProductMapping
        products={
          filteredData?.flatMap(invoice => 
            invoice.items.map(item => ({
              code: item.productCode,
              description: item.description,
              metrics: {
                totalSpend: item.total,
                quantity: item.quantity,
              },
            }))
          ).filter((item, index, self) => 
            index === self.findIndex(t => t.code === item.code)
          ) || []
        }
        onCreateMapping={(source, target) => {
          console.log('Mapping:', source, 'to', target);
          // TODO: Implement mapping logic in store
        }}
      />
    </div>
  );
};

