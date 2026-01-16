-- Supabase Database Setup for BOBO Token Dashboard
-- Run this SQL in your Supabase SQL Editor

-- Create config table to store token address and social links
CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    token_address TEXT,
    dexscreener_link TEXT,
    bags_link TEXT,
    twitter_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row (you'll update this via dashboard)
INSERT INTO config (id, token_address, dexscreener_link, bags_link, twitter_link)
VALUES (
    1,
    'Ep7o7wAi4NUJWAfpuGYd46DjJ88yYMY2wt9yd6n9pump', -- Default token address
    'https://dexscreener.com/solana/Ep7o7wAi4NUJWAfpuGYd46DjJ88yYMY2wt9yd6n9pump', -- DexScreener link
    'https://bags.fun/', -- Bags app link
    'https://twitter.com/yourhandle' -- Twitter link
)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (for the website)
CREATE POLICY "Allow public read access" ON config
    FOR SELECT
    USING (true);

-- Create policy to allow authenticated users to update (for dashboard)
CREATE POLICY "Allow authenticated update" ON config
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at on config table
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

