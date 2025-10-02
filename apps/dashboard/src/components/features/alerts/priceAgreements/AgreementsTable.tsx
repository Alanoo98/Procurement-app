import React from 'react';
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { Eye, Handshake, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/format';
import { useTableColumns } from '@/hooks/useTableColumns';
// import { getPriceValue } from '@/utils/getPriceValue';

type Agreement = {
  id: string;
  description: string;
  productCode: string;
  unitType: string;
  unitSubtype?: string;
  price: number;
  totalSpend: number;
  supplier: string;
};

type AgreementsTableProps = {
  data: Agreement[];
  onSort: (field: string) => void;
  sortField: string;
  sortDirection: string;
  hasProductHistory: (productCode: string, supplier: string) => boolean;
};

export const AgreementsTable: React.FC<AgreementsTableProps> = ({
  data,
  onSort,
  // sortField,
  // sortDirection,
  hasProductHistory,
}) => {
  const navigate = useNavigate();

  const { columns, handleColumnResize } = useTableColumns([
    { id: 'product', width: 300 },
    { id: 'productCode', width: 150 },
    { id: 'unitType', width: 150 },
    { id: 'price', width: 150 },
    { id: 'totalSpend', width: 150 },
    { id: 'supplier', width: 200 },
    { id: 'actions', width: 100 },
  ]);

  const headers = [
    { label: 'Product', field: 'description', sortable: true },
    { label: 'Product Code', field: 'productCode', sortable: true },
    { label: 'Unit Type', field: 'unitType', sortable: true },
    { label: 'Price', field: 'price', sortable: true },
    { label: 'Total Spend', field: 'totalSpend', sortable: true },
    { label: 'Supplier', field: 'supplier', sortable: true },
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
        {data.map((agreement) => {
          const hasPurchases = hasProductHistory(agreement.productCode, agreement.supplier);
          return (
            <tr
              key={agreement.id}
              className={`hover:bg-gray-50 ${hasPurchases ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (hasPurchases) {
                  navigate(`/products/${encodeURIComponent(`${agreement.productCode}|${agreement.supplier}`)}`);
                }
              }}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Handshake className="h-5 w-5 text-emerald-500 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {agreement.description}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {agreement.productCode}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {agreement.unitType}
                {agreement.unitSubtype && (
                  <span className="text-gray-500 ml-1">({agreement.unitSubtype})</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(agreement.price)}/{agreement.unitType}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(agreement.totalSpend)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {agreement.supplier}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {hasPurchases && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/products/${encodeURIComponent(`${agreement.productCode}|${agreement.supplier}`)}`);
                    }}
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </ResizableTable>
  );
};

