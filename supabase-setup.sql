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

-- Drop existing policies if they exist (to avoid conflicts when re-running)
DROP POLICY IF EXISTS "Allow public insert" ON game_participants;
DROP POLICY IF EXISTS "Allow public read" ON game_participants;
DROP POLICY IF EXISTS "Allow public insert" ON game_winners;
DROP POLICY IF EXISTS "Allow public read" ON game_winners;

-- Allow public insert for game_participants (anyone can register)
CREATE POLICY "Allow public insert" ON game_participants
    FOR INSERT
    WITH CHECK (true);

-- Allow public read for game_participants (for leaderboard/statistics)
CREATE POLICY "Allow public read" ON game_participants
    FOR SELECT
    USING (true);

-- Allow public insert for game_winners (winners can claim)
CREATE POLICY "Allow public insert" ON game_winners
    FOR INSERT
    WITH CHECK (true);

-- Allow public read for game_winners (to check if already claimed)
CREATE POLICY "Allow public read" ON game_winners
    FOR SELECT
    USING (true);

-- Create view for leaderboard (shows all participants with their highest level)
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
    wallet_address,
    MAX(level) as highest_level,
    MAX(score) as best_score,
    COUNT(*) as total_wins,
    MAX(claimed_at) as last_claimed
FROM game_winners
GROUP BY wallet_address
ORDER BY highest_level DESC, best_score DESC, last_claimed ASC;

-- Create casino_bets table to track aggregated casino stats per wallet
CREATE TABLE IF NOT EXISTS casino_bets (
    wallet_address TEXT PRIMARY KEY,
    total_bets INTEGER DEFAULT 0,
    total_wagered NUMERIC(20, 9) DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    total_won NUMERIC(20, 9) DEFAULT 0,
    total_paid_out NUMERIC(20, 9) DEFAULT 0,
    house_fee_collected NUMERIC(20, 9) DEFAULT 0,
    last_bet_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    -- Add total_wagered if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='casino_bets' AND column_name='total_wagered') THEN
        ALTER TABLE casino_bets ADD COLUMN total_wagered NUMERIC(20, 9) DEFAULT 0;
    END IF;
    
    -- Add total_won if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='casino_bets' AND column_name='total_won') THEN
        ALTER TABLE casino_bets ADD COLUMN total_won NUMERIC(20, 9) DEFAULT 0;
    END IF;
    
    -- Add total_paid_out if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='casino_bets' AND column_name='total_paid_out') THEN
        ALTER TABLE casino_bets ADD COLUMN total_paid_out NUMERIC(20, 9) DEFAULT 0;
    END IF;
    
    -- Add house_fee_collected if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='casino_bets' AND column_name='house_fee_collected') THEN
        ALTER TABLE casino_bets ADD COLUMN house_fee_collected NUMERIC(20, 9) DEFAULT 0;
    END IF;
    
    -- Add last_bet_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='casino_bets' AND column_name='last_bet_at') THEN
        ALTER TABLE casino_bets ADD COLUMN last_bet_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Enable RLS on casino_bets
ALTER TABLE casino_bets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts when re-running)
DROP POLICY IF EXISTS "Allow public insert" ON casino_bets;
DROP POLICY IF EXISTS "Allow public read" ON casino_bets;
DROP POLICY IF EXISTS "Allow public update" ON casino_bets;

-- Allow public insert for casino_bets (players can place bets)
CREATE POLICY "Allow public insert" ON casino_bets
    FOR INSERT
    WITH CHECK (true);

-- Allow public read for casino_bets (to display stats)
CREATE POLICY "Allow public read" ON casino_bets
    FOR SELECT
    USING (true);

-- Allow public update for casino_bets (to aggregate stats)
CREATE POLICY "Allow public update" ON casino_bets
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Drop trigger if exists (to avoid conflicts when re-running)
DROP TRIGGER IF EXISTS update_casino_bets_updated_at ON casino_bets;

-- Create trigger to update updated_at on casino_bets
CREATE TRIGGER update_casino_bets_updated_at BEFORE UPDATE ON casino_bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
