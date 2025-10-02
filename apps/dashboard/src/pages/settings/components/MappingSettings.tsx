import React, { useState, useMemo } from "react";
import { useMappings } from '@/hooks/utils/useMappings';
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { useTableColumns } from '@/hooks/ui/useTableColumns';
import { format } from "date-fns";
import { ArrowUpDown } from "lucide-react";
import { usePagination } from '@/hooks/ui/usePagination';
import { Pagination } from '@/components/shared/ui/Pagination';

export const MappingSettings: React.FC = () => {
  const [type, setType] = useState<"location" | "supplier">("location");
  const { data, isLoading } = useMappings(type);

  const [sortField, setSortField] = useState<"variant_name" | "mapped_name" | "created_at">("variant_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { columns, handleColumnResize } = useTableColumns([
    { id: "variant", width: 300 },
    { id: "mappedTo", width: 300 },
    { id: "created", width: 150 },
  ]);

  const sortedData = useMemo(() => {
    if (!data) return [];

    return [...data].sort((a, b) => {
      const aVal = (a[sortField] ?? "").toLowerCase?.() || "";
      const bVal = (b[sortField] ?? "").toLowerCase?.() || "";
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [data, sortField, sortDirection]);

  const {
    currentPage,
    paginatedItems,
    pageSize,
    goToPage,
    totalItems,
  } = usePagination(sortedData);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div>
      {/* Toggle Buttons */}
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => setType("location")}
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            type === "location" ? "bg-emerald-100 text-emerald-700" : "text-gray-500"
          }`}
        >
          Location Mappings
        </button>
        <button
          onClick={() => setType("supplier")}
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            type === "supplier" ? "bg-emerald-100 text-emerald-700" : "text-gray-500"
          }`}
        >
          Supplier Mappings
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <ResizableTable columns={columns} onColumnResize={handleColumnResize}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                  <button onClick={() => handleSort("variant_name")} className="flex items-center gap-1">
                    Variant Name <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                  <button onClick={() => handleSort("mapped_name")} className="flex items-center gap-1">
                    Mapped To <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                  <button onClick={() => handleSort("created_at")} className="flex items-center gap-1">
                    Created At <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-sm text-gray-500">
                    No mappings found.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((row: any) => {
                  const created = row.created_at
                    ? format(new Date(row.created_at), "yyyy-MM-dd")
                    : "—";

                  const mappedTo = row.mapped_name || "—";
                  const mappedAddress = row.mapped_address || null;

                  const variant = row.variant_name || row.variant_receiver_name || "—";
                  const variantAddress =
                    type === "location"
                      ? row.variant_address || row.variant_receiver_address
                      : row.variant_address;

                  return (
                    <tr key={row.mapping_id}>
                      <td className="text-sm px-4 py-2">
                        <div>{variant}</div>
                        {variantAddress && (
                          <div className="text-xs text-gray-400">{variantAddress}</div>
                        )}
                      </td>
                      <td className="text-sm px-4 py-2">
                        <div>{mappedTo}</div>
                        {mappedAddress && (
                          <div className="text-xs text-gray-400">{mappedAddress}</div>
                        )}
                      </td>
                      <td className="text-sm px-4 py-2 text-gray-500">{created}</td>
                    </tr>
                  );
                })
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

