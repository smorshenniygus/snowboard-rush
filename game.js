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

        // Create player at the top with physics
        this.player = this.physics.add.sprite(this.game.config.width / 2, this.game.config.height * 0.2, 'snowboarder');
        this.player.setScale(1.5);
        this.player.setAngle(0);
        // Set player collision body size
        this.player.setSize(this.player.width * 0.7, this.player.height * 0.7);

        // Initialize obstacle groups with physics
        this.staticObstacles = this.physics.add.group();
        this.movingObstacles = this.physics.add.group();

        // Add collision detection
        this.physics.add.overlap(this.player, this.staticObstacles, this.gameOver, null, this);
        this.physics.add.overlap(this.player, this.movingObstacles, this.gameOver, null, this);

        // Set up score display
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        });

        // Add control buttons for mobile
        const buttonStyle = {
            fontSize: '48px',
            fill: '#fff',
            backgroundColor: '#000000aa',
            padding: { x: 20, y: 10 },
            fixedWidth: 60,
            fixedHeight: 60,
            align: 'center'
        };

        this.leftButton = this.add.text(50, this.game.config.height - 80, '←', buttonStyle)
            .setInteractive()
            .setScrollFactor(0);
        
        this.rightButton = this.add.text(this.game.config.width - 110, this.game.config.height - 80, '→', buttonStyle)
            .setInteractive()
            .setScrollFactor(0);

        // Add button controls
        this.leftButton.on('pointerdown', () => this.movePlayer(-1));
        this.rightButton.on('pointerdown', () => this.movePlayer(1));

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
        // Calculate spawn zones with smaller intervals for better vertical distribution
        const spawnZones = [];
        for (let y = 50; y <= 600; y += 100) { // Adjusted vertical spacing
            spawnZones.push(this.game.config.height + y);
        }

        // Track positions to ensure better spacing
        const existingPositions = new Set();
        let obstaclesSpawned = 0;

        // Spawn static obstacles with better distribution
        spawnZones.forEach(zoneY => {
            // Ensure at least one obstacle per zone
            let attempts = 0;
            let x;
            let hasSpawnedInZone = false;

            // Try up to 3 times to place an obstacle in this zone
            while (!hasSpawnedInZone && attempts < 3) {
                x = Phaser.Math.Between(50, this.game.config.width - 50);
                if (!this.isPositionOccupied(x, zoneY, existingPositions)) {
                    existingPositions.add(`${Math.floor(x/50)},${Math.floor(zoneY/50)}`);
                    const obstacle = this.staticObstacles.create(x, zoneY, Phaser.Math.RND.pick(['rock', 'tree']));
                    obstacle.setScale(1.2);
                    obstacle.setSize(obstacle.width * 0.7, obstacle.height * 0.7);
                    hasSpawnedInZone = true;
                    obstaclesSpawned++;
                }
                attempts++;
            }

            // Try to add an additional obstacle with 50% chance
            if (Phaser.Math.Between(0, 100) < 50) {
                attempts = 0;
                while (attempts < 3) {
                    x = Phaser.Math.Between(50, this.game.config.width - 50);
                    if (!this.isPositionOccupied(x, zoneY, existingPositions)) {
                        existingPositions.add(`${Math.floor(x/50)},${Math.floor(zoneY/50)}`);
                        const obstacle = this.staticObstacles.create(x, zoneY, Phaser.Math.RND.pick(['rock', 'tree']));
                        obstacle.setScale(1.2);
                        obstacle.setSize(obstacle.width * 0.7, obstacle.height * 0.7);
                        obstaclesSpawned++;
                        break;
                    }
                    attempts++;
                }
            }
        });

        // Spawn moving obstacles (skiers) with better distribution
        spawnZones.forEach((zoneY, index) => {
            if (index % 2 === 0 && Phaser.Math.Between(0, 100) < 40) { // Spawn skiers more frequently
                let attempts = 0;
                let x;
                do {
                    x = Phaser.Math.Between(50, this.game.config.width - 50);
                    attempts++;
                } while (this.isPositionOccupied(x, zoneY, existingPositions) && attempts < 5);

                if (attempts < 5) {
                    existingPositions.add(`${Math.floor(x/50)},${Math.floor(zoneY/50)}`);
                    const obstacle = this.movingObstacles.create(x, zoneY, 'skier');
                    obstacle.setScale(1.2);
                    obstacle.speed = Phaser.Math.Between(6, 12);
                    obstacle.setAngle(0);
                    obstacle.setSize(obstacle.width * 0.7, obstacle.height * 0.7);
                    obstacle.horizontalSpeed = Phaser.Math.Between(-3, 3);
                    obstacle.nextDirectionChange = 0;
                    obstaclesSpawned++;
                }
            }
        });

        // If not enough obstacles were spawned, force spawn some more
        if (obstaclesSpawned < 3) {
            const extraSpawnY = this.game.config.height + Phaser.Math.Between(50, 600);
            for (let i = 0; i < 3 - obstaclesSpawned; i++) {
                let x = Phaser.Math.Between(50, this.game.config.width - 50);
                if (!this.isPositionOccupied(x, extraSpawnY, existingPositions)) {
                    const obstacle = this.staticObstacles.create(x, extraSpawnY, Phaser.Math.RND.pick(['rock', 'tree']));
                    obstacle.setScale(1.2);
                    obstacle.setSize(obstacle.width * 0.7, obstacle.height * 0.7);
                }
            }
        }
    }

    isPositionOccupied(x, y, existingPositions) {
        const gridX = Math.floor(x/50);
        const gridY = Math.floor(y/50);
        
        // Check a narrower horizontal area but longer vertical area
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                if (existingPositions.has(`${gridX + dx},${gridY + dy}`)) {
                    return true;
                }
            }
        }
        return false;
    }

    update(time, delta) {
        // Handle keyboard input with smoother movement
        if (this.cursors.left.isDown) {
            this.movePlayer(-1);
        } else if (this.cursors.right.isDown) {
            this.movePlayer(1);
        }

        // Scroll background downward
        this.background.tilePositionY += this.speed;

        // Increase speed over time
        if (time - this.lastSpeedIncrease > 1000) {
            this.speed += this.speedIncrease;
            this.lastSpeedIncrease = time;
            this.score += 10;
            this.scoreText.setText('Score: ' + this.score);
        }

        // Update obstacles
        this.updateObstacles(time);

        // Spawn new obstacles more frequently and check for minimum obstacles
        if (time % 15 === 0) { // Changed from 27 to 15 for more frequent spawns
            // Count current obstacles
            const totalObstacles = this.staticObstacles.countActive() + this.movingObstacles.countActive();
            
            // If too few obstacles, force a spawn
            if (totalObstacles < 5) {
                this.spawnObstacles();
            } else if (Phaser.Math.Between(0, 100) < 70) { // 70% chance to spawn normally
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

        // Add title
        this.add.text(width / 2, height * 0.2, 'New High Score!', {
            fontSize: '48px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Add score display
        this.add.text(width / 2, height * 0.3, `Score: ${this.score}`, {
            fontSize: '32px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Create input field background
        const inputBg = this.add.rectangle(width / 2, height * 0.4, 300, 60, 0x000000, 0.5);
        inputBg.setInteractive();

        // Add placeholder text
        this.nameText = this.add.text(width / 2, height * 0.4, 'Click to enter name', {
            fontSize: '24px',
            fill: '#999'
        }).setOrigin(0.5);

        // Handle input
        let playerName = '';
        inputBg.on('pointerdown', () => {
            // Use browser's prompt for simplicity
            const name = prompt('Enter your name:', '');
            if (name) {
                playerName = name.substring(0, 15); // Limit name length
                this.nameText.setText(playerName);
                this.nameText.setStyle({ fill: '#fff' });
            }
        });

        // Add submit button
        const submitButton = this.add.text(width / 2, height * 0.6, 'Submit', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#2ecc71',
            padding: { x: 20, y: 10 }
        }).setInteractive().setOrigin(0.5);

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
            
            // Go to leaderboard
            this.scene.start('LeaderboardScene');
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

        // Game Over text
        this.add.text(width / 2, height / 3, 'Game Over', {
            fontSize: '64px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Score text
        this.add.text(width / 2, height / 2, `Score: ${this.score}`, {
            fontSize: '32px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Play Again button
        const playAgainButton = this.add.text(width / 2, height * 0.6, 'Play Again', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#2ecc71',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        playAgainButton.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        // Save Score button
        const saveScoreButton = this.add.text(width / 2, height * 0.7, 'Save Score', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#3498db',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        saveScoreButton.on('pointerdown', () => {
            this.scene.start('NameInputScene', { score: this.score });
        });

        // View Leaderboard button
        const leaderboardButton = this.add.text(width / 2, height * 0.8, 'Leaderboard', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#9b59b6',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        leaderboardButton.on('pointerdown', () => {
            this.scene.start('LeaderboardScene');
        });
    }
}

class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardScene');
    }

    create() {
        const { width, height } = this.game.config;

        // Title
        this.add.text(width / 2, 50, 'Leaderboard', {
            fontSize: '48px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Get and display high scores
        const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
        highScores.forEach((score, index) => {
            const dateStr = new Date(score.date).toLocaleDateString();
            const name = score.name || 'Anonymous';
            this.add.text(width / 2, 150 + index * 40, 
                `${index + 1}. ${name} - ${score.score} - ${dateStr}`, {
                fontSize: '24px',
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 3
            }).setOrigin(0.5);
        });

        // Back button
        const backButton = this.add.text(width / 2 - 100, height - 100, 'Back to Game', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#e74c3c',
            padding: { x: 20, y: 10 }
        }).setInteractive().setOrigin(0.5);

        // Erase button
        const eraseButton = this.add.text(width / 2 + 100, height - 100, 'Erase All', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#95a5a6',
            padding: { x: 20, y: 10 }
        }).setInteractive().setOrigin(0.5);

        backButton.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        eraseButton.on('pointerdown', () => {
            if (confirm('Are you sure you want to erase all scores?')) {
                localStorage.removeItem('highScores');
                this.scene.restart(); // Refresh the leaderboard
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