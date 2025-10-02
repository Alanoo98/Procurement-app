import React, { useState, useEffect } from "react";
import { usePendingMappings } from '@/hooks/utils/usePendingMappings';   
import { ResizableTable } from '@/components/shared/ui/ResizableTable';
import { useTableColumns } from '@/hooks/ui/useTableColumns';
import { resolvePendingMapping } from '@/hooks/utils/useResolvePendingMapping';
import { ResolveModal } from "./ResolveModal";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';

export const PendingMappingsSettings: React.FC = () => {
  const [type, setType] = useState<"location" | "supplier">("location");
  const { data, isLoading } = usePendingMappings(type);
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [rowToResolve, setRowToResolve] = useState<any>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false); // NEW
  const [suggestedMatches, setSuggestedMatches] = useState<Record<string, any>>({});

  const { columns, handleColumnResize } = useTableColumns([
    { id: "variant", width: 300 },
    { id: "suggestion", width: 300 },
    { id: "action", width: 150 },
  ]);

  // Calculate actual suggested matches for display
  useEffect(() => {
    if (!data) return;

    const calculateSuggestions = async () => {
      if (type === "supplier") {
        const { data: suppliers } = await supabase
          .from("suppliers")
          .select("supplier_id, name, address, tax_id");

        if (!suppliers) return;

        const matches: Record<string, any> = {};
        
        data.forEach((row: any) => {
          const variantName = row.variant_supplier_name?.toLowerCase().trim() ?? "";
          const variantAddress = row.variant_address?.toLowerCase().trim() ?? "";
          const variantTaxId = (row.variant_tax_id ?? "").toLowerCase().trim();

          const match = suppliers.find((s) => {
            const nameMatch = s.name?.toLowerCase().trim() === variantName;
            const addressMatch = (s.address ?? "").toLowerCase().trim() === variantAddress;
            const taxMatch = (s.tax_id ?? "").toLowerCase().trim() === variantTaxId;
            return nameMatch && (addressMatch || taxMatch);
          });

          if (match) {
            matches[row.id] = match;
          }
        });

        setSuggestedMatches(matches);
      } else if (type === "location") {
        // Fetch existing location mappings to see what's already mapped
        const { data: existingMappings } = await supabase
          .from("location_mappings")
          .select(`
            mapping_id,
            location_id,
            variant_name,
            variant_address,
            variant_receiver_name,
            locations (
              location_id,
              name,
              address
            )
          `);

        if (!existingMappings) return;

        console.log("Existing location mappings count:", existingMappings.length);
        console.log("Pending locations count:", data?.length);
        
        // Debug: Show the first pending location's field names
        if (data && data.length > 0) {
          console.log("First pending location fields:", Object.keys(data[0]));
          console.log("First pending location data:", data[0]);
        }

        const matches: Record<string, any> = {};
        
        data.forEach((row: any) => {
          const variantName = row.variant_receiver_name?.toLowerCase().trim() ?? "";
          const variantAddress = row.variant_address?.toLowerCase().trim() ?? "";

          // Normalize text for comparison (remove accents, extra spaces)
          const normalizeText = (text: string) => {
            return text
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove accents
              .replace(/\s+/g, ' ') // Normalize all whitespace (including newlines) to single spaces
              .trim();
          };
          
          const normalizedVariantName = normalizeText(variantName);
          const normalizedVariantAddress = normalizeText(variantAddress);

          // Find the best matching existing mapping
          let bestMatch = null;
          let bestScore = 0;

          existingMappings.forEach((mapping: any) => {
            const mappingName = mapping.variant_receiver_name?.toLowerCase().trim() ?? 
                               mapping.variant_name?.toLowerCase().trim() ?? "";
            const mappingAddress = mapping.variant_address?.toLowerCase().trim() ?? "";
            
            const normalizedMappingName = normalizeText(mappingName);
            const normalizedMappingAddress = normalizeText(mappingAddress);
            
            // Calculate similarity scores
            let nameScore = 0;
            let addressScore = 0;
            
            // Name matching (exact, contains, or fuzzy)
            if (normalizedVariantName === normalizedMappingName) {
              nameScore = 1.0; // Exact match
            } else if (normalizedVariantName.includes(normalizedMappingName) || 
                      normalizedMappingName.includes(normalizedVariantName)) {
              nameScore = 0.8; // Contains match
            } else if (normalizedVariantName.length > 3 && normalizedMappingName.length > 3) {
              // Simple fuzzy matching for longer names
              const commonChars = [...normalizedVariantName].filter(char => 
                normalizedMappingName.includes(char)
              ).length;
              nameScore = commonChars / Math.max(normalizedVariantName.length, normalizedMappingName.length);
            }
            
            // Address matching (exact, contains, or fuzzy)
            if (normalizedVariantAddress === normalizedMappingAddress) {
              addressScore = 1.0; // Exact match
            } else if (normalizedVariantAddress.includes(normalizedMappingAddress) || 
                      normalizedMappingAddress.includes(normalizedVariantAddress)) {
              addressScore = 0.8; // Contains match
            } else if (normalizedVariantAddress.length > 5 && normalizedMappingAddress.length > 5) {
              // Simple fuzzy matching for longer addresses
              const commonChars = [...normalizedVariantAddress].filter(char => 
                normalizedMappingAddress.includes(char)
              ).length;
              addressScore = commonChars / Math.max(normalizedVariantAddress.length, normalizedMappingAddress.length);
            }
            
            // Combined score (weight name more than address)
            const combinedScore = (nameScore * 0.7) + (addressScore * 0.3);
            
            if (combinedScore > bestScore && combinedScore > 0.3) { // Minimum threshold
              bestScore = combinedScore;
              bestMatch = {
                ...mapping.locations,
                mapping_id: mapping.mapping_id,
                similarity_score: combinedScore,
                match_type: nameScore > 0.8 ? 'name' : addressScore > 0.8 ? 'address' : 'fuzzy'
              };
            }
          });

          if (bestMatch) {
            console.log(`Found mapping match for "${variantName}": "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`);
            matches[row.id] = bestMatch;
          } else {
            console.log(`No good mapping match found for "${variantName}" - needs new mapping`);
          }
        });

        console.log("Final matches count:", Object.keys(matches).length);
        setSuggestedMatches(matches);
      }
    };

    calculateSuggestions();
  }, [data, type]);

  const toggleRow = (row: any) => {
    setSelectedRows((prev) =>
      prev.some((r) => r.id === row.id)
        ? prev.filter((r) => r.id !== row.id)
        : [...prev, row]
    );
  };

  const toggleSelectAll = () => {
    if (!data) return;
    const allSelected = selectedRows.length === data.length;
    setSelectedRows(allSelected ? [] : [...data]);
  };

  const isRowSelected = (row: any) => selectedRows.some((r) => r.id === row.id);
  const isAllSelected = data && data.length > 0 && selectedRows.length === data.length;

  const handleResolveSingle = (row: any) => {
    setRowToResolve(row);
    setModalOpen(true);
  };

  const handleConfirm = async (selectedId: string | { name: string; address?: string }) => {
    const rows = rowToResolve ? [rowToResolve] : selectedRows;

    for (const row of rows) {
      await resolvePendingMapping({
        type,
        pendingRow: row,
        targetId: selectedId,
      });
    }

    setModalOpen(false);
    setRowToResolve(null);
    setSelectedRows([]);
    queryClient.invalidateQueries({ queryKey: ["pending_mappings", type] });
    queryClient.invalidateQueries({ queryKey: ["mappings", type] });
    // Invalidate suppliers and locations queries to refresh suggested matches
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    queryClient.invalidateQueries({ queryKey: ["locations"] });
  };

  const handleAutoResolveAllSuppliers = async () => {
    setConfirmBulkOpen(false); // close modal
    const suppliers = await supabase
      .from("suppliers")
      .select("supplier_id, name, address, tax_id");

    if (!suppliers.data) {
      toast.error("Could not fetch existing suppliers.");
      return;
    }

    let addedCount = 0;

    for (const row of data ?? []) {
      const name = row.variant_supplier_name?.trim().toLowerCase();
      const address = (row.variant_address ?? "").trim().toLowerCase();
      const taxId = (row.variant_tax_id ?? "").trim();

      const exists = suppliers.data.some((s) => {
        const nameMatch = s.name.trim().toLowerCase() === name;
        const addressMatch = (s.address ?? "").trim().toLowerCase() === address;
        const taxIdMatch = (s.tax_id ?? "").trim() === taxId;
        return nameMatch && (addressMatch || taxIdMatch);
      });

      if (exists) continue;

      const { data: inserted, error } = await supabase
        .from("suppliers")
        .insert({
          name: row.variant_supplier_name,
          address: row.variant_address || null,
          tax_id: row.variant_tax_id || null,
        })
        .select("supplier_id")
        .single();

      if (inserted && !error) {
        await resolvePendingMapping({
          type: "supplier",
          pendingRow: row,
          targetId: inserted.supplier_id,
        });
        addedCount++;
      }
    }

    toast.success(`${addedCount} supplier${addedCount !== 1 ? "s" : ""} added and resolved.`);
    queryClient.invalidateQueries({ queryKey: ["pending_mappings", "supplier"] });
    queryClient.invalidateQueries({ queryKey: ["mappings", "supplier"] });
    // Invalidate suppliers query to refresh suggested matches
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    setSelectedRows([]);
  };

  const handleAutoResolveAllLocations = async () => {
    setConfirmBulkOpen(false); // close modal
    
    let resolvedCount = 0;
    let skippedCount = 0;

    for (const row of data ?? []) {
      const suggestedMatch = suggestedMatches[row.id];
      
      // Only resolve if we have a good suggested match (similarity score > 0.5)
      if (suggestedMatch && suggestedMatch.similarity_score > 0.5) {
        try {
          await resolvePendingMapping({
            type: "location",
            pendingRow: row,
            targetId: suggestedMatch.location_id,
          });
          resolvedCount++;
        } catch (error) {
          console.error(`Failed to resolve ${row.variant_receiver_name}:`, error);
          skippedCount++;
        }
      } else {
        skippedCount++;
        console.log(`Skipping ${row.variant_receiver_name} - no good match found (score: ${suggestedMatch?.similarity_score || 0})`);
      }
    }

    if (resolvedCount > 0) {
      toast.success(`${resolvedCount} location${resolvedCount !== 1 ? "s" : ""} auto-resolved.`);
    }
    
    if (skippedCount > 0) {
      toast.info(`${skippedCount} location${skippedCount !== 1 ? "s" : ""} skipped - no good matches found.`);
    }
    
    queryClient.invalidateQueries({ queryKey: ["pending_mappings", "location"] });
    queryClient.invalidateQueries({ queryKey: ["mappings", "location"] });
    // Invalidate locations query to refresh suggested matches
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    setSelectedRows([]);
  };

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => {
            setSelectedRows([]);
            setType("location");
          }}
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            type === "location" ? "bg-emerald-100 text-emerald-700" : "text-gray-500"
          }`}
        >
          Pending Locations
        </button>
        <button
          onClick={() => {
            setSelectedRows([]);
            setType("supplier");
          }}
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            type === "supplier" ? "bg-emerald-100 text-emerald-700" : "text-gray-500"
          }`}
        >
          Pending Suppliers
        </button>
      </div>

      {/* Action Buttons */}
      {(selectedRows.length > 0 || (type === "supplier" && (data?.length ?? 0) > 0) || (type === "location" && (data?.length ?? 0) > 0)) && (
        <div className="flex items-center gap-3 mb-4">
            {selectedRows.length > 0 && (
            <button
                onClick={() => {
                // ✅ Set the first row as fallback so modal has data
                setRowToResolve(selectedRows[0]);
                setModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs rounded-md"
            >
                Resolve {selectedRows.length} Selected
            </button>
            )}
          {type === "supplier" && (data?.length ?? 0) > 0 && (
            <button
              onClick={() => setConfirmBulkOpen(true)}
              className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 text-xs rounded-md border border-emerald-200"
            >
              Auto-Resolve All Unique Suppliers
            </button>
          )}
          {type === "location" && (data?.length ?? 0) > 0 && (
            <button
              onClick={() => setConfirmBulkOpen(true)}
              className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 text-xs rounded-md border border-emerald-200"
            >
              Auto-Resolve Matched Locations
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <ResizableTable columns={columns} onColumnResize={handleColumnResize}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                <input
                  type="checkbox"
                  checked={!isAllSelected}
                  onChange={toggleSelectAll}
                />{" "}
                Variant
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                Suggested Match
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                Action
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
            ) : data?.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-sm text-gray-500">
                  No pending {type === "location" ? "locations" : "suppliers"} to resolve.
                </td>
              </tr>
            ) : (
              data?.map((row: any) => (
                <tr key={row.id}>
                  <td className="text-sm px-4 py-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isRowSelected(row)}
                        onChange={() => toggleRow(row)}
                      />
                      <span>
                        {type === "location"
                          ? row.variant_receiver_name
                          : row.variant_supplier_name}
                        <div className="text-xs text-gray-400">{row.variant_address}</div>
                      </span>
                    </label>
                  </td>
                  <td className="text-sm px-4 py-2">
                    {type === "location"
                      ? suggestedMatches[row.id]?.name || row.suggested_location_id || "—"
                      : suggestedMatches[row.id]?.name || row.suppliers?.name || "—"}
                  </td>
                  <td className="text-sm px-4 py-2">
                    <button
                      onClick={() => handleResolveSingle(row)}
                      className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
                    >
                      Resolve
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </ResizableTable>
      </div>

      <ResolveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        type={type}
        pendingRow={rowToResolve}
      />

      {/* Custom Confirmation Modal */}
      {confirmBulkOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold mb-3">Confirm Auto-Resolve</h2>
            <p className="text-sm text-gray-600 mb-6">
              {type === "supplier" 
                ? "Are you sure you want to automatically create and resolve all unique suppliers? This action cannot be undone."
                : "Are you sure you want to automatically resolve all locations that have good suggested matches? Items without good matches will be skipped."
              }
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmBulkOpen(false)}
                className="px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={type === "supplier" ? handleAutoResolveAllSuppliers : handleAutoResolveAllLocations}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};