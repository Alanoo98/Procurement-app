import React, { useMemo, useState, useEffect } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { usePagination } from '@/hooks/ui/usePagination';
import { Pagination } from '@/components/shared/ui/Pagination';
import { useSuppliers } from '@/hooks/metrics/useSuppliers';
import { useTableColumns } from '@/hooks/ui/useTableColumns';
import { formatCurrency } from '@/utils/format';
import { TableEmptyState, TableLoadingState, TableErrorState } from '@/components/shared/ui/EmptyStates';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Suppliers: React.FC = () => {
  const { data, isLoading, error } = useSuppliers();
  const [localData, setLocalData] = useState<typeof data>([]);

  // Update local data when data changes
  useEffect(() => {
    setLocalData(data || []);
  }, [data]);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"name" | "total_spend">("total_spend");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { columns, handleColumnResize } = useTableColumns([
    { id: "name", width: 280 },
    { id: "invoice_count", width: 100 },
    { id: "total_spend", width: 100 },
    { id: "top_products", width: 300 },
  ]);

  const filteredSorted = useMemo(() => {
    if (!localData) return [];

    const term = searchTerm.toLowerCase();
    const filtered = data.filter(
      (s) =>
        s.name?.toLowerCase().includes(term) ||
        s.address?.toLowerCase().includes(term) ||
        s.top_products?.toLowerCase().includes(term)
    );

    filtered.sort((a, b) => {
      const valA = a[sortField] ?? "";
      const valB = b[sortField] ?? "";

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      return sortDirection === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return filtered;
  }, [data, localData, searchTerm, sortField, sortDirection]);

  const { currentPage, paginatedItems, pageSize, goToPage, changePageSize, totalItems } =
    usePagination(filteredSorted);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getYAxisDomain = (data: Array<{ [key: string]: unknown }>, key: string) => {
    const maxValue = Math.max(...data.map((item) => Math.abs(Number(item[key]) || 0)));
    return [0, maxValue * 1.1];
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <p className="mt-1 text-sm text-gray-500">
          View procurement metrics by supplier
        </p>
        
        {/* Helpful notice for unmapped suppliers */}
        {localData?.some((s) => s.name.includes('[Unmapped Supplier')) && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Unmapped Suppliers Detected
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    Some suppliers in your invoice data haven't been mapped to the suppliers table yet. 
                    These appear as "[Unmapped Supplier]" in the list below.
                  </p>
                  <p className="mt-1">
                    To fix this, go to{" "}
                    <button
                      onClick={() => navigate('/settings')}
                      className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors"
                    >
                      Settings → Pending Suppliers
                    </button>{" "}
                    to add these suppliers or map existing invoice data to the correct suppliers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Spend by Supplier</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredSorted}
              margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis
                domain={getYAxisDomain(filteredSorted, "total_spend")}
                tickFormatter={(value) => formatCurrency(value)}
                width={60}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const s = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 shadow-md rounded-md p-3 text-sm">
                      <div className="font-bold text-gray-800">{label}</div>
                      <div className="font-semibold text-gray-600">Total Spend: {formatCurrency(s.total_spend)}</div>
                      <div className="text-gray-600">Invoices: {s.invoice_count}</div>
                      <div className="text-gray-600">
                        Top Products:
                        {s.top_products ? (
                          <ul className="mt-1 ml-2 list-decimal text-sm text-gray-600">
                            {s.top_products.split(',').map((product: string, index: number) => (
                              <li key={index}>{product.trim()}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="italic text-gray-400 ml-1">No data</span>
                        )}
                      </div>

                    </div>
                  );
                }}
              />
              <Bar dataKey="total_spend" fill="#059669" name="Total Spend" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-96 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <ResizableTable
          columns={columns}
          onColumnResize={handleColumnResize}
          className="min-w-full divide-y divide-gray-200"
        >
          <thead className="bg-gray-50">
            <tr>
              {[ 
                { label: "Supplier", field: "name" },
                { label: "Invoices", field: "invoice_count" },
                { label: "Total Spend", field: "total_spend" },
                { label: "Top Products", field: "top_products" },
              ].map(({ label, field }) => (
                <th
                  key={field}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <button className="flex items-center gap-1" onClick={() => handleSort(field as "name" | "total_spend")}>
                    {label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <TableLoadingState message="Loading suppliers..." colSpan={4} />
            ) : error ? (
              <TableErrorState message={error.message} colSpan={4} />
            ) : paginatedItems.length === 0 ? (
              <TableEmptyState 
                context="suppliers"
                suggestion={searchTerm ? "Try adjusting your search terms to find more suppliers." : "Import invoice data to see your supplier relationships and spending patterns."}
                action={searchTerm ? {
                  label: "Clear search",
                  onClick: () => setSearchTerm('')
                } : undefined}
                colSpan={4}
              />
            ) : (
              paginatedItems.map((s) => (
              <tr key={s.supplier_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 align-middle">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                    <span className="text-xs text-gray-400">{s.address || <span className="italic text-gray-300">No address</span>}</span>
                  </div>
                </td>
                <td className="text-sm text-gray-500">{s.invoice_count}</td>
                <td className="text-sm text-gray-500">{formatCurrency(s.total_spend)}</td>
                <td className="text-sm text-gray-500 align-top px-6 py-4">
                  {s.top_products ? (
                    <ul className="flex flex-col gap-1">
                       {s.top_products.replace(/\r?\n+/g, ' ').split(',').map((product, index) => (
                        <li key={index} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="font-semibold text-gray-800 w-5 flex-shrink-0">{index + 1}.</span>
                           <span className="truncate">{product.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="italic text-gray-300">No data</span>
                  )}
                </td>
              </tr>
            ))
            )}
          </tbody>
        </ResizableTable>

        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      </div>
    </div>
  );
};

