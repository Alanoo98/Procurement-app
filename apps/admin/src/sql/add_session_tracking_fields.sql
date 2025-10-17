-- Add session-based tracking fields to users table
-- This migration adds fields to track user activity based on sessions rather than just logins

-- Add new columns to users table for session-based tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_session TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_currently_active BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_score INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_session_duration_minutes INTEGER DEFAULT 0;

-- Create index for performance on session-based queries
CREATE INDEX IF NOT EXISTS idx_users_last_active_session ON users(last_active_session);
CREATE INDEX IF NOT EXISTS idx_users_is_currently_active ON users(is_currently_active);
CREATE INDEX IF NOT EXISTS idx_users_activity_score ON users(activity_score);

-- Create a function to update user session activity
CREATE OR REPLACE FUNCTION update_user_session_activity(
    p_user_id UUID,
    p_session_timestamp TIMESTAMPTZ DEFAULT NOW(),
    p_session_duration_minutes INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET 
        last_active_session = p_session_timestamp,
        session_count = COALESCE(session_count, 0) + 1,
        is_currently_active = TRUE,
        total_session_duration_minutes = COALESCE(total_session_duration_minutes, 0) + p_session_duration_minutes,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the session activity
    PERFORM log_user_activity(
        p_user_id, 
        'session_activity', 
        'session', 
        NULL, 
        'User session activity recorded',
        jsonb_build_object(
            'session_timestamp', p_session_timestamp,
            'session_duration_minutes', p_session_duration_minutes
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE NOTICE 'Error updating user session activity: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to calculate and update activity scores
CREATE OR REPLACE FUNCTION calculate_user_activity_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_last_active TIMESTAMPTZ;
    v_session_count INTEGER;
    v_days_since_activity INTEGER;
BEGIN
    -- Get user's current activity data
    SELECT 
        last_active_session,
        session_count
    INTO v_last_active, v_session_count
    FROM users 
    WHERE id = p_user_id;
    
    -- Calculate score based on recency and frequency
    IF v_last_active IS NOT NULL THEN
        -- Days since last activity (0-7 days = higher score)
        v_days_since_activity := EXTRACT(DAY FROM NOW() - v_last_active);
        
        -- Recency score (0-50 points)
        IF v_days_since_activity = 0 THEN
            v_score := v_score + 50;
        ELSIF v_days_since_activity <= 1 THEN
            v_score := v_score + 40;
        ELSIF v_days_since_activity <= 3 THEN
            v_score := v_score + 30;
        ELSIF v_days_since_activity <= 7 THEN
            v_score := v_score + 20;
        ELSE
            v_score := v_score + 10;
        END IF;
        
        -- Frequency score (0-50 points)
        IF v_session_count >= 20 THEN
            v_score := v_score + 50;
        ELSIF v_session_count >= 10 THEN
            v_score := v_score + 40;
        ELSIF v_session_count >= 5 THEN
            v_score := v_score + 30;
        ELSIF v_session_count >= 2 THEN
            v_score := v_score + 20;
        ELSE
            v_score := v_score + 10;
        END IF;
    END IF;
    
    -- Update the user's activity score
    UPDATE users 
    SET 
        activity_score = v_score,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to mark users as inactive after a period of time
CREATE OR REPLACE FUNCTION mark_inactive_users()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    -- Mark users as inactive if they haven't had activity in the last 24 hours
    UPDATE users 
    SET 
        is_currently_active = FALSE,
        updated_at = NOW()
    WHERE 
        is_currently_active = TRUE 
        AND (
            last_active_session IS NULL 
            OR last_active_session < NOW() - INTERVAL '24 hours'
        );
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for session-based user analytics
CREATE OR REPLACE VIEW user_session_analytics AS
SELECT 
    u.id,
    au.email,
    u.full_name,
    au.last_sign_in_at,
    u.last_active_session,
    u.session_count,
    u.is_currently_active,
    u.activity_score,
    u.total_session_duration_minutes,
    u.created_at,
    u.updated_at,
    -- Calculate derived metrics
    CASE 
        WHEN u.last_active_session IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM NOW() - u.last_active_session)
    END as days_since_last_activity,
    CASE 
        WHEN au.last_sign_in_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM NOW() - au.last_sign_in_at)
    END as days_since_last_login,
    -- Activity status
    CASE 
        WHEN u.is_currently_active THEN 'Currently Active'
        WHEN u.last_active_session IS NOT NULL AND u.last_active_session > NOW() - INTERVAL '7 days' THEN 'Active (7 days)'
        WHEN u.last_active_session IS NOT NULL AND u.last_active_session > NOW() - INTERVAL '30 days' THEN 'Recently Active'
        ELSE 'Inactive'
    END as activity_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
ORDER BY u.activity_score DESC, u.last_active_session DESC;

-- Create a function to get session analytics summary
CREATE OR REPLACE FUNCTION get_session_analytics_summary()
RETURNS TABLE(
    total_users INTEGER,
    currently_active_users INTEGER,
    active_7_days INTEGER,
    total_sessions_today INTEGER,
    total_sessions_this_week INTEGER,
    average_activity_score NUMERIC,
    most_active_user_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_users,
        COUNT(*) FILTER (WHERE is_currently_active)::INTEGER as currently_active_users,
        COUNT(*) FILTER (WHERE last_active_session > NOW() - INTERVAL '7 days')::INTEGER as active_7_days,
        COALESCE(SUM(session_count) FILTER (WHERE last_active_session > NOW() - INTERVAL '1 day'), 0)::INTEGER as total_sessions_today,
        COALESCE(SUM(session_count) FILTER (WHERE last_active_session > NOW() - INTERVAL '7 days'), 0)::INTEGER as total_sessions_this_week,
        COALESCE(AVG(activity_score), 0)::NUMERIC as average_activity_score,
        (SELECT au.email FROM users u LEFT JOIN auth.users au ON u.id = au.id ORDER BY u.activity_score DESC, u.last_active_session DESC LIMIT 1) as most_active_user_email
    FROM users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically update activity scores when session data changes
CREATE OR REPLACE FUNCTION trigger_update_activity_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate activity score when session data changes
    PERFORM calculate_user_activity_score(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_activity_score_update
    AFTER UPDATE OF last_active_session, session_count ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_activity_score();

-- Add comments to document the new fields
COMMENT ON COLUMN users.last_active_session IS 'Timestamp of the most recent user session activity (token request, etc.)';
COMMENT ON COLUMN users.session_count IS 'Total number of active sessions for this user';
COMMENT ON COLUMN users.is_currently_active IS 'Whether the user has been active in the last 24 hours';
COMMENT ON COLUMN users.activity_score IS 'Calculated activity score based on session frequency and recency (0-100)';
COMMENT ON COLUMN users.total_session_duration_minutes IS 'Total duration of all user sessions in minutes';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_session_activity(UUID, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_activity_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_inactive_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_analytics_summary() TO authenticated;
GRANT SELECT ON user_session_analytics TO authenticated;
