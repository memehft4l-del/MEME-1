# How to Push to GitHub

## Method 1: Personal Access Token (Recommended)

### Step 1: Create a Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `MEME-1 Push Token`
4. Set expiration: `90 days` (or `No expiration` if you prefer)
5. Select scopes: Check **`repo`** (this gives full repository access)
6. Click **"Generate token"**
7. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)

### Step 2: Push Using the Token

Run this command:
```bash
cd "/Users/biggucci/MEME 1"
git push origin main
```

When prompted:
- **Username**: `memehft4l-del`
- **Password**: Paste your Personal Access Token (NOT your GitHub password)

The token will be saved in your macOS keychain for future pushes.

## Method 2: SSH Keys (Best for Long-term)

### Step 1: Generate SSH Key (if you don't have one)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Press Enter to accept default location, then set a passphrase (optional).

### Step 2: Add SSH Key to GitHub

1. Copy your public key:
```bash
cat ~/.ssh/id_ed25519.pub
```

2. Go to: https://github.com/settings/keys
3. Click **"New SSH key"**
4. Title: `MacBook Pro`
5. Paste your public key
6. Click **"Add SSH key"**

### Step 3: Update Remote URL

```bash
cd "/Users/biggucci/MEME 1"
git remote set-url origin git@github.com:memehft4l-del/MEME-1.git
git push origin main
```

## Method 3: GitHub Desktop (Easiest GUI)

1. Download: https://desktop.github.com/
2. Sign in with your GitHub account
3. File → Add Local Repository → Select `/Users/biggucci/MEME 1`
4. Click "Publish repository" button

## Quick Test

After setting up, test with:
```bash
git push origin main
```

If it works, you're all set! 🎉


