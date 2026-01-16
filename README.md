# BOBO Token Website

A memecoin website featuring a 3D character (BOBO) whose size dynamically adjusts based on the token's market cap.

## Features

- **Real-time Market Cap Tracking** - Fetches data from Helius RPC and DexScreener
- **3D Interactive Character** - Click and drag to rotate, scroll to zoom
- **Dynamic Size Scaling** - Character size adjusts based on market cap
- **Vitals System**:
  - Ego Level: Based on market cap
  - Confidence: Based on 24h price change
  - Horniness: Based on daily volume ($30k-$2M range)
  - Flex Power: Based on market cap tiers
- **Supabase Dashboard** - Manage token address and social links

## Setup Instructions

### 1. Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the SQL script from `supabase-setup.sql`
4. Get your project URL and anon key from Settings > API

### 2. Configure Supabase Credentials

#### In `script.js`:
Update these lines with your Supabase credentials:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

#### In `dashboard.html`:
Update the same credentials in the dashboard file.

### 3. Configure Token Address

You can set the token address in two ways:

**Option A: Via Dashboard**
1. Open `dashboard.html` in your browser
2. Enter your token mint address and social links
3. Click Save

**Option B: Via UI**
1. Open `index.html` in your browser
2. Enter token address in the "Token Address" field
3. Click Set

### 4. Run the Website

Simply open `index.html` in a web browser, or use a local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`

## GitHub Hosting (GitHub Pages)

### Deploy to GitHub Pages:

1. **Create a GitHub repository:**
   - Go to [github.com](https://github.com) and create a new repository
   - Name it something like `bobo-token` or `pepedih-website`
   - Don't initialize with README (we already have one)

2. **Push your code:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **Deploy from a branch**
   - Choose **main** branch and **/ (root)** folder
   - Click **Save**
   - Your site will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

### Custom Domain (Optional):
- Add a `CNAME` file in the root with your domain name
- Configure DNS settings as per GitHub Pages instructions

## Files

- `index.html` - Main website
- `styles.css` - Styling
- `script.js` - Main JavaScript logic
- `dashboard.html` - Admin dashboard for configuration
- `supabase-setup.sql` - Database setup script

## Social Links

The footer links (DexScreener, Bags, Twitter) are managed through Supabase and can be updated via the dashboard.

## API Keys

- **Helius API**: Already configured in `script.js`
- **DexScreener**: No API key needed (free public API)
- **Supabase**: Configure your own credentials

## Notes

- The website works without Supabase (uses default/fallback links)
- Token address can be set via UI even without Supabase
- All data updates every 5 seconds automatically

## Custom Domain Setup

If you have a custom domain (like bobo.capital), see `DOMAIN_SETUP.md` for instructions on configuring it in Vercel.

