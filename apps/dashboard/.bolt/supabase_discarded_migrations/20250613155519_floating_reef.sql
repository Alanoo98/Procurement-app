/*
  # Fix Price Negotiations RLS Policies

  1. Security Updates
    - Add INSERT policy for price_negotiations table
    - Add UPDATE policy for price_negotiations table  
    - Add DELETE policy for price_negotiations table
    - Ensure users can manage negotiations in their organization

  The current RLS policies only have SELECT access, but users need to be able to
  create, update, and delete price negotiations within their organization.
*/

-- Add INSERT policy for price_negotiations
CREATE POLICY "Users can create negotiations in their organization"
  ON price_negotiations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_belongs_to_organization(organization_id));

-- Add UPDATE policy for price_negotiations  
CREATE POLICY "Users can update negotiations in their organization"
  ON price_negotiations
  FOR UPDATE
  TO authenticated
  USING (user_belongs_to_organization(organization_id))
  WITH CHECK (user_belongs_to_organization(organization_id));

-- Add DELETE policy for price_negotiations
CREATE POLICY "Users can delete negotiations in their organization"
  ON price_negotiations
  FOR DELETE
  TO authenticated
  USING (user_belongs_to_organization(organization_id));