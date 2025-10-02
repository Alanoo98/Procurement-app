import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/store/filterStore';
import { useOrganization } from '@/contexts/OrganizationContext';

export type PaxRecord = {
  pax_id: string;
  date_id: string;
  location_id: string;
  pax_count: number;
  created_at?: string;
  updated_at?: string;
  location?: {
    name: string;
    address?: string;
  };
};

export const usePaxData = () => {
  const { dateRange, restaurants } = useFilterStore();
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const [data, setData] = useState<PaxRecord[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
    const fetchPaxData = async () => {
      if (!currentOrganization) return;
  
      setLoading(true);
      setError(null);
  
      try {
        // Step 1: Fetch matching location IDs
        let locQuery = supabase
          .from('locations')
          .select('location_id')
          .eq('organization_id', currentOrganization.id);
  
        if (currentBusinessUnit && currentBusinessUnit.id) {
          locQuery = locQuery.eq('business_unit_id', currentBusinessUnit.id);
        }
  
        const locResult = await locQuery;
        if (locResult.error) throw locResult.error;
  
        const locationIds = locResult.data.map(loc => loc.location_id);
  
        // Step 2: Query PAX table using those location IDs
        let query = supabase
          .from('pax')
          .select(`
            pax_id,
            date_id,
            location_id,
            pax_count,
            created_at,
            updated_at,
            locations:location_id(name, address)
          `)
          .in('location_id', locationIds)
          .order('date_id', { ascending: false });

        // Step 3: Apply optional filters
        if (dateRange?.start && dateRange?.end) {
          query = query
            .gte('date_id', dateRange.start)
            .lte('date_id', dateRange.end);
        }

        if (restaurants.length > 0) {
          query = query.in('location_id', restaurants);
        }

        // Step 4: Execute query with pagination
        let allRows: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const offset = page * pageSize;
          
          const { data: pageRows, error: pageError } = await query
            .range(offset, offset + pageSize - 1);

          if (pageError) {
            throw pageError;
          }

          if (!pageRows || pageRows.length === 0) {
            hasMore = false;
          } else {
            allRows = allRows.concat(pageRows);
            
            // If we got less than pageSize, we've reached the end
            if (pageRows.length < pageSize) {
              hasMore = false;
            }
            
            page++;
          }
        }

        const paxData = allRows;
  
        setData(paxData || []);
      } catch (err) {
        console.error('Error fetching PAX data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchPaxData();
  }, [dateRange, restaurants, currentOrganization, currentBusinessUnit]);


  const addPaxRecord = async (record: Omit<PaxRecord, 'pax_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('pax')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      
      setData(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding PAX record:', err);
      throw err;
    }
  };

  const updatePaxRecord = async (pax_id: string, updates: Partial<PaxRecord>) => {
    try {
      const { data, error } = await supabase
        .from('pax')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('pax_id', pax_id)
        .select(`
          pax_id,
          date_id,
          location_id,
          pax_count,
          created_at,
          updated_at,
          locations:location_id(name, address)
        `)
        .single();

      if (error) throw error;
      
      setData(prev => prev.map(record => 
        record.pax_id === pax_id ? data : record
      ));
      
      return data;
    } catch (err) {
      console.error('Error updating PAX record:', err);
      throw err;
    }
  };

  const deletePaxRecord = async (pax_id: string) => {
    try {
      const { error } = await supabase
        .from('pax')
        .delete()
        .eq('pax_id', pax_id);

      if (error) throw error;
      
      setData(prev => prev.filter(record => record.pax_id !== pax_id));
    } catch (err) {
      console.error('Error deleting PAX record:', err);
      throw err;
    }
  };

  const importPaxData = async (records: Array<Omit<PaxRecord, 'pax_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('pax')
        .insert(records)
        .select();

      if (error) throw error;
      
      setData(prev => [...data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error importing PAX data:', err);
      throw err;
    }
  };

  return {
    data,
    isLoading,
    error,
    addPaxRecord,
    updatePaxRecord,
    deletePaxRecord,
    importPaxData
  };
};
