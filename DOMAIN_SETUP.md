# Setting Up Custom Domain: bobo.capital

## Step-by-Step Guide

### 1. Add Domain in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your **MEME-1** project
3. Go to **Settings** → **Domains**
4. Click **"Add Domain"**
5. Enter: `bobo.capital`
6. Click **"Add"**

### 2. Configure DNS Records

Vercel will show you DNS records to add. You'll need to add these to your domain registrar (where you bought bobo.capital).

#### Option A: Use Vercel Nameservers (Easiest)

1. Vercel will show you nameservers like:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
2. Go to your domain registrar (where you bought bobo.capital)
3. Find **DNS Settings** or **Nameservers**
4. Replace existing nameservers with Vercel's nameservers
5. Save and wait 24-48 hours for propagation

#### Option B: Add A/CNAME Records (If you want to keep your current nameservers)

1. Vercel will show you a CNAME record like:
   - **Type**: CNAME
   - **Name**: @ (or leave blank)
   - **Value**: `cname.vercel-dns.com`
2. Or an A record:
   - **Type**: A
   - **Name**: @
   - **Value**: `76.76.21.21` (Vercel's IP)
3. Add these records in your domain registrar's DNS settings
4. Wait 24-48 hours for propagation

### 3. SSL Certificate (Automatic)

Vercel automatically provisions SSL certificates for your domain. This happens automatically after DNS is configured correctly.

### 4. Verify Domain

1. After adding DNS records, go back to Vercel
2. Click **"Refresh"** next to your domain
3. Vercel will verify the DNS configuration
4. Once verified, you'll see a green checkmark ✅

### 5. Wait for Propagation

- DNS changes can take 24-48 hours to propagate worldwide
- You can check status at: https://dnschecker.org
- Enter `bobo.capital` and check if it resolves

## Quick Checklist

- [ ] Domain added in Vercel dashboard
- [ ] DNS records added to domain registrar
- [ ] Nameservers updated (if using Option A)
- [ ] Wait 24-48 hours for propagation
- [ ] SSL certificate auto-provisioned by Vercel
- [ ] Domain verified in Vercel dashboard

## Troubleshooting

**Domain not resolving?**
- Check DNS records are correct
- Wait longer (can take up to 48 hours)
- Verify nameservers are correct

**SSL certificate issues?**
- Vercel handles this automatically
- May take a few minutes after DNS is verified

**Still seeing error?**
- Clear browser cache
- Try incognito/private mode
- Check DNS propagation: https://dnschecker.org

## Your Current Vercel URL

Your site is currently live at:
- `https://meme-1-xxxxx.vercel.app` (or similar)

After domain setup, it will also be at:
- `https://bobo.capital`

Both URLs will work!


