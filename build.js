// Build script to inject environment variables into HTML
const fs = require('fs');
const path = require('path');

// Read environment variables from Vercel
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cwihyzlbsbbpchkheito.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y_MINoKzOLp1DBG23X0HZg_NR9gXzSk';

// Read index.html
const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Replace the script tag with environment variables
const envScript = `<script>
        // Environment variables from Vercel
        window.SUPABASE_URL = '${SUPABASE_URL}';
        window.SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
    </script>`;

// Replace the existing script tag
html = html.replace(
    /<script>\s*\/\/ Vercel environment variables.*?<\/script>/s,
    envScript
);

// Write back
fs.writeFileSync(indexPath, html, 'utf8');
console.log('Environment variables injected successfully');


