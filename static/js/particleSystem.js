/**
 * Particle System Module
 * High-fidelity 3D particle system with various pattern generators
 */

class ParticleSystem {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.particleCount = 5000;
        this.particleSize = 2;
        this.animationSpeed = 1.0;
        this.currentPattern = 'sphere';
        this.primaryColor = new THREE.Color(0x00d4ff);
        this.secondaryColor = new THREE.Color(0xff00d4);
        this.targetPositions = [];
        this.originalPositions = [];
        this.velocities = [];
        this.gestureInfluence = 0;
        this.gesturePosition = { x: 0, y: 0 };
        this.time = 0;
        this.bloomEnabled = true;
        this.trailsEnabled = false;
        this.bloomStrength = 1.2;
        this.isAnimating = true;
        
        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);
        this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);

        // Camera setup
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.z = 50;

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Create particles
        this.createParticles();

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Window resize handler
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation loop
        this.animate();
    }

    createParticles() {
        // Remove existing particles
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        const alphas = new Float32Array(this.particleCount);
        const randomSeeds = new Float32Array(this.particleCount);

        // Initialize arrays
        this.targetPositions = [];
        this.originalPositions = [];
        this.velocities = [];

        // Generate pattern positions
        const patternPositions = this.generatePattern(this.currentPattern);

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Position
            positions[i3] = patternPositions[i3];
            positions[i3 + 1] = patternPositions[i3 + 1];
            positions[i3 + 2] = patternPositions[i3 + 2];

            // Store original and target positions
            this.originalPositions.push(
                positions[i3],
                positions[i3 + 1],
                positions[i3 + 2]
            );
            this.targetPositions.push(
                positions[i3],
                positions[i3 + 1],
                positions[i3 + 2]
            );

            // Velocities
            this.velocities.push(0, 0, 0);

            // Color gradient with more saturation
            const t = i / this.particleCount;
            const color = new THREE.Color().lerpColors(this.primaryColor, this.secondaryColor, t);
            // Increase color saturation
            const hsl = {};
            color.getHSL(hsl);
            color.setHSL(hsl.h, Math.min(hsl.s * 1.2, 1.0), Math.min(hsl.l * 1.1, 0.7));
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            // Size variation - small star sizes
            sizes[i] = this.particleSize * (0.4 + Math.random() * 0.6);

            // Alpha - varied for depth
            alphas[i] = 0.7 + Math.random() * 0.3;
            
            // Random seed for twinkling
            randomSeeds[i] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        geometry.setAttribute('randomSeed', new THREE.BufferAttribute(randomSeeds, 1));

        // Shader material for twinkling star particles with glow
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: this.renderer.getPixelRatio() },
                bloomStrength: { value: this.bloomStrength }
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                attribute float randomSeed;
                varying vec3 vColor;
                varying float vAlpha;
                varying float vRandom;
                uniform float time;
                uniform float pixelRatio;
                
                void main() {
                    vColor = color;
                    vRandom = randomSeed;
                    
                    // Twinkling effect - vary alpha based on time and random seed
                    float twinkle = sin(time * 3.0 + randomSeed * 6.28) * 0.3 + 0.7;
                    float twinkle2 = sin(time * 5.0 + randomSeed * 12.56) * 0.2 + 0.8;
                    vAlpha = alpha * twinkle * twinkle2;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * pixelRatio * (150.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                varying float vRandom;
                uniform float bloomStrength;
                uniform float time;
                
                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    
                    // Create sharp 4-point star shape
                    vec2 absCenter = abs(center);
                    float starShape = max(absCenter.x, absCenter.y);
                    float crossShape = min(absCenter.x + absCenter.y * 0.5, absCenter.y + absCenter.x * 0.5);
                    float star = min(starShape, crossShape * 1.5);
                    
                    // Outer glow
                    float glow = exp(-dist * 4.0) * bloomStrength * 0.8;
                    
                    // Sharp bright core
                    float core = smoothstep(0.15, 0.0, star);
                    
                    // Star rays
                    float rays = smoothstep(0.25, 0.05, crossShape) * smoothstep(0.4, 0.1, dist);
                    
                    // Combine core and rays
                    float brightness = core + rays * 0.6 + glow;
                    
                    // Color with white-hot center
                    vec3 coreColor = mix(vColor, vec3(1.0), core * 0.7);
                    vec3 finalColor = coreColor * brightness * 1.5;
                    
                    // Final alpha
                    float alpha = (core + rays * 0.5 + glow * 0.5) * vAlpha;
                    
                    if (alpha < 0.01) discard;
                    
                    gl_FragColor = vec4(finalColor, min(alpha, 1.0));
                }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    generatePattern(pattern) {
        const positions = new Float32Array(this.particleCount * 3);
        const radius = 15;

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            let x, y, z;

            switch (pattern) {
                case 'sphere':
                    const phi = Math.acos(2 * Math.random() - 1);
                    const theta = Math.random() * Math.PI * 2;
                    const r = radius * Math.cbrt(Math.random());
                    x = r * Math.sin(phi) * Math.cos(theta);
                    y = r * Math.sin(phi) * Math.sin(theta);
                    z = r * Math.cos(phi);
                    break;

                case 'cube':
                    x = (Math.random() - 0.5) * radius * 2;
                    y = (Math.random() - 0.5) * radius * 2;
                    z = (Math.random() - 0.5) * radius * 2;
                    break;

                case 'torus':
                    const torusAngle = Math.random() * Math.PI * 2;
                    const tubeAngle = Math.random() * Math.PI * 2;
                    const torusRadius = radius * 0.8;
                    const tubeRadius = radius * 0.3 * Math.random();
                    x = (torusRadius + tubeRadius * Math.cos(tubeAngle)) * Math.cos(torusAngle);
                    y = tubeRadius * Math.sin(tubeAngle);
                    z = (torusRadius + tubeRadius * Math.cos(tubeAngle)) * Math.sin(torusAngle);
                    break;

                case 'spiral':
                    const spiralT = (i / this.particleCount) * Math.PI * 8;
                    const spiralRadius = radius * (0.2 + (i / this.particleCount) * 0.8);
                    x = spiralRadius * Math.cos(spiralT) + (Math.random() - 0.5) * 2;
                    y = (i / this.particleCount - 0.5) * radius * 2;
                    z = spiralRadius * Math.sin(spiralT) + (Math.random() - 0.5) * 2;
                    break;

                case 'galaxy':
                    const arm = Math.floor(Math.random() * 3);
                    const armAngle = (arm / 3) * Math.PI * 2;
                    const dist = Math.random() * radius;
                    const spread = (1 - dist / radius) * 0.5;
                    const galaxyAngle = armAngle + (dist / radius) * Math.PI * 2;
                    x = dist * Math.cos(galaxyAngle) + (Math.random() - 0.5) * spread * radius;
                    y = (Math.random() - 0.5) * spread * radius * 0.3;
                    z = dist * Math.sin(galaxyAngle) + (Math.random() - 0.5) * spread * radius;
                    break;

                case 'heart':
                    const ht = (i / this.particleCount) * Math.PI * 2;
                    const heartScale = radius * 0.8;
                    x = heartScale * 0.8 * (16 * Math.pow(Math.sin(ht), 3)) / 16;
                    y = heartScale * 0.8 * (13 * Math.cos(ht) - 5 * Math.cos(2*ht) - 2 * Math.cos(3*ht) - Math.cos(4*ht)) / 16;
                    z = (Math.random() - 0.5) * radius * 0.5;
                    // Add noise
                    x += (Math.random() - 0.5) * 1.5;
                    y += (Math.random() - 0.5) * 1.5;
                    break;

                case 'dna':
                    const dnaT = (i / this.particleCount) * Math.PI * 6;
                    const strand = i % 2;
                    const dnaRadius = radius * 0.4;
                    const dnaOffset = strand * Math.PI;
                    x = dnaRadius * Math.cos(dnaT + dnaOffset) + (Math.random() - 0.5) * 1;
                    y = (i / this.particleCount - 0.5) * radius * 3;
                    z = dnaRadius * Math.sin(dnaT + dnaOffset) + (Math.random() - 0.5) * 1;
                    break;

                case 'wave':
                    const waveX = (i % 100) / 100 - 0.5;
                    const waveZ = Math.floor(i / 100) / (this.particleCount / 100) - 0.5;
                    x = waveX * radius * 3;
                    z = waveZ * radius * 3;
                    y = Math.sin(waveX * Math.PI * 4) * Math.cos(waveZ * Math.PI * 4) * radius * 0.5;
                    y += (Math.random() - 0.5) * 1;
                    break;

                default:
                    x = (Math.random() - 0.5) * radius * 2;
                    y = (Math.random() - 0.5) * radius * 2;
                    z = (Math.random() - 0.5) * radius * 2;
            }

            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;
        }

        return positions;
    }

    setPattern(pattern) {
        this.currentPattern = pattern;
        const newPositions = this.generatePattern(pattern);
        
        for (let i = 0; i < this.particleCount * 3; i++) {
            this.targetPositions[i] = newPositions[i];
            this.originalPositions[i] = newPositions[i];
        }
    }

    setColors(primary, secondary) {
        this.primaryColor = new THREE.Color(primary);
        this.secondaryColor = new THREE.Color(secondary);
        
        if (this.particles) {
            const colors = this.particles.geometry.attributes.color.array;
            for (let i = 0; i < this.particleCount; i++) {
                const i3 = i * 3;
                const t = i / this.particleCount;
                const color = new THREE.Color().lerpColors(this.primaryColor, this.secondaryColor, t);
                // Increase color saturation
                const hsl = {};
                color.getHSL(hsl);
                color.setHSL(hsl.h, Math.min(hsl.s * 1.2, 1.0), Math.min(hsl.l * 1.1, 0.7));
                colors[i3] = color.r;
                colors[i3 + 1] = color.g;
                colors[i3 + 2] = color.b;
            }
            this.particles.geometry.attributes.color.needsUpdate = true;
        }
    }

    setParticleCount(count) {
        this.particleCount = count;
        this.createParticles();
    }

    setParticleSize(size) {
        this.particleSize = size;
        if (this.particles) {
            const sizes = this.particles.geometry.attributes.size.array;
            for (let i = 0; i < this.particleCount; i++) {
                sizes[i] = size * (0.5 + Math.random() * 0.5);
            }
            this.particles.geometry.attributes.size.needsUpdate = true;
        }
    }

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
    }

    setBloomStrength(strength) {
        this.bloomStrength = strength;
        if (this.particles && this.particles.material.uniforms) {
            this.particles.material.uniforms.bloomStrength.value = strength;
        }
    }

    setBloomEnabled(enabled) {
        this.bloomEnabled = enabled;
        this.setBloomStrength(enabled ? this.bloomStrength : 0);
    }

    setTrailsEnabled(enabled) {
        this.trailsEnabled = enabled;
    }

    updateGestureInfluence(openness, position, sensitivity = 1.0) {
        // openness: 0 = closed fist, 1 = open hand
        this.gestureInfluence = openness;
        this.gesturePosition = position;
        
        const positions = this.particles.geometry.attributes.position.array;
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Base target position
            let tx = this.originalPositions[i3];
            let ty = this.originalPositions[i3 + 1];
            let tz = this.originalPositions[i3 + 2];
            
            // Apply gesture influence
            const scale = 0.3 + openness * 1.7; // Scale from 0.3 to 2.0
            tx *= scale;
            ty *= scale;
            tz *= scale;
            
            // Add dispersion based on hand openness
            if (openness > 0.7) {
                const dispersion = (openness - 0.7) * 3 * sensitivity;
                tx += (Math.random() - 0.5) * dispersion * 10;
                ty += (Math.random() - 0.5) * dispersion * 10;
                tz += (Math.random() - 0.5) * dispersion * 10;
            }
            
            // Move particles towards gesture position
            const gesturePull = sensitivity * 0.3;
            tx += (position.x - 0.5) * 20 * gesturePull;
            ty += (0.5 - position.y) * 20 * gesturePull;
            
            this.targetPositions[i3] = tx;
            this.targetPositions[i3 + 1] = ty;
            this.targetPositions[i3 + 2] = tz;
        }
    }

    animate() {
        if (!this.isAnimating) return;
        
        requestAnimationFrame(() => this.animate());
        
        this.time += 0.016 * this.animationSpeed;
        
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            
            // Smooth interpolation to target positions
            for (let i = 0; i < this.particleCount; i++) {
                const i3 = i * 3;
                
                // Lerp to target
                const lerpFactor = 0.05 * this.animationSpeed;
                positions[i3] += (this.targetPositions[i3] - positions[i3]) * lerpFactor;
                positions[i3 + 1] += (this.targetPositions[i3 + 1] - positions[i3 + 1]) * lerpFactor;
                positions[i3 + 2] += (this.targetPositions[i3 + 2] - positions[i3 + 2]) * lerpFactor;
                
                // Add subtle floating animation
                const floatSpeed = 0.5 + (i / this.particleCount) * 0.5;
                const floatAmount = 0.1 * this.animationSpeed;
                positions[i3 + 1] += Math.sin(this.time * floatSpeed + i * 0.1) * floatAmount;
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
            
            // Rotate entire particle system slowly
            this.particles.rotation.y += 0.001 * this.animationSpeed;
            
            // Update shader uniforms
            if (this.particles.material.uniforms) {
                this.particles.material.uniforms.time.value = this.time;
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    reset() {
        this.gestureInfluence = 0;
        this.gesturePosition = { x: 0.5, y: 0.5 };
        
        for (let i = 0; i < this.particleCount * 3; i++) {
            this.targetPositions[i] = this.originalPositions[i];
        }
        
        this.camera.position.set(0, 0, 50);
        this.camera.lookAt(0, 0, 0);
        
        if (this.particles) {
            this.particles.rotation.set(0, 0, 0);
        }
    }

    takeScreenshot() {
        return this.renderer.domElement.toDataURL('image/png');
    }

    dispose() {
        this.isAnimating = false;
        
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
        
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}

// Export for use in other modules
window.ParticleSystem = ParticleSystem;
