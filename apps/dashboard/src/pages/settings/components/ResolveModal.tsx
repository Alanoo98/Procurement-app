import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";

interface ResolveModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedId: string) => void;
  type: "location" | "supplier";
  pendingRow?: any;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({
  open,
  onClose,
  onConfirm,
  type,
  pendingRow,
}) => {
  const [options, setOptions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newSupplierName, setNewSupplierName] = useState<string>("");
  const [newSupplierAddress, setNewSupplierAddress] = useState<string>("");
  const [newSupplierTaxId, setNewSupplierTaxId] = useState<string>("");

  // 1. Fetch existing supplier or location options when modal opens
  useEffect(() => {
    if (!open) return;

    const fetchOptions = async () => {
      if (type === "location") {
        // For locations, fetch existing location mappings to see what's already mapped
        const { data, error } = await supabase
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
        
        if (!error && data) {
          // Transform to unique locations with their mapping info
          const locationMap = new Map();
          data.forEach((mapping: any) => {
            const location = mapping.locations;
            if (location && !locationMap.has(location.location_id)) {
              locationMap.set(location.location_id, {
                ...location,
                mapping_id: mapping.mapping_id,
                variant_name: mapping.variant_name,
                variant_address: mapping.variant_address,
                variant_receiver_name: mapping.variant_receiver_name
              });
            }
          });
          
          const sorted = Array.from(locationMap.values()).sort((a: any, b: any) =>
            a.name.localeCompare(b.name)
          );
          setOptions(sorted);
        }
      } else {
        // For suppliers, fetch from suppliers table
        const { data, error } = await supabase
          .from("suppliers")
          .select("name,supplier_id,address,tax_id");
        
        if (!error && data) {
          const sorted = data.sort((a: any, b: any) =>
            a.name.localeCompare(b.name)
          );
          setOptions(sorted);
        }
      }
    };

    fetchOptions();
  }, [open, type, pendingRow?.id]); // Add pendingRow.id to refetch when resolving different items

  // 2. Autofill input fields from the pending row (no matching logic)
  useEffect(() => {
    if (!open || !pendingRow) return;

    if (type === "supplier") {
      setNewSupplierName(pendingRow.variant_supplier_name ?? "");
      setNewSupplierAddress(pendingRow.variant_address ?? "");
      setNewSupplierTaxId(pendingRow.variant_tax_id ?? "");
    } else if (type === "location") {
      setNewSupplierName(pendingRow.variant_receiver_name ?? "");
      setNewSupplierAddress(pendingRow.variant_address ?? "");
    }
    setSelectedId(null); // Don't preselect anything
  }, [open, type, pendingRow]);

  useEffect(() => {
    if (
      !open ||
      type !== "supplier" ||
      !pendingRow ||
      options.length === 0
    )
      return;

    const variantName = pendingRow.variant_supplier_name?.toLowerCase().trim() ?? "";
    const variantAddress = pendingRow.variant_address?.toLowerCase().trim() ?? "";
    const variantTaxId = (pendingRow.variant_tax_id ?? "").toLowerCase().trim();

    const match = options.find((s) => {
      const nameMatch = s.name?.toLowerCase().trim() === variantName;
      const addressMatch = (s.address ?? "").toLowerCase().trim() === variantAddress;
      const taxMatch = (s.tax_id ?? "").toLowerCase().trim() === variantTaxId;
      return nameMatch && (addressMatch || taxMatch);
    });

    if (match) {
      setSelectedId(match.supplier_id);
    }
  }, [open, type, pendingRow, options]);

  // Add matching logic for locations
  useEffect(() => {
    if (
      !open ||
      type !== "location" ||
      !pendingRow ||
      options.length === 0
    )
      return;

    const variantName = pendingRow.variant_receiver_name?.toLowerCase().trim() ?? "";
    const variantAddress = pendingRow.variant_address?.toLowerCase().trim() ?? "";

    // Normalize text for comparison (same logic as in PendingMappingsSettings)
    const normalizeText = (text: string) => {
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, ' ') // Normalize all whitespace
        .trim();
    };

    const normalizedVariantName = normalizeText(variantName);
    const normalizedVariantAddress = normalizeText(variantAddress);

    console.log(`Looking for location match: "${variantName}" at "${variantAddress}"`);
    console.log(`Normalized: "${normalizedVariantName}" at "${normalizedVariantAddress}"`);

    const match = options.find((l) => {
      const locationName = l.name?.toLowerCase().trim() ?? "";
      const locationAddress = (l.address ?? "").toLowerCase().trim();
      
      const normalizedLocationName = normalizeText(locationName);
      const normalizedLocationAddress = normalizeText(locationAddress);
      
      console.log(`Comparing with: "${locationName}" at "${locationAddress}"`);
      console.log(`Normalized: "${normalizedLocationName}" at "${normalizedLocationAddress}"`);
      
      // Check for name similarity (allowing for minor variations)
      const nameMatch = normalizedVariantName === normalizedLocationName ||
                       normalizedVariantName.includes(normalizedLocationName) ||
                       normalizedLocationName.includes(normalizedVariantName);
      
      // If the existing location has no address, only check name match
      if (!locationAddress) {
        if (nameMatch) {
          console.log(`✅ Found location match by name only: "${locationName}" (no address)`);
        }
        return nameMatch;
      }
      
      // If both have addresses, check both name and address
      const addressMatch = normalizedVariantAddress === normalizedLocationAddress ||
                          normalizedVariantAddress.includes(normalizedLocationAddress) ||
                          normalizedLocationAddress.includes(normalizedVariantAddress);
      
      if (nameMatch && addressMatch) {
        console.log(`✅ Found location match: "${locationName}" at "${locationAddress}"`);
      }
      
      return nameMatch && addressMatch;
    });

    if (match) {
      setSelectedId(match.location_id);
    }
  }, [open, type, pendingRow, options]);

  const handleAddSupplier = async () => {
    if (!newSupplierName) return;

    const isDuplicate = options.some((s) => {
      const nameMatch = s.name.trim().toLowerCase() === newSupplierName.trim().toLowerCase();
      const addressMatch = (s.address ?? "").trim().toLowerCase() === newSupplierAddress.trim().toLowerCase();
      const taxIdMatch = (s.tax_id ?? "").trim() === newSupplierTaxId.trim();
      return nameMatch && (addressMatch || taxIdMatch);
    });

    if (isDuplicate) {
      toast.error("A supplier with the same name and address or tax ID already exists.");
      return;
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name: newSupplierName,
        address: newSupplierAddress || null,
        tax_id: newSupplierTaxId || null,
      })
      .select("supplier_id, name, address, tax_id")
      .single();

    if (error || !data) {
      toast.error("Failed to add supplier.");
      return;
    }

    toast.success("Supplier added and resolved.");

    // Update options, reset inputs
    setOptions((prev) => [...prev, data]);
    setSelectedId(null);
    setNewSupplierName("");
    setNewSupplierAddress("");
    setNewSupplierTaxId("");

    // Immediately resolve the pending row
    onConfirm(data.supplier_id); // This triggers the resolution logic
    onClose(); // Close the modal
  };
  
  return open ? (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Resolve Pending {type}s</h2>

        <select
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
          value={selectedId || ""}
        >
          <option value="">Select a {type}</option>
          {options.map((opt) => (
            <option
              key={opt.location_id || opt.supplier_id}
              value={opt.location_id || opt.supplier_id}
            >
              {opt.name}
            </option>
          ))}
        </select>

        {type === "supplier" && (
          <div className="mb-4 border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Add New Supplier</h3>
            <input
              type="text"
              placeholder="Name *"
              value={newSupplierName ?? ""}
              onChange={(e) => setNewSupplierName(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-2"
            />
            <input
              type="text"
              placeholder="Address (optional)"
              value={newSupplierAddress ?? ""}
              onChange={(e) => setNewSupplierAddress(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-2"
            />
            <input
              type="text"
              placeholder="Tax ID (optional)"
              value={newSupplierTaxId ?? ""}
              onChange={(e) => setNewSupplierTaxId(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-2"
            />
            <button
              onClick={handleAddSupplier}
              disabled={!newSupplierName}
              className="bg-emerald-500 text-white px-3 py-2 text-sm rounded w-full"
            >
              Add Supplier
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-gray-500 text-sm">
            Cancel
          </button>
          <button
            disabled={!selectedId}
            onClick={() => onConfirm(selectedId!)}
            className="bg-emerald-600 text-white px-4 py-2 rounded text-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

