class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.resetGameState();
    }

    resetGameState() {
        this.score = 0;
        this.speed = 7;
        this.speedIncrease = 0.3;
        this.lastSpeedIncrease = 0;
        this.moveDistance = 40;
        this.lastMoveTime = 0;
        this.moveDelay = 150;
    }

    preload() {
        // Load game assets
        this.load.image('snowboarder', 'assets/snowboarder.png');
        this.load.image('rock', 'assets/rock.png');
        this.load.image('tree', 'assets/tree.png');
        this.load.image('skier', 'assets/skier.png');
        this.load.image('background', 'assets/mountain.png');
    }

    create() {
        // Reset game state when starting a new game
        this.resetGameState();
        
        // Set up scrolling background
        this.background = this.add.tileSprite(0, 0, this.game.config.width, this.game.config.height, 'background');
        this.background.setOrigin(0, 0);

        // Create player with smaller scale for mobile
        this.player = this.physics.add.sprite(this.game.config.width / 2, this.game.config.height * 0.2, 'snowboarder');
        this.player.setScale(window.innerWidth < 768 ? 0.8 : 1.5);
        this.player.setAngle(0);
        // Set player collision body size
        this.player.setSize(this.player.width * 0.7, this.player.height * 0.7);

        // Initialize obstacle groups with physics
        this.staticObstacles = this.physics.add.group();
        this.movingObstacles = this.physics.add.group();

        // Add collision detection
        this.physics.add.overlap(this.player, this.staticObstacles, this.gameOver, null, this);
        this.physics.add.overlap(this.player, this.movingObstacles, this.gameOver, null, this);

        // Set up score display with responsive font size
        const fontSize = window.innerWidth < 768 ? '24px' : '32px';
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: fontSize,
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4,
            shadowColor: '#000',
            shadowBlur: 4,
            shadowOffsetX: 2,
            shadowOffsetY: 2
        });

        // Add control buttons for mobile with improved styling
        const buttonSize = window.innerWidth < 768 ? 50 : 60;
        const buttonY = this.game.config.height - (window.innerWidth < 768 ? 70 : 80);
        const buttonStyle = {
            fontSize: window.innerWidth < 768 ? '36px' : '48px',
            fill: '#fff',
            backgroundColor: '#000000aa',
            padding: { x: 15, y: 8 },
            fixedWidth: buttonSize,
            fixedHeight: buttonSize,
            align: 'center',
            shadow: { blur: 4, color: '#000000', fill: true },
            stroke: '#ffffff',
            strokeThickness: 2
        };

        this.leftButton = this.add.text(40, buttonY, '←', buttonStyle)
            .setInteractive()
            .setScrollFactor(0)
            .setAlpha(0.8);
        
        this.rightButton = this.add.text(this.game.config.width - 90, buttonY, '→', buttonStyle)
            .setInteractive()
            .setScrollFactor(0)
            .setAlpha(0.8);

        // Add button controls with hover effects
        this.leftButton.on('pointerdown', () => {
            this.leftButton.setAlpha(1);
            this.movePlayer(-1);
        });
        this.leftButton.on('pointerup', () => this.leftButton.setAlpha(0.8));
        this.leftButton.on('pointerout', () => this.leftButton.setAlpha(0.8));

        this.rightButton.on('pointerdown', () => {
            this.rightButton.setAlpha(1);
            this.movePlayer(1);
        });
        this.rightButton.on('pointerup', () => this.rightButton.setAlpha(0.8));
        this.rightButton.on('pointerout', () => this.rightButton.setAlpha(0.8));

        // Set up keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // Keep touch input for swipes
        this.input.on('pointerdown', this.startSwipe, this);
        this.input.on('pointerup', this.endSwipe, this);

        // Start spawning obstacles
        this.spawnObstacles();
    }

    movePlayer(direction) {
        const currentTime = new Date().getTime();
        // Check if enough time has passed since last move
        if (currentTime - this.lastMoveTime >= this.moveDelay) {
            const newX = this.player.x + (direction * this.moveDistance);
            if (newX > 50 && newX < this.game.config.width - 50) {
                this.player.x = newX;
                this.lastMoveTime = currentTime;
            }
        }
    }

    startSwipe(pointer) {
        this.swipeStartX = pointer.x;
    }

    endSwipe(pointer) {
        const swipeEndX = pointer.x;
        const swipeDistance = swipeEndX - this.swipeStartX;
        const swipeThreshold = 50;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            this.movePlayer(swipeDistance > 0 ? 1 : -1);
        }
    }

    spawnObstacles() {
        const isMobile = window.innerWidth < 768;
        // Calculate spawn zones with balanced intervals
        const spawnZones = [];
        // Adjust spawn range and interval based on device and game progress
        const baseInterval = this.score < 100 ? (isMobile ? 80 : 70) : 
                           this.score < 300 ? (isMobile ? 60 : 50) : 
                           (isMobile ? 45 : 40);
        
        for (let y = 50; y <= (isMobile ? 800 : 1200); y += baseInterval) {
            spawnZones.push(this.game.config.height + y);
        }

        // Track positions to ensure better spacing
        const existingPositions = new Set();
        let obstaclesSpawned = 0;

        // Base spawn chances that increase with score
        const baseStaticChance = Math.min(40 + (this.score / 20), 75);
        const baseMovingChance = Math.min(30 + (this.score / 30), 60);

        // Spawn static obstacles with progressive difficulty
        spawnZones.forEach(zoneY => {
            if (Phaser.Math.Between(0, 100) < (isMobile ? baseStaticChance : baseStaticChance + 5)) {
                for (let attempt = 0; attempt < (isMobile ? 2 : 3); attempt++) {
                    let x = Phaser.Math.Between(50, this.game.config.width - 50);
                    if (!this.isPositionOccupied(x, zoneY, existingPositions)) {
                        existingPositions.add(`${Math.floor(x/50)},${Math.floor(zoneY/50)}`);
                        const obstacle = this.staticObstacles.create(x, zoneY, Phaser.Math.RND.pick(['rock', 'tree']));
                        obstacle.setScale(window.innerWidth < 768 ? 0.7 : 1.2);
                        obstacle.setSize(obstacle.width * 0.7, obstacle.height * 0.7);
                        obstaclesSpawned++;
                        break;
                    }
                }
            }
        });

        // Spawn moving obstacles (skiers) with progressive difficulty
        spawnZones.forEach((zoneY, index) => {
            if (index % 2 === 0 && Phaser.Math.Between(0, 100) < (isMobile ? baseMovingChance : baseMovingChance + 5)) {
                for (let attempt = 0; attempt < 2; attempt++) {
                    let x = Phaser.Math.Between(50, this.game.config.width - 50);
                    if (!this.isPositionOccupied(x, zoneY, existingPositions)) {
                        existingPositions.add(`${Math.floor(x/50)},${Math.floor(zoneY/50)}`);
                        const obstacle = this.movingObstacles.create(x, zoneY, 'skier');
                        obstacle.setScale(window.innerWidth < 768 ? 0.7 : 1.2);
                        obstacle.speed = Math.min(4 + (this.score / 100), 10);
                        obstacle.setAngle(0);
                        obstacle.setSize(obstacle.width * 0.7, obstacle.height * 0.7);
                        obstacle.horizontalSpeed = Phaser.Math.Between(-2, 2);
                        obstacle.nextDirectionChange = 0;
                        obstaclesSpawned++;
                        break;
                    }
                }
            }
        });
    }

    isPositionOccupied(x, y, existingPositions) {
        const gridX = Math.floor(x/50);
        const gridY = Math.floor(y/50);
        const isMobile = window.innerWidth < 768;
        const spacing = this.score < 200 ? (isMobile ? 2 : 3) : (isMobile ? 1 : 2);
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -spacing; dy <= spacing; dy++) {
                if (existingPositions.has(`${gridX + dx},${gridY + dy}`)) {
                    return true;
                }
            }
        }
        return false;
    }

    update(time, delta) {
        // Handle keyboard input
        if (this.cursors.left.isDown) {
            this.movePlayer(-1);
        } else if (this.cursors.right.isDown) {
            this.movePlayer(1);
        }

        // Scroll background with progressive speed
        const baseSpeed = 5;
        this.speed = Math.min(baseSpeed + (this.score / 100), 12);
        this.background.tilePositionY += this.speed;

        // Progressive scoring
        if (time - this.lastSpeedIncrease > 1000) {
            this.score += Math.floor(5 + (this.speed - baseSpeed));
            this.scoreText.setText('Score: ' + this.score);
            this.lastSpeedIncrease = time;
        }

        // Update obstacles
        this.updateObstacles(time);

        // Dynamic obstacle spawning based on score
        const spawnCheckInterval = Math.max(12 - Math.floor(this.score / 200), 6);
        if (time % spawnCheckInterval === 0) {
            const minObstacles = Math.min(6 + Math.floor(this.score / 100), 15);
            const totalObstacles = this.staticObstacles.countActive() + this.movingObstacles.countActive();
            
            if (totalObstacles < minObstacles) {
                this.spawnObstacles();
            }
        }
    }

    updateObstacles(time) {
        // Update static obstacles
        this.staticObstacles.children.iterate((obstacle) => {
            if (obstacle) {
                obstacle.y -= this.speed;
                if (obstacle.y < -50) {
                    obstacle.destroy();
                }
            }
        });

        // Update moving obstacles with improved movement
        this.movingObstacles.children.iterate((obstacle) => {
            if (obstacle) {
                // Update vertical position
                obstacle.y -= obstacle.speed;
                
                // Update horizontal movement
                if (time > obstacle.nextDirectionChange) {
                    obstacle.horizontalSpeed = Phaser.Math.Between(-3, 3);
                    obstacle.nextDirectionChange = time + Phaser.Math.Between(500, 2000);
                }
                
                // Apply horizontal movement
                obstacle.x += obstacle.horizontalSpeed;
                
                // Keep skiers within bounds
                obstacle.x = Phaser.Math.Clamp(obstacle.x, 50, this.game.config.width - 50);
                
                if (obstacle.y < -50) {
                    obstacle.destroy();
                }
            }
        });
    }

    checkCollisions() {
        // Check collisions with static obstacles
        this.physics.overlap(this.player, this.staticObstacles, this.gameOver, null, this);
        // Check collisions with moving obstacles
        this.physics.overlap(this.player, this.movingObstacles, this.gameOver, null, this);
    }

    gameOver() {
        // Stop the game immediately
        this.scene.pause();
        
        // Go to game over scene first
        this.scene.start('GameOverScene', { score: this.score });
    }
}

class NameInputScene extends Phaser.Scene {
    constructor() {
        super('NameInputScene');
    }

    init(data) {
        this.score = data.score;
    }

    create() {
        const { width, height } = this.game.config;
        const isMobile = window.innerWidth < 768;
        const fontSize = isMobile ? '36px' : '48px';
        const scoreFontSize = isMobile ? '24px' : '32px';

        // Semi-transparent background
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        // Add title with glow effect
        this.add.text(width / 2, height * 0.2, 'New High Score!', {
            fontSize: fontSize,
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 6,
            shadow: { blur: 8, color: '#f1c40f', fill: true }
        }).setOrigin(0.5);

        // Add score display with animation
        const scoreText = this.add.text(width / 2, height * 0.3, `Score: ${this.score}`, {
            fontSize: scoreFontSize,
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4,
            shadow: { blur: 4, color: '#000000', fill: true }
        }).setOrigin(0.5);

        // Animate score
        this.tweens.add({
            targets: scoreText,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            repeat: 1
        });

        // Create input field background with glow
        const inputBg = this.add.rectangle(width / 2, height * 0.4, isMobile ? 250 : 300, isMobile ? 50 : 60, 0x000000, 0.5);
        inputBg.setInteractive();
        
        // Add glow effect to input field
        inputBg.postFX.addGlow(0x3498db, 4, 0, false, 0.1, 16);

        // Add placeholder text
        this.nameText = this.add.text(width / 2, height * 0.4, 'Click to enter name', {
            fontSize: isMobile ? '20px' : '24px',
            fill: '#999',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Handle input with improved visual feedback
        let playerName = '';
        inputBg.on('pointerdown', () => {
            inputBg.setFillStyle(0x3498db, 0.3);
            const name = prompt('Enter your name:', '');
            if (name) {
                playerName = name.substring(0, 15);
                this.nameText.setText(playerName);
                this.nameText.setStyle({ fill: '#fff' });
            }
            inputBg.setFillStyle(0x000000, 0.5);
        });

        // Add submit button with improved styling
        const buttonStyle = {
            fontSize: isMobile ? '24px' : '32px',
            fill: '#fff',
            backgroundColor: '#2ecc71',
            padding: { x: isMobile ? 15 : 20, y: isMobile ? 8 : 10 },
            shadow: { blur: 4, color: '#000000', fill: true },
            stroke: '#000',
            strokeThickness: 2
        };

        const submitButton = this.add.text(width / 2, height * 0.6, 'Submit', buttonStyle)
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerover', () => submitButton.setScale(1.1))
            .on('pointerout', () => submitButton.setScale(1));

        submitButton.on('pointerdown', () => {
            if (playerName.trim() === '') {
                playerName = 'Anonymous';
            }
            // Save score with name
            const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
            highScores.push({
                name: playerName,
                score: this.score,
                date: new Date().toISOString()
            });
            highScores.sort((a, b) => b.score - a.score);
            localStorage.setItem('highScores', JSON.stringify(highScores.slice(0, 10)));
            
            // Transition effect
            this.cameras.main.fade(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('LeaderboardScene');
            });
        });
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.score = data.score;
    }

    create() {
        const { width, height } = this.game.config;
        const isMobile = window.innerWidth < 768;

        // Modern semi-transparent overlay
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0)
            .setAlpha(0);
        this.tweens.add({
            targets: this.children.list[0],
            alpha: 0.7,
            duration: 500,
            ease: 'Power2'
        });

        // Game Over text with animation
        const gameOverText = this.add.text(width / 2, height * 0.3, 'Game Over', {
            fontFamily: 'Inter, sans-serif',
            fontSize: isMobile ? '48px' : '64px',
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000000',
                blur: 8,
                fill: true
            }
        }).setOrigin(0.5).setAlpha(0);

        // Animate game over text
        this.tweens.add({
            targets: gameOverText,
            y: height * 0.25,
            alpha: 1,
            duration: 800,
            ease: 'Back.out'
        });

        // Score display with animation
        const scoreText = this.add.text(width / 2, height * 0.4, `Score: ${this.score}`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: isMobile ? '32px' : '48px',
            fontWeight: '600',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: scoreText,
            alpha: 1,
            scale: 1.2,
            duration: 600,
            delay: 400,
            ease: 'Back.out'
        });

        // Create modern buttons
        const createButton = (text, y, color, delay) => {
            const button = this.add.container(width / 2, y);
            
            // Button background
            const bg = this.add.rectangle(0, 0, isMobile ? 200 : 250, isMobile ? 50 : 60, color)
                .setOrigin(0.5)
                .setAlpha(0.9);
            
            // Button text
            const txt = this.add.text(0, 0, text, {
                fontFamily: 'Inter, sans-serif',
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: 'bold',
                fill: '#ffffff'
            }).setOrigin(0.5);

            button.add([bg, txt]);
            button.setAlpha(0);
            
            // Add hover effects
            bg.setInteractive()
                .on('pointerover', () => this.tweens.add({
                    targets: button,
                    scale: 1.05,
                    duration: 200
                }))
                .on('pointerout', () => this.tweens.add({
                    targets: button,
                    scale: 1,
                    duration: 200
                }));

            // Animate button appearance
            this.tweens.add({
                targets: button,
                alpha: 1,
                y: y - 10,
                duration: 500,
                delay: delay,
                ease: 'Back.out'
            });

            return button;
        };

        // Add buttons with different colors and animations
        const playAgainButton = createButton('Play Again', height * 0.6, 0x2ecc71, 600);
        const saveScoreButton = createButton('Save Score', height * 0.7, 0x3498db, 800);
        const leaderboardButton = createButton('Leaderboard', height * 0.8, 0x9b59b6, 1000);

        // Add button functionality
        playAgainButton.list[0].on('pointerdown', () => this.scene.start('GameScene'));
        saveScoreButton.list[0].on('pointerdown', () => this.scene.start('NameInputScene', { score: this.score }));
        leaderboardButton.list[0].on('pointerdown', () => this.scene.start('LeaderboardScene'));
    }
}

class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardScene');
    }

    create() {
        const { width, height } = this.game.config;
        const isMobile = window.innerWidth < 768;
        const fontSize = isMobile ? '36px' : '48px';
        const scoreFontSize = isMobile ? '20px' : '24px';

        // Semi-transparent background
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        // Title with glow effect
        this.add.text(width / 2, 50, 'Leaderboard', {
            fontSize: fontSize,
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 6,
            shadow: { blur: 8, color: '#9b59b6', fill: true }
        }).setOrigin(0.5);

        // Get and display high scores
        const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
        const startY = 150;
        const spacing = isMobile ? 35 : 40;

        highScores.forEach((score, index) => {
            const dateStr = new Date(score.date).toLocaleDateString();
            const name = score.name || 'Anonymous';
            
            // Create score container
            const container = this.add.container(width / 2, startY + index * spacing);
            
            // Add background for each score
            const bg = this.add.rectangle(0, 0, width * 0.8, spacing - 5, 0x000000, index % 2 === 0 ? 0.3 : 0.4);
            container.add(bg);
            
            // Add score text
            const scoreText = this.add.text(0, 0, 
                `${index + 1}. ${name} - ${score.score} - ${dateStr}`, {
                fontSize: scoreFontSize,
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 2
            }).setOrigin(0.5);
            container.add(scoreText);
        });

        // Button style
        const buttonStyle = {
            fontSize: isMobile ? '24px' : '32px',
            fill: '#fff',
            backgroundColor: '#e74c3c',
            padding: { x: isMobile ? 15 : 20, y: isMobile ? 8 : 10 },
            shadow: { blur: 4, color: '#000000', fill: true },
            stroke: '#000',
            strokeThickness: 2
        };

        // Back button
        const backButton = this.add.text(width / 2 - (isMobile ? 80 : 100), height - (isMobile ? 80 : 100), 
            'Back', buttonStyle)
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerover', () => backButton.setScale(1.1))
            .on('pointerout', () => backButton.setScale(1));

        // Erase button
        const eraseButton = this.add.text(width / 2 + (isMobile ? 80 : 100), height - (isMobile ? 80 : 100), 
            'Erase All', {
                ...buttonStyle,
                backgroundColor: '#95a5a6'
            })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerover', () => eraseButton.setScale(1.1))
            .on('pointerout', () => eraseButton.setScale(1));

        backButton.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        eraseButton.on('pointerdown', () => {
            if (confirm('Are you sure you want to erase all scores?')) {
                localStorage.removeItem('highScores');
                this.scene.restart();
            }
        });
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [GameScene, NameInputScene, LeaderboardScene, GameOverScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Create and start the game
const game = new Phaser.Game(config); 