-- Create summaries table to store meeting summaries/resumes
CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,

    -- Summary content
    title TEXT NOT NULL,
    summary_text TEXT NOT NULL,

    -- User preferences used for generation
    format VARCHAR(50) DEFAULT 'structured', -- 'structured', 'bullet_points', 'paragraph', 'action_items'
    language VARCHAR(10) DEFAULT 'en', -- 'en', 'fr', 'es', etc.
    detail_level VARCHAR(20) DEFAULT 'medium', -- 'brief', 'medium', 'detailed'

    -- Additional metadata
    model_used VARCHAR(50), -- e.g., 'gpt-4o-mini'
    generation_time_seconds FLOAT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster user queries
CREATE INDEX idx_summaries_user_id ON summaries(user_id);
CREATE INDEX idx_summaries_meeting_id ON summaries(meeting_id);
CREATE INDEX idx_summaries_created_at ON summaries(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own summaries
CREATE POLICY "Users can view their own summaries"
    ON summaries
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own summaries
CREATE POLICY "Users can insert their own summaries"
    ON summaries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own summaries
CREATE POLICY "Users can update their own summaries"
    ON summaries
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own summaries
CREATE POLICY "Users can delete their own summaries"
    ON summaries
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_summaries_updated_at
    BEFORE UPDATE ON summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
