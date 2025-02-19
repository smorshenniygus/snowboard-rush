# Snowboard Rush 🏂

A thrilling snowboarding obstacle course game where players dodge obstacles while racing down a mountain. Built with Phaser 3 and JavaScript.

[Play the Game](https://smorshenniygus.github.io/snowboard-rush/) 

## 🎮 Game Features

- Responsive design that works on both desktop and mobile devices
- Swipe/keyboard controls for smooth gameplay
- Dynamic obstacle spawning system
- Progressive difficulty increase
- Local high score system
- Beautiful pixel art graphics

## 🎯 How to Play

- **Desktop**: Use left/right arrow keys to move
- **Mobile**: Swipe left/right or use on-screen buttons
- Avoid obstacles (trees, rocks, and other skiers)
- Score points by surviving longer
- Game speed increases over time

## 🛠️ Development

### Prerequisites

- A modern web browser
- Basic understanding of HTML, CSS, and JavaScript
- Git for version control

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/smorshenniygus/snowboard-rush.git
   ```

2. Navigate to the project directory:
   ```bash
   cd snowboard-rush
   ```

3. Start a local server:
   - Using Python 3:
     ```bash
     python -m http.server 8000
     ```
   - Using Node.js:
     ```bash
     npx http-server
     ```

4. Open your browser and visit:
   - `http://localhost:8000` (Python)
   - `http://localhost:8080` (Node.js)

## 🚀 Deployment

The game is hosted using GitHub Pages. To deploy your own version:

1. Fork this repository
2. Go to repository Settings > Pages
3. Set source to 'main' branch and root directory
4. Your game will be available at `https://smorshenniygus.github.io/snowboard-rush/`

## 🎨 Assets

All game assets are included in the `assets` directory:
- `snowboarder.png` - Player character
- `rock.png` - Static obstacle
- `tree.png` - Static obstacle
- `skier.png` - Moving obstacle
- `mountain.png` - Scrolling background

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 