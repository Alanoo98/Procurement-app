import React, { useState } from 'react';
import {
  DndContext,
  useDroppable,
  useDraggable,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useProductMappingStore } from '@/store/productMappingStore';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Pagination } from './Pagination';
import { usePagination } from '@/hooks/ui';

interface Product {
  code: string;
  description: string;
  metrics?: {
    totalSpend: number;
    quantity: number;
  };
}

interface ProductMappingProps {
  products: Product[];
  onCreateMapping: (source: Product, target: Product) => void;
}

interface DraggableProductProps {
  product: Product;
  getMappedProduct: (code: string) => string | null;
  onRemoveMapping: (code: string) => void;
  getMappedProducts: (code: string) => Array<{ sourceCode: string; description: string }>;
}

const DraggableProduct: React.FC<DraggableProductProps> = ({ 
  product, 
  getMappedProduct, 
  getMappedProducts,
  onRemoveMapping 
}) => {
  const { setNodeRef: dragRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: product.code,
  });
  
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: product.code,
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : undefined,
  };

  // Combine drag and drop refs
  const setRefs = (el: HTMLElement | null) => {
    dragRef(el);
    dropRef(el);
  };

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-4 rounded-lg shadow-sm border flex items-center gap-4 cursor-move transition-colors ${
        isOver ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <GripVertical className="h-5 w-5 text-gray-400" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{product.description}</div>
        <div className="text-sm text-gray-500">{product.code}</div>
        {getMappedProduct(product.code) ? (
          <div className="mt-1 text-xs text-emerald-600">
            <div className="flex items-center gap-2">
              <span>Mapped to: {getMappedProduct(product.code)}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveMapping(product.code);
                }}
                className="p-1 hover:bg-red-100 rounded-full"
              >
                <X className="h-3 w-3 text-red-500" />
              </button>
            </div>
          </div>
        ) : null}
        {getMappedProducts(product.code).length > 0 && (
          <div className="mt-1 text-xs text-emerald-600">
            Mapped from:
            <ul className="ml-2">
              {getMappedProducts(product.code).map(mapping => (
                <li key={mapping.sourceCode}>
                  {mapping.description} ({mapping.sourceCode})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {product.metrics && (
        <div className="text-right text-sm">
          <div className="text-gray-900">Total: {product.metrics.totalSpend}</div>
          <div className="text-gray-500">Qty: {product.metrics.quantity}</div>
        </div>
      )}
    </div>
  );
};

export const ProductMapping: React.FC<ProductMappingProps> = ({
  products,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { addMapping, removeMapping, getMappedProduct, getMappedProducts, resetMappings } = useProductMappingStore();
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const product = products.find(p => p.code === event.active.id);
    if (product) {
      setActiveProduct(product);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const source = products.find(p => p.code === event.active.id);
    const target = products.find(p => p.code === event.over?.id);

    if (source && target && source !== target && event.over?.id) {
      if (confirm(`Are you sure you want to map "${source.description}" to "${target.description}"?`)) {
        addMapping(source.code, target.code);
        toast.success('Products mapped successfully');
      }
    }

    setActiveProduct(null);
  };

  const handleRemoveMapping = (code: string) => {
    if (confirm('Are you sure you want to remove this mapping?')) {
      removeMapping(code);
      toast.success('Mapping removed successfully');
    }
  };

  const handleResetAll = () => {
    setShowResetConfirm(true);
  };

  const confirmResetAll = () => {
    resetMappings();
    setShowResetConfirm(false);
    toast.success('All mappings have been reset');
  };

  const filteredProducts = products.filter(product =>
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    currentPage,
    paginatedItems: paginatedProducts,
    pageSize,
    goToPage,
    totalItems,
  } = usePagination(filteredProducts, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
        />
        <button
          onClick={handleResetAll}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Reset All Mappings
        </button>
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <div>
            <h4 className="text-sm font-medium text-amber-800">How to map products:</h4>
            <ol className="mt-2 text-sm text-amber-700 space-y-1">
              <li>1. Drag a product onto another product to create a mapping</li>
              <li>2. The products will be consolidated in analytics and efficiency views</li>
              <li>3. Both product codes will be preserved for reference</li>
              <li>4. Metrics will be combined for mapped products</li>
            </ol>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-2">
          {paginatedProducts.map((product) => (
            <DraggableProduct
              key={product.code}
              product={product}
              getMappedProduct={getMappedProduct}
              onRemoveMapping={handleRemoveMapping}
              getMappedProducts={getMappedProducts}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProduct && (
            <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-emerald-500 flex items-center gap-4">
              <GripVertical className="h-5 w-5 text-emerald-500" />
              <div>
                <div className="font-medium text-gray-900">{activeProduct.description}</div>
                <div className="text-sm text-gray-500">{activeProduct.code}</div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={goToPage}
        />
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reset All Mappings</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to reset all product mappings? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


