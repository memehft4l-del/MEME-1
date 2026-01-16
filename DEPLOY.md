# Deployment Guide

## Quick Deploy to GitHub Pages

### Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon → **New repository**
3. Name your repository (e.g., `bobo-token-website`)
4. Make it **Public** (required for free GitHub Pages)
5. **Don't** initialize with README, .gitignore, or license
6. Click **Create repository**

### Step 2: Push Your Code

Run these commands in your terminal (replace with your actual GitHub username and repo name):

```bash
cd "/Users/biggucci/MEME 1"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select:
   - **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
5. Click **Save**
6. Wait 1-2 minutes for deployment
7. Your site will be live at:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
   ```

### Step 4: Update Supabase Configuration

After deploying, make sure your Supabase credentials are set in:
- `script.js` (line 15-16)
- `dashboard.html` (line 159-160)

**Important:** These credentials are visible in the code, so make sure your Supabase RLS policies are set correctly (public read access is OK, but restrict writes).

## Alternative Hosting Options

### Netlify
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your project folder
3. Done! Your site is live

### Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Deploy automatically

### Cloudflare Pages
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your GitHub repository
3. Deploy

## Troubleshooting

- **404 Error:** Make sure `index.html` is in the root folder
- **Supabase not working:** Check your API keys are correct
- **3D model not showing:** Check browser console for errors
- **Mobile not working:** Clear browser cache and refresh

