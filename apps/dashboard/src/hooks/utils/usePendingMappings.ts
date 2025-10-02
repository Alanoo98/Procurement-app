import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';

export const usePendingMappings = (type: "location" | "supplier" | "category") => {
  const table =
    type === "location" ? "pending_location_mappings" : 
    type === "supplier" ? "pending_supplier_mappings" : 
    "pending_category_mappings";

  return useQuery({
    queryKey: ["pending_mappings", type],
    queryFn: async () => {
      if (type === "supplier") {
        // For suppliers, join with suppliers table to get the name
        const { data, error } = await supabase
          .from(table)
          .select(`
            *,
            suppliers (
              name,
              address
            )
          `)
          .eq('status', 'pending'); // Only show pending mappings, not resolved ones
        if (error) throw error;
        return data;
      } else if (type === "category") {
        // For categories, join with product_categories table to get category info
        const { data, error } = await supabase
          .from(table)
          .select(`
            *,
            product_categories (
              category_name,
              category_description
            )
          `)
          .eq('status', 'pending'); // Only show pending mappings, not resolved ones
        if (error) throw error;
        return data;
      } else {
        // For locations, filter by status (no join since no FK constraint exists)
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('status', 'pending'); // Only show pending mappings, not resolved ones
        if (error) throw error;
        return data;
      }
    },
  });
};
