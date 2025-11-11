-- Create user_preferences table to store user's default summary preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,

    -- Default summary preferences
    default_format VARCHAR(50) DEFAULT 'structured', -- 'structured', 'bullet_points', 'paragraph', 'action_items'
    default_language VARCHAR(10) DEFAULT 'en', -- 'en', 'fr', 'es', etc.
    default_detail_level VARCHAR(20) DEFAULT 'medium', -- 'brief', 'medium', 'detailed'

    -- Additional preferences
    auto_generate_summary BOOLEAN DEFAULT true, -- Automatically generate summary after transcription
    include_timestamps BOOLEAN DEFAULT true, -- Include timestamps in summaries
    include_action_items BOOLEAN DEFAULT true, -- Extract action items
    include_decisions BOOLEAN DEFAULT true, -- Extract key decisions

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster user queries
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own preferences
CREATE POLICY "Users can view their own preferences"
    ON user_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
    ON user_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
    ON user_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete their own preferences"
    ON user_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
