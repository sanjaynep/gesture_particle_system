// Three.js Scene Setup
let scene, camera, renderer, particles;
let particleGeometry, particleMaterial, particleSystem;
let particleCount = 5000;
let currentPattern = 'sphere';
let currentColor = 0x00ff00;

// Gesture state
let isHandOpen = false;
let targetScale = 1.0;
let currentScale = 1.0;

// Initialize Three.js Scene
function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 50;
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').appendChild(renderer.domElement);
    
    // Create initial particle system
    createParticleSystem(currentPattern);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

// Create Particle System
function createParticleSystem(pattern) {
    // Remove existing particle system if it exists
    if (particleSystem) {
        scene.remove(particleSystem);
        particleGeometry.dispose();
        particleMaterial.dispose();
    }
    
    // Create geometry
    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = new Float32Array(particleCount * 3);
    
    // Generate particles based on pattern
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        let x, y, z;
        
        switch (pattern) {
            case 'sphere':
                // Sphere distribution
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const radius = 15 + Math.random() * 10;
                x = radius * Math.sin(phi) * Math.cos(theta);
                y = radius * Math.sin(phi) * Math.sin(theta);
                z = radius * Math.cos(phi);
                break;
                
            case 'cube':
                // Cube distribution
                const size = 25;
                x = (Math.random() - 0.5) * size;
                y = (Math.random() - 0.5) * size;
                z = (Math.random() - 0.5) * size;
                break;
                
            case 'random':
            default:
                // Random cloud
                const spread = 30;
                x = (Math.random() - 0.5) * spread;
                y = (Math.random() - 0.5) * spread;
                z = (Math.random() - 0.5) * spread;
                break;
        }
        
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
        
        initialPositions[i3] = x;
        initialPositions[i3 + 1] = y;
        initialPositions[i3 + 2] = z;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.userData.initialPositions = initialPositions;
    
    // Create material
    particleMaterial = new THREE.PointsMaterial({
        color: currentColor,
        size: 0.5,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    // Create particle system
    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    
    // Smooth transition for particle scale
    currentScale += (targetScale - currentScale) * 0.05;
    
    // Update particle positions based on gesture
    if (particleSystem) {
        const positions = particleGeometry.attributes.position.array;
        const initialPositions = particleGeometry.userData.initialPositions;
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Lerp between initial position and contracted position
            const contractionFactor = currentScale;
            
            positions[i3] = initialPositions[i3] * contractionFactor;
            positions[i3 + 1] = initialPositions[i3 + 1] * contractionFactor;
            positions[i3 + 2] = initialPositions[i3 + 2] * contractionFactor;
        }
        
        particleGeometry.attributes.position.needsUpdate = true;
        
        // Rotate particle system
        particleSystem.rotation.y += 0.001;
        particleSystem.rotation.x += 0.0005;
    }
    
    renderer.render(scene, camera);
}

// Window Resize Handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// MediaPipe Hands Setup
let hands;
let videoElement;
let canvasElement;
let canvasCtx;

function initMediaPipe() {
    videoElement = document.getElementById('video');
    canvasElement = document.getElementById('output_canvas');
    canvasCtx = canvasElement.getContext('2d');
    
    // Initialize MediaPipe Hands
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
    
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    hands.onResults(onHandsResults);
    
    // Start camera
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });
    camera.start();
}

// Process hand detection results
function onHandsResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Detect if hand is open or closed
        const handState = detectHandGesture(landmarks);
        
        if (handState === 'open') {
            isHandOpen = true;
            targetScale = 1.5; // Expand particles
            updateGestureStatus('Open Hand ✋');
        } else if (handState === 'closed') {
            isHandOpen = false;
            targetScale = 0.3; // Contract particles
            updateGestureStatus('Closed Fist ✊');
        }
    } else {
        // No hand detected, reset to neutral state
        targetScale = 1.0;
        updateGestureStatus('No Hand Detected');
    }
}

// Detect hand gesture (open vs closed)
function detectHandGesture(landmarks) {
    // Get fingertip and knuckle positions
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const thumbMCP = landmarks[2];
    const indexMCP = landmarks[5];
    const middleMCP = landmarks[9];
    const ringMCP = landmarks[13];
    const pinkyMCP = landmarks[17];
    
    // Calculate if fingers are extended
    const thumbExtended = distance(thumbTip, thumbMCP) > 0.1;
    const indexExtended = indexTip.y < indexMCP.y;
    const middleExtended = middleTip.y < middleMCP.y;
    const ringExtended = ringTip.y < ringMCP.y;
    const pinkyExtended = pinkyTip.y < pinkyMCP.y;
    
    // Count extended fingers
    const extendedCount = 
        (thumbExtended ? 1 : 0) +
        (indexExtended ? 1 : 0) +
        (middleExtended ? 1 : 0) +
        (ringExtended ? 1 : 0) +
        (pinkyExtended ? 1 : 0);
    
    // Open hand: 4 or 5 fingers extended
    // Closed hand: 0-2 fingers extended
    if (extendedCount >= 3) {
        return 'open';
    } else {
        return 'closed';
    }
}

// Calculate distance between two points
function distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Update gesture status in UI
function updateGestureStatus(status) {
    document.getElementById('gestureText').textContent = status;
}

// UI Event Handlers
function initUI() {
    // Pattern selection
    const patternButtons = document.querySelectorAll('.pattern-btn');
    patternButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            patternButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPattern = btn.dataset.pattern;
            createParticleSystem(currentPattern);
        });
    });
    
    // Color picker
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.addEventListener('input', (e) => {
        currentColor = parseInt(e.target.value.replace('#', '0x'));
        if (particleMaterial) {
            particleMaterial.color.setHex(currentColor);
        }
    });
    
    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    fullscreenBtn.addEventListener('click', () => {
        const container = document.getElementById('container');
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.log('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    });
}

// Initialize everything when page loads
window.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    initMediaPipe();
    initUI();
});
