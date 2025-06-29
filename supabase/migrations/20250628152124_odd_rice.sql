/*
  # Fix Debug Functions and Database Issues

  1. Debug Functions
    - Create validate_database_setup function
    - Create test_user_creation_process function
    - Create repair_user_setup function

  2. Enhanced Error Handling
    - Improve handle_new_user function with better logging
    - Add comprehensive error recovery

  3. Permissions
    - Ensure all functions have proper permissions
    - Grant necessary access to authenticated users
*/

-- Drop existing functions if they exist to ensure clean recreation
DROP FUNCTION IF EXISTS validate_database_setup();
DROP FUNCTION IF EXISTS test_user_creation_process(uuid);
DROP FUNCTION IF EXISTS repair_user_setup(uuid);

-- Function to validate database setup
CREATE OR REPLACE FUNCTION validate_database_setup()
RETURNS TABLE(
  table_name text,
  table_exists boolean,
  rls_enabled boolean,
  policies_count bigint,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    expected.table_name::text,
    (t.table_name IS NOT NULL) as table_exists,
    COALESCE(c.relrowsecurity, false) as rls_enabled,
    COALESCE(p.policy_count, 0) as policies_count,
    CASE 
      WHEN t.table_name IS NULL THEN 'MISSING'
      WHEN NOT COALESCE(c.relrowsecurity, false) THEN 'NO_RLS'
      WHEN COALESCE(p.policy_count, 0) = 0 THEN 'NO_POLICIES'
      ELSE 'OK'
    END as status
  FROM (
    VALUES 
      ('profiles'),
      ('app_settings'),
      ('daily_goals'),
      ('user_preferences'),
      ('learning_sessions'),
      ('word_progress'),
      ('achievements')
  ) AS expected(table_name)
  LEFT JOIN information_schema.tables t 
    ON t.table_name = expected.table_name 
    AND t.table_schema = 'public'
  LEFT JOIN pg_class c 
    ON c.relname = expected.table_name
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LEFT JOIN (
    SELECT 
      tablename,
      COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) p ON p.tablename = expected.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test user creation process
CREATE OR REPLACE FUNCTION test_user_creation_process(test_user_id uuid)
RETURNS TABLE(
  step text,
  success boolean,
  error_message text,
  details text
) AS $$
DECLARE
  test_email text := 'test@example.com';
  test_name text := 'Test User';
  step_error text;
BEGIN
  -- Test 1: Profile creation
  BEGIN
    INSERT INTO profiles (id, email, full_name, created_at, updated_at)
    VALUES (test_user_id, test_email, test_name, now(), now());
    
    RETURN QUERY SELECT 'profiles'::text, true, ''::text, 'Profile created successfully'::text;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'profiles'::text, false, step_error::text, ('SQLSTATE: ' || SQLSTATE)::text;
  END;

  -- Test 2: App settings creation
  BEGIN
    INSERT INTO app_settings (user_id, created_at, updated_at)
    VALUES (test_user_id, now(), now());
    
    RETURN QUERY SELECT 'app_settings'::text, true, ''::text, 'App settings created successfully'::text;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'app_settings'::text, false, step_error::text, ('SQLSTATE: ' || SQLSTATE)::text;
  END;

  -- Test 3: Daily goals creation
  BEGIN
    INSERT INTO daily_goals (user_id, goal_type, target_value, goal_date, created_at, updated_at)
    VALUES 
      (test_user_id, 'words', 10, CURRENT_DATE, now(), now()),
      (test_user_id, 'time', 30, CURRENT_DATE, now(), now()),
      (test_user_id, 'accuracy', 80, CURRENT_DATE, now(), now());
    
    RETURN QUERY SELECT 'daily_goals'::text, true, ''::text, 'Daily goals created successfully'::text;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'daily_goals'::text, false, step_error::text, ('SQLSTATE: ' || SQLSTATE)::text;
  END;

  -- Test 4: User preferences creation (if table exists)
  BEGIN
    -- Check if user_preferences table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_preferences'
    ) THEN
      INSERT INTO user_preferences (user_id, created_at, updated_at)
      VALUES (test_user_id, now(), now());
      
      RETURN QUERY SELECT 'user_preferences'::text, true, ''::text, 'User preferences created successfully'::text;
    ELSE
      RETURN QUERY SELECT 'user_preferences'::text, true, ''::text, 'Table does not exist (optional)'::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'user_preferences'::text, false, step_error::text, ('SQLSTATE: ' || SQLSTATE)::text;
  END;

  -- Test 5: Trigger simulation
  BEGIN
    -- Test if the trigger function works
    PERFORM handle_new_user();
    RETURN QUERY SELECT 'trigger_function'::text, true, ''::text, 'Trigger function exists and is callable'::text;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'trigger_function'::text, false, step_error::text, ('SQLSTATE: ' || SQLSTATE)::text;
  END;

  -- Clean up test data
  BEGIN
    DELETE FROM user_preferences WHERE user_id = test_user_id;
    DELETE FROM daily_goals WHERE user_id = test_user_id;
    DELETE FROM app_settings WHERE user_id = test_user_id;
    DELETE FROM profiles WHERE id = test_user_id;
    
    RETURN QUERY SELECT 'cleanup'::text, true, ''::text, 'Test data cleaned up successfully'::text;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'cleanup'::text, false, step_error::text, ('SQLSTATE: ' || SQLSTATE)::text;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to repair incomplete user setups
CREATE OR REPLACE FUNCTION repair_user_setup(target_user_id uuid)
RETURNS TABLE(
  step text,
  action text,
  success boolean,
  message text
) AS $$
DECLARE
  user_record auth.users%ROWTYPE;
  user_email text;
  user_name text;
  step_error text;
BEGIN
  -- Get user info from auth.users
  BEGIN
    SELECT * INTO user_record FROM auth.users WHERE id = target_user_id;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT 'validation'::text, 'check_user'::text, false, 'User not found in auth.users'::text;
      RETURN;
    END IF;

    user_email := COALESCE(user_record.email, '');
    user_name := COALESCE(user_record.raw_user_meta_data->>'full_name', '');
    
    RETURN QUERY SELECT 'validation'::text, 'check_user'::text, true, ('User found: ' || user_email)::text;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'validation'::text, 'check_user'::text, false, step_error::text;
    RETURN;
  END;

  -- Repair profile
  BEGIN
    INSERT INTO profiles (id, email, full_name, created_at, updated_at)
    VALUES (target_user_id, user_email, user_name, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now();
    
    RETURN QUERY SELECT 'profiles'::text, 'upsert'::text, true, 'Profile created/updated successfully'::text;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'profiles'::text, 'upsert'::text, false, step_error::text;
  END;

  -- Repair app settings
  BEGIN
    INSERT INTO app_settings (user_id, created_at, updated_at)
    VALUES (target_user_id, now(), now())
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now();
    
    RETURN QUERY SELECT 'app_settings'::text, 'upsert'::text, true, 'App settings created/updated successfully'::text;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'app_settings'::text, 'upsert'::text, false, step_error::text;
  END;

  -- Repair daily goals
  BEGIN
    INSERT INTO daily_goals (user_id, goal_type, target_value, goal_date, created_at, updated_at)
    VALUES 
      (target_user_id, 'words', 10, CURRENT_DATE, now(), now()),
      (target_user_id, 'time', 30, CURRENT_DATE, now(), now()),
      (target_user_id, 'accuracy', 80, CURRENT_DATE, now(), now())
    ON CONFLICT (user_id, goal_type, goal_date) DO UPDATE SET updated_at = now();
    
    RETURN QUERY SELECT 'daily_goals'::text, 'upsert'::text, true, 'Daily goals created/updated successfully'::text;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'daily_goals'::text, 'upsert'::text, false, step_error::text;
  END;

  -- Repair user preferences (if table exists)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_preferences'
    ) THEN
      INSERT INTO user_preferences (user_id, created_at, updated_at)
      VALUES (target_user_id, now(), now())
      ON CONFLICT (user_id) DO UPDATE SET updated_at = now();
      
      RETURN QUERY SELECT 'user_preferences'::text, 'upsert'::text, true, 'User preferences created/updated successfully'::text;
    ELSE
      RETURN QUERY SELECT 'user_preferences'::text, 'skip'::text, true, 'Table does not exist (optional)'::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    step_error := SQLERRM;
    RETURN QUERY SELECT 'user_preferences'::text, 'upsert'::text, false, step_error::text;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced handle_new_user function with comprehensive logging
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_email text;
  user_name text;
  error_msg text;
  step_name text;
BEGIN
  -- Initialize variables
  user_email := COALESCE(NEW.email, '');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  RAISE NOTICE 'Starting user setup for: % (email: %)', NEW.id, user_email;

  -- Step 1: Create profile
  step_name := 'profiles';
  BEGIN
    INSERT INTO profiles (id, email, full_name, created_at, updated_at)
    VALUES (NEW.id, user_email, user_name, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now();
    
    RAISE NOTICE 'SUCCESS: % table updated for user %', step_name, NEW.id;
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RAISE WARNING 'FAILED: % table for user %: % (SQLSTATE: %)', step_name, NEW.id, error_msg, SQLSTATE;
  END;

  -- Step 2: Create app settings
  step_name := 'app_settings';
  BEGIN
    INSERT INTO app_settings (user_id, created_at, updated_at)
    VALUES (NEW.id, now(), now())
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now();
    
    RAISE NOTICE 'SUCCESS: % table updated for user %', step_name, NEW.id;
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RAISE WARNING 'FAILED: % table for user %: % (SQLSTATE: %)', step_name, NEW.id, error_msg, SQLSTATE;
  END;

  -- Step 3: Create daily goals
  step_name := 'daily_goals';
  BEGIN
    INSERT INTO daily_goals (user_id, goal_type, target_value, goal_date, created_at, updated_at)
    VALUES 
      (NEW.id, 'words', 10, CURRENT_DATE, now(), now()),
      (NEW.id, 'time', 30, CURRENT_DATE, now(), now()),
      (NEW.id, 'accuracy', 80, CURRENT_DATE, now(), now())
    ON CONFLICT (user_id, goal_type, goal_date) DO UPDATE SET updated_at = now();
    
    RAISE NOTICE 'SUCCESS: % table updated for user %', step_name, NEW.id;
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RAISE WARNING 'FAILED: % table for user %: % (SQLSTATE: %)', step_name, NEW.id, error_msg, SQLSTATE;
  END;

  -- Step 4: Create user preferences (if table exists)
  step_name := 'user_preferences';
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_preferences'
    ) THEN
      INSERT INTO user_preferences (user_id, created_at, updated_at)
      VALUES (NEW.id, now(), now())
      ON CONFLICT (user_id) DO UPDATE SET updated_at = now();
      
      RAISE NOTICE 'SUCCESS: % table updated for user %', step_name, NEW.id;
    ELSE
      RAISE NOTICE 'SKIPPED: % table does not exist', step_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RAISE WARNING 'FAILED: % table for user %: % (SQLSTATE: %)', step_name, NEW.id, error_msg, SQLSTATE;
  END;

  RAISE NOTICE 'User setup completed for: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's using the latest function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant execute permissions on all functions to authenticated users
GRANT EXECUTE ON FUNCTION validate_database_setup() TO authenticated;
GRANT EXECUTE ON FUNCTION test_user_creation_process(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION repair_user_setup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

-- Grant necessary table permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure RLS policies are properly set for all tables
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'app_settings', 'daily_goals', 'user_preferences', 'learning_sessions', 'word_progress', 'achievements')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.tablename);
    RAISE NOTICE 'Enabled RLS for table: %', table_record.tablename;
  END LOOP;
END $$;