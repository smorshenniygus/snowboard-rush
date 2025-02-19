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
        this.moveDistance = 55;
        this.lastMoveTime = 0;
        this.moveDelay = 90;
        this.isMoving = false;
        this.moveDirection = 0;
        this.movementSmoothing = 0.35;
        this.tiltAngle = 20;
        this.tiltSpeed = 0.3;
        this.lastCameraUpdate = 0;
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
        
        // Lock camera to prevent movement
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.scrollX = 0;
        this.cameras.main.scrollY = 0;
        
        // Set up scrolling background with smoother movement
        this.background = this.add.tileSprite(0, 0, this.game.config.width, this.game.config.height, 'background');
        this.background.setOrigin(0, 0);
        this.background.setScrollFactor(0);

        // Create player with enhanced smoothing
        this.player = this.physics.add.sprite(this.game.config.width / 2, this.game.config.height * 0.2, 'snowboarder');
        this.player.setScale(window.innerWidth < 768 ? 0.8 : 1.5);
        this.player.setAngle(0);
        this.player.setSize(this.player.width * 0.5, this.player.height * 0.5);
        this.player.setOffset(this.player.width * 0.25, this.player.height * 0.25);
        this.player.setScrollFactor(0);
        this.player.setDamping(true);
        this.player.setDrag(0.95);

        // Initialize obstacle groups with physics and set scroll factor
        this.staticObstacles = this.physics.add.group({
            scrollFactor: 0
        });
        this.movingObstacles = this.physics.add.group({
            scrollFactor: 0
        });

        // Add collision detection
        this.physics.add.overlap(this.player, this.staticObstacles, this.gameOver, null, this);
        this.physics.add.overlap(this.player, this.movingObstacles, this.gameOver, null, this);

        // Modern iOS-style score display
        const fontSize = window.innerWidth < 768 ? '28px' : '36px';
        this.scoreContainer = this.add.container(16, 16);
        
        // Score background with blur effect
        const scoreBg = this.add.rectangle(0, 0, 160, 50, 0x000000, 0.4)
            .setOrigin(0, 0)
            .setAlpha(0.8);
        scoreBg.postFX.addBlur(1, 1, 1, 0.1);
        
        this.scoreText = this.add.text(80, 25, 'Score: 0', {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: fontSize,
            fontWeight: '600',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 3,
                fill: true
            }
        }).setOrigin(0.5);

        this.scoreContainer.add([scoreBg, this.scoreText]);

        // Modern iOS-style control buttons
        const buttonSize = window.innerWidth < 768 ? 70 : 80;
        const buttonY = this.game.config.height - (window.innerWidth < 768 ? 100 : 120);
        
        // Create button container for visual effects
        const createButton = (x, text, direction) => {
            const container = this.add.container(x, buttonY);
            
            // Button background with blur effect
            const bg = this.add.circle(0, 0, buttonSize/2, 0xFFFFFF, 0.15)
                .setInteractive();
            bg.postFX.addBlur(1, 1, 1, 0.1);
            
            // Button border
            const border = this.add.circle(0, 0, buttonSize/2, 0xFFFFFF, 0.3);
            border.setStrokeStyle(2, 0xFFFFFF, 0.5);
            
            // Button text with iOS-style font
            const txt = this.add.text(0, 0, text, {
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: window.innerWidth < 768 ? '36px' : '48px',
                fontWeight: 'bold',
                fill: '#ffffff',
                stroke: '#ffffff',
                strokeThickness: 1
            }).setOrigin(0.5);
            
            container.add([bg, border, txt]);
            
            // Enhanced touch feedback
            bg.on('pointerdown', () => {
                this.moveDirection = direction;
                this.isMoving = true;
                container.setScale(0.9);
                bg.setFillStyle(0xFFFFFF, 0.3);
            });
            
            bg.on('pointerup', () => {
                this.isMoving = false;
                this.moveDirection = 0;
                container.setScale(1);
                bg.setFillStyle(0xFFFFFF, 0.15);
            });
            
            bg.on('pointerout', () => {
                this.isMoving = false;
                this.moveDirection = 0;
                container.setScale(1);
                bg.setFillStyle(0xFFFFFF, 0.15);
            });
            
            return container;
        };

        this.leftButton = createButton(buttonSize, '←', -1);
        this.rightButton = createButton(this.game.config.width - buttonSize, '→', 1);

        // Set up keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Enhanced touch input for swipes
        this.input.on('pointerdown', this.startSwipe, this);
        this.input.on('pointerup', this.endSwipe, this);

        // Start spawning obstacles
        this.spawnObstacles();
    }

    movePlayer(direction) {
        const currentTime = new Date().getTime();
        if (currentTime - this.lastMoveTime >= this.moveDelay) {
            const targetX = this.player.x + (direction * this.moveDistance);
            // Reduce margin and use player width for more precise boundaries
            const margin = 15;
            const playerHalfWidth = (this.player.width * this.player.scale * 0.5) / 2;
            
            // Use player's actual width in boundary calculation
            if (targetX >= margin + playerHalfWidth && 
                targetX <= this.game.config.width - margin - playerHalfWidth) {
                // Enhanced smooth movement using improved lerp
                this.player.x = Phaser.Math.Linear(
                    this.player.x,
                    targetX,
                    this.movementSmoothing
                );

                // Smoother tilt animation with easing
                const targetAngle = -direction * this.tiltAngle;
                this.player.angle = Phaser.Math.Linear(
                    this.player.angle,
                    targetAngle,
                    this.tiltSpeed
                );

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
        const spawnZones = [];
        const baseInterval = this.score < 100 ? (isMobile ? 68 : 60) :
                           this.score < 300 ? (isMobile ? 51 : 43) :
                           (isMobile ? 38 : 34);
        
        for (let y = 50; y <= (isMobile ? 800 : 1200); y += baseInterval) {
            spawnZones.push(this.game.config.height + y);
        }

        const existingPositions = new Set();
        let obstaclesSpawned = 0;

        const baseStaticChance = Math.min(46 + (this.score / 20), 85);
        const baseMovingChance = Math.min(35 + (this.score / 30), 70);

        // Spawn static obstacles with progressive difficulty
        spawnZones.forEach(zoneY => {
            if (Phaser.Math.Between(0, 100) < (isMobile ? baseStaticChance : baseStaticChance + 5)) {
                for (let attempt = 0; attempt < (isMobile ? 2 : 3); attempt++) {
                    // Match obstacle spawn boundaries with player movement area
                    const margin = 15;
                    let x = Phaser.Math.Between(margin, this.game.config.width - margin);
                    if (!this.isPositionOccupied(x, zoneY, existingPositions)) {
                        existingPositions.add(`${Math.floor(x/50)},${Math.floor(zoneY/50)}`);
                        const obstacle = this.staticObstacles.create(x, zoneY, Phaser.Math.RND.pick(['rock', 'tree']));
                        obstacle.setScale(window.innerWidth < 768 ? 0.7 : 1.2);
                        // Adjust obstacle hitbox
                        obstacle.setSize(obstacle.width * 0.5, obstacle.height * 0.5);
                        obstacle.setOffset(obstacle.width * 0.25, obstacle.height * 0.25);
                        obstaclesSpawned++;
                        break;
                    }
                }
            }
        });

        // Spawn moving obstacles (skiers)
        spawnZones.forEach((zoneY, index) => {
            if (index % 2 === 0 && Phaser.Math.Between(0, 100) < (isMobile ? baseMovingChance : baseMovingChance + 5)) {
                for (let attempt = 0; attempt < 2; attempt++) {
                    const margin = 15;
                    let x = Phaser.Math.Between(margin, this.game.config.width - margin);
                    if (!this.isPositionOccupied(x, zoneY, existingPositions)) {
                        existingPositions.add(`${Math.floor(x/50)},${Math.floor(zoneY/50)}`);
                        const obstacle = this.movingObstacles.create(x, zoneY, 'skier');
                        obstacle.setScale(window.innerWidth < 768 ? 0.7 : 1.2);
                        obstacle.speed = Math.min(4 + (this.score / 100), 10);
                        obstacle.setAngle(0);
                        // Adjust skier hitbox
                        obstacle.setSize(obstacle.width * 0.5, obstacle.height * 0.5);
                        obstacle.setOffset(obstacle.width * 0.25, obstacle.height * 0.25);
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
        // Continuous smooth movement based on input with improved interpolation
        if (this.cursors.left.isDown || (this.isMoving && this.moveDirection === -1)) {
            this.movePlayer(-1);
        } else if (this.cursors.right.isDown || (this.isMoving && this.moveDirection === 1)) {
            this.movePlayer(1);
        } else {
            // Smoother return to upright position
            this.player.angle = Phaser.Math.Linear(
                this.player.angle,
                0,
                this.tiltSpeed * 1.2
            );
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

        // iOS-style blur background
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0);
        bg.postFX.addBlur(2, 2, 1, 0.1);

        // Modern container for content
        const container = this.add.container(width / 2, height * 0.2);
        
        // Game Over text with iOS typography
        const gameOverText = this.add.text(0, 0, 'Game Over', {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: isMobile ? '42px' : '56px',
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Score display with iOS-style design
        const scoreText = this.add.text(0, 80, `Score: ${this.score}`, {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: isMobile ? '32px' : '42px',
            fontWeight: '600',
            fill: '#ffffff'
        }).setOrigin(0.5);

        container.add([gameOverText, scoreText]);

        // Create iOS-style buttons
        const createButton = (text, y, color) => {
            const button = this.add.container(0, y);
            
            // Button background with blur effect
            const bg = this.add.rectangle(0, 0, isMobile ? 200 : 250, isMobile ? 50 : 60, color, 0.9)
                .setInteractive();
            bg.postFX.addBlur(1, 1, 1, 0.1);
            
            // Button text
            const txt = this.add.text(0, 0, text, {
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '600',
                fill: '#ffffff'
            }).setOrigin(0.5);

            button.add([bg, txt]);
            
            // iOS-style touch feedback
            bg.on('pointerdown', () => {
                this.tweens.add({
                    targets: button,
                    scale: 0.95,
                    duration: 100
                });
            });
            
            bg.on('pointerup', () => {
                this.tweens.add({
                    targets: button,
                    scale: 1,
                    duration: 100
                });
            });
            
            bg.on('pointerout', () => {
                this.tweens.add({
                    targets: button,
                    scale: 1,
                    duration: 100
                });
            });

            return button;
        };

        // Add modern styled buttons
        const buttonSpacing = isMobile ? 70 : 80;
        const startY = height * 0.45;
        
        const playButton = createButton('Play Again', startY, 0x34C759);
        const saveButton = createButton('Save Score', startY + buttonSpacing, 0x007AFF);
        const leaderButton = createButton('Leaderboard', startY + buttonSpacing * 2, 0x5856D6);

        container.add([playButton, saveButton, leaderButton]);

        // Add button functionality
        playButton.list[0].on('pointerup', () => this.scene.start('GameScene'));
        saveButton.list[0].on('pointerup', () => this.scene.start('NameInputScene', { score: this.score }));
        leaderButton.list[0].on('pointerup', () => this.scene.start('LeaderboardScene'));
    }
}

class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardScene');
    }

    create() {
        const { width, height } = this.game.config;
        const isMobile = window.innerWidth < 768;

        // iOS-style blur background
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0);
        bg.postFX.addBlur(2, 2, 1, 0.1);

        // Modern title with iOS typography
        const title = this.add.text(width / 2, 40, 'Leaderboard', {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: isMobile ? '36px' : '48px',
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Create scrollable container for scores
        const scrollableArea = this.add.container(width / 2, 120);
        
        // Get and display high scores with iOS-style design
        const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
        const spacing = isMobile ? 60 : 70;

        highScores.forEach((score, index) => {
            const dateStr = new Date(score.date).toLocaleDateString();
            const name = score.name || 'Anonymous';
            
            // Score container with blur effect
            const scoreContainer = this.add.container(0, index * spacing);
            
            // Score background
            const scoreBg = this.add.rectangle(0, 0, width * 0.8, spacing - 10, 0xFFFFFF, 0.1);
            scoreBg.postFX.addBlur(1, 1, 1, 0.1);
            
            // Score content with modern typography
            const rankText = this.add.text(-width * 0.35, 0, `#${index + 1}`, {
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: isMobile ? '24px' : '28px',
                fontWeight: 'bold',
                fill: '#ffffff'
            }).setOrigin(0, 0.5);
            
            const nameText = this.add.text(-width * 0.25, 0, name, {
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: isMobile ? '20px' : '24px',
                fill: '#ffffff'
            }).setOrigin(0, 0.5);
            
            const scoreValue = this.add.text(width * 0.15, 0, score.score.toString(), {
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '600',
                fill: '#ffffff'
            }).setOrigin(0.5);
            
            const dateText = this.add.text(width * 0.3, 0, dateStr, {
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: isMobile ? '16px' : '20px',
                fill: '#ffffff',
                alpha: 0.8
            }).setOrigin(0, 0.5);
            
            scoreContainer.add([scoreBg, rankText, nameText, scoreValue, dateText]);
            scrollableArea.add(scoreContainer);
        });

        // iOS-style buttons
        const buttonY = height - (isMobile ? 80 : 100);
        const buttonWidth = isMobile ? 140 : 160;
        
        // Back button with blur effect
        const backButton = this.add.container(width / 2 - buttonWidth, buttonY);
        const backBg = this.add.rectangle(0, 0, buttonWidth - 20, isMobile ? 44 : 50, 0xFF3B30, 0.9)
            .setInteractive();
        backBg.postFX.addBlur(1, 1, 1, 0.1);
        
        const backText = this.add.text(0, 0, 'Back', {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '600',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        backButton.add([backBg, backText]);

        // Clear button
        const clearButton = this.add.container(width / 2 + buttonWidth, buttonY);
        const clearBg = this.add.rectangle(0, 0, buttonWidth - 20, isMobile ? 44 : 50, 0x8E8E93, 0.9)
            .setInteractive();
        clearBg.postFX.addBlur(1, 1, 1, 0.1);
        
        const clearText = this.add.text(0, 0, 'Clear All', {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '600',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        clearButton.add([clearBg, clearText]);

        // Add iOS-style touch feedback
        [backBg, clearBg].forEach(button => {
            button.on('pointerdown', () => {
                this.tweens.add({
                    targets: button.parentContainer,
                    scale: 0.95,
                    duration: 100
                });
            });
            
            button.on('pointerup', () => {
                this.tweens.add({
                    targets: button.parentContainer,
                    scale: 1,
                    duration: 100
                });
            });
            
            button.on('pointerout', () => {
                this.tweens.add({
                    targets: button.parentContainer,
                    scale: 1,
                    duration: 100
                });
            });
        });

        // Add button functionality
        backBg.on('pointerup', () => {
            this.scene.start('GameScene');
        });

        clearBg.on('pointerup', () => {
            if (confirm('Are you sure you want to clear all scores?')) {
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
    },
    // Add camera settings
    cameras: {
        main: {
            backgroundColor: '#87CEEB',
            roundPixels: true
        }
    }
};

// Create and start the game
const game = new Phaser.Game(config); 