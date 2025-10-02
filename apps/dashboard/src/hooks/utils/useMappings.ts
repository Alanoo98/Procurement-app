// useMappings.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';

export const useMappings = (type: "location" | "supplier") => {
  const table = type === "location" ? "location_mappings" : "supplier_mappings";
  const foreignTable = type === "location" ? "locations" : "suppliers";

  return useQuery({
    queryKey: ["mappings", type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select(`
          *,
          ${foreignTable} (
            name,
            address
          )
        `);

      if (error) throw error;

      return data.map((row: Mapping) => ({
        ...row,
        mapped_name: row[foreignTable]?.name ?? null,
        mapped_address: row[foreignTable]?.address ?? null,
      }));
    },
  });
};
