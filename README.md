# ✨ Gesture Particle System

A real-time interactive 3D particle system controlled by hand gestures using Three.js and MediaPipe.

![Gesture Particles Demo](https://img.shields.io/badge/Demo-Live-brightgreen)

## 🎮 Features

- **Real-time Hand Gesture Detection** - Open/close hand to control particles
- **8 Particle Patterns** - Sphere, Cube, Torus, Spiral, Galaxy, Heart, DNA, Wave
- **Color Customization** - Primary/secondary colors + 6 preset themes
- **Twinkling Star Effects** - Sharp, glowing particles with animation
- **Adjustable Settings** - Particle count, size, animation speed, bloom
- **Screenshot Export** - Save your creations as PNG images
- **Fullscreen Mode** - Immersive viewing experience
- **Clean Minimal UI** - Modern dark theme interface

## 🚀 Live Demo

Visit: [https://yourusername.github.io/gesture_particle_system](https://yourusername.github.io/gesture_particle_system)

## 🎯 How to Use

1. **Click "Start Experience"** to enable camera
2. **Allow camera access** when prompted
3. **Close your fist** → Particles contract and concentrate
4. **Open your hand** → Particles expand and disperse
5. **Move your hand** → Particles follow the motion

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Toggle fullscreen |
| `R` | Reset view |
| `S` | Take screenshot |
| `H` | Toggle control panel |

## 🛠️ Technologies

- **Three.js** - 3D graphics rendering
- **MediaPipe Hands** - Hand gesture detection
- **WebGL Shaders** - Custom particle effects
- **Django** - Backend framework (optional)

## 📁 Project Structure

```
gesture_particle_system/
├── docs/                    # GitHub Pages (static)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── particleSystem.js
│       ├── gestureDetector.js
│       └── app.js
├── static/                  # Django static files
├── templates/               # Django templates
├── core/                    # Django app
├── gesture_system/          # Django settings
└── manage.py
```

## 🌐 Deployment

### GitHub Pages (Static)
1. Push to GitHub
2. Go to **Settings → Pages**
3. Source: **Deploy from branch**
4. Branch: **main**, Folder: **/docs**
5. Save and wait for deployment

### Django Server (Local)
```bash
# Create virtual environment
python -m venv myenv
myenv\Scripts\activate  # Windows
source myenv/bin/activate  # Mac/Linux

# Install Django
pip install django

# Run server
python manage.py runserver
```
Visit: http://127.0.0.1:8000

## 📝 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

Made with ❤️ using Three.js and MediaPipe
