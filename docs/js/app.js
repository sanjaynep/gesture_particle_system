/**
 * Main Application Controller
 * Coordinates particle system and gesture detection
 */

class App {
    constructor() {
        this.particleSystem = null;
        this.gestureDetector = null;
        this.isInitialized = false;
        this.gestureEnabled = true;
        
        // DOM Elements
        this.elements = {
            canvasContainer: document.getElementById('canvas-container'),
            cameraPreview: document.getElementById('camera-preview'),
            cameraFeed: document.getElementById('camera-feed'),
            handCanvas: document.getElementById('hand-canvas'),
            gestureIcon: document.getElementById('gesture-icon'),
            gestureText: document.getElementById('gesture-text'),
            controlPanel: document.getElementById('control-panel'),
            instructionsOverlay: document.getElementById('instructions-overlay'),
            loadingOverlay: document.getElementById('loading-overlay'),
            startBtn: document.getElementById('start-btn'),
            togglePanelBtn: document.getElementById('toggle-panel'),
            fullscreenBtn: document.getElementById('fullscreen-btn'),
            screenshotBtn: document.getElementById('screenshot-btn'),
            resetBtn: document.getElementById('reset-btn'),
            // Pattern buttons
            patternBtns: document.querySelectorAll('.pattern-btn'),
            // Color pickers
            primaryColor: document.getElementById('primary-color'),
            secondaryColor: document.getElementById('secondary-color'),
            colorPresets: document.querySelectorAll('.color-preset'),
            // Sliders
            particleCount: document.getElementById('particle-count'),
            particleCountValue: document.getElementById('particle-count-value'),
            particleSize: document.getElementById('particle-size'),
            particleSizeValue: document.getElementById('particle-size-value'),
            animationSpeed: document.getElementById('animation-speed'),
            animationSpeedValue: document.getElementById('animation-speed-value'),
            gestureSensitivity: document.getElementById('gesture-sensitivity'),
            gestureSensitivityValue: document.getElementById('gesture-sensitivity-value'),
            bloomStrength: document.getElementById('bloom-strength'),
            bloomStrengthValue: document.getElementById('bloom-strength-value'),
            // Toggles
            gestureEnabledToggle: document.getElementById('gesture-enabled'),
            showHandTracking: document.getElementById('show-hand-tracking'),
            bloomEnabled: document.getElementById('bloom-enabled'),
            trailsEnabled: document.getElementById('trails-enabled')
        };
        
        this.bindEvents();
    }

    bindEvents() {
        // Start button
        this.elements.startBtn.addEventListener('click', () => this.start());

        // Panel toggle
        this.elements.togglePanelBtn.addEventListener('click', () => {
            this.elements.controlPanel.classList.toggle('collapsed');
        });

        // Fullscreen
        this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Screenshot
        this.elements.screenshotBtn.addEventListener('click', () => this.takeScreenshot());

        // Reset
        this.elements.resetBtn.addEventListener('click', () => this.reset());

        // Pattern buttons
        this.elements.patternBtns.forEach(btn => {
            btn.addEventListener('click', () => this.setPattern(btn.dataset.pattern, btn));
        });

        // Color pickers
        this.elements.primaryColor.addEventListener('input', (e) => this.updateColors());
        this.elements.secondaryColor.addEventListener('input', (e) => this.updateColors());

        // Color presets
        this.elements.colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                this.elements.primaryColor.value = preset.dataset.primary;
                this.elements.secondaryColor.value = preset.dataset.secondary;
                this.updateColors();
            });
        });

        // Particle count slider
        this.elements.particleCount.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.elements.particleCountValue.textContent = value;
        });
        this.elements.particleCount.addEventListener('change', (e) => {
            if (this.particleSystem) {
                this.particleSystem.setParticleCount(parseInt(e.target.value));
            }
        });

        // Particle size slider
        this.elements.particleSize.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.particleSizeValue.textContent = value;
            if (this.particleSystem) {
                this.particleSystem.setParticleSize(value);
            }
        });

        // Animation speed slider
        this.elements.animationSpeed.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.animationSpeedValue.textContent = value.toFixed(1);
            if (this.particleSystem) {
                this.particleSystem.setAnimationSpeed(value);
            }
        });

        // Gesture sensitivity slider
        this.elements.gestureSensitivity.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.gestureSensitivityValue.textContent = value.toFixed(1);
            if (this.gestureDetector) {
                this.gestureDetector.setSensitivity(value);
            }
        });

        // Bloom strength slider
        this.elements.bloomStrength.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.bloomStrengthValue.textContent = value.toFixed(1);
            if (this.particleSystem) {
                this.particleSystem.setBloomStrength(value);
            }
        });

        // Gesture enabled toggle
        this.elements.gestureEnabledToggle.addEventListener('change', (e) => {
            this.gestureEnabled = e.target.checked;
            if (this.gestureDetector) {
                if (this.gestureEnabled) {
                    this.gestureDetector.resume();
                } else {
                    this.gestureDetector.pause();
                }
            }
            this.elements.cameraPreview.classList.toggle('hidden', !this.gestureEnabled);
        });

        // Show hand tracking toggle
        this.elements.showHandTracking.addEventListener('change', (e) => {
            if (this.gestureDetector) {
                this.gestureDetector.setShowTracking(e.target.checked);
            }
        });

        // Bloom enabled toggle
        this.elements.bloomEnabled.addEventListener('change', (e) => {
            if (this.particleSystem) {
                this.particleSystem.setBloomEnabled(e.target.checked);
            }
        });

        // Trails enabled toggle
        this.elements.trailsEnabled.addEventListener('change', (e) => {
            if (this.particleSystem) {
                this.particleSystem.setTrailsEnabled(e.target.checked);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            } else if (e.key === 'r' || e.key === 'R') {
                this.reset();
            } else if (e.key === 's' || e.key === 'S') {
                this.takeScreenshot();
            } else if (e.key === 'h' || e.key === 'H') {
                this.elements.controlPanel.classList.toggle('collapsed');
            }
        });
    }

    async start() {
        this.elements.instructionsOverlay.classList.add('hidden');
        this.elements.loadingOverlay.classList.remove('hidden');

        try {
            // Initialize particle system
            this.particleSystem = new ParticleSystem(this.elements.canvasContainer);
            
            // Initialize gesture detector
            this.gestureDetector = new GestureDetector(
                this.elements.cameraFeed,
                this.elements.handCanvas
            );

            // Set up gesture callbacks
            this.gestureDetector.onGestureUpdate = (gesture) => {
                this.onGestureUpdate(gesture);
            };

            this.gestureDetector.onHandDetected = () => {
                this.elements.cameraPreview.classList.add('glow');
            };

            this.gestureDetector.onHandLost = () => {
                this.elements.cameraPreview.classList.remove('glow');
            };

            // Initialize camera and gesture detection
            await this.gestureDetector.init();

            this.isInitialized = true;
            this.elements.loadingOverlay.classList.add('hidden');
            
            console.log('Gesture Particle System initialized successfully!');
        } catch (error) {
            console.error('Initialization error:', error);
            this.elements.loadingOverlay.querySelector('.loader-text').textContent = 
                'Error: Camera access denied or not available';
            
            // Still show particle system even without camera
            if (!this.particleSystem) {
                this.particleSystem = new ParticleSystem(this.elements.canvasContainer);
            }
            
            setTimeout(() => {
                this.elements.loadingOverlay.classList.add('hidden');
                this.elements.cameraPreview.classList.add('hidden');
            }, 2000);
        }
    }

    onGestureUpdate(gesture) {
        if (!this.isInitialized || !this.gestureEnabled) return;

        // Update gesture status display
        const description = this.gestureDetector.getGestureDescription();
        this.elements.gestureIcon.textContent = description.icon;
        this.elements.gestureText.textContent = description.text;

        // Update particle system
        if (this.particleSystem) {
            const sensitivity = parseFloat(this.elements.gestureSensitivity.value);
            this.particleSystem.updateGestureInfluence(
                gesture.openness,
                gesture.position,
                sensitivity
            );
        }
    }

    setPattern(pattern, btn) {
        // Update active button
        this.elements.patternBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update particle system
        if (this.particleSystem) {
            this.particleSystem.setPattern(pattern);
        }
    }

    updateColors() {
        if (this.particleSystem) {
            this.particleSystem.setColors(
                this.elements.primaryColor.value,
                this.elements.secondaryColor.value
            );
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    takeScreenshot() {
        if (this.particleSystem) {
            // Need to render one frame to ensure canvas has content
            this.particleSystem.renderer.render(
                this.particleSystem.scene, 
                this.particleSystem.camera
            );
            
            // Get the canvas data with proper settings
            const canvas = this.particleSystem.renderer.domElement;
            
            // Create a temporary canvas to add background
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Fill with dark background
            tempCtx.fillStyle = '#0a0a0f';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Draw the WebGL canvas on top
            tempCtx.drawImage(canvas, 0, 0);
            
            // Convert to blob and download
            tempCanvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `gesture-particles-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }
            }, 'image/png', 1.0);
        }
    }

    reset() {
        if (this.particleSystem) {
            this.particleSystem.reset();
        }
        
        // Reset UI
        this.elements.primaryColor.value = '#00d4ff';
        this.elements.secondaryColor.value = '#ff00d4';
        this.elements.particleCount.value = 5000;
        this.elements.particleCountValue.textContent = '5000';
        this.elements.particleSize.value = 2;
        this.elements.particleSizeValue.textContent = '2';
        this.elements.animationSpeed.value = 1;
        this.elements.animationSpeedValue.textContent = '1.0';
        this.elements.gestureSensitivity.value = 1;
        this.elements.gestureSensitivityValue.textContent = '1.0';
        this.elements.bloomStrength.value = 1.2;
        this.elements.bloomStrengthValue.textContent = '1.2';
        
        // Reset pattern to sphere
        this.elements.patternBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-pattern="sphere"]').classList.add('active');
        
        if (this.particleSystem) {
            this.particleSystem.setColors('#00d4ff', '#ff00d4');
            this.particleSystem.setPattern('sphere');
            this.particleSystem.setParticleCount(5000);
            this.particleSystem.setParticleSize(2);
            this.particleSystem.setAnimationSpeed(1);
            this.particleSystem.setBloomStrength(1.2);
        }
    }

    dispose() {
        if (this.particleSystem) {
            this.particleSystem.dispose();
        }
        if (this.gestureDetector) {
            this.gestureDetector.dispose();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    
    // Hide loading overlay initially (show instructions instead)
    document.getElementById('loading-overlay').classList.add('hidden');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.dispose();
    }
});
