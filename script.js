// Global variables
let scene, camera, renderer, controls;
let pepeGroup;
let penisMesh;
let baseSize = 1;
let currentMarketCap = 0;
let previousMarketCap = 0;
let updateInterval;

// API Configuration
const HELIUS_API_URL = 'https://mainnet.helius-rpc.com/?api-key=5b8196dc-7a4b-43fa-80f0-8f285ccf318b';

// Supabase Configuration
// These can be overridden by environment variables in Vercel
// For Vercel: Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables
const SUPABASE_URL = window.SUPABASE_URL || 'https://cwihyzlbsbbpchkheito.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_Y_MINoKzOLp1DBG23X0HZg_NR9gXzSk';
let supabaseClient = null;

// Token mint address (can be set via UI or here)
let TOKEN_MINT_ADDRESS = localStorage.getItem('bobo_token_address') || 'Ep7o7wAi4NUJWAfpuGYd46DjJ88yYMY2wt9yd6n9pump';
let tokenDecimals = 9; // Default Solana token decimals
let tokenSupply = 0;
let tokenPrice = 0;
let priceHistory24h = [];

// Social links (will be loaded from Supabase)
let socialLinks = {
    dexscreener: '',
    bags: '',
    twitter: ''
};

// Initialize function - can be called multiple times safely
function initializeApp() {
    console.log('🚀 BOBO Website Initializing...');
    console.log('Token Address:', TOKEN_MINT_ADDRESS);
    console.log('THREE.js available:', typeof THREE !== 'undefined');
    console.log('Document ready state:', document.readyState);
    
    // Check if required elements exist
    const canvas = document.getElementById('pepe-canvas');
    const container = document.getElementById('canvas-container');
    console.log('Canvas found:', !!canvas);
    console.log('Container found:', !!container);
    
    // CRITICAL: Start market cap updates FIRST (this shows data immediately)
    try {
        console.log('🔥 Starting market cap updates FIRST...');
        startMarketCapUpdates();
        console.log('✅ Market cap updates started');
    } catch (error) {
        console.error('❌ Market cap updates failed:', error);
        console.error('Error stack:', error.stack);
    }
    
    // Initialize scene
    try {
        initScene();
        console.log('✅ Scene initialized');
    } catch (error) {
        console.error('❌ Scene initialization failed:', error);
        console.error('Error stack:', error.stack);
    }
    
    // Initialize UI
    try {
        initUI();
        console.log('✅ UI initialized');
    } catch (error) {
        console.error('❌ UI initialization failed:', error);
        console.error('Error stack:', error.stack);
    }
    
    // Initialize Supabase in background (non-blocking, won't break site if it fails)
    setTimeout(() => {
        try {
            initSupabase();
            loadConfigFromSupabase();
        } catch (error) {
            console.error('Supabase initialization error (non-critical):', error);
            setDefaultLinks();
        }
    }, 100);
    
    // Set contract address placeholder (will be updated from dashboard)
    const contractAddressEl = document.getElementById('contractAddress');
    if (contractAddressEl && (!contractAddressEl.textContent || contractAddressEl.textContent === '--')) {
        // Show default token address if available (full address)
        if (TOKEN_MINT_ADDRESS) {
            contractAddressEl.textContent = TOKEN_MINT_ADDRESS;
        } else {
            contractAddressEl.textContent = 'Loading...';
        }
    }
    
    // Show welcome modal on first visit
    const hasSeenWelcome = localStorage.getItem('bobo_welcome_seen');
    if (!hasSeenWelcome) {
        showWelcomeModal();
        localStorage.setItem('bobo_welcome_seen', 'true');
    }
}

// Initialize immediately if DOM is already loaded, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already loaded, initialize immediately
    console.log('⚡ DOM already loaded, initializing immediately...');
    setTimeout(initializeApp, 0);
}

// Initialize Three.js scene
function initScene() {
    const canvas = document.getElementById('pepe-canvas');
    const container = document.getElementById('canvas-container');
    
    if (!canvas || !container) {
        console.error('Canvas or container not found');
        setTimeout(initScene, 100); // Retry after a short delay
        return;
    }
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Camera setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height || 1;
    
    camera = new THREE.PerspectiveCamera(
        75,
        aspect,
        0.1,
        1000
    );
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xff6b6b, 0.5);
    pointLight.position.set(-5, 3, 5);
    scene.add(pointLight);
    
    // Create BOBO character
    createBoboCharacter();
    
    // Initial render to ensure something shows up
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
    
    // Add OrbitControls for 3D interaction
    // Wait a bit for OrbitControls to load
    setTimeout(() => {
        try {
            // Try different ways OrbitControls might be exposed
            const OrbitControlsClass = window.OrbitControls || 
                                      (typeof THREE !== 'undefined' && THREE.OrbitControls) ||
                                      (typeof module !== 'undefined' && module.exports && require('three/examples/js/controls/OrbitControls'));
            
            if (OrbitControlsClass) {
                controls = new OrbitControlsClass(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                controls.minDistance = 3;
                controls.maxDistance = 15;
                controls.enablePan = false;
                controls.target.set(0, 0, 0);
            } else {
                // Fallback: Simple mouse controls
                initSimpleControls();
            }
        } catch (e) {
            console.warn('OrbitControls error, using simple controls:', e);
            initSimpleControls();
        }
    }, 100);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

// Create BOBO character with adjustable anatomy
function createBoboCharacter() {
    pepeGroup = new THREE.Group();
    
    // Body (green sphere)
    const bodyGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4ade80,
        shininess: 30
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    pepeGroup.add(body);
    
    // Head (larger green sphere)
    const headGeometry = new THREE.SphereGeometry(0.6, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x22c55e,
        shininess: 30
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    pepeGroup.add(head);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 1.6, 0.5);
    pepeGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 1.6, 0.5);
    pepeGroup.add(rightEye);
    
    // Pupils
    const pupilGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const pupilMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.2, 1.6, 0.6);
    pepeGroup.add(leftPupil);
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.2, 1.6, 0.6);
    pepeGroup.add(rightPupil);
    
    // Mouth
    const mouthGeometry = new THREE.TorusGeometry(0.2, 0.05, 8, 16);
    const mouthMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 1.3, 0.5);
    mouth.rotation.x = Math.PI / 2;
    pepeGroup.add(mouth);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 16);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x22c55e });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -0.5, 0);
    pepeGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -0.5, 0);
    pepeGroup.add(rightLeg);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0x22c55e });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.6, 0.8, 0);
    leftArm.rotation.z = Math.PI / 4;
    pepeGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.6, 0.8, 0);
    rightArm.rotation.z = -Math.PI / 4;
    pepeGroup.add(rightArm);
    
    // Penis (adjustable size based on market cap)
    const penisGeometry = new THREE.CylinderGeometry(0.08, 0.1, baseSize, 16);
    const penisMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff6b6b,
        shininess: 50
    });
    penisMesh = new THREE.Mesh(penisGeometry, penisMaterial);
    penisMesh.position.set(0, -0.2, 0.4);
    penisMesh.rotation.x = Math.PI / 2;
    pepeGroup.add(penisMesh);
    
    // Tip
    const tipGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const tipMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff4757,
        shininess: 50
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.set(0, -0.2, 0.4 + baseSize / 2);
    pepeGroup.add(tip);
    penisMesh.tip = tip;
    
    scene.add(pepeGroup);
}

// Update penis size based on market cap - More sensitive with longer range
function updatePenisSize(marketCap) {
    // Extended range for more sensitivity - 0 to 100cm range
    // Adjusted scaling so $4k = ~4-5cm, $1M = ~20cm, $10M = ~50cm, $50M = ~100cm
    const maxMarketCap = 50000000; // $50M max for full size
    const minSize = 0.2; // Minimum size in 3D units (~4cm)
    const maxSize = 5.0; // Maximum size in 3D units (~100cm)
    
    // Use a more aggressive logarithmic scale that gives very small sizes at low market caps
    let normalizedMC;
    if (marketCap <= 0) {
        normalizedMC = 0;
    } else if (marketCap < 10000) {
        // For very small market caps ($0-$10k), use linear scaling from 0 to 0.05
        // This ensures $4k = ~4-5cm
        normalizedMC = (marketCap / 10000) * 0.05;
    } else {
        // For larger market caps, use logarithmic scaling
        // Adjusted to start from $10k baseline
        const minMC = 10000;
        const adjustedMC = marketCap - minMC;
        const adjustedMaxMC = maxMarketCap - minMC;
        // Use square root for smoother curve, then normalize
        normalizedMC = Math.min(
            0.05 + (Math.sqrt(adjustedMC) / Math.sqrt(adjustedMaxMC)) * 0.95,
            1
        );
    }
    
    const newSize = minSize + (maxSize - minSize) * normalizedMC;
    
    // Update penis geometry
    if (penisMesh) {
        const newGeometry = new THREE.CylinderGeometry(0.08, 0.1, newSize, 16);
        penisMesh.geometry.dispose();
        penisMesh.geometry = newGeometry;
        penisMesh.position.set(0, -0.2, 0.4);
        
        // Update tip position
        if (penisMesh.tip) {
            penisMesh.tip.position.set(0, -0.2, 0.4 + newSize / 2);
        }
    }
    
    // Convert to cm for display - more precise with decimals
    const sizeInCm = Math.round((newSize * 20) * 10) / 10; // Round to 1 decimal
    return sizeInCm;
}

// Initialize UI event handlers
function initUI() {
    // Modal close
    const closeModalBtn = document.getElementById('closeModal');
    const welcomeModal = document.getElementById('welcomeModal');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideWelcomeModal);
    }
    
    if (welcomeModal) {
        welcomeModal.addEventListener('click', (e) => {
            if (e.target.id === 'welcomeModal') {
                hideWelcomeModal();
            }
        });
    }
}

// Market cap updates with real API
function startMarketCapUpdates() {
    console.log('📈 Starting market cap updates...');
    
    // CRITICAL: Start simulation mode IMMEDIATELY - don't wait for anything
    // This ensures data shows right away
    try {
        console.log('🎮 Starting simulation mode immediately...');
        startSimulationMode();
        console.log('✅ Simulation mode started successfully');
    } catch (error) {
        console.error('❌ Failed to start simulation mode:', error);
        // Try again after a short delay
        setTimeout(() => {
            try {
                startSimulationMode();
            } catch (e) {
                console.error('❌ Retry failed:', e);
            }
        }, 500);
    }
    
    // If no token address is set, just use simulation
    if (!TOKEN_MINT_ADDRESS) {
        console.warn('⚠️ Token mint address not set. Using simulation mode only.');
        return;
    }
    
    // Try to fetch real data in background (non-blocking, doesn't stop simulation)
    setTimeout(async () => {
        try {
            console.log('🌐 Attempting to fetch real token data...');
            await fetchTokenData();
        } catch (error) {
            console.error('⚠️ Background fetch failed, simulation continues:', error);
        }
    }, 2000);
    
    // Try to fetch real data every 5 seconds (simulation keeps running in parallel)
    setInterval(async () => {
        try {
            await fetchTokenData();
        } catch (error) {
            console.error('⚠️ Periodic fetch error:', error);
            // Simulation mode continues regardless
        }
    }, 5000);
}

async function fetchTokenData() {
    try {
        console.log('Fetching token data for:', TOKEN_MINT_ADDRESS);
        
        // Fetch token supply from Helius
        const supply = await getTokenSupply();
        if (supply) {
            tokenSupply = supply;
            console.log('Token supply:', supply);
        }
        
        // Fetch price from DexScreener (free API, no key needed)
        const priceData = await getTokenPrice();
        if (priceData && priceData.price > 0) {
            tokenPrice = priceData.price;
            const volume24h = priceData.volume24h || 0;
            const priceChange24h = priceData.priceChange24h || 0;
            
            // Calculate market cap
            previousMarketCap = currentMarketCap;
            currentMarketCap = (tokenSupply * tokenPrice) || 0;
            
            console.log('Real data fetched - MC:', currentMarketCap, 'Price:', tokenPrice);
            
            // Update UI with real data
            updateMarketCapDisplay(currentMarketCap);
            updatePriceDisplay(tokenPrice);
            updateVolumeDisplay(volume24h);
            updateChangeDisplay(priceChange24h);
            
            // Update size
            const sizeInCm = updatePenisSize(currentMarketCap);
            updateSizeDisplay(sizeInCm);
            
            // Update vitals
            updateVitals(currentMarketCap, priceChange24h, volume24h);
            
            // Update contract address display (full address)
            if (TOKEN_MINT_ADDRESS) {
                const caEl = document.getElementById('contractAddress');
                if (caEl) {
                    caEl.textContent = TOKEN_MINT_ADDRESS;
                }
            }
            
            updateUIStatus('Connected', 'Connected');
            return true; // Success
        } else {
            console.warn('No price data available');
            return false;
        }
        
    } catch (error) {
        console.error('Error fetching token data:', error);
        return false;
    }
}

// Get token supply from Helius RPC
async function getTokenSupply() {
    if (!TOKEN_MINT_ADDRESS) return null;
    
    try {
        const response = await fetch(HELIUS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTokenSupply',
                params: [TOKEN_MINT_ADDRESS]
            })
        });
        
        const data = await response.json();
        if (data.result && data.result.value) {
            const supply = parseInt(data.result.value.amount);
            tokenDecimals = data.result.value.decimals || 9;
            // Convert to human-readable format
            return supply / Math.pow(10, tokenDecimals);
        }
        return null;
    } catch (error) {
        console.error('Error fetching token supply:', error);
        return null;
    }
}

// Get token price from DexScreener API
async function getTokenPrice() {
    if (!TOKEN_MINT_ADDRESS) return null;
    
    try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_MINT_ADDRESS}`);
        const data = await response.json();
        
        if (data.pairs && data.pairs.length > 0) {
            // Get the pair with highest liquidity
            const bestPair = data.pairs.reduce((prev, current) => {
                const prevLiq = parseFloat(prev.liquidity?.usd || 0);
                const currentLiq = parseFloat(current.liquidity?.usd || 0);
                return currentLiq > prevLiq ? current : prev;
            });
            
            const price = parseFloat(bestPair.priceUsd || 0);
            const volume24h = parseFloat(bestPair.volume?.h24 || 0);
            const priceChange24h = parseFloat(bestPair.priceChange?.h24 || 0);
            
            return {
                price,
                volume24h,
                priceChange24h
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching token price:', error);
        return null;
    }
}

// Simulation mode (primary mode - always runs first)
function startSimulationMode() {
    console.log('🎮 Starting simulation mode');
    
    // Clear any existing interval first
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    
    // Update status FIRST so user sees something
    try {
        updateUIStatus('Simulation Mode', 'Simulation Mode');
    } catch (e) {
        console.error('Error updating status:', e);
    }
    
    // Start updating immediately - this is critical!
    console.log('📊 Calling updateMarketCap() immediately...');
    try {
        updateMarketCap();
        console.log('✅ updateMarketCap() completed successfully');
    } catch (error) {
        console.error('❌ updateMarketCap() failed:', error);
        console.error('Error details:', error.message, error.stack);
        // Try again after a short delay
        setTimeout(() => {
            try {
                updateMarketCap();
            } catch (e) {
                console.error('❌ Retry also failed:', e);
            }
        }, 1000);
    }
    
    // Set up interval for continuous updates
    updateInterval = setInterval(() => {
        try {
            updateMarketCap();
        } catch (error) {
            console.error('❌ Error in updateMarketCap interval:', error);
        }
    }, 5000);
    
    console.log('✅ Simulation mode started, interval set to 5 seconds');
}

function updateMarketCap() {
    try {
        console.log('📊 updateMarketCap() called at', new Date().toLocaleTimeString());
        
        // Simulate market cap (fallback when API is not available)
        const baseMC = 500000; // Base market cap
        const fluctuation = (Math.random() - 0.5) * 200000; // Random fluctuation
        const trend = Math.sin(Date.now() / 100000) * 100000; // Sinusoidal trend
        
        previousMarketCap = currentMarketCap;
        currentMarketCap = Math.max(0, baseMC + fluctuation + trend);
        
        console.log('💰 Calculated market cap:', currentMarketCap.toLocaleString());
        
        // Update UI - wrap each in try/catch to prevent one failure from stopping all
        try {
            updateMarketCapDisplay(currentMarketCap);
            console.log('✅ Market cap display updated');
        } catch (e) { 
            console.error('❌ Error updating market cap display:', e);
        }
        
        // Calculate price (mock calculation)
        const price = currentMarketCap / 1000000000; // Assuming 1B supply
        try {
            updatePriceDisplay(price);
            console.log('✅ Price display updated');
        } catch (e) { 
            console.error('❌ Error updating price display:', e);
        }
        
        // Update volume (mock)
        const volume24h = currentMarketCap * 0.1 * (0.5 + Math.random());
        try {
            updateVolumeDisplay(volume24h);
            console.log('✅ Volume display updated');
        } catch (e) { 
            console.error('❌ Error updating volume display:', e);
        }
        
        // Calculate 24h change
        const change = previousMarketCap > 0 
            ? ((currentMarketCap - previousMarketCap) / previousMarketCap * 100)
            : 0;
        try {
            updateChangeDisplay(change);
            console.log('✅ Change display updated');
        } catch (e) { 
            console.error('❌ Error updating change display:', e);
        }
        
        // Update size
        const sizeInCm = updatePenisSize(currentMarketCap);
        try {
            updateSizeDisplay(sizeInCm);
            console.log('✅ Size display updated:', sizeInCm, 'cm');
        } catch (e) { 
            console.error('❌ Error updating size display:', e);
        }
        
        // Update vitals (using mock volume for simulation)
        const mockVolume = currentMarketCap * 0.1 * (0.5 + Math.random());
        try {
            updateVitals(currentMarketCap, change, mockVolume);
            console.log('✅ Vitals updated');
        } catch (e) { 
            console.error('❌ Error updating vitals:', e);
        }
        
        // Update last update time
        try {
            const lastUpdateEl = document.getElementById('lastUpdate');
            if (lastUpdateEl) {
                lastUpdateEl.textContent = new Date().toLocaleTimeString();
            } else {
                console.warn('⚠️ lastUpdate element not found');
            }
        } catch (e) { 
            console.error('❌ Error updating last update time:', e);
        }
        
        console.log('✅✅✅ updateMarketCap() completed successfully ✅✅✅');
    } catch (error) {
        console.error('❌❌❌ FATAL ERROR in updateMarketCap():', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
    }
}

function updateMarketCapDisplay(mc) {
    const formatted = formatCurrency(mc);
    document.getElementById('marketCap').textContent = formatted;
    document.getElementById('marketCapDetail').textContent = formatted;
}

function updatePriceDisplay(price) {
    document.getElementById('tokenPrice').textContent = `$${price.toFixed(6)}`;
}

function updateChangeDisplay(change) {
    const changeElement = document.getElementById('change24h');
    changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    changeElement.style.color = change >= 0 ? '#4ade80' : '#ef4444';
}

function updateSizeDisplay(sizeInCm) {
    document.getElementById('currentSize').textContent = `${sizeInCm} cm`;
    document.getElementById('currentSizeDetail').textContent = `${sizeInCm} cm`;
}

function updateVitals(marketCap, priceChange24h, volume24h) {
    // Ego Level (based on market cap) - 0% to 100%
    const maxMC = 50000000; // $50M max
    const egoLevel = Math.min((marketCap / maxMC) * 100, 100);
    document.getElementById('egoLevel').textContent = `${egoLevel.toFixed(0)}%`;
    document.getElementById('egoBar').style.width = `${egoLevel}%`;
    
    // Confidence (based on 24h price change)
    // Positive change = HIGH confidence, negative = LOW
    let confidence = 'LOW';
    if (priceChange24h > 20) confidence = 'HIGH';
    else if (priceChange24h > 5) confidence = 'MEDIUM';
    else if (priceChange24h < -20) confidence = 'VERY LOW';
    document.getElementById('confidence').textContent = confidence;
    
    // Horniness (based on daily volume) - $30k to $2M range, fluid/linear
    const minVolume = 30000;  // $30k minimum
    const maxVolume = 2000000; // $2M maximum
    let horninessLevel = 0;
    
    if (volume24h >= maxVolume) {
        horninessLevel = 5; // Full 5 dots
    } else if (volume24h >= minVolume) {
        // Linear scaling: (volume - min) / (max - min) * 5
        horninessLevel = Math.floor(((volume24h - minVolume) / (maxVolume - minVolume)) * 5);
        horninessLevel = Math.min(horninessLevel, 5);
    } else {
        // Below $30k = 0 dots
        horninessLevel = 0;
    }
    
    const horninessDots = document.querySelectorAll('.horn-dot');
    horninessDots.forEach((dot, index) => {
        if (index < horninessLevel) {
            dot.textContent = '🟢';
            dot.classList.add('active');
        } else {
            dot.textContent = '⚪';
            dot.classList.remove('active');
        }
    });
    
    // Flex Power (based on market cap tiers)
    let flexPower = 'WEAK';
    if (marketCap > 10000000) flexPower = 'ULTRA';
    else if (marketCap > 5000000) flexPower = 'STRONG';
    else if (marketCap > 1000000) flexPower = 'MODERATE';
    else if (marketCap > 100000) flexPower = 'RISING';
    document.getElementById('flexPower').textContent = flexPower;
}

function updateVolumeDisplay(volume) {
    const volumeEl = document.getElementById('volume24h');
    if (volumeEl) {
        volumeEl.textContent = formatCurrency(volume);
    } else {
        console.warn('volume24h element not found');
    }
}

function formatCurrency(value) {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`;
    } else {
        return `$${value.toFixed(0)}`;
    }
}

function updateUIStatus(status, newStatus) {
    try {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = newStatus || status;
            console.log('📝 Status updated to:', newStatus || status);
        } else {
            console.warn('⚠️ Status element not found');
        }
    } catch (error) {
        console.error('❌ Error updating status:', error);
    }
}

// Simple mouse/touch controls fallback
function initSimpleControls() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let previousTouchPosition = { x: 0, y: 0 };
    
    // Mouse controls
    renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    renderer.domElement.addEventListener('mousemove', (e) => {
        if (isDragging && pepeGroup) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            pepeGroup.rotation.y += deltaX * 0.01;
            pepeGroup.rotation.x += deltaY * 0.01;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.01;
        camera.position.z = Math.max(3, Math.min(15, camera.position.z));
    });
    
    // Touch controls for mobile
    renderer.domElement.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            isDragging = true;
            previousTouchPosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isDragging && pepeGroup && e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - previousTouchPosition.x;
            const deltaY = e.touches[0].clientY - previousTouchPosition.y;
            pepeGroup.rotation.y += deltaX * 0.01;
            pepeGroup.rotation.x += deltaY * 0.01;
            previousTouchPosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            // Pinch to zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            if (previousTouchPosition.distance) {
                const scale = distance / previousTouchPosition.distance;
                camera.position.z /= scale;
                camera.position.z = Math.max(3, Math.min(15, camera.position.z));
            }
            previousTouchPosition.distance = distance;
        }
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchend', (e) => {
        isDragging = false;
        previousTouchPosition.distance = null;
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update OrbitControls
    if (controls && controls.update) {
        controls.update();
    }
    
    // Subtle idle animation (breathing effect) - only if not dragging
    if (pepeGroup && (!controls || !controls.enabled)) {
        pepeGroup.rotation.y = Math.sin(Date.now() / 3000) * 0.05;
    }
    
    renderer.render(scene, camera);
}

// Window resize handler
function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}


// Initialize Supabase client
function initSupabase() {
    // Check if supabase library is loaded
    if (typeof supabase === 'undefined') {
        console.warn('Supabase library not loaded. Site will work without Supabase.');
        setDefaultLinks();
        return;
    }
    
    if (SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
        SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
        try {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized');
        } catch (error) {
            console.error('❌ Error initializing Supabase:', error);
            setDefaultLinks();
        }
    } else {
        console.warn('Supabase credentials not configured. Using default links.');
        setDefaultLinks();
    }
}

// Load configuration from Supabase
async function loadConfigFromSupabase() {
    if (!supabaseClient) {
        // Use default links if Supabase not configured
        setDefaultLinks();
        return;
    }
    
    try {
        // Fetch configuration from Supabase
        const { data, error } = await supabaseClient
            .from('config')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (error) {
            console.error('Error loading config from Supabase:', error);
            setDefaultLinks();
            return;
        }
        
        if (data) {
            // Update token address if available (from dashboard)
            if (data.token_address) {
                TOKEN_MINT_ADDRESS = data.token_address;
                // Display as CA (Contract Address) - full address
                const contractAddressEl = document.getElementById('contractAddress');
                if (contractAddressEl) {
                    contractAddressEl.textContent = data.token_address;
                }
                // Restart updates with new address from dashboard
                if (updateInterval) {
                    clearInterval(updateInterval);
                }
                startMarketCapUpdates();
            }
            
            // Update social links
            socialLinks.dexscreener = data.dexscreener_link || '';
            socialLinks.bags = data.bags_link || '';
            socialLinks.twitter = data.twitter_link || '';
            
            // Update footer links
            updateFooterLinks();
        } else {
            setDefaultLinks();
        }
    } catch (error) {
        console.error('Error fetching config:', error);
        setDefaultLinks();
    }
}

// Set default links (fallback)
function setDefaultLinks() {
    // Generate DexScreener link from token address
    if (TOKEN_MINT_ADDRESS) {
        socialLinks.dexscreener = `https://dexscreener.com/solana/${TOKEN_MINT_ADDRESS}`;
    }
    socialLinks.bags = '#';
    socialLinks.twitter = '#';
    updateFooterLinks();
}

// Update footer links in the UI
function updateFooterLinks() {
    const dexscreenerLink = document.getElementById('dexscreenerLink');
    const bagsLink = document.getElementById('bagsLink');
    const twitterLink = document.getElementById('twitterLink');
    
    if (dexscreenerLink) {
        dexscreenerLink.href = socialLinks.dexscreener || '#';
    }
    if (bagsLink) {
        bagsLink.href = socialLinks.bags || '#';
    }
    if (twitterLink) {
        twitterLink.href = socialLinks.twitter || '#';
    }
}


