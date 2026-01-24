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
    
    // Initialize leaderboard
    try {
        initLeaderboard();
        console.log('✅ Leaderboard initialized');
    } catch (error) {
        console.error('❌ Leaderboard initialization failed:', error);
    }
    
    // Initialize Supabase FIRST to get token address, then start market cap updates
    initSupabase();
    
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
    
    // Reset game state
    gameState.level = 1;
    gameState.score = 0;
    gameState.timeLeft = 30;
    gameState.gameActive = true;
    gameState.targetsHit = 0;
    gameState.targetsNeeded = 10; // Need to hit 10 targets per level
    gameState.targetSpeed = 2000; // 2 seconds to click
    gameState.misses = 0;
    
    // Clear any existing timers
    if (gameState.gameTimer) clearInterval(gameState.gameTimer);
    if (gameState.targetTimer) clearInterval(gameState.targetTimer);
    
    // Show game area
    document.getElementById('startGameBtn').style.display = 'none';
    document.getElementById('gamePlayArea').style.display = 'block';
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
    
    // Random position
    const maxX = playArea.clientWidth - 80;
    const maxY = playArea.clientHeight - 80;
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    
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
            
            // Lose time for missing
            gameState.timeLeft = Math.max(0, gameState.timeLeft - 1);
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
        // Spawn next target (faster each time)
        gameState.targetSpeed = Math.max(800, gameState.targetSpeed - 50);
        spawnTarget();
    }
}

function completeLevel() {
    if (gameState.level >= 5) {
        // Game won!
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
        gameState.targetsNeeded = 10 + (gameState.level * 2); // More targets needed
        gameState.targetSpeed = Math.max(1000, 2000 - (gameState.level * 200)); // Faster targets
        gameState.timeLeft += 5; // Bonus time
        
        // Show level complete message
        const instructions = document.getElementById('gameInstructions');
        if (instructions) {
            instructions.textContent = `Level ${gameState.level - 1} Complete! Starting Level ${gameState.level}...`;
            setTimeout(() => {
                instructions.textContent = `Hit ${gameState.targetsNeeded} targets! They appear faster each level!`;
            }, 2000);
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
        instructionsEl.textContent = `Hit ${gameState.targetsNeeded} targets! Progress: ${gameState.targetsHit}/${gameState.targetsNeeded}`;
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
let currentFilter = 'all';

function initLeaderboard() {
    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.level;
            loadLeaderboard();
        });
    });
    
    // Load leaderboard on init
    loadLeaderboard();
    
    // Refresh leaderboard every 30 seconds
    setInterval(loadLeaderboard, 30000);
}

async function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    
    leaderboardList.innerHTML = '<p class="loading-text">Loading leaderboard...</p>';
    
    try {
        if (!supabaseClient) {
            leaderboardList.innerHTML = '<p class="error-text">Supabase not connected</p>';
            return;
        }
        
        let query = supabaseClient
            .from('game_winners')
            .select('wallet_address, level, score, claimed_at')
            .order('level', { ascending: false })
            .order('score', { ascending: false })
            .order('claimed_at', { ascending: true });
        
        // Apply filter
        if (currentFilter !== 'all') {
            query = query.eq('level', parseInt(currentFilter));
        }
        
        const { data, error } = await query.limit(100);
        
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


