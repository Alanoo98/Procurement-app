import React from 'react';
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { Eye, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/format';
import { useTableColumns } from '@/hooks/ui/useTableColumns';

type Opportunity = {
  description: string;
  productCode: string;
  supplier: string;
  spend: number;
  transactions: number;
  avgPrice: number;
  unitType: string;
};

type OpportunitiesTableProps = {
  data: Opportunity[];
  onSort: (field: string) => void;
  sortField: string;
  sortDirection: string;
  onViewProduct: (productCode: string, supplier: string) => void;
};

export const OpportunitiesTable: React.FC<OpportunitiesTableProps> = ({
  data,
  onSort,
  onViewProduct,
}) => {
  const navigate = useNavigate();

  const { columns, handleColumnResize } = useTableColumns([
    { id: 'product', width: 300 },
    { id: 'productCode', width: 150 },
    { id: 'supplier', width: 200 },
    { id: 'spend', width: 150 },
    { id: 'transactions', width: 120 },
    { id: 'actions', width: 100 },
  ]);

  const headers = [
    { label: 'Product', field: 'description', sortable: true },
    { label: 'Product Code', field: 'productCode', sortable: true },
    { label: 'Supplier', field: 'supplier', sortable: true },
    { label: 'Spend', field: 'spend', sortable: true },
    { label: 'Transactions', field: 'transactions', sortable: true },
    { label: '', field: 'actions', sortable: false },
  ];

  return (
    <ResizableTable columns={columns} onColumnResize={handleColumnResize}>
      <thead className="bg-gray-50">
        <tr>
          {headers.map(({ label, field, sortable }) => (
            <th
              key={field}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {sortable ? (
                <button
                  className="flex items-center gap-1"
                  onClick={() => onSort(field)}
                >
                  {label}
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              ) : (
                label
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((product, index) => (
          <tr
            key={index}
            className="hover:bg-gray-50 cursor-pointer"
            onClick={() => navigate(`/products/${encodeURIComponent(`${product.productCode}|${product.supplier}`)}`)}
          >
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {product.description}
                  </div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {product.productCode}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {product.supplier}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">
                {formatCurrency(product.spend)}
              </div>
              <div className="text-xs text-gray-500">
                Avg. {formatCurrency(product.avgPrice)}/{product.unitType}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {product.transactions}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProduct(product.productCode, product.supplier);
                }}
                className="text-emerald-600 hover:text-emerald-700"
              >
                <Eye className="h-5 w-5" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </ResizableTable>
  );
};

