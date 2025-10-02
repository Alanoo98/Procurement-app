import React, { useState, useMemo } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { usePagination } from '@/hooks/ui/usePagination';
import { Pagination } from '@/components/shared/ui/Pagination';
import { useInvoiceMetrics } from '@/hooks/metrics';
import { useLocations, Location } from '@/hooks/data/useLocations';
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
import { LocationMetric } from '@/hooks/metrics/useLocationMetrics';

export const LocationsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"location" | "total_spend" | "invoice_count" | "supplier_count" | "product_count">("total_spend");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Get all locations for local search functionality
  const { data: allLocations } = useLocations();
  
  // Get all location metrics data
  const { data: allLocationData, isLoading, error } = useInvoiceMetrics('location');

  // Apply local search filtering to the data
  const filteredData = useMemo(() => {
    if (!allLocationData || !searchTerm) return allLocationData;
    
    const term = searchTerm.toLowerCase();
    return allLocationData.filter((location: LocationMetric) => 
      location.label?.toLowerCase().includes(term) ||
      location.address?.toLowerCase().includes(term)
    );
  }, [allLocationData, searchTerm]);







  const { columns, handleColumnResize } = useTableColumns([
    { id: "location", width: 250 },
    { id: "invoice_count", width: 120 },
    { id: "supplier_count", width: 120 },
    { id: "product_count", width: 120 },
    { id: "total_spend", width: 160 },
  ]);


  const filteredSortedLocations = useMemo(() => {
    if (!filteredData) return [];

    const sorted = [...filteredData].sort((a, b) => {
        const valA = sortField === "location" ? a.label : a[sortField];
        const valB = sortField === "location" ? b.label : b[sortField];

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      return sortDirection === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return sorted;
  }, [filteredData, sortField, sortDirection]);

  const getYAxisDomain = (data: LocationMetric[], key: string) => {
    const maxValue = Math.max(...data.map((item) => Math.abs((item[key as keyof LocationMetric] as number) || 0)));
    return [0, maxValue * 1.1];
  };

  const {
    currentPage,
    paginatedItems,
    pageSize,
    goToPage,
    totalItems,
  } = usePagination(filteredSortedLocations);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor location-level procurement metrics
        </p>


      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Spend by Location</h2>
        <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={filteredSortedLocations}
                margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                dataKey="label"
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
                />
                <YAxis
                domain={getYAxisDomain(filteredSortedLocations, "total_spend")}
                tickFormatter={(value) => formatCurrency(value)}
                width={60}
                />
                <Tooltip
                content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                    <div className="bg-white border border-gray-200 shadow-md rounded-md p-3 text-sm">
                        <div className="font-bold text-gray-800">{label}</div>
                        <div className="font-semibold text-gray-800">Total Spend: {formatCurrency(data.total_spend)}</div>
                        <div className="text-gray-600">Products: {data.product_count}</div>
                        <div className="text-gray-600">Suppliers: {data.supplier_count}</div>
                        <div className="text-gray-600">Invoices: {data.invoice_count}</div>
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
            placeholder="Search locations..."
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
                { label: "Location", field: "location" },
                { label: "Invoices", field: "invoice_count" },
                { label: "Suppliers", field: "supplier_count" },
                { label: "Products", field: "product_count" },
                { label: "Total Spend", field: "total_spend" },
              ].map(({ label, field }) => (
                <th
                  key={field}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <button className="flex items-center gap-1"onClick={() => handleSort(field as typeof sortField)}>
                    {label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <TableLoadingState message="Loading locations..." colSpan={5} />
            ) : error ? (
              <TableErrorState message={error.message} colSpan={5} />
            ) : paginatedItems.length === 0 ? (
              <TableEmptyState 
                context="locations"
                suggestion={searchTerm ? "Try adjusting your search terms to find more locations." : "Add your restaurant locations to track location-specific procurement metrics."}
                action={searchTerm ? {
                  label: "Clear search",
                  onClick: () => setSearchTerm('')
                } : undefined}
                colSpan={5}
              />
            ) : (
              paginatedItems.map((loc, index) => (
              <tr key={loc.key ?? `location-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 align-middle">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{loc.label}</span>
                    <span className="text-xs text-gray-400">{loc.address || <span className="italic text-gray-300">No address</span>}</span>
                  </div>
                </td>
                <td className="text-sm text-gray-500">{loc.invoice_count}</td>
                <td className="text-sm text-gray-500">{loc.supplier_count}</td>
                <td className="text-sm text-gray-500">{loc.product_count}</td>
                <td className="text-sm text-gray-500">{formatCurrency(loc.total_spend)}</td>
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
        />
      </div>
    </div>
  );
};

