/**
 * Gesture Detector Module
 * Hand gesture detection using MediaPipe Hands
 */

class GestureDetector {
    constructor(videoElement, canvasElement, options = {}) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        this.options = {
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5,
            ...options
        };
        
        this.hands = null;
        this.camera = null;
        this.isRunning = false;
        this.showTracking = true;
        this.sensitivity = 1.0;
        
        // Gesture state
        this.currentGesture = {
            openness: 0.5, // 0 = closed fist, 1 = open hand
            position: { x: 0.5, y: 0.5 },
            isDetected: false,
            confidence: 0
        };
        
        // Callbacks
        this.onGestureUpdate = null;
        this.onHandDetected = null;
        this.onHandLost = null;
        
        // Smoothing
        this.smoothingFactor = 0.3;
        this.previousOpenness = 0.5;
        this.previousPosition = { x: 0.5, y: 0.5 };
    }

    async init() {
        // Initialize MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: this.options.maxNumHands,
            modelComplexity: this.options.modelComplexity,
            minDetectionConfidence: this.options.minDetectionConfidence,
            minTrackingConfidence: this.options.minTrackingConfidence
        });

        this.hands.onResults((results) => this.onResults(results));

        return new Promise((resolve, reject) => {
            // Setup camera
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    if (this.isRunning && this.hands) {
                        await this.hands.send({ image: this.video });
                    }
                },
                width: 640,
                height: 480
            });

            this.camera.start()
                .then(() => {
                    this.isRunning = true;
                    this.updateCanvasSize();
                    resolve();
                })
                .catch((err) => {
                    console.error('Camera start error:', err);
                    reject(err);
                });
        });
    }

    updateCanvasSize() {
        this.canvas.width = this.video.videoWidth || 640;
        this.canvas.height = this.video.videoHeight || 480;
    }

    onResults(results) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Draw hand landmarks if tracking is enabled
            if (this.showTracking) {
                this.drawHand(landmarks, results.multiHandedness[0]);
            }

            // Calculate gesture
            const gesture = this.analyzeGesture(landmarks);
            
            // Smooth the values
            this.currentGesture.openness = this.lerp(
                this.previousOpenness,
                gesture.openness,
                this.smoothingFactor
            );
            this.currentGesture.position = {
                x: this.lerp(this.previousPosition.x, gesture.position.x, this.smoothingFactor),
                y: this.lerp(this.previousPosition.y, gesture.position.y, this.smoothingFactor)
            };
            this.currentGesture.isDetected = true;
            this.currentGesture.confidence = results.multiHandedness[0].score;

            // Update previous values
            this.previousOpenness = this.currentGesture.openness;
            this.previousPosition = { ...this.currentGesture.position };

            // Trigger callback
            if (this.onGestureUpdate) {
                this.onGestureUpdate(this.currentGesture);
            }

            // Hand detected callback
            if (!this.wasHandDetected && this.onHandDetected) {
                this.onHandDetected();
            }
            this.wasHandDetected = true;
        } else {
            // No hand detected
            if (this.wasHandDetected && this.onHandLost) {
                this.onHandLost();
            }
            this.wasHandDetected = false;
            this.currentGesture.isDetected = false;
            
            // Gradually return to neutral
            this.currentGesture.openness = this.lerp(this.currentGesture.openness, 0.5, 0.05);
            this.currentGesture.position = {
                x: this.lerp(this.currentGesture.position.x, 0.5, 0.05),
                y: this.lerp(this.currentGesture.position.y, 0.5, 0.05)
            };
            
            if (this.onGestureUpdate) {
                this.onGestureUpdate(this.currentGesture);
            }
        }
    }

    analyzeGesture(landmarks) {
        // Hand landmark indices
        const WRIST = 0;
        const THUMB_TIP = 4;
        const INDEX_TIP = 8;
        const MIDDLE_TIP = 12;
        const RING_TIP = 16;
        const PINKY_TIP = 20;
        const INDEX_MCP = 5;
        const MIDDLE_MCP = 9;
        const RING_MCP = 13;
        const PINKY_MCP = 17;

        // Calculate hand center (palm position)
        const palmCenter = {
            x: (landmarks[WRIST].x + landmarks[INDEX_MCP].x + landmarks[PINKY_MCP].x) / 3,
            y: (landmarks[WRIST].y + landmarks[INDEX_MCP].y + landmarks[PINKY_MCP].y) / 3
        };

        // Calculate finger extensions (distance from fingertip to palm center)
        const fingerTips = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
        const fingerMCPs = [1, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP]; // Thumb uses base

        let totalExtension = 0;
        let maxExtension = 0;

        for (let i = 0; i < fingerTips.length; i++) {
            const tipIndex = fingerTips[i];
            const mcpIndex = fingerMCPs[i];
            
            // Distance from fingertip to MCP joint
            const tipToMCP = this.distance(landmarks[tipIndex], landmarks[mcpIndex]);
            
            // Distance from MCP to wrist (for normalization)
            const mcpToWrist = this.distance(landmarks[mcpIndex], landmarks[WRIST]);
            
            // Normalized extension (0 = curled, 1 = extended)
            const extension = Math.min(tipToMCP / (mcpToWrist * 1.5), 1);
            totalExtension += extension;
            
            if (extension > maxExtension) {
                maxExtension = extension;
            }
        }

        // Average openness (0 = closed fist, 1 = fully open)
        const openness = Math.pow(totalExtension / fingerTips.length, 0.8);

        // Calculate hand position (normalized 0-1)
        const position = {
            x: palmCenter.x,
            y: palmCenter.y
        };

        return {
            openness: Math.max(0, Math.min(1, openness)),
            position: position
        };
    }

    distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    drawHand(landmarks, handedness) {
        const connections = [
            // Thumb
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Index
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Middle
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Ring
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Pinky
            [0, 17], [17, 18], [18, 19], [19, 20],
            // Palm
            [5, 9], [9, 13], [13, 17], [0, 17]
        ];

        const width = this.canvas.width;
        const height = this.canvas.height;

        // Draw connections
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';

        for (const [start, end] of connections) {
            const p1 = landmarks[start];
            const p2 = landmarks[end];
            
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x * width, p1.y * height);
            this.ctx.lineTo(p2.x * width, p2.y * height);
            this.ctx.stroke();
        }

        // Draw landmarks
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            const x = landmark.x * width;
            const y = landmark.y * height;
            
            // Fingertips have larger circles
            const isTip = [4, 8, 12, 16, 20].includes(i);
            const radius = isTip ? 8 : 5;
            
            // Gradient for fingertips
            if (isTip) {
                const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, 'rgba(255, 0, 212, 1)');
                gradient.addColorStop(1, 'rgba(0, 212, 255, 0.5)');
                this.ctx.fillStyle = gradient;
            } else {
                this.ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
            }
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw openness indicator
        this.drawOpennessIndicator();
    }

    drawOpennessIndicator() {
        const x = this.canvas.width - 30;
        const y = this.canvas.height / 2;
        const height = 100;
        const width = 10;
        
        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(x - width/2, y - height/2, width, height);
        
        // Fill based on openness
        const fillHeight = height * this.currentGesture.openness;
        const gradient = this.ctx.createLinearGradient(x, y + height/2, x, y - height/2);
        gradient.addColorStop(0, '#00d4ff');
        gradient.addColorStop(1, '#ff00d4');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x - width/2, y + height/2 - fillHeight, width, fillHeight);
        
        // Border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - width/2, y - height/2, width, height);
    }

    setShowTracking(show) {
        this.showTracking = show;
    }

    setSensitivity(sensitivity) {
        this.sensitivity = sensitivity;
        this.smoothingFactor = 0.2 + (1 - sensitivity) * 0.3; // Lower sensitivity = more smoothing
    }

    getGesture() {
        return this.currentGesture;
    }

    getGestureDescription() {
        const openness = this.currentGesture.openness;
        
        if (!this.currentGesture.isDetected) {
            return { icon: '👋', text: 'Searching...' };
        }
        
        if (openness < 0.3) {
            return { icon: '✊', text: 'Closed Fist' };
        } else if (openness < 0.5) {
            return { icon: '🤏', text: 'Partially Closed' };
        } else if (openness < 0.7) {
            return { icon: '🖐️', text: 'Partially Open' };
        } else {
            return { icon: '✋', text: 'Open Hand' };
        }
    }

    pause() {
        this.isRunning = false;
    }

    resume() {
        this.isRunning = true;
    }

    stop() {
        this.isRunning = false;
        if (this.camera) {
            this.camera.stop();
        }
    }

    dispose() {
        this.stop();
        if (this.hands) {
            this.hands.close();
        }
    }
}

// Export for use in other modules
window.GestureDetector = GestureDetector;
