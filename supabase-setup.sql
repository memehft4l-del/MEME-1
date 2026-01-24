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

-- Drop existing policies if they exist (to avoid conflicts when re-running)
DROP POLICY IF EXISTS "Allow public read access" ON config;
DROP POLICY IF EXISTS "Allow authenticated update" ON config;
DROP POLICY IF EXISTS "Allow public write access" ON config;

-- Create policy to allow public read access (for the website)
CREATE POLICY "Allow public read access" ON config
    FOR SELECT
    USING (true);

-- Create policy to allow authenticated users to update (for dashboard)
-- Note: If you want public write access (no auth required), use the policy below instead
CREATE POLICY "Allow authenticated update" ON config
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Alternative: Uncomment below for public write access (no authentication required)
-- CREATE POLICY "Allow public write access" ON config
--     FOR ALL
--     USING (true)
--     WITH CHECK (true);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists (to avoid conflicts when re-running)
DROP TRIGGER IF EXISTS update_config_updated_at ON config;

-- Create trigger to update updated_at on config table
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create game_participants table to store wallet addresses
CREATE TABLE IF NOT EXISTS game_participants (
    id SERIAL PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_winners table to track winners and prevent duplicate claims
CREATE TABLE IF NOT EXISTS game_winners (
    id SERIAL PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    level INTEGER NOT NULL,
    score INTEGER NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on game tables
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_winners ENABLE ROW LEVEL SECURITY;

-- Allow public insert for game_participants (anyone can register)
CREATE POLICY "Allow public insert" ON game_participants
    FOR INSERT
    WITH CHECK (true);

-- Allow public insert for game_winners (winners can claim)
CREATE POLICY "Allow public insert" ON game_winners
    FOR INSERT
    WITH CHECK (true);

-- Allow public read for game_winners (to check if already claimed)
CREATE POLICY "Allow public read" ON game_winners
    FOR SELECT
    USING (true);

