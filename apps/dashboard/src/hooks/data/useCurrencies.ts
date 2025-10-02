import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Currency } from '@/utils/currency';
import { QUERY_KEYS, CACHE_TIMES, STALE_TIMES } from '@/hooks/utils/queryConfig';

export const useCurrencies = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.CURRENCIES],
    queryFn: async (): Promise<Currency[]> => {
      const { data, error: fetchError } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (fetchError) {
        throw fetchError;
      }

      return data || [];
    },
    staleTime: STALE_TIMES.STALE, // Currencies don't change often
    gcTime: CACHE_TIMES.VERY_LONG, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
  });
};

export const useCurrency = (currencyId?: string) => {
  const { data: currencies, isLoading, error } = useCurrencies();
  
  const currency = currencyId && currencies 
    ? currencies.find(c => c.id === currencyId) || null 
    : null;

  return { currency, isLoading, error };
};

