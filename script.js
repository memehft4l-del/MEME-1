// Global variables
let scene, camera, renderer, controls;
let pepeGroup;
let penisMesh;
let baseSize = 1;
let currentMarketCap = 0;
let previousMarketCap = 0;
let updateInterval;
let particleSystem = null;
let raycaster = null;
let mouse = new THREE.Vector2();
let hasRealData = false; // Track if we've successfully fetched real data
let realDataUpdateInterval = null;

// Easter egg variables
let konamiCode = [];
let clickCount = 0;
let easterEggsActive = {
    rainbow: false,
    disco: false,
    bigBobo: false
};

// API Configuration
const HELIUS_API_URL = 'https://mainnet.helius-rpc.com/?api-key=5b8196dc-7a4b-43fa-80f0-8f285ccf318b';
const PAYOUT_WALLET = '7H7hsiRwGrZpWpKbPXEsSrqNCtuT3FDDHGFTsP4sHDyN';
const DEV_WALLET = '7H7hsiRwGrZpWpKbPXEsSrqNCtuT3FDDHGFTsP4sHDyN';
const BET_AMOUNT = 0.1; // Fixed bet amount in SOL
const HOUSE_FEE_PERCENT = 5; // 5% house fee
const WIN_PROBABILITY = 0.35; // 35% chance to win (65% house edge)
let totalSolPaidOut = 0;

// Supabase Configuration
// These can be overridden by environment variables in Vercel
// For Vercel: Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables
const SUPABASE_URL = window.SUPABASE_URL || 'https://cwihyzlbsbbpchkheito.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_Y_MINoKzOLp1DBG23X0HZg_NR9gXzSk';
let supabaseClient = null;

// Token mint address (will be loaded from Supabase, fallback to default)
let TOKEN_MINT_ADDRESS = null; // Will be set from Supabase or default
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
    
    // Initialize scene first
    try {
        initScene();
        console.log('✅ Scene initialized');
    } catch (error) {
        console.error('❌ Scene initialization failed:', error);
        console.error('Error stack:', error.stack);
    }
    
    // Initialize Supabase FIRST (before everything else that needs it)
    initSupabase();
    
    // Initialize UI
    try {
        initUI();
        console.log('✅ UI initialized');
    } catch (error) {
        console.error('❌ UI initialization failed:', error);
        console.error('Error stack:', error.stack);
    }
    
    // Initialize challenge game
    try {
        initChallengeGame();
        console.log('✅ Challenge game initialized');
    } catch (error) {
        console.error('❌ Challenge game initialization failed:', error);
    }
    
    // Initialize memory game
    try {
        initMemoryGame();
        console.log('✅ Memory game initialized');
    } catch (error) {
        console.error('❌ Memory game initialization failed:', error);
    }
    
    // Initialize game selection
    try {
        initGameSelection();
        console.log('✅ Game selection initialized');
    } catch (error) {
        console.error('❌ Game selection initialization failed:', error);
    }
    
    // Initialize casino game
    try {
        initCasinoGame();
        console.log('✅ Casino game initialized');
    } catch (error) {
        console.error('❌ Casino game initialization failed:', error);
    }
    
    // Initialize leaderboard (wait a bit for Supabase to be ready)
    setTimeout(() => {
        try {
            initLeaderboard();
            console.log('✅ Leaderboard initialized');
        } catch (error) {
            console.error('❌ Leaderboard initialization failed:', error);
        }
    }, 1500);
    
    // Initialize payout tracking
    setTimeout(() => {
        try {
            loadPayoutStats();
            console.log('✅ Payout stats initialized');
        } catch (error) {
            console.error('❌ Payout stats initialization failed:', error);
        }
    }, 2000);
    
    // Update payout stats every 60 seconds
    setInterval(() => {
        loadPayoutStats();
    }, 60000);
    
    // Load config from Supabase (async), then start market cap updates
    loadConfigFromSupabase().then(() => {
        // After Supabase config is loaded (or failed), start market cap updates
        try {
            console.log('🔥 Starting market cap updates after Supabase config loaded...');
            console.log('📝 Using token address:', TOKEN_MINT_ADDRESS || 'DEFAULT');
            startMarketCapUpdates();
            console.log('✅ Market cap updates started');
        } catch (error) {
            console.error('❌ Market cap updates failed:', error);
            console.error('Error stack:', error.stack);
        }
    }).catch((error) => {
        console.error('Supabase config load error, starting with defaults:', error);
        // Set default token address if Supabase fails
        if (!TOKEN_MINT_ADDRESS) {
            TOKEN_MINT_ADDRESS = 'Ep7o7wAi4NUJWAfpuGYd46DjJ88yYMY2wt9yd6n9pump';
        }
        try {
            startMarketCapUpdates();
        } catch (e) {
            console.error('Failed to start market cap updates:', e);
        }
    });
    
    // Contract address will be set after Supabase loads
    const contractAddressEl = document.getElementById('contractAddress');
    if (contractAddressEl && (!contractAddressEl.textContent || contractAddressEl.textContent === '--')) {
        contractAddressEl.textContent = 'Loading...';
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
    
    // Initialize raycaster for click detection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Add click listener for penis easter egg (use capture phase to catch before OrbitControls)
    setTimeout(() => {
        if (renderer && renderer.domElement) {
            renderer.domElement.addEventListener('click', onCanvasClick, true); // Use capture phase
            console.log('✅ Penis click listener added');
        }
    }, 500);
    
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
    // Make sure penis is clickable
    penisMesh.userData.clickable = true;
    pepeGroup.add(penisMesh);
    
    // Tip
    const tipGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const tipMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff4757,
        shininess: 50
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.set(0, -0.2, 0.4 + baseSize / 2);
    tip.userData.clickable = true;
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
    
    // Easter eggs initialization
    initEasterEggs();
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
    
    // Try to fetch real data every 5 seconds
    // Only continue simulation if real data fetch fails
    realDataUpdateInterval = setInterval(async () => {
        try {
            const success = await fetchTokenData();
            // If real data fetch fails, re-enable simulation mode
            if (!success && !hasRealData && !updateInterval) {
                console.log('⚠️ Real data fetch failed, re-enabling simulation mode');
                startSimulationMode();
            }
        } catch (error) {
            console.error('⚠️ Periodic fetch error:', error);
            // If we don't have real data yet, keep simulation running
            if (!hasRealData && !updateInterval) {
                startSimulationMode();
            }
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
            const priceChange1h = priceData.priceChange1h || 0; // Changed to 1h
            
            // Calculate market cap
            previousMarketCap = currentMarketCap;
            currentMarketCap = (tokenSupply * tokenPrice) || 0;
            
            console.log('Real data fetched - MC:', currentMarketCap, 'Price:', tokenPrice);
            
            // Mark that we have real data - this will stop simulation updates
            hasRealData = true;
            
            // Stop simulation mode interval if it's running
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
                console.log('✅ Stopped simulation mode - using real data');
            }
            
            // Update UI with real data
            updateMarketCapDisplay(currentMarketCap);
            updatePriceDisplay(tokenPrice);
            updateVolumeDisplay(volume24h);
            updateChangeDisplay(priceChange1h);
            
            // Update size
            const sizeInCm = updatePenisSize(currentMarketCap);
            updateSizeDisplay(sizeInCm);
            
            // Update vitals (using 1h change for confidence)
            updateVitals(currentMarketCap, priceChange1h, volume24h);
            
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
            const priceChange1h = parseFloat(bestPair.priceChange?.h1 || 0); // Changed to 1h
            
            return {
                price,
                volume24h,
                priceChange1h
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
    
    // Initialize countdown timer
    let countdownSeconds = 5;
    const countdownInterval = setInterval(() => {
        countdownSeconds--;
        const nextUpdateEl = document.getElementById('nextUpdate');
        if (nextUpdateEl) {
            if (countdownSeconds > 0) {
                nextUpdateEl.textContent = `${countdownSeconds}s`;
            } else {
                nextUpdateEl.textContent = 'Updating...';
                countdownSeconds = 5; // Reset for next cycle
            }
        }
    }, 1000);
    
    console.log('✅ Simulation mode started, interval set to 5 seconds');
}

function updateMarketCap() {
    try {
        // Don't update if we have real data - let the real API handle updates
        if (hasRealData) {
            console.log('⏭️ Skipping simulation update - real data available');
            return;
        }
        
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
        
        // Calculate 1h change (simulated)
        const change = previousMarketCap > 0 
            ? ((currentMarketCap - previousMarketCap) / previousMarketCap * 100)
            : (Math.random() - 0.5) * 10; // Random change for simulation
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
        
        // Next update countdown is handled by the global interval
        
        // Update growth percentage
        try {
            const growthEl = document.getElementById('growth');
            if (growthEl && previousMarketCap > 0) {
                const growth = ((currentMarketCap - previousMarketCap) / previousMarketCap) * 100;
                growthEl.textContent = `${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%`;
                growthEl.style.color = growth >= 0 ? '#4ade80' : '#ef4444';
            } else if (growthEl) {
                growthEl.textContent = '--%';
                growthEl.style.color = '';
            }
        } catch (e) {
            console.error('❌ Error updating growth:', e);
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
    const marketCapEl = document.getElementById('marketCap');
    const marketCapDetailEl = document.getElementById('marketCapDetail');
    
    if (marketCapEl && marketCapEl.textContent !== formatted) {
        marketCapEl.style.opacity = '0.5';
        setTimeout(() => {
            marketCapEl.textContent = formatted;
            marketCapEl.style.opacity = '1';
        }, 150);
    } else if (marketCapEl) {
        marketCapEl.textContent = formatted;
    }
    
    if (marketCapDetailEl && marketCapDetailEl.textContent !== formatted) {
        marketCapDetailEl.style.opacity = '0.5';
        setTimeout(() => {
            marketCapDetailEl.textContent = formatted;
            marketCapDetailEl.style.opacity = '1';
        }, 150);
    } else if (marketCapDetailEl) {
        marketCapDetailEl.textContent = formatted;
    }
}

function updatePriceDisplay(price) {
    const priceEl = document.getElementById('tokenPrice');
    if (priceEl) {
        const newText = `$${price.toFixed(6)}`;
        if (priceEl.textContent !== newText) {
            priceEl.style.opacity = '0.5';
            setTimeout(() => {
                priceEl.textContent = newText;
                priceEl.style.opacity = '1';
            }, 150);
        } else {
            priceEl.textContent = newText;
        }
    }
}

function updateChangeDisplay(change) {
    const changeElement = document.getElementById('change1h');
    const changeDetailElement = document.getElementById('change1hDetail');
    
    const formatted = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    const color = change >= 0 ? '#4ade80' : '#ef4444';
    
    if (changeElement) {
        if (changeElement.textContent !== formatted) {
            changeElement.style.opacity = '0.5';
            setTimeout(() => {
                changeElement.textContent = formatted;
                changeElement.style.color = color;
                changeElement.style.opacity = '1';
            }, 150);
        } else {
            changeElement.textContent = formatted;
            changeElement.style.color = color;
        }
    }
    
    if (changeDetailElement) {
        if (changeDetailElement.textContent !== formatted) {
            changeDetailElement.style.opacity = '0.5';
            setTimeout(() => {
                changeDetailElement.textContent = formatted;
                changeDetailElement.style.color = color;
                changeDetailElement.style.opacity = '1';
            }, 150);
        } else {
            changeDetailElement.textContent = formatted;
            changeDetailElement.style.color = color;
        }
    }
}

function updateSizeDisplay(sizeInCm) {
    const sizeText = `${sizeInCm} cm`;
    const currentSizeEl = document.getElementById('currentSize');
    const currentSizeDetailEl = document.getElementById('currentSizeDetail');
    
    if (currentSizeEl) {
        if (currentSizeEl.textContent !== sizeText) {
            currentSizeEl.style.opacity = '0.5';
            setTimeout(() => {
                currentSizeEl.textContent = sizeText;
                currentSizeEl.style.opacity = '1';
            }, 150);
        } else {
            currentSizeEl.textContent = sizeText;
        }
    }
    
    if (currentSizeDetailEl) {
        if (currentSizeDetailEl.textContent !== sizeText) {
            currentSizeDetailEl.style.opacity = '0.5';
            setTimeout(() => {
                currentSizeDetailEl.textContent = sizeText;
                currentSizeDetailEl.style.opacity = '1';
            }, 150);
        } else {
            currentSizeDetailEl.textContent = sizeText;
        }
    }
}

function updateVitals(marketCap, priceChange1h, volume24h) {
    // Ego Level (based on market cap) - 0% to 100%
    const maxMC = 50000000; // $50M max
    const egoLevel = Math.min((marketCap / maxMC) * 100, 100);
    document.getElementById('egoLevel').textContent = `${egoLevel.toFixed(0)}%`;
    document.getElementById('egoBar').style.width = `${egoLevel}%`;
    
    // Confidence (based on 1h price change - adjusted thresholds for 1h)
    let confidence = 'LOW';
    if (priceChange1h > 10) confidence = 'HIGH'; // Adjusted for 1h
    else if (priceChange1h > 2) confidence = 'MEDIUM';
    else if (priceChange1h < -10) confidence = 'VERY LOW';
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
        const formatted = formatCurrency(volume);
        if (volumeEl.textContent !== formatted) {
            volumeEl.style.opacity = '0.5';
            setTimeout(() => {
                volumeEl.textContent = formatted;
                volumeEl.style.opacity = '1';
            }, 150);
        } else {
            volumeEl.textContent = formatted;
        }
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
    
    renderer.render(scene, camera);
}

// Window resize handler
function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Welcome modal
function showWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function hideWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Initialize Supabase client
function initSupabase() {
    // Wait for supabase library to load
    if (typeof supabase === 'undefined') {
        console.warn('Supabase library not loaded yet, retrying...');
        // Retry after a short delay
        setTimeout(() => {
            if (typeof supabase !== 'undefined') {
                initSupabase();
            } else {
                console.warn('Supabase library not loaded. Site will work without Supabase.');
                setDefaultLinks();
            }
        }, 500);
        return;
    }
    
    if (SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
        SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
        try {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized');
            console.log('Supabase URL:', SUPABASE_URL);
            console.log('Supabase Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
            
            // Test connection
            testSupabaseConnection();
        } catch (error) {
            console.error('❌ Error initializing Supabase:', error);
            setDefaultLinks();
        }
    } else {
        console.warn('Supabase credentials not configured. Using default links.');
        console.warn('URL:', SUPABASE_URL);
        console.warn('Key:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'missing');
        setDefaultLinks();
    }
}

// Test Supabase connection
async function testSupabaseConnection() {
    if (!supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('config')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('❌ Supabase connection test failed:', error);
        } else {
            console.log('✅ Supabase connection test successful');
        }
    } catch (error) {
        console.error('❌ Supabase connection test error:', error);
    }
}

// Load configuration from Supabase
async function loadConfigFromSupabase() {
    if (!supabaseClient) {
        // Use default links if Supabase not configured
        console.log('⚠️ Supabase not configured, using default token address');
        if (!TOKEN_MINT_ADDRESS) {
            TOKEN_MINT_ADDRESS = 'Ep7o7wAi4NUJWAfpuGYd46DjJ88yYMY2wt9yd6n9pump';
        }
        setDefaultLinks();
        return;
    }
    
    try {
        console.log('📥 Loading config from Supabase...');
        // Fetch configuration from Supabase
        const { data, error } = await supabaseClient
            .from('config')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (error) {
            console.error('❌ Error loading config from Supabase:', error);
            // Use default token address if Supabase fails
            if (!TOKEN_MINT_ADDRESS) {
                TOKEN_MINT_ADDRESS = 'Ep7o7wAi4NUJWAfpuGYd46DjJ88yYMY2wt9yd6n9pump';
            }
            setDefaultLinks();
            return;
        }
        
        if (data) {
            console.log('✅ Config loaded from Supabase:', data);
            
            // Update token address from Supabase (this is the source of truth)
            if (data.token_address && data.token_address.trim()) {
                TOKEN_MINT_ADDRESS = data.token_address.trim();
                console.log('✅ Token address set from Supabase:', TOKEN_MINT_ADDRESS);
                
                // Display as CA (Contract Address) - full address
                const contractAddressEl = document.getElementById('contractAddress');
                if (contractAddressEl) {
                    contractAddressEl.textContent = TOKEN_MINT_ADDRESS;
                }
            } else {
                // Fallback to default if Supabase has no token address
                if (!TOKEN_MINT_ADDRESS) {
                    TOKEN_MINT_ADDRESS = 'Ep7o7wAi4NUJWAfpuGYd46DjJ88yYMY2wt9yd6n9pump';
                    console.log('⚠️ No token address in Supabase, using default:', TOKEN_MINT_ADDRESS);
                }
                
                // Still update the display
                const contractAddressEl = document.getElementById('contractAddress');
                if (contractAddressEl && TOKEN_MINT_ADDRESS) {
                    contractAddressEl.textContent = TOKEN_MINT_ADDRESS;
                }
            }
            
            // Update social links
            socialLinks.dexscreener = data.dexscreener_link || '';
            socialLinks.bags = data.bags_link || '';
            socialLinks.twitter = data.twitter_link || '';
            
            // Update footer links
            updateFooterLinks();
        } else {
            console.warn('⚠️ No config data found in Supabase, using defaults');
            if (!TOKEN_MINT_ADDRESS) {
                TOKEN_MINT_ADDRESS = 'Ep7o7wAi4NUJWAfpuGYd46DjJ88yYMY2wt9yd6n9pump';
            }
            setDefaultLinks();
        }
    } catch (error) {
        console.error('❌ Error fetching config:', error);
        if (!TOKEN_MINT_ADDRESS) {
            TOKEN_MINT_ADDRESS = 'Ep7o7wAi4NUJWAfpuGYd46DjJ88yYMY2wt9yd6n9pump';
        }
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

// Penis click easter egg - white stuff comes out
function onCanvasClick(event) {
    if (!penisMesh || !camera || !scene || !raycaster || !renderer) {
        console.log('Missing required objects:', {penisMesh: !!penisMesh, camera: !!camera, scene: !!scene, raycaster: !!raycaster, renderer: !!renderer});
        return;
    }
    
    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Check if penis or tip was clicked (check both)
    const objectsToCheck = [penisMesh];
    if (penisMesh.tip) {
        objectsToCheck.push(penisMesh.tip);
    }
    
    const intersects = raycaster.intersectObjects(objectsToCheck, false);
    
    console.log('Click detected, intersects:', intersects.length);
    
    if (intersects.length > 0) {
        // Get the tip position (where particles should come from)
        let tipPosition;
        if (penisMesh.tip) {
            // Get world position of tip
            const worldPos = new THREE.Vector3();
            penisMesh.tip.getWorldPosition(worldPos);
            tipPosition = worldPos;
        } else {
            tipPosition = intersects[0].point;
        }
        
        console.log('Penis clicked! Creating particle effect at:', tipPosition);
        createPenisParticleEffect(tipPosition);
        showEasterEggMessage('💦 SPLOOSH! 💦');
    }
}

function createPenisParticleEffect(position) {
    // Remove existing particles if any
    if (particleSystem) {
        scene.remove(particleSystem);
        particleSystem.geometry.dispose();
        particleSystem.material.dispose();
    }
    
    // Create particle system
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    // Initialize particles at penis tip position
    const startPos = position.clone();
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Start position (at penis tip)
        positions[i3] = startPos.x;
        positions[i3 + 1] = startPos.y;
        positions[i3 + 2] = startPos.z;
        
        // Random velocity (shooting out)
        velocities.push({
            x: (Math.random() - 0.5) * 0.3,
            y: Math.random() * 0.4 + 0.2, // Upward bias
            z: (Math.random() - 0.5) * 0.3
        });
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create material (white, semi-transparent)
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    particleSystem = new THREE.Points(particles, material);
    scene.add(particleSystem);
    
    // Animate particles
    let frame = 0;
    const maxFrames = 60; // 1 second at 60fps
    
    function animateParticles() {
        if (frame >= maxFrames || !particleSystem) {
            if (particleSystem) {
                scene.remove(particleSystem);
                particleSystem.geometry.dispose();
                particleSystem.material.dispose();
                particleSystem = null;
            }
            return;
        }
        
        const positions = particleSystem.geometry.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const vel = velocities[i];
            
            // Update position
            positions[i3] += vel.x;
            positions[i3 + 1] += vel.y;
            positions[i3 + 2] += vel.z;
            
            // Gravity effect
            vel.y -= 0.01;
            
            // Fade out
            const alpha = 1 - (frame / maxFrames);
            if (i === 0) {
                particleSystem.material.opacity = alpha * 0.8;
            }
        }
        
        particleSystem.geometry.attributes.position.needsUpdate = true;
        frame++;
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
}

// Easter Eggs
function initEasterEggs() {
    // Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    let konamiCode = [];
    
    document.addEventListener('keydown', (e) => {
        konamiCode.push(e.code);
        if (konamiCode.length > konamiSequence.length) {
            konamiCode.shift();
        }
        
        if (konamiCode.join(',') === konamiSequence.join(',')) {
            activateRainbowMode();
            konamiCode = [];
        }
    });
    
    // Click counter easter egg (click BOBO 10 times)
    const canvas = document.getElementById('pepe-canvas');
    if (canvas) {
        canvas.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 10) {
                activateBigBobo();
                clickCount = 0;
            }
            
            // Reset counter after 3 seconds
            setTimeout(() => {
                if (clickCount < 10) clickCount = 0;
            }, 3000);
        });
    }
    
    // Triple tap on mobile
    let tapCount = 0;
    let tapTimer;
    if (canvas) {
        canvas.addEventListener('touchstart', () => {
            tapCount++;
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => {
                if (tapCount === 3) {
                    activateDiscoMode();
                }
                tapCount = 0;
            }, 500);
        });
    }
}

function activateRainbowMode() {
    easterEggsActive.rainbow = !easterEggsActive.rainbow;
    document.body.classList.toggle('rainbow-mode', easterEggsActive.rainbow);
    showEasterEggMessage('🌈 RAINBOW MODE ACTIVATED! 🌈');
}

function activateDiscoMode() {
    easterEggsActive.disco = !easterEggsActive.disco;
    document.body.classList.toggle('disco-mode', easterEggsActive.disco);
    showEasterEggMessage('💃 DISCO MODE! 💃');
}

function activateBigBobo() {
    easterEggsActive.bigBobo = !easterEggsActive.bigBobo;
    if (pepeGroup) {
        if (easterEggsActive.bigBobo) {
            pepeGroup.scale.set(2, 2, 2);
            showEasterEggMessage('🔍 BIG BOBO MODE!');
        } else {
            pepeGroup.scale.set(1, 1, 1);
        }
    }
}

function showEasterEggMessage(message) {
    const msg = document.createElement('div');
    msg.className = 'easter-egg-message';
    msg.textContent = message;
    document.body.appendChild(msg);
    
    setTimeout(() => {
        msg.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        msg.classList.remove('show');
        setTimeout(() => msg.remove(), 500);
    }, 3000);
}

// Challenge Game Logic
let walletAddress = null;
let gameState = {
    level: 1,
    score: 0,
    timeLeft: 30,
    gameActive: false,
    gameTimer: null,
    targetTimer: null,
    targetsHit: 0,
    targetsNeeded: 0,
    targetSpeed: 2000,
    misses: 0
};

// Initialize challenge game
function initChallengeGame() {
    // Wallet address input
    const walletInput = document.getElementById('walletAddressInput');
    const submitWalletBtn = document.getElementById('submitWalletBtn');
    
    if (submitWalletBtn) {
        submitWalletBtn.addEventListener('click', submitWalletAddress);
    }
    
    if (walletInput) {
        walletInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitWalletAddress();
            }
        });
    }
    
    // Start game button
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
    }
    
    // Target button click
    const targetButton = document.getElementById('targetButton');
    if (targetButton) {
        targetButton.addEventListener('click', hitTarget);
    }
    
    // Play again button
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            document.getElementById('gameResult').style.display = 'none';
            document.getElementById('startGameBtn').style.display = 'block';
            document.getElementById('gamePlayArea').style.display = 'none';
        });
    }
    
    // Claim airdrop button
    const claimBtn = document.getElementById('claimAirdropBtn');
    if (claimBtn) {
        claimBtn.addEventListener('click', claimAirdrop);
    }
}

function isValidSolanaAddress(address) {
    // Basic Solana address validation (base58, 32-44 chars)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
}

async function submitWalletAddress() {
    const walletInput = document.getElementById('walletAddressInput');
    const address = walletInput ? walletInput.value.trim() : '';
    
    if (!address) {
        alert('Please enter your Solana wallet address!');
        return;
    }
    
    if (!isValidSolanaAddress(address)) {
        alert('Invalid Solana wallet address format!');
        return;
    }
    
    walletAddress = address;
    
    // Store wallet address in Supabase
    try {
        if (supabaseClient) {
            const { error } = await supabaseClient
                .from('game_participants')
                .insert({
                    wallet_address: walletAddress,
                    created_at: new Date().toISOString()
                });
            
            if (error && error.code !== '23505') { // Ignore duplicate key errors
                console.error('Error storing wallet:', error);
            }
        }
    } catch (err) {
        console.error('Supabase error:', err);
    }
    
    // Update UI
    document.getElementById('walletStatus').style.display = 'none';
    document.getElementById('walletConnected').style.display = 'block';
    document.getElementById('walletAddress').textContent = 
        walletAddress.substring(0, 8) + '...' + walletAddress.substring(walletAddress.length - 8);
    document.getElementById('gameArea').style.display = 'block';
    
    console.log('Wallet address submitted:', walletAddress);
}

function startGame() {
    if (!walletAddress) {
        alert('Please enter your wallet address first!');
        return;
    }
    
    // Reset game state - Start at level 3 (hard levels only)
    gameState.level = 3;
    gameState.score = 0;
    gameState.timeLeft = 25;
    gameState.gameActive = true;
    gameState.targetsHit = 0;
    gameState.targetsNeeded = 14; // Level 3 starts with 14 targets
    gameState.targetSpeed = 1500; // 1.5 seconds to click (harder)
    gameState.misses = 0;
    
    // Clear any existing timers
    if (gameState.gameTimer) clearInterval(gameState.gameTimer);
    if (gameState.targetTimer) clearInterval(gameState.targetTimer);
    
    // Show game area
    document.getElementById('startGameBtn').style.display = 'none';
    const playArea = document.getElementById('gamePlayArea');
    playArea.style.display = 'block';
    playArea.classList.remove('level-5'); // Reset level class
    document.getElementById('gameResult').style.display = 'none';
    
    updateGameDisplay();
    startTimer();
    spawnTarget();
}

function spawnTarget() {
    if (!gameState.gameActive) return;
    
    const targetButton = document.getElementById('targetButton');
    const playArea = document.getElementById('gamePlayArea');
    
    if (!targetButton || !playArea) return;
    
    // Get actual dimensions (account for mobile and level 5)
    const playAreaRect = playArea.getBoundingClientRect();
    let buttonSize;
    if (gameState.level === 5) {
        // Level 5: Smaller targets
        buttonSize = window.innerWidth <= 480 ? 50 : window.innerWidth <= 768 ? 55 : 60;
    } else {
        buttonSize = window.innerWidth <= 480 ? 60 : window.innerWidth <= 768 ? 70 : 80;
    }
    const maxX = playAreaRect.width - buttonSize;
    const maxY = playAreaRect.height - buttonSize;
    
    // Ensure target is within bounds
    const x = Math.max(10, Math.min(maxX - 10, Math.random() * maxX));
    const y = Math.max(10, Math.min(maxY - 10, Math.random() * maxY));
    
    targetButton.style.width = buttonSize + 'px';
    targetButton.style.height = buttonSize + 'px';
    targetButton.style.left = x + 'px';
    targetButton.style.top = y + 'px';
    targetButton.style.display = 'block';
    targetButton.style.opacity = '1';
    targetButton.classList.add('target-visible');
    
    // Target disappears after timeout (miss)
    gameState.targetTimer = setTimeout(() => {
        if (targetButton.classList.contains('target-visible')) {
            targetButton.classList.remove('target-visible');
            targetButton.style.display = 'none';
            gameState.misses++;
            
            // Lose time for missing (more penalty on level 5)
            const timePenalty = gameState.level === 5 ? 2 : 1;
            gameState.timeLeft = Math.max(0, gameState.timeLeft - timePenalty);
            updateGameDisplay();
            
            // Spawn next target
            if (gameState.gameActive) {
                spawnTarget();
            }
        }
    }, gameState.targetSpeed);
}

function hitTarget() {
    if (!gameState.gameActive) return;
    
    const targetButton = document.getElementById('targetButton');
    if (!targetButton || !targetButton.classList.contains('target-visible')) return;
    
    // Clear timeout
    if (gameState.targetTimer) {
        clearTimeout(gameState.targetTimer);
        gameState.targetTimer = null;
    }
    
    // Hide target
    targetButton.classList.remove('target-visible');
    targetButton.style.display = 'none';
    
    // Update score
    gameState.targetsHit++;
    gameState.score += gameState.level * 10;
    
    updateGameDisplay();
    
    // Check level complete
    if (gameState.targetsHit >= gameState.targetsNeeded) {
        completeLevel();
    } else {
        // Spawn next target (faster each time, but level 5 doesn't get faster)
        if (gameState.level < 5) {
            gameState.targetSpeed = Math.max(800, gameState.targetSpeed - 50);
        } else {
            // Level 5: Speed stays the same or gets slightly faster (but not too much)
            gameState.targetSpeed = Math.max(500, gameState.targetSpeed - 10);
        }
        spawnTarget();
    }
}

function completeLevel() {
    // Only level 5 completion allows airdrop claim
    if (gameState.level >= 5) {
        // Game won! (completed level 5)
        gameState.gameActive = false;
        stopTimer();
        if (gameState.targetTimer) {
            clearTimeout(gameState.targetTimer);
        }
        showGameResult(true);
    } else {
        // Next level - harder!
        gameState.level++;
        gameState.targetsHit = 0;
        
        // Level 5 is EXTREMELY hard - almost impossible
        if (gameState.level === 5) {
            gameState.targetsNeeded = 30; // Need to hit 30 targets (was 18)
            gameState.targetSpeed = 600; // Only 0.6 seconds to click (was 1100ms)
            gameState.timeLeft = Math.max(gameState.timeLeft, 20); // Max 20 seconds, no bonus
            
            // Add level-5 class for smaller targets
            const playArea = document.getElementById('gamePlayArea');
            if (playArea) {
                playArea.classList.add('level-5');
            }
        } else {
            // Level 3: 14 targets, Level 4: 16 targets
            gameState.targetsNeeded = 14 + ((gameState.level - 3) * 2);
            gameState.targetSpeed = Math.max(800, 1500 - ((gameState.level - 3) * 200));
            gameState.timeLeft += 3; // Small bonus time
        }
        
        // Show level complete message
        const instructions = document.getElementById('gameInstructions');
        if (instructions) {
            if (gameState.level === 5) {
                instructions.textContent = `⚠️ FINAL LEVEL - EXTREME DIFFICULTY ⚠️`;
                setTimeout(() => {
                    instructions.textContent = `Hit ${gameState.targetsNeeded} targets in ${gameState.timeLeft}s! Targets appear for only ${gameState.targetSpeed}ms!`;
                }, 2000);
            } else {
                instructions.textContent = `Level ${gameState.level - 1} Complete! Starting Level ${gameState.level}...`;
                setTimeout(() => {
                    instructions.textContent = `Hit ${gameState.targetsNeeded} targets! Complete Level 5 to win SOL airdrop!`;
                }, 2000);
            }
        }
        
        // Continue to next level
        spawnTarget();
    }
}

function startTimer() {
    gameState.gameTimer = setInterval(() => {
        gameState.timeLeft--;
        updateGameDisplay();
        
        if (gameState.timeLeft <= 0) {
            gameState.gameActive = false;
            stopTimer();
            if (gameState.targetTimer) {
                clearTimeout(gameState.targetTimer);
            }
            const targetButton = document.getElementById('targetButton');
            if (targetButton) {
                targetButton.style.display = 'none';
            }
            showGameResult(false);
        }
    }, 1000);
}

function stopTimer() {
    if (gameState.gameTimer) {
        clearInterval(gameState.gameTimer);
        gameState.gameTimer = null;
    }
}

function stopGame() {
    gameState.gameActive = false;
    stopTimer();
    if (gameState.targetTimer) {
        clearTimeout(gameState.targetTimer);
        gameState.targetTimer = null;
    }
    const targetButton = document.getElementById('targetButton');
    if (targetButton) {
        targetButton.style.display = 'none';
    }
}

function updateGameDisplay() {
    const levelEl = document.getElementById('gameLevel');
    const scoreEl = document.getElementById('gameScore');
    const timeEl = document.getElementById('gameTime');
    
    if (levelEl) levelEl.textContent = gameState.level;
    if (scoreEl) scoreEl.textContent = gameState.score;
    if (timeEl) {
        timeEl.textContent = gameState.timeLeft;
        // Visual warning when time is low
        if (gameState.timeLeft <= 5) {
            timeEl.style.color = '#ef4444';
            timeEl.style.animation = 'pulse 0.5s infinite';
        } else {
            timeEl.style.color = '';
            timeEl.style.animation = '';
        }
    }
    
    // Update instructions
    const instructionsEl = document.getElementById('gameInstructions');
    if (instructionsEl && gameState.gameActive) {
        if (gameState.level === 5) {
            instructionsEl.textContent = `⚠️ LEVEL 5: ${gameState.targetsHit}/${gameState.targetsNeeded} targets | ${gameState.timeLeft}s left | ${gameState.targetSpeed}ms per target ⚠️`;
        } else {
            instructionsEl.textContent = `Level ${gameState.level}: Hit ${gameState.targetsNeeded} targets! Progress: ${gameState.targetsHit}/${gameState.targetsNeeded} (Complete Level 5 to win!)`;
        }
    }
}

function showGameResult(won) {
    const resultDiv = document.getElementById('gameResult');
    const messageEl = document.getElementById('resultMessage');
    const claimBtn = document.getElementById('claimAirdropBtn');
    
    resultDiv.style.display = 'block';
    
    if (won) {
        messageEl.textContent = '🎉 Congratulations! You completed the challenge! 🎉';
        messageEl.style.color = '#4ade80';
        claimBtn.style.display = 'block';
    } else {
        messageEl.textContent = '⏰ Time\'s up! Try again to win SOL airdrop!';
        messageEl.style.color = '#ef4444';
        claimBtn.style.display = 'none';
    }
}

async function claimAirdrop() {
    if (!walletAddress) {
        alert('Wallet address not entered!');
        return;
    }
    
    if (gameState.level < 5) {
        alert('You must complete level 5 to claim the airdrop!');
        return;
    }
    
    try {
        const claimBtn = document.getElementById('claimAirdropBtn');
        claimBtn.disabled = true;
        claimBtn.textContent = 'Processing...';
        
        // Check if already claimed in Supabase
        let alreadyClaimed = false;
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('game_winners')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();
            
            if (data) {
                alreadyClaimed = true;
            }
        }
        
        if (alreadyClaimed) {
            alert('❌ You have already claimed your airdrop!');
            claimBtn.disabled = false;
            claimBtn.textContent = 'Claim SOL Airdrop';
            return;
        }
        
        // Store winner in Supabase
        if (supabaseClient) {
            const { error } = await supabaseClient
                .from('game_winners')
                .insert({
                    wallet_address: walletAddress,
                    level: gameState.level,
                    score: gameState.score,
                    claimed_at: new Date().toISOString()
                });
            
            if (error) {
                console.error('Error storing winner:', error);
                alert('❌ Error processing claim. Please try again.');
                claimBtn.disabled = false;
                claimBtn.textContent = 'Claim SOL Airdrop';
                return;
            }
        }
        
        alert('✅ Success! Your wallet address has been recorded. SOL airdrop will be sent manually by the dev team!');
        claimBtn.style.display = 'none';
        
        // Refresh leaderboard
        if (typeof loadLeaderboard === 'function') {
            loadLeaderboard();
        }
        
    } catch (error) {
        console.error('Airdrop claim error:', error);
        alert('❌ Error claiming airdrop. Please contact support.');
        const claimBtn = document.getElementById('claimAirdropBtn');
        claimBtn.disabled = false;
        claimBtn.textContent = 'Claim SOL Airdrop';
    }
}

// Leaderboard Logic
function initLeaderboard() {
    // Load leaderboard on init
    loadLeaderboard();
    
    // Refresh leaderboard every 30 seconds
    setInterval(loadLeaderboard, 30000);
}

async function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    
    leaderboardList.innerHTML = '<p class="loading-text">Loading leaderboard...</p>';
    
    // Wait for Supabase to initialize if not ready
    if (!supabaseClient) {
        // Check if Supabase library is available
        if (typeof supabase === 'undefined') {
            leaderboardList.innerHTML = '<p class="error-text">Supabase library loading...</p>';
            // Retry after a delay
            setTimeout(loadLeaderboard, 1000);
            return;
        }
        
        // Try to initialize Supabase if credentials are available
        if (SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
            SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
            try {
                supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Supabase initialized for leaderboard');
            } catch (error) {
                console.error('❌ Error initializing Supabase:', error);
                leaderboardList.innerHTML = '<p class="error-text">Failed to connect to database</p>';
                return;
            }
        } else {
            leaderboardList.innerHTML = '<p class="error-text">Database not configured</p>';
            return;
        }
    }
    
    try {
        
        // Get all winners - unified leaderboard
        const { data, error } = await supabaseClient
            .from('game_winners')
            .select('wallet_address, level, score, claimed_at')
            .order('level', { ascending: false })
            .order('score', { ascending: false })
            .order('claimed_at', { ascending: true })
            .limit(100);
        
        if (error) {
            console.error('Error loading leaderboard:', error);
            leaderboardList.innerHTML = '<p class="error-text">Error loading leaderboard</p>';
            return;
        }
        
        if (!data || data.length === 0) {
            leaderboardList.innerHTML = '<p class="no-data-text">No winners yet. Be the first!</p>';
            return;
        }
        
        // Group by wallet address to get highest level per wallet
        const walletMap = new Map();
        data.forEach(entry => {
            const addr = entry.wallet_address;
            if (!walletMap.has(addr) || 
                walletMap.get(addr).level < entry.level ||
                (walletMap.get(addr).level === entry.level && walletMap.get(addr).score < entry.score)) {
                walletMap.set(addr, entry);
            }
        });
        
        // Convert to array and sort
        const leaderboard = Array.from(walletMap.values())
            .sort((a, b) => {
                if (b.level !== a.level) return b.level - a.level;
                if (b.score !== a.score) return b.score - a.score;
                return new Date(a.claimed_at) - new Date(b.claimed_at);
            })
            .slice(0, 50); // Top 50
        
        // Display leaderboard
        let html = '<div class="leaderboard-header">';
        html += '<span class="rank-col">Rank</span>';
        html += '<span class="wallet-col">Wallet</span>';
        html += '<span class="level-col">Level</span>';
        html += '<span class="score-col">Score</span>';
        html += '</div>';
        
        leaderboard.forEach((entry, index) => {
            const rank = index + 1;
            const walletDisplay = entry.wallet_address.substring(0, 6) + '...' + entry.wallet_address.substring(entry.wallet_address.length - 6);
            const date = new Date(entry.claimed_at);
            const dateStr = date.toLocaleDateString();
            
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-gold';
            else if (rank === 2) rankClass = 'rank-silver';
            else if (rank === 3) rankClass = 'rank-bronze';
            
            html += `<div class="leaderboard-item ${rankClass}">`;
            html += `<span class="rank-col">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank}</span>`;
            html += `<span class="wallet-col" title="${entry.wallet_address}">${walletDisplay}</span>`;
            html += `<span class="level-col">Level ${entry.level}</span>`;
            html += `<span class="score-col">${entry.score.toLocaleString()}</span>`;
            html += `</div>`;
        });
        
        leaderboardList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardList.innerHTML = '<p class="error-text">Error loading leaderboard</p>';
    }
}

// Payout Stats Logic
async function loadPayoutStats() {
    try {
        // Get total winners count from Supabase
        let totalWinners = 0;
        if (supabaseClient) {
            const { count } = await supabaseClient
                .from('game_winners')
                .select('*', { count: 'exact', head: true });
            totalWinners = count || 0;
        }
        
        const winnersEl = document.getElementById('totalWinners');
        if (winnersEl) {
            winnersEl.textContent = totalWinners.toLocaleString();
        }
        
        // Get SOL paid out from wallet transactions
        await calculateSolPaidOut();
        
    } catch (error) {
        console.error('Error loading payout stats:', error);
    }
}

async function calculateSolPaidOut() {
    try {
        // Use Helius API to get transaction history
        const response = await fetch(HELIUS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getSignaturesForAddress',
                params: [
                    PAYOUT_WALLET,
                    {
                        limit: 1000, // Get last 1000 transactions
                        commitment: 'confirmed'
                    }
                ]
            })
        });
        
        const data = await response.json();
        
        if (data.error || !data.result) {
            console.error('Error fetching transactions:', data.error);
            document.getElementById('totalSolPaid').textContent = 'Error loading';
            return;
        }
        
        // Get transaction details for each signature
        const signatures = data.result.slice(0, 100); // Check first 100 transactions
        let totalPaid = 0;
        
        // Process transactions in batches
        for (let i = 0; i < signatures.length; i += 10) {
            const batch = signatures.slice(i, i + 10);
            const batchPromises = batch.map(sig => getTransactionDetails(sig.signature));
            const batchResults = await Promise.all(batchPromises);
            
            batchResults.forEach(amount => {
                // Only count transfers less than 0.1 SOL (airdrops)
                if (amount > 0 && amount < 0.1) {
                    totalPaid += amount;
                }
            });
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        totalSolPaidOut = totalPaid;
        const paidEl = document.getElementById('totalSolPaid');
        if (paidEl) {
            paidEl.textContent = totalPaid.toFixed(4) + ' SOL';
        }
        
        console.log('Total SOL paid out:', totalPaid);
        
    } catch (error) {
        console.error('Error calculating SOL paid out:', error);
        document.getElementById('totalSolPaid').textContent = 'Error loading';
    }
}

async function getTransactionDetails(signature) {
    try {
        const response = await fetch(HELIUS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTransaction',
                params: [
                    signature,
                    {
                        encoding: 'jsonParsed',
                        maxSupportedTransactionVersion: 0
                    }
                ]
            })
        });
        
        const data = await response.json();
        
        if (data.error || !data.result) {
            return 0;
        }
        
        const transaction = data.result;
        
        // Check if this transaction sent SOL from our payout wallet
        if (transaction.transaction && transaction.transaction.message) {
            const accountKeys = transaction.transaction.message.accountKeys || [];
            const preBalances = transaction.meta?.preBalances || [];
            const postBalances = transaction.meta?.postBalances || [];
            
            // Find our wallet index
            const walletIndex = accountKeys.findIndex(acc => 
                (typeof acc === 'string' ? acc : acc.pubkey) === PAYOUT_WALLET
            );
            
            if (walletIndex >= 0 && preBalances[walletIndex] && postBalances[walletIndex]) {
                const balanceChange = (preBalances[walletIndex] - postBalances[walletIndex]) / 1e9;
                
                // Only count outgoing transactions (positive balance change means we sent SOL)
                if (balanceChange > 0) {
                    return balanceChange;
                }
            }
        }
        
        return 0;
    } catch (error) {
        console.error('Error getting transaction details:', error);
        return 0;
    }
}

// Game Selection Logic
function initGameSelection() {
    const game1Btn = document.getElementById('game1Btn');
    const game2Btn = document.getElementById('game2Btn');
    const casinoBtn = document.getElementById('casinoBtn');
    const reactionGame = document.getElementById('reactionGame');
    const memoryGame = document.getElementById('memoryGame');
    const casinoGame = document.getElementById('casinoGame');
    
    // Start with casino game active
    if (casinoBtn && casinoGame) {
        casinoBtn.classList.add('active');
        casinoGame.style.display = 'block';
        if (reactionGame) reactionGame.style.display = 'none';
        if (memoryGame) memoryGame.style.display = 'none';
    }
    
    if (game1Btn) {
        game1Btn.addEventListener('click', () => {
            game1Btn.classList.add('active');
            if (game2Btn) game2Btn.classList.remove('active');
            if (casinoBtn) casinoBtn.classList.remove('active');
            if (reactionGame) reactionGame.style.display = 'block';
            if (memoryGame) memoryGame.style.display = 'none';
            if (casinoGame) casinoGame.style.display = 'none';
        });
    }
    
    if (game2Btn) {
        game2Btn.addEventListener('click', () => {
            game2Btn.classList.add('active');
            if (game1Btn) game1Btn.classList.remove('active');
            if (casinoBtn) casinoBtn.classList.remove('active');
            if (reactionGame) reactionGame.style.display = 'none';
            if (memoryGame) memoryGame.style.display = 'block';
            if (casinoGame) casinoGame.style.display = 'none';
        });
    }
    
    if (casinoBtn) {
        casinoBtn.addEventListener('click', () => {
            casinoBtn.classList.add('active');
            if (game1Btn) game1Btn.classList.remove('active');
            if (game2Btn) game2Btn.classList.remove('active');
            if (reactionGame) reactionGame.style.display = 'none';
            if (memoryGame) memoryGame.style.display = 'none';
            if (casinoGame) casinoGame.style.display = 'block';
        });
    }
}

// Memory Game Logic
let memoryGameState = {
    level: 3,
    moves: 0,
    timeLeft: 60,
    matches: 0,
    gameActive: false,
    gameTimer: null,
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 0,
    walletAddress: null
};

function initMemoryGame() {
    const walletInput = document.getElementById('walletAddressInput2');
    const submitBtn = document.getElementById('submitWalletBtn2');
    const startBtn = document.getElementById('startGameBtn2');
    const playAgainBtn = document.getElementById('playAgainBtn2');
    const claimBtn = document.getElementById('claimAirdropBtn2');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', submitWalletMemory);
    }
    
    if (walletInput) {
        walletInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitWalletMemory();
        });
    }
    
    if (startBtn) {
        startBtn.addEventListener('click', startMemoryGame);
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            const resultDiv = document.getElementById('gameResult2');
            const grid = document.getElementById('memoryGrid');
            if (resultDiv) resultDiv.style.display = 'none';
            if (grid) grid.innerHTML = '';
            if (startBtn) startBtn.style.display = 'block';
        });
    }
    
    if (claimBtn) {
        claimBtn.addEventListener('click', claimAirdropMemory);
    }
}

function submitWalletMemory() {
    const walletInput = document.getElementById('walletAddressInput2');
    const address = walletInput ? walletInput.value.trim() : '';
    
    if (!address) {
        alert('Please enter your Solana wallet address!');
        return;
    }
    
    if (!isValidSolanaAddress(address)) {
        alert('Invalid Solana wallet address format!');
        return;
    }
    
    memoryGameState.walletAddress = address;
    
    // Store wallet address in Supabase
    try {
        if (supabaseClient) {
            supabaseClient.from('game_participants').insert({
                wallet_address: address,
                created_at: new Date().toISOString()
            }).catch(e => {
                if (e.code !== '23505') console.error('Error storing wallet:', e);
            });
        }
    } catch (err) {
        console.error('Supabase error:', err);
    }
    
    // Update UI
    const walletStatus = document.getElementById('walletStatus2');
    const walletConnected = document.getElementById('walletConnected2');
    const gameArea = document.getElementById('gameArea2');
    
    if (walletStatus) walletStatus.style.display = 'none';
    if (walletConnected) {
        walletConnected.style.display = 'block';
        const addrSpan = document.getElementById('walletAddress2');
        if (addrSpan) {
            addrSpan.textContent = address.substring(0, 8) + '...' + address.substring(address.length - 8);
        }
    }
    if (gameArea) gameArea.style.display = 'block';
}

function startMemoryGame() {
    if (!memoryGameState.walletAddress) {
        alert('Please enter your wallet address first!');
        return;
    }
    
    memoryGameState.level = 3;
    memoryGameState.moves = 0;
    memoryGameState.matches = 0;
    memoryGameState.matchedPairs = 0;
    memoryGameState.flippedCards = [];
    memoryGameState.gameActive = true;
    
    // Level 3: 6 pairs, Level 4: 8 pairs, Level 5: 12 pairs (EXTREMELY HARD)
    memoryGameState.totalPairs = memoryGameState.level === 3 ? 6 : memoryGameState.level === 4 ? 8 : 12;
    memoryGameState.timeLeft = memoryGameState.level === 5 ? 30 : memoryGameState.level === 4 ? 40 : 60;
    
    const startBtn = document.getElementById('startGameBtn2');
    if (startBtn) startBtn.style.display = 'none';
    const resultDiv = document.getElementById('gameResult2');
    if (resultDiv) resultDiv.style.display = 'none';
    
    createMemoryGrid();
    startMemoryTimer();
    updateMemoryDisplay();
}

function createMemoryGrid() {
    const grid = document.getElementById('memoryGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const cols = memoryGameState.level === 5 ? 6 : memoryGameState.level === 4 ? 4 : 3;
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    const symbols = ['🥒', '🍌', '🍎', '🍊', '🍇', '🍓', '🍑', '🥝', '🍉', '🍐', '🥭', '🍋'];
    const selectedSymbols = symbols.slice(0, memoryGameState.totalPairs);
    const cardValues = [...selectedSymbols, ...selectedSymbols].sort(() => Math.random() - 0.5);
    
    cardValues.forEach((value, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.dataset.index = index;
        card.dataset.value = value;
        card.textContent = '?';
        card.addEventListener('click', () => flipMemoryCard(card));
        grid.appendChild(card);
    });
    
    memoryGameState.cards = Array.from(grid.children);
}

function flipMemoryCard(card) {
    if (!memoryGameState.gameActive) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if (memoryGameState.flippedCards.length >= 2) return;
    
    card.classList.add('flipped');
    card.textContent = card.dataset.value;
    memoryGameState.flippedCards.push(card);
    
    if (memoryGameState.flippedCards.length === 2) {
        memoryGameState.moves++;
        updateMemoryDisplay();
        checkMemoryMatch();
    }
}

function checkMemoryMatch() {
    const [card1, card2] = memoryGameState.flippedCards;
    
    if (card1.dataset.value === card2.dataset.value) {
        // Match!
        setTimeout(() => {
            card1.classList.add('matched');
            card2.classList.add('matched');
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            memoryGameState.matchedPairs++;
            memoryGameState.matches = memoryGameState.matchedPairs;
            memoryGameState.flippedCards = [];
            updateMemoryDisplay();
            
            if (memoryGameState.matchedPairs >= memoryGameState.totalPairs) {
                completeMemoryLevel();
            }
        }, 500);
    } else {
        // No match
        setTimeout(() => {
            card1.classList.add('wrong');
            card2.classList.add('wrong');
            setTimeout(() => {
                card1.classList.remove('flipped', 'wrong');
                card2.classList.remove('flipped', 'wrong');
                card1.textContent = '?';
                card2.textContent = '?';
                memoryGameState.flippedCards = [];
            }, 1000);
        }, 500);
    }
}

function completeMemoryLevel() {
    if (memoryGameState.level >= 5) {
        memoryGameState.gameActive = false;
        stopMemoryTimer();
        showMemoryResult(true);
    } else {
        memoryGameState.level++;
        memoryGameState.matchedPairs = 0;
        memoryGameState.flippedCards = [];
        memoryGameState.totalPairs = memoryGameState.level === 4 ? 8 : 12;
        memoryGameState.timeLeft = memoryGameState.level === 5 ? 30 : 40;
        
        const instructions = document.getElementById('gameInstructions2');
        if (instructions) {
            instructions.textContent = `Level ${memoryGameState.level - 1} Complete! Starting Level ${memoryGameState.level}...`;
            setTimeout(() => {
                instructions.textContent = memoryGameState.level === 5 
                    ? `⚠️ LEVEL 5: Match ${memoryGameState.totalPairs} pairs in ${memoryGameState.timeLeft}s - EXTREME DIFFICULTY! ⚠️`
                    : `Match ${memoryGameState.totalPairs} pairs! Complete Level 5 to win!`;
            }, 2000);
        }
        
        setTimeout(() => {
            createMemoryGrid();
            updateMemoryDisplay();
        }, 1500);
    }
}

function startMemoryTimer() {
    if (memoryGameState.gameTimer) clearInterval(memoryGameState.gameTimer);
    memoryGameState.gameTimer = setInterval(() => {
        memoryGameState.timeLeft--;
        updateMemoryDisplay();
        if (memoryGameState.timeLeft <= 0) {
            memoryGameState.gameActive = false;
            stopMemoryTimer();
            showMemoryResult(false);
        }
    }, 1000);
}

function stopMemoryTimer() {
    if (memoryGameState.gameTimer) {
        clearInterval(memoryGameState.gameTimer);
        memoryGameState.gameTimer = null;
    }
}

function updateMemoryDisplay() {
    const levelEl = document.getElementById('gameLevel2');
    const movesEl = document.getElementById('gameMoves2');
    const timeEl = document.getElementById('gameTime2');
    const matchesEl = document.getElementById('gameMatches2');
    
    if (levelEl) levelEl.textContent = memoryGameState.level;
    if (movesEl) movesEl.textContent = memoryGameState.moves;
    if (timeEl) {
        timeEl.textContent = memoryGameState.timeLeft;
        if (memoryGameState.timeLeft <= 5) {
            timeEl.style.color = '#ef4444';
            timeEl.style.animation = 'pulse 0.5s infinite';
        } else {
            timeEl.style.color = '';
            timeEl.style.animation = '';
        }
    }
    if (matchesEl) matchesEl.textContent = `${memoryGameState.matches}/${memoryGameState.totalPairs}`;
}

function showMemoryResult(won) {
    const resultDiv = document.getElementById('gameResult2');
    const messageEl = document.getElementById('resultMessage2');
    const claimBtn = document.getElementById('claimAirdropBtn2');
    
    if (resultDiv) resultDiv.style.display = 'block';
    if (messageEl) {
        if (won) {
            messageEl.textContent = '🎉 Congratulations! You completed Level 5! 🎉';
            messageEl.style.color = '#4ade80';
            if (claimBtn) claimBtn.style.display = 'block';
        } else {
            messageEl.textContent = '⏰ Time\'s up! Try again!';
            messageEl.style.color = '#ef4444';
            if (claimBtn) claimBtn.style.display = 'none';
        }
    }
}

async function claimAirdropMemory() {
    if (!memoryGameState.walletAddress || memoryGameState.level < 5) {
        alert('You must complete level 5 to claim the airdrop!');
        return;
    }
    
    const claimBtn = document.getElementById('claimAirdropBtn2');
    if (claimBtn) {
        claimBtn.disabled = true;
        claimBtn.textContent = 'Processing...';
    }
    
    try {
        // Check if already claimed
        let alreadyClaimed = false;
        if (supabaseClient) {
            const { data } = await supabaseClient
                .from('game_winners')
                .select('*')
                .eq('wallet_address', memoryGameState.walletAddress)
                .single();
            
            if (data) alreadyClaimed = true;
        }
        
        if (alreadyClaimed) {
            alert('❌ You have already claimed your airdrop!');
            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.textContent = 'Claim SOL Airdrop';
            }
            return;
        }
        
        // Store winner
        if (supabaseClient) {
            const { error } = await supabaseClient.from('game_winners').insert({
                wallet_address: memoryGameState.walletAddress,
                level: memoryGameState.level,
                score: memoryGameState.moves,
                claimed_at: new Date().toISOString()
            });
            
            if (error) throw error;
        }
        
        alert('✅ Success! Your wallet address has been recorded. SOL airdrop will be sent manually!');
        if (claimBtn) claimBtn.style.display = 'none';
        
        // Refresh leaderboard
        if (typeof loadLeaderboard === 'function') {
            loadLeaderboard();
        }
    } catch (error) {
        console.error('Airdrop claim error:', error);
        alert('❌ Error claiming airdrop. Please try again.');
        if (claimBtn) {
            claimBtn.disabled = false;
            claimBtn.textContent = 'Claim SOL Airdrop';
        }
    }
}

// Casino Game Logic
let casinoState = {
    walletAddress: null,
    pendingBet: null,
    lastCheckedSignature: null
};

function initCasinoGame() {
    const walletInput = document.getElementById('walletAddressInput3');
    const submitBtn = document.getElementById('submitWalletBtn3');
    const verifyBtn = document.getElementById('verifyBetBtn');
    const copyBtn = document.getElementById('copyWalletBtn');
    const playAgainBtn = document.getElementById('playAgainBtn3');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', submitWalletCasino);
    }
    
    if (walletInput) {
        walletInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitWalletCasino();
        });
    }
    
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyAndPlayBet);
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const walletAddr = document.getElementById('devWalletAddress');
            if (walletAddr) {
                navigator.clipboard.writeText(walletAddr.textContent).then(() => {
                    copyBtn.textContent = '✅ Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = '📋 Copy';
                    }, 2000);
                });
            }
        });
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            document.getElementById('gameResult3').style.display = 'none';
            document.getElementById('betStatus').textContent = '';
            document.getElementById('betStatus').className = 'bet-status';
            const coin = document.getElementById('coin');
            const coinResult = document.getElementById('coinResult');
            if (coin) {
                coin.classList.remove('flipping', 'heads', 'tails');
            }
            if (coinResult) {
                coinResult.textContent = '';
                coinResult.className = 'coin-result';
            }
        });
    }
    
    // Load casino stats
    loadCasinoStats();
}

function submitWalletCasino() {
    const walletInput = document.getElementById('walletAddressInput3');
    const address = walletInput ? walletInput.value.trim() : '';
    
    if (!address) {
        alert('Please enter your Solana wallet address!');
        return;
    }
    
    if (!isValidSolanaAddress(address)) {
        alert('Invalid Solana wallet address format!');
        return;
    }
    
    casinoState.walletAddress = address;
    
    // Store wallet address
    try {
        if (supabaseClient) {
            const { error } = await supabaseClient.from('game_participants').insert({
                wallet_address: address,
                created_at: new Date().toISOString()
            });
            if (error && error.code !== '23505') {
                console.error('Error storing wallet:', error);
            }
        }
    } catch (err) {
        console.error('Supabase error:', err);
    }
    
    // Update UI
    document.getElementById('walletStatus3').style.display = 'none';
    document.getElementById('walletConnected3').style.display = 'block';
    document.getElementById('walletAddress3').textContent = 
        address.substring(0, 8) + '...' + address.substring(address.length - 8);
    document.getElementById('casinoArea').style.display = 'block';
    
    // Load user stats
    loadCasinoStats();
}

async function loadCasinoStats() {
    if (!casinoState.walletAddress || !supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('casino_bets')
            .select('total_wagered, total_won, total_paid_out')
            .eq('wallet_address', casinoState.walletAddress)
            .maybeSingle();
        
        if (error) {
            console.error('Error loading casino stats:', error);
        }
        
        if (data) {
            document.getElementById('totalWagered').textContent = 
                (parseFloat(data.total_wagered || 0)).toFixed(4) + ' SOL';
            document.getElementById('totalWon').textContent = 
                (parseFloat(data.total_paid_out || 0)).toFixed(4) + ' SOL';
        } else {
            document.getElementById('totalWagered').textContent = '0.0000 SOL';
            document.getElementById('totalWon').textContent = '0.0000 SOL';
        }
    } catch (error) {
        console.error('Error loading casino stats:', error);
        document.getElementById('totalWagered').textContent = '0.0000 SOL';
        document.getElementById('totalWon').textContent = '0.0000 SOL';
    }
}

async function verifyAndPlayBet() {
    if (!casinoState.walletAddress) {
        alert('Please enter your wallet address first!');
        return;
    }
    
    const verifyBtn = document.getElementById('verifyBetBtn');
    const statusEl = document.getElementById('betStatus');
    
    if (verifyBtn) verifyBtn.disabled = true;
    if (statusEl) {
        statusEl.textContent = 'Checking for bet transaction... (this may take a few seconds)';
        statusEl.className = 'bet-status pending';
    }
    
    try {
        // Wait a moment for transaction to be confirmed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for recent transaction from user's wallet to dev wallet
        const transaction = await findBetTransaction();
        
        if (!transaction) {
            if (statusEl) {
                statusEl.textContent = '❌ No bet found. Please send exactly 0.1 SOL to the address above first.';
                statusEl.className = 'bet-status error';
            }
            if (verifyBtn) verifyBtn.disabled = false;
            return;
        }
        
        // Verify amount is exactly 0.1 SOL
        const betAmount = transaction.amount;
        if (Math.abs(betAmount - BET_AMOUNT) > 0.001) {
            if (statusEl) {
                statusEl.textContent = `❌ Invalid bet amount: ${betAmount.toFixed(4)} SOL. Must be exactly 0.1 SOL.`;
                statusEl.className = 'bet-status error';
            }
            if (verifyBtn) verifyBtn.disabled = false;
            return;
        }
        
        // Check if this transaction was already used
        if (supabaseClient) {
            const { data: existingBet, error } = await supabaseClient
                .from('casino_bets')
                .select('*')
                .eq('wallet_address', casinoState.walletAddress)
                .maybeSingle();
            
            if (error) {
                console.error('Error checking existing bet:', error);
            }
            
            // Check if transaction signature matches (if we stored it)
            // For now, we'll check by wallet and recent timestamp
            if (existingBet && existingBet.last_bet_at) {
                const lastBetTime = new Date(existingBet.last_bet_at).getTime();
                const txTime = transaction.timestamp * 1000;
                // If bet was within last 5 minutes and same amount, might be duplicate
                if (Math.abs(txTime - lastBetTime) < 300000 && Math.abs(betAmount - BET_AMOUNT) < 0.001) {
                    // Check if we've already processed a bet very recently
                    if (statusEl) {
                        statusEl.textContent = '❌ This transaction may have already been processed. Please wait a moment or use a new transaction.';
                        statusEl.className = 'bet-status error';
                    }
                    if (verifyBtn) verifyBtn.disabled = false;
                    return;
                }
            }
        }
        
        // Process the bet
        await processBet(transaction);
        
    } catch (error) {
        console.error('Error verifying bet:', error);
        if (statusEl) {
            statusEl.textContent = '❌ Error verifying bet. Please try again.';
            statusEl.className = 'bet-status error';
        }
        if (verifyBtn) verifyBtn.disabled = false;
    }
}

async function findBetTransaction() {
    try {
        console.log('Looking for transaction from:', casinoState.walletAddress, 'to:', DEV_WALLET);
        
        // Get recent transactions from dev wallet
        const response = await fetch(HELIUS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getSignaturesForAddress',
                params: [
                    DEV_WALLET,
                    { limit: 100, commitment: 'confirmed' }
                ]
            })
        });
        
        const data = await response.json();
        console.log('Transaction signatures response:', data);
        
        if (data.error || !data.result) {
            console.error('Error getting signatures:', data.error);
            return null;
        }
        
        // Check recent transactions (last 30, within last 10 minutes)
        const now = Math.floor(Date.now() / 1000);
        const tenMinutesAgo = now - 600;
        
        for (const sigInfo of data.result.slice(0, 30)) {
            // Skip if transaction is too old (more than 10 minutes)
            if (sigInfo.blockTime && sigInfo.blockTime < tenMinutesAgo) {
                continue;
            }
            
            console.log('Checking transaction:', sigInfo.signature);
            const txDetails = await getCasinoTransactionDetails(sigInfo.signature);
            console.log('Transaction details:', txDetails);
            
            if (txDetails && 
                txDetails.from === casinoState.walletAddress &&
                txDetails.to === DEV_WALLET &&
                txDetails.amount >= BET_AMOUNT * 0.99 && // Allow small rounding
                txDetails.amount <= BET_AMOUNT * 1.01) {
                console.log('Found matching transaction!', txDetails);
                return {
                    signature: sigInfo.signature,
                    amount: txDetails.amount,
                    timestamp: sigInfo.blockTime || now
                };
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log('No matching transaction found');
        return null;
    } catch (error) {
        console.error('Error finding transaction:', error);
        return null;
    }
}

async function getCasinoTransactionDetails(signature) {
    try {
        const response = await fetch(HELIUS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTransaction',
                params: [
                    signature,
                    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
                ]
            })
        });
        
        const data = await response.json();
        if (data.error || !data.result) {
            console.log('Transaction fetch error:', data.error);
            return null;
        }
        
        const tx = data.result;
        if (!tx || !tx.transaction) return null;
        
        // Check if transaction failed
        if (tx.meta?.err) {
            console.log('Transaction failed:', tx.meta.err);
            return null;
        }
        
        const accountKeys = tx.transaction?.message?.accountKeys || [];
        const preBalances = tx.meta?.preBalances || [];
        const postBalances = tx.meta?.postBalances || [];
        
        // Find sender and receiver by balance changes
        let fromAddress = null;
        let toAddress = null;
        let amount = 0;
        
        // Method 1: Check balance changes
        for (let i = 0; i < accountKeys.length; i++) {
            const key = typeof accountKeys[i] === 'string' ? accountKeys[i] : accountKeys[i].pubkey;
            const preBalance = preBalances[i] || 0;
            const postBalance = postBalances[i] || 0;
            const balanceChange = (preBalance - postBalance) / 1e9;
            
            // Sender lost SOL (positive change means they sent)
            if (balanceChange > 0.0001 && key !== DEV_WALLET) {
                fromAddress = key;
                amount = balanceChange;
            }
            // Receiver gained SOL (negative change means they received)
            if (balanceChange < -0.0001 && key === DEV_WALLET) {
                toAddress = key;
            }
        }
        
        // Method 2: Check transfer instructions if balance method didn't work
        if (!fromAddress && tx.transaction?.message?.instructions) {
            for (const instruction of tx.transaction.message.instructions) {
                if (instruction.parsed?.type === 'transfer') {
                    const parsed = instruction.parsed;
                    if (parsed.info?.destination === DEV_WALLET && parsed.info?.lamports) {
                        fromAddress = parsed.info.source;
                        toAddress = DEV_WALLET;
                        amount = parsed.info.lamports / 1e9;
                        break;
                    }
                }
            }
        }
        
        console.log('Parsed transaction:', { fromAddress, toAddress, amount });
        
        if (fromAddress && toAddress === DEV_WALLET && amount > 0) {
            return { from: fromAddress, to: toAddress, amount: amount };
        }
        
        return null;
    } catch (error) {
        console.error('Error getting transaction details:', error);
        return null;
    }
}

async function processBet(transaction) {
    const statusEl = document.getElementById('betStatus');
    const verifyBtn = document.getElementById('verifyBetBtn');
    const coin = document.getElementById('coin');
    const coinResult = document.getElementById('coinResult');
    
    if (verifyBtn) verifyBtn.disabled = true;
    if (coinResult) coinResult.textContent = '';
    
    try {
        // Animate coin flip
        if (coin) {
            coin.classList.add('flipping');
        }
        
        // Wait for animation (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // No house fee for now - testing mode
        const houseFee = 0;
        const netBetAmount = BET_AMOUNT;
        
        // Determine win/loss (35% chance to win - 65% house edge)
        const isWin = Math.random() < WIN_PROBABILITY;
        const winAmount = isWin ? netBetAmount * 2 : 0; // 2x payout if win
        const payoutAmount = isWin ? winAmount : 0;
        
        // Stop animation and show result
        if (coin) {
            coin.classList.remove('flipping');
            coin.classList.add(isWin ? 'heads' : 'tails');
        }
        
        if (coinResult) {
            coinResult.textContent = isWin ? '🟢 HEADS - YOU WIN!' : '🔴 TAILS - HOUSE WINS';
            coinResult.className = 'coin-result ' + (isWin ? 'win' : 'loss');
        }
        
        // Update aggregated stats in Supabase (upsert)
        if (supabaseClient) {
            // First, try to get existing record
            const { data: existing } = await supabaseClient
                .from('casino_bets')
                .select('*')
                .eq('wallet_address', casinoState.walletAddress)
                .single();
            
            if (existing) {
                // Update existing record
                const { error } = await supabaseClient
                    .from('casino_bets')
                    .update({
                        total_bets: (existing.total_bets || 0) + 1,
                        total_wagered: parseFloat(existing.total_wagered || 0) + BET_AMOUNT,
                        total_wins: isWin ? (existing.total_wins || 0) + 1 : (existing.total_wins || 0),
                        total_losses: isWin ? (existing.total_losses || 0) : (existing.total_losses || 0) + 1,
                        total_won: isWin ? parseFloat(existing.total_won || 0) + winAmount : parseFloat(existing.total_won || 0),
                        total_paid_out: isWin ? parseFloat(existing.total_paid_out || 0) + payoutAmount : parseFloat(existing.total_paid_out || 0),
                        house_fee_collected: parseFloat(existing.house_fee_collected || 0) + houseFee,
                        last_bet_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('wallet_address', casinoState.walletAddress);
                
                if (error) throw error;
            } else {
                // Insert new record
                const { error } = await supabaseClient
                    .from('casino_bets')
                    .insert({
                        wallet_address: casinoState.walletAddress,
                        total_bets: 1,
                        total_wagered: BET_AMOUNT,
                        total_wins: isWin ? 1 : 0,
                        total_losses: isWin ? 0 : 1,
                        total_won: winAmount,
                        total_paid_out: payoutAmount,
                        house_fee_collected: houseFee,
                        last_bet_at: new Date().toISOString()
                    });
                
                if (error) throw error;
            }
        }
        
        // Show result
        showCasinoResult(isWin, payoutAmount, houseFee);
        
        if (statusEl) {
            statusEl.textContent = `✅ ${isWin ? 'WINNER! 🎉' : 'Better luck next time!'}`;
            statusEl.className = 'bet-status ' + (isWin ? 'success' : 'error');
        }
        
        // Reload stats
        loadCasinoStats();
        
    } catch (error) {
        console.error('Error processing bet:', error);
        if (coin) coin.classList.remove('flipping');
        if (statusEl) {
            statusEl.textContent = '❌ Error processing bet. Please contact support.';
            statusEl.className = 'bet-status error';
        }
    } finally {
        if (verifyBtn) verifyBtn.disabled = false;
    }
}

function showCasinoResult(isWin, payoutAmount, houseFee) {
    const resultDiv = document.getElementById('gameResult3');
    const messageEl = document.getElementById('resultMessage3');
    const payoutInfo = document.getElementById('payoutInfo');
    
    if (resultDiv) resultDiv.style.display = 'block';
    
    if (messageEl) {
        if (isWin) {
            messageEl.textContent = '🎉 YOU WIN! 🎉';
            messageEl.style.color = '#4ade80';
        } else {
            messageEl.textContent = '😔 You Lost';
            messageEl.style.color = '#ef4444';
        }
    }
    
    if (payoutInfo) {
        let html = '<div style="text-align: left; line-height: 1.8;">';
        html += `<div>Bet Amount: <strong>${BET_AMOUNT} SOL</strong></div>`;
        if (isWin) {
            html += `<div style="color: #4ade80; margin-top: 10px;">Payout: <strong>${payoutAmount.toFixed(4)} SOL</strong></div>`;
            html += `<div style="color: #4ade80;">Profit: <strong>${(payoutAmount - BET_AMOUNT).toFixed(4)} SOL</strong></div>`;
            html += '<div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">Payout will be sent to your wallet address</div>';
        } else {
            html += `<div style="color: #ef4444; margin-top: 10px;">Loss: <strong>${BET_AMOUNT} SOL</strong></div>`;
        }
        html += '</div>';
        payoutInfo.innerHTML = html;
    }
}


