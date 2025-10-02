import { supabase } from '@/lib/supabase';

export const resolvePendingMapping = async ({
  type,
  pendingRow,
  targetId,
}: {
  type: "location" | "supplier" | "category";
  pendingRow: any;
  targetId: string;
}) => {
  const now = new Date().toISOString();

  if (type === "location") {
    // Check if mapping already exists
    const { data: existingMapping } = await supabase
      .from("location_mappings")
      .select("mapping_id, location_id")
      .eq("organization_id", pendingRow.organization_id)
      .eq("variant_name", pendingRow.variant_receiver_name)
      .eq("variant_address", pendingRow.variant_address)
      .single();

    let insertError = null;
    let locationIdToUse = targetId;
    
    if (existingMapping) {
      // Mapping already exists, use the existing location_id
      locationIdToUse = existingMapping.location_id;
      console.log(`Location mapping already exists for ${pendingRow.variant_receiver_name}, using existing location_id: ${locationIdToUse}`);
    } else {
      // Only insert if mapping doesn't exist
      const { error } = await supabase
        .from("location_mappings")
        .insert({
          location_id: targetId,
          variant_name: pendingRow.variant_receiver_name,
          variant_address: pendingRow.variant_address,
          variant_receiver_name: pendingRow.variant_receiver_name,
          organization_id: pendingRow.organization_id,
          created_at: now,
        });
      insertError = error;
    }

    const { error: deletePendingError } = await supabase
      .from("pending_location_mappings")
      .delete()
      .eq("id", pendingRow.id);

    const { error: updateError } = await supabase
      .from("invoice_lines")
      .update({
        location_id: locationIdToUse,
        location_pending: false,
      })
      .match({
        organization_id: pendingRow.organization_id,
        variant_receiver_name: pendingRow.variant_receiver_name,
        variant_address: pendingRow.variant_address,
        location_pending: true,
      })
      .is("location_id", null); // ✅ critical fix

    if (insertError || deletePendingError || updateError)
      throw insertError || deletePendingError || updateError;
  }

  if (type === "supplier") {
    // Check if mapping already exists
    const { data: existingMapping } = await supabase
      .from("supplier_mappings")
      .select("mapping_id, supplier_id")
      .eq("organization_id", pendingRow.organization_id)
      .eq("variant_name", pendingRow.variant_supplier_name)
      .eq("variant_address", pendingRow.variant_address)
      .single();

    let insertError = null;
    let supplierIdToUse = targetId;
    
    if (existingMapping) {
      // Mapping already exists, use the existing supplier_id
      supplierIdToUse = existingMapping.supplier_id;
      console.log(`Mapping already exists for ${pendingRow.variant_supplier_name}, using existing supplier_id: ${supplierIdToUse}`);
    } else {
      // Only insert if mapping doesn't exist
      const { error } = await supabase
        .from("supplier_mappings")
        .insert({
          supplier_id: targetId,
          variant_name: pendingRow.variant_supplier_name,
          variant_address: pendingRow.variant_address,
          organization_id: pendingRow.organization_id,
          created_at: now,
        });
      insertError = error;
    }

    const { error: deletePendingError } = await supabase
      .from("pending_supplier_mappings")
      .delete()
      .eq("id", pendingRow.id);

    const { error: updateError } = await supabase
      .from("invoice_lines")
      .update({
        supplier_id: supplierIdToUse,
        supplier_pending: false,
      })
      .match({
        organization_id: pendingRow.organization_id,
        variant_supplier_name: pendingRow.variant_supplier_name,
        variant_address: pendingRow.variant_address,
        supplier_pending: true,
      })
      .is("supplier_id", null); // ✅ also critical fix

    if (insertError || deletePendingError || updateError)
      throw insertError || deletePendingError || updateError;
  }

  if (type === "category") {
    // Create the category mapping
    const { error: insertError } = await supabase
      .from("product_category_mappings")
      .insert({
        organization_id: pendingRow.organization_id,
        category_id: targetId,
        variant_product_name: pendingRow.variant_product_name,
        variant_product_code: pendingRow.variant_product_code,
        variant_supplier_name: pendingRow.variant_supplier_name,
        is_active: true,
        created_at: now,
      });

    // Delete the pending mapping
    const { error: deletePendingError } = await supabase
      .from("pending_category_mappings")
      .delete()
      .eq("id", pendingRow.id);

    // Update invoice_lines to use the category
    const { error: updateError } = await supabase
      .from("invoice_lines")
      .update({
        category_id: targetId,
        category_pending: false,
      })
      .match({
        organization_id: pendingRow.organization_id,
        description: pendingRow.variant_product_name,
        category_pending: true,
      })
      .is("category_id", null);

    if (insertError || deletePendingError || updateError)
      throw insertError || deletePendingError || updateError;
  }
};
