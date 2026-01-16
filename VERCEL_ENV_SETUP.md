# How to Add Environment Variables in Vercel

## Quick Guide

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Click on your **MEME-1** project

### Step 2: Add Environment Variables
1. Click **"Settings"** tab
2. Click **"Environment Variables"** (left sidebar)
3. Add these two variables:

**Variable 1:**
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://cwihyzlbsbbpchkheito.supabase.co`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development
- Click **"Save"**

**Variable 2:**
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `sb_publishable_Y_MINoKzOLp1DBG23X0HZg_NR9gXzSk`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development
- Click **"Save"**

### Step 3: Redeploy
1. Go to **"Deployments"** tab
2. Click **"..."** on latest deployment → **"Redeploy"**
3. Or just push a new commit (auto-deploys)

## How It Works

The `build.js` script will automatically inject these environment variables into your HTML during deployment. The values will be available in your JavaScript code.

## Important Notes

⚠️ **Note**: Since this is a frontend static site, these values will still be visible in the browser's source code. This is **normal and expected** - Supabase anon keys are designed to be public.

✅ **Security**: Your Supabase Row Level Security (RLS) policies protect your data, not the key itself.

## Current Values (Fallback)

If environment variables aren't set, the code uses these defaults:
- Supabase URL: `https://cwihyzlbsbbpchkheito.supabase.co`
- Supabase Key: `sb_publishable_Y_MINoKzOLp1DBG23X0HZg_NR9gXzSk`

These are already in the code, so the site works even without env vars!

