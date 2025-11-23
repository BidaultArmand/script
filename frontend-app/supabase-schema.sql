-- Create user_subscriptions table for tracking Stripe subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT CHECK (status IN ('active', 'cancelled', 'past_due')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Create index on stripe_subscription_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_sub_id ON user_subscriptions(stripe_subscription_id);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for webhooks)
CREATE POLICY "Service role has full access"
  ON user_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE user_subscriptions IS 'Stores user subscription information from Stripe';
COMMENT ON COLUMN user_subscriptions.user_id IS 'Reference to the Supabase auth user';
COMMENT ON COLUMN user_subscriptions.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON COLUMN user_subscriptions.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN user_subscriptions.status IS 'Subscription status: active, cancelled, or past_due';
COMMENT ON COLUMN user_subscriptions.current_period_end IS 'When the current subscription period ends';
