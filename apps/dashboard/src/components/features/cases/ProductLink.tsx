import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ExternalLink } from 'lucide-react';

interface ProductLinkProps {
  productCode: string;
  supplierId?: string;
  supplierName?: string;
  className?: string;
}

export const ProductLink: React.FC<ProductLinkProps> = ({
  productCode,
  supplierId,
  supplierName,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleProductClick = () => {
    // Create the product ID in the format expected by the product detail page
    const productId = `${productCode}|${supplierId || 'null'}`;
    const encodedId = encodeURIComponent(productId);
    
    // Navigate to product detail page
    navigate(`/products/${encodedId}`, {
      state: { from: '/cases' }
    });
  };

  return (
    <button
      onClick={handleProductClick}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 
        bg-blue-50 hover:bg-blue-100 
        border border-blue-200 hover:border-blue-300
        rounded-lg text-blue-700 hover:text-blue-800
        text-sm font-medium transition-colors
        group ${className}
      `}
      title={`View product details for ${productCode}`}
    >
      <Package className="h-4 w-4" />
      <span className="truncate max-w-[200px]">
        {productCode}
      </span>
      {supplierName && (
        <span className="text-xs text-blue-600 truncate max-w-[100px]">
          ({supplierName})
        </span>
      )}
      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};
