@@ .. @@
 -- Create trigger for new user signup
 CREATE OR REPLACE TRIGGER on_auth_user_created
   AFTER INSERT ON auth.users
   FOR EACH ROW EXECUTE FUNCTION handle_new_user();
+
+-- Update the trigger to only add users to organization after email confirmation
+CREATE OR REPLACE FUNCTION handle_new_user()
+RETURNS trigger
+LANGUAGE plpgsql
+SECURITY DEFINER
+AS $$
+DECLARE
+  default_org_id uuid;
+BEGIN
+  -- Only proceed if email is confirmed
+  IF NEW.email_confirmed_at IS NOT NULL THEN
+    -- Get the default organization (you might want to customize this logic)
+    SELECT id INTO default_org_id
+    FROM organizations
+    WHERE name = 'DiningSix'
+    LIMIT 1;
+
+    -- If no default organization exists, create one
+    IF default_org_id IS NULL THEN
+      INSERT INTO organizations (name, slug, settings)
+      VALUES ('DiningSix', 'diningsix', '{}')
+      RETURNING id INTO default_org_id;
+    END IF;
+
+    -- Add the user to the default organization as a member
+    INSERT INTO organization_users (organization_id, user_id, role)
+    VALUES (default_org_id, NEW.id, 'member')
+    ON CONFLICT (organization_id, user_id) DO NOTHING;
+  END IF;
+
+  RETURN NEW;
+END;
+$$;
+
+-- Also create a trigger for when email gets confirmed
+CREATE OR REPLACE TRIGGER on_auth_user_confirmed
+  AFTER UPDATE ON auth.users
+  FOR EACH ROW 
+  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
+  EXECUTE FUNCTION handle_new_user();