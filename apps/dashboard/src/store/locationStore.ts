import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface LocationMapping {
  id: string | null;
  name: string;
  address: string;
  variants: Array<{
    receiverName?: string;
    address: string;
  }>;
}

interface LocationState {
  selectedLocations: string[];
  locationMappings: LocationMapping[];
  setSelectedLocations: (locations: string[]) => void;
  clearLocations: () => void;
  addLocationMapping: (mapping: LocationMapping, updatedMappings?: LocationMapping[]) => void;
  removeLocationMapping: (id: string) => void;
  updateLocationMapping: (mapping: LocationMapping) => void;
  fetchMappings: () => Promise<void>;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 500
): Promise<T> => {
  let lastError: any;
  let currentDelay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await delay(currentDelay);
        currentDelay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
};

const checkExistingMapping = async (variant: { receiverName?: string; address: string }) => {
  let existingMapping = null;

  if (variant.receiverName) {
    const { data: receiverNameMapping } = await supabase
      .from('location_mappings')
      .select('*')
      .eq('variant_receiver_name', variant.receiverName)
      .maybeSingle();

    if (receiverNameMapping) {
      return receiverNameMapping;
    }
  }

  const { data: addressMapping } = await supabase
    .from('location_mappings')
    .select('*')
    .eq('variant_address', variant.address)
    .maybeSingle();

  return addressMapping;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      selectedLocations: [],
      locationMappings: [],
      setSelectedLocations: (locations) => set({ selectedLocations: locations }),
      clearLocations: () => set({ selectedLocations: [] }),
      addLocationMapping: async (mapping, updatedMappings) => {
        try {
          // Check for existing variants first
          for (const variant of mapping.variants) {
            const existingMapping = await checkExistingMapping(variant);
            if (existingMapping) {
              throw new Error(`A mapping already exists for ${variant.receiverName || variant.address}`);
            }
          }

          // Insert location first
          const { data: locationData, error: locationError } = await supabase
            .from('locations')
            .insert([{
              name: mapping.name,
              address: mapping.address,
            }])
            .select()
            .single();

          if (locationError) throw locationError;
          if (!locationData || !locationData.location_id) {
            throw new Error('Failed to create location: No location ID returned');
          }

          // Add a delay to ensure location is fully propagated
          await delay(500);

          // Insert variants as mappings with retry mechanism
          await retryOperation(async () => {
            const mappingPromises = mapping.variants.map(variant => 
              supabase
                .from('location_mappings')
                .insert({
                  location_id: locationData.location_id,
                  variant_name: variant.receiverName || variant.address,
                  variant_receiver_name: variant.receiverName,
                  variant_address: variant.address,
                })
                .select()
            );

            await Promise.all(mappingPromises);
          });

          // Update local state
          set((state) => ({
            locationMappings: updatedMappings || [{
              ...mapping,
              id: locationData.location_id,
            }, ...state.locationMappings],
          }));

          toast.success('Location added successfully');
        } catch (error: any) {
          console.error('Error adding location:', error);
          toast.error(error.message || 'Failed to add location');
          throw error;
        }
      },

      removeLocationMapping: async (id) => {
        try {
          const { error } = await supabase
            .from('locations')
            .delete()
            .eq('location_id', id);

          if (error) throw error;

          set((state) => ({
            locationMappings: state.locationMappings.filter((m) => m.id !== id),
          }));

          toast.success('Location removed successfully');
        } catch (error) {
          console.error('Error removing location:', error);
          toast.error('Failed to remove location');
          throw error;
        }
      },

      updateLocationMapping: async (mapping) => {
        try {
          // Check for existing variants that don't belong to this location
          for (const variant of mapping.variants) {
            const existingMapping = await checkExistingMapping(variant);
            if (existingMapping && existingMapping.location_id !== mapping.id) {
              throw new Error(`A mapping already exists for ${variant.receiverName || variant.address}`);
            }
          }

          // Update location
          const { error: locationError } = await supabase
            .from('locations')
            .update({
              name: mapping.name,
              address: mapping.address,
            })
            .eq('location_id', mapping.id);

          if (locationError) throw locationError;

          // Delete existing mappings for this location
          const { error: deleteError } = await supabase
            .from('location_mappings')
            .delete()
            .eq('location_id', mapping.id);

          if (deleteError) throw deleteError;

          // Add a delay before creating new mappings
          await delay(500);

          // Insert new mappings with retry mechanism
          await retryOperation(async () => {
            const mappingPromises = mapping.variants.map(variant => 
              supabase
                .from('location_mappings')
                .insert({
                  location_id: mapping.id,
                  variant_name: variant.receiverName || variant.address,
                  variant_receiver_name: variant.receiverName,
                  variant_address: variant.address,
                })
                .select()
            );

            await Promise.all(mappingPromises);
          });

          // Update local state with deduplicated variants
          const deduplicatedMapping = {
            ...mapping,
            variants: mapping.variants,
          };

          set((state) => ({
            locationMappings: state.locationMappings.map((m) =>
              m.id === mapping.id ? deduplicatedMapping : m
            ),
          }));

          toast.success('Location updated successfully');
        } catch (error: any) {
          console.error('Error updating location:', error);
          toast.error(error.message || 'Failed to update location');
          throw error;
        }
      },

      fetchMappings: async () => {
        try {
          // Fetch locations
          const { data: locations, error: locationsError } = await supabase
            .from('locations')
            .select('*');

          if (locationsError) throw locationsError;

          // Fetch mappings
          const { data: mappings, error: mappingsError } = await supabase
            .from('location_mappings')
            .select('*');

          if (mappingsError) throw mappingsError;

          // Transform data into LocationMapping format
          const locationMappings = locations.map(location => ({
            id: location.location_id,
            name: location.name,
            address: location.address,
            variants: mappings
              .filter(m => m.location_id === location.location_id)
              .map(m => ({
                receiverName: m.variant_receiver_name,
                address: m.variant_address,
              })),
          }));

          set({ locationMappings });
        } catch (error) {
          console.error('Error fetching locations:', error);
          toast.error('Failed to fetch locations');
        }
      },
    }),
    {
      name: 'location-storage',
    }
  )
);

export const getLocationFromAddress = (address: string, mappings: LocationMapping[]): string => {
  const normalizedAddress = address.toLowerCase().trim();
  
  for (const mapping of mappings) {
    if (mapping.variants.some(v => 
      (v.address && normalizedAddress.includes(v.address.toLowerCase()))
    )) {
      return mapping.name;
    }
  }
  
  return address;
};

export const getLocationFromName = (name: string, mappings: LocationMapping[]): string => {
  const normalizedName = name.toLowerCase().trim();
  
  for (const mapping of mappings) {
    if (mapping.variants.some(v => 
      v.receiverName && normalizedName === v.receiverName.toLowerCase()
    )) {
      return mapping.name;
    }
  }
  
  return name;
};