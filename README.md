# Gesture-Based Real-Time Interactive 3D Particle System

A Django-based web application that uses Three.js for 3D particle visualization and MediaPipe Hands for real-time gesture recognition. Control particle behavior with hand gestures!

## Features

### 3D Particle System (Three.js)
- **Multiple Patterns**: Sphere, Cube, and Random Cloud formations
- **5000 Interactive Particles**: Smooth animations and transitions
- **Real-time Rendering**: 60 FPS particle system with automatic rotation

### Gesture Recognition (MediaPipe Hands)
- **Open Hand (✋)**: Expands particles outward
- **Closed Fist (✊)**: Contracts particles toward the center
- **Real-time Detection**: Smooth gesture-to-particle transitions

### Interactive UI Controls
- **Pattern Selector**: Switch between Sphere, Cube, and Random Cloud formations
- **Color Picker**: Change particle colors in real-time
- **Fullscreen Mode**: Toggle fullscreen for immersive experience
- **Gesture Status Display**: See current hand gesture in real-time

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sanjaynep/gesture_particle_system.git
   cd gesture_particle_system
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

4. **Start the development server**:
   ```bash
   python manage.py runserver
   ```

5. **Open in browser**:
   Navigate to `http://localhost:8000/`

## Requirements

- Python 3.8+
- Django 4.2+
- Modern web browser with:
  - WebGL support (for Three.js)
  - Camera access (for gesture recognition)
  - JavaScript enabled

## Project Structure

```
gesture_particle_system/
├── gesture_project/          # Django project settings
│   ├── settings.py          # Project configuration
│   ├── urls.py              # Main URL routing
│   └── wsgi.py              # WSGI configuration
├── particles/                # Django app
│   ├── static/
│   │   └── particles/
│   │       ├── css/
│   │       │   └── style.css      # UI styling
│   │       └── js/
│   │           └── particles.js   # Three.js & MediaPipe logic
│   ├── templates/
│   │   └── particles/
│   │       └── index.html         # Main template
│   ├── urls.py              # App URL routing
│   └── views.py             # View logic
├── manage.py                # Django management script
└── requirements.txt         # Python dependencies
```

## How It Works

### Three.js Particle System
- Initializes a 3D scene with perspective camera
- Creates 5000 particles using THREE.Points
- Implements three pattern generation algorithms:
  - **Sphere**: Particles distributed on spherical surface
  - **Cube**: Particles distributed in cubic volume
  - **Random Cloud**: Particles randomly scattered in 3D space

### Gesture Recognition
- Uses MediaPipe Hands to detect hand landmarks in real-time
- Analyzes finger positions to determine hand state:
  - **Open Hand**: 3+ fingers extended → Particles expand (scale 1.5x)
  - **Closed Fist**: <3 fingers extended → Particles contract (scale 0.3x)
- Smooth transitions using linear interpolation

### Interactive Controls
- **Pattern Selection**: Regenerates particle positions based on selected pattern
- **Color Picker**: Updates particle material color dynamically
- **Fullscreen**: Uses Fullscreen API for immersive experience

## Browser Permissions

The application requires camera access for gesture recognition. When prompted:
1. Click "Allow" to enable camera access
2. The application will begin detecting hand gestures
3. No video is stored or transmitted - all processing is done locally in your browser

## Technologies Used

- **Backend**: Django 4.2
- **3D Graphics**: Three.js (via CDN)
- **Gesture Recognition**: MediaPipe Hands (via CDN)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)

## Performance

- Renders 5000 particles at 60 FPS on modern hardware
- Low latency gesture detection (<50ms)
- Smooth transitions using requestAnimationFrame
- Optimized BufferGeometry for efficient rendering

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires WebGL 2.0 support

## License

MIT License - Feel free to use and modify!

## Credits

Created as a demonstration of combining Three.js 3D graphics with MediaPipe hand tracking for interactive web experiences.
