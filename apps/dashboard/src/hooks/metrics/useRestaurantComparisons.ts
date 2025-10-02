import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface LocationComparisonGroup {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  business_unit_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  locations: Array<{
    location_id: string;
    name: string;
    added_at: string;
  }>;
}

export interface CreateComparisonGroupData {
  name: string;
  description?: string;
  locationIds: string[];
}

interface DatabaseComparisonGroup {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  business_unit_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
}

interface ComparisonMember {
  location_id: string;
  added_at: string;
  locations: {
    location_id: string;
    name: string;
  }[];
}

export const useLocationComparisons = () => {
  const { currentOrganization, currentBusinessUnit } = useOrganization();
  const [comparisonGroups, setComparisonGroups] = useState<LocationComparisonGroup[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch comparison groups
  const fetchComparisonGroups = async () => {
    if (!currentOrganization) {
      setComparisonGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get comparison groups with member count
      const { data: groupsData, error: groupsError } = await supabase
        .rpc('get_comparison_groups_with_member_count', {
          org_id: currentOrganization.id
        });

      if (groupsError) throw groupsError;

      // For each group, fetch the location details
      const groupsWithLocations = await Promise.all(
        (groupsData || []).map(async (group: DatabaseComparisonGroup) => {
          const { data: membersData, error: membersError } = await supabase
            .from('restaurant_comparison_members')
            .select(`
              location_id,
              added_at,
              locations (
                location_id,
                name
              )
            `)
            .eq('comparison_group_id', group.id);

          if (membersError) throw membersError;

          const locations = (membersData || []).map((member: ComparisonMember) => ({
            location_id: member.location_id,
            name: member.locations?.[0]?.name || '-',
            added_at: member.added_at,
          }));

          return {
            ...group,
            locations,
          };
        })
      );

      setComparisonGroups(groupsWithLocations);
    } catch (err) {
      console.error('Error fetching comparison groups:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new comparison group
  const createComparisonGroup = async (data: CreateComparisonGroupData) => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    // Get current user for debugging
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    
    if (userError) {
      console.error('❌ Failed to get current user:', userError);
      throw new Error('Authentication error');
    }

    if (!user) {
      console.error('❌ No authenticated user found');
      throw new Error('No authenticated user');
    }

    

    try {
      // First, let's check if the user exists in the users table
      const { data: userData, error: userCheckError } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('id', user.id)
        .single();

      

      if (userCheckError) {
        console.error('❌ Failed to check user in users table:', userCheckError);
        throw new Error('User not found in organization');
      }

      if (!userData) {
        console.error('❌ User not found in users table');
        throw new Error('User not found in organization');
      }

      if (userData.organization_id !== currentOrganization.id) {
        console.error('❌ User organization mismatch:', {
          userOrg: userData.organization_id,
          currentOrg: currentOrganization.id
        });
        
        // If user has no organization, assign them to the current one
        if (userData.organization_id === null) {
  
          const { error: updateError } = await supabase
            .from('users')
            .update({ organization_id: currentOrganization.id })
            .eq('id', user.id);
          
          if (updateError) {
            console.error('❌ Failed to update user organization:', updateError);
            throw new Error('Failed to assign user to organization');
          }
          
          console.log('✅ Successfully assigned user to organization');
        } else {
          throw new Error('User organization mismatch');
        }
      }

      // Create the comparison group with created_by field
      const groupInsertData = {
        name: data.name,
        description: data.description,
        organization_id: currentOrganization.id,
        business_unit_id: currentBusinessUnit?.id,
        created_by: user.id,
      };

      

      const { data: groupData, error: groupError } = await supabase
        .from('restaurant_comparison_groups')
        .insert(groupInsertData)
        .select()
        .single();

      

      if (groupError) {
        console.error('❌ Failed to create comparison group:', groupError);
        throw groupError;
      }

      console.log('✅ Successfully created comparison group:', groupData);

      // Add locations to the group
      if (data.locationIds.length > 0) {
        const membersData = data.locationIds.map(locationId => ({
          comparison_group_id: groupData.id,
          location_id: locationId,
          added_by: user.id,
        }));



        const { error: membersError } = await supabase
          .from('restaurant_comparison_members')
          .insert(membersData);



        if (membersError) {
          console.error('❌ Failed to add members to group:', membersError);
          throw membersError;
        }

        console.log('✅ Successfully added members to group');
      }

      toast.success('Comparison group created successfully');
      await fetchComparisonGroups(); // Refresh the list
      return groupData;
    } catch (err) {
      console.error('❌ Error creating comparison group:', err);
      toast.error('Failed to create comparison group');
      throw err;
    }
  };

  // Update a comparison group
  const updateComparisonGroup = async (
    groupId: string,
    updates: Partial<Pick<LocationComparisonGroup, 'name' | 'description'>>,
    locationIds?: string[]
  ) => {
    try {
      // Get current user for debugging
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      
      if (userError || !user) {
        console.error('❌ Failed to get current user for update:', userError);
        throw new Error('Authentication error');
      }

      // Update the group details
      const { error: groupError } = await supabase
        .from('restaurant_comparison_groups')
        .update({
          name: updates.name,
          description: updates.description,
        })
        .eq('id', groupId);

      if (groupError) throw groupError;

      // Update locations if provided
      if (locationIds !== undefined) {
        // Remove existing members
        const { error: deleteError } = await supabase
          .from('restaurant_comparison_members')
          .delete()
          .eq('comparison_group_id', groupId);

        if (deleteError) throw deleteError;

        // Add new members
        if (locationIds.length > 0) {
          const membersData = locationIds.map(locationId => ({
            comparison_group_id: groupId,
            location_id: locationId,
            added_by: user.id,
          }));

  

          const { error: insertError } = await supabase
            .from('restaurant_comparison_members')
            .insert(membersData);

          if (insertError) throw insertError;
        }
      }

      toast.success('Comparison group updated successfully');
      await fetchComparisonGroups(); // Refresh the list
    } catch (err) {
      console.error('Error updating comparison group:', err);
      toast.error('Failed to update comparison group');
      throw err;
    }
  };

  // Delete a comparison group
  const deleteComparisonGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('restaurant_comparison_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast.success('Comparison group deleted successfully');
      await fetchComparisonGroups(); // Refresh the list
    } catch (err) {
      console.error('Error deleting comparison group:', err);
      toast.error('Failed to delete comparison group');
      throw err;
    }
  };

  // Get comparison groups for a specific location
  const getComparisonGroupsByLocation = (locationId: string) => {
    return comparisonGroups.filter(group =>
      group.locations.some(location => location.location_id === locationId)
    );
  };

  // Get all location IDs from all comparison groups
  const getAllComparisonLocationIds = () => {
    const locationIds = new Set<string>();
    comparisonGroups.forEach(group => {
      group.locations.forEach(location => {
        locationIds.add(location.location_id);
      });
    });
    return Array.from(locationIds);
  };

  // Fetch data when organization changes
  useEffect(() => {
    fetchComparisonGroups();
  }, [currentOrganization, currentBusinessUnit]);

  return {
    comparisonGroups,
    isLoading,
    error,
    createComparisonGroup,
    updateComparisonGroup,
    deleteComparisonGroup,
    getComparisonGroupsByLocation,
    getAllComparisonLocationIds,
    refresh: fetchComparisonGroups,
  };
}; 
