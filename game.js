// Add design system constants at the beginning of the file, before any classes
// Design system for consistent styling
const UI = {
    colors: {
        primary: '#3498db',
        secondary: '#2ecc71',
        accent: '#f1c40f',
        danger: '#e74c3c',
        dark: '#2c3e50',
        light: '#ecf0f1',
        overlay: 'rgba(0, 0, 0, 0.7)'
    },
    fonts: {
        primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    },
    radius: {
        small: 8,
        medium: 12,
        large: 20,
        pill: 9999
    },
    shadows: {
        small: { x: 0, y: 2, blur: 4, color: 'rgba(0,0,0,0.2)' },
        medium: { x: 0, y: 4, blur: 8, color: 'rgba(0,0,0,0.2)' },
        large: { x: 0, y: 8, blur: 16, color: 'rgba(0,0,0,0.2)' }
    },
    animations: {
        short: 150,
        medium: 300,
        long: 500
    }
};

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

        // Modern minimalist score display with visual hierarchy
        const isMobile = window.innerWidth < 768;
        const fontSize = isMobile ? '28px' : '32px';
        this.scoreContainer = this.add.container(isMobile ? 16 : 24, isMobile ? 16 : 24);
        
        // Score background with glass morphism effect
        const scoreBg = this.add.rectangle(0, 0, 180, 60, 0xFFFFFF, 0.15)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0xFFFFFF, 0.3);
        scoreBg.postFX.addBlur(1, 1, 1, 0.1);
        
        // Add subtle glow to score
        const scoreGlow = this.add.rectangle(10, 10, 160, 40, UI.colors.primary, 0.2)
            .setOrigin(0, 0);
        scoreGlow.postFX.addGlow(UI.colors.primary, 4, 0, false, 0.1, 8);
        
        // Modern score text with improved typography
        this.scoreText = this.add.text(90, 30, 'Score: 0', {
            fontFamily: UI.fonts.primary,
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

        this.scoreContainer.add([scoreBg, scoreGlow, this.scoreText]);
        
        // Add pause button for better UX
        this.pauseButton = this.createIconButton(
            this.game.config.width - (isMobile ? 24 : 32), 
            isMobile ? 24 : 32,
            '⏸️',
            () => this.pauseGame()
        );

        // Modern floating control buttons with improved visual feedback
        const buttonSize = isMobile ? 80 : 90;
        const buttonY = this.game.config.height - (isMobile ? 110 : 130);
        
        // Create modernized buttons
        this.leftButton = this.createControlButton(
            buttonSize, 
            buttonY, 
            '←', 
            -1,
            UI.colors.primary
        );
        
        this.rightButton = this.createControlButton(
            this.game.config.width - buttonSize, 
            buttonY, 
            '→', 
            1,
            UI.colors.primary
        );

        // Set up keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Enhanced touch input for swipes
        this.input.on('pointerdown', this.startSwipe, this);
        this.input.on('pointerup', this.endSwipe, this);

        // Start spawning obstacles
        this.spawnObstacles();
    }
    
    // Modern floating button with improved visual feedback
    createControlButton(x, y, text, direction, color) {
        const container = this.add.container(x, y);
        const isMobile = window.innerWidth < 768;
        const buttonSize = isMobile ? 80 : 90;
        
        // Glass morphism effect for button background
        const bgOuter = this.add.circle(0, 0, buttonSize/2, 0xFFFFFF, 0.15)
            .setInteractive();
        bgOuter.setStrokeStyle(2, 0xFFFFFF, 0.3);
        bgOuter.postFX.addBlur(1, 1, 1, 0.1);
        
        // Inner highlight for better depth
        const bgInner = this.add.circle(0, 0, buttonSize/2 - 4, 0xFFFFFF, 0.05);
        
        // Glow effect for visual feedback
        const glow = this.add.circle(0, 0, buttonSize/2 - 8, color, 0);
        glow.postFX.addGlow(color, 4, 0, false, 0.1, 8);
        
        // Modern typography for button text
        const txt = this.add.text(0, 0, text, {
            fontFamily: UI.fonts.primary,
            fontSize: isMobile ? '42px' : '48px',
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#ffffff',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        container.add([bgOuter, bgInner, glow, txt]);
        
        // Enhanced touch feedback with animations
        bgOuter.on('pointerdown', () => {
            this.moveDirection = direction;
            this.isMoving = true;
            
            // Visual feedback animation
            this.tweens.add({
                targets: container,
                scale: 0.9,
                duration: UI.animations.short,
                ease: 'Power2'
            });
            
            this.tweens.add({
                targets: glow,
                alpha: 0.8,
                duration: UI.animations.short,
                ease: 'Power2'
            });
            
            bgOuter.setFillStyle(color, 0.3);
        });
        
        bgOuter.on('pointerup', () => {
            this.isMoving = false;
            this.moveDirection = 0;
            
            // Restore button state with animation
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: UI.animations.short,
                ease: 'Back.easeOut'
            });
            
            this.tweens.add({
                targets: glow,
                alpha: 0,
                duration: UI.animations.medium,
                ease: 'Power2'
            });
            
            bgOuter.setFillStyle(0xFFFFFF, 0.15);
        });
        
        bgOuter.on('pointerout', () => {
            this.isMoving = false;
            this.moveDirection = 0;
            
            // Restore button state with animation
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: UI.animations.short,
                ease: 'Back.easeOut'
            });
            
            this.tweens.add({
                targets: glow,
                alpha: 0,
                duration: UI.animations.medium,
                ease: 'Power2'
            });
            
            bgOuter.setFillStyle(0xFFFFFF, 0.15);
        });
        
        return container;
    }
    
    // Create a simple icon button
    createIconButton(x, y, icon, callback) {
        const isMobile = window.innerWidth < 768;
        const size = isMobile ? 48 : 56;
        const container = this.add.container(x, y);
        
        // Button background with glass effect
        const bg = this.add.circle(0, 0, size/2, 0xFFFFFF, 0.15)
            .setInteractive();
        bg.setStrokeStyle(1, 0xFFFFFF, 0.3);
        bg.postFX.addBlur(1, 1, 1, 0.1);
        
        // Button icon
        const text = this.add.text(0, 0, icon, {
            fontFamily: UI.fonts.primary,
            fontSize: isMobile ? '24px' : '28px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        container.add([bg, text]);
        
        // Add interaction
        bg.on('pointerdown', () => {
            this.tweens.add({
                targets: container,
                scale: 0.9,
                duration: UI.animations.short,
                ease: 'Power2'
            });
            bg.setFillStyle(0xFFFFFF, 0.3);
        });
        
        bg.on('pointerup', () => {
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: UI.animations.short,
                ease: 'Back.easeOut'
            });
            bg.setFillStyle(0xFFFFFF, 0.15);
            callback();
        });
        
        bg.on('pointerout', () => {
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: UI.animations.short
            });
            bg.setFillStyle(0xFFFFFF, 0.15);
        });
        
        return container;
    }
    
    // Pause game functionality
    pauseGame() {
        this.scene.pause();
        this.scene.launch('PauseScene');
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
        
        // Create more fine-grained spawn zones for better distribution
        const baseInterval = this.score < 100 ? (isMobile ? 68 : 60) :
                           this.score < 300 ? (isMobile ? 45 : 38) :
                           this.score < 600 ? (isMobile ? 35 : 30) :
                           (isMobile ? 30 : 25);
        
        for (let y = 50; y <= (isMobile ? 800 : 1200); y += baseInterval) {
            spawnZones.push(this.game.config.height + y);
        }

        // Create lanes for obstacle distribution
        const numLanes = isMobile ? 5 : 7;
        const laneWidth = (this.game.config.width - 30) / numLanes;
        
        // Track occupied positions and lanes
        const existingPositions = new Set();
        const occupiedLanes = new Array(spawnZones.length).fill().map(() => new Set());
        let obstaclesSpawned = 0;

        // Spawn chance calculation
        const baseStaticChance = Math.min(50 + (this.score / 15), 90);
        const baseMovingChance = Math.min(40 + (this.score / 25), 80);

        // First pass: Distribute static obstacles more evenly across lanes
        spawnZones.forEach((zoneY, zoneIndex) => {
            // Always create some minimum obstacles per zone
            const minObstaclesPerZone = this.score < 100 ? 1 : 
                                        this.score < 300 ? 2 :
                                        this.score < 600 ? 2 : 3;
            
            // Calculate available lanes
            const availableLanes = [];
            for (let lane = 0; lane < numLanes; lane++) {
                if (!occupiedLanes[zoneIndex].has(lane)) {
                    availableLanes.push(lane);
                }
            }
            
            // Shuffle available lanes for randomness
            this.shuffleArray(availableLanes);
            
            // Place obstacles in different lanes
            let placedInZone = 0;
            for (let i = 0; i < Math.min(availableLanes.length, minObstaclesPerZone); i++) {
                const lane = availableLanes[i];
                // Calculate x position within lane (with some randomness)
                const margin = 15;
                const laneStart = margin + (lane * laneWidth);
                const laneEnd = laneStart + laneWidth;
                const x = Phaser.Math.Between(laneStart + 10, laneEnd - 10);
                
                if (!this.isPositionOccupied(x, zoneY, existingPositions)) {
                    existingPositions.add(`${Math.floor(x/50)},${Math.floor(zoneY/50)}`);
                    occupiedLanes[zoneIndex].add(lane);
                    
                    // Create obstacle
                    if (Phaser.Math.Between(0, 100) < baseStaticChance) {
                        const obstacle = this.staticObstacles.create(x, zoneY, Phaser.Math.RND.pick(['rock', 'tree']));
                        obstacle.setScale(window.innerWidth < 768 ? 0.7 : 1.2);
                        obstacle.setSize(obstacle.width * 0.5, obstacle.height * 0.5);
                        obstacle.setOffset(obstacle.width * 0.25, obstacle.height * 0.25);
                        obstaclesSpawned++;
                        placedInZone++;
                    }
                }
            }
            
            // Additional random obstacles based on chance
            if (placedInZone < minObstaclesPerZone && availableLanes.length > 0) {
                const additionalAttempts = Math.min(3, availableLanes.length - placedInZone);
                for (let i = 0; i < additionalAttempts; i++) {
                    const margin = 15;
                    const x = Phaser.Math.Between(margin, this.game.config.width - margin);
                    if (!this.isPositionOccupied(x, zoneY, existingPositions)) {
                        existingPositions.add(`${Math.floor(x/50)},${Math.floor(zoneY/50)}`);
                        const obstacle = this.staticObstacles.create(x, zoneY, Phaser.Math.RND.pick(['rock', 'tree']));
                        obstacle.setScale(window.innerWidth < 768 ? 0.7 : 1.2);
                        obstacle.setSize(obstacle.width * 0.5, obstacle.height * 0.5);
                        obstacle.setOffset(obstacle.width * 0.25, obstacle.height * 0.25);
                        obstaclesSpawned++;
                    }
                }
            }
        });

        // Second pass: Add moving obstacles in remaining spaces
        spawnZones.forEach((zoneY, zoneIndex) => {
            if (zoneIndex % 2 === 0 && Phaser.Math.Between(0, 100) < baseMovingChance) {
                // Find available lanes
                const availableLanes = [];
                for (let lane = 0; lane < numLanes; lane++) {
                    if (!occupiedLanes[zoneIndex].has(lane)) {
                        availableLanes.push(lane);
                    }
                }
                
                if (availableLanes.length > 0) {
                    // Choose a random available lane
                    const lane = availableLanes[Phaser.Math.Between(0, availableLanes.length - 1)];
                    
                    // Calculate x position within lane
                    const margin = 15;
                    const laneStart = margin + (lane * laneWidth);
                    const laneEnd = laneStart + laneWidth;
                    const x = Phaser.Math.Between(laneStart + 10, laneEnd - 10);
                    
                    if (!this.isPositionOccupied(x, zoneY, existingPositions)) {
                        existingPositions.add(`${Math.floor(x/50)},${Math.floor(zoneY/50)}`);
                        occupiedLanes[zoneIndex].add(lane);
                        
                        const obstacle = this.movingObstacles.create(x, zoneY, 'skier');
                        obstacle.setScale(window.innerWidth < 768 ? 0.7 : 1.2);
                        
                        // Enhanced speed progression for skiers
                        const baseSpeed = 4;
                        const speedIncrease = this.score / 75;
                        const maxSpeed = 12;
                        obstacle.speed = Math.min(baseSpeed + speedIncrease, maxSpeed);
                        
                        // More dynamic horizontal movement at higher scores
                        const baseHorizontalSpeed = 2;
                        const horizontalSpeedIncrease = Math.min(this.score / 200, 2);
                        const maxHorizontalSpeed = baseHorizontalSpeed + horizontalSpeedIncrease;
                        
                        obstacle.setAngle(0);
                        obstacle.setSize(obstacle.width * 0.5, obstacle.height * 0.5);
                        obstacle.setOffset(obstacle.width * 0.25, obstacle.height * 0.25);
                        obstacle.horizontalSpeed = Phaser.Math.Between(-maxHorizontalSpeed, maxHorizontalSpeed);
                        obstacle.nextDirectionChange = 0;
                        obstaclesSpawned++;
                    }
                }
            }
        });
        
        // Ensure a clear path is always available by removing obstacles that block all lanes
        this.ensureClearPath();
    }
    
    // Helper method to shuffle array
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // Ensure there's always a clear path through the obstacles
    ensureClearPath() {
        // Get all obstacles organized by approximate rows
        const obstacleRows = new Map();
        const rowHeight = 50;
        
        // Process static obstacles
        this.staticObstacles.getChildren().forEach(obstacle => {
            const rowIndex = Math.floor(obstacle.y / rowHeight);
            if (!obstacleRows.has(rowIndex)) {
                obstacleRows.set(rowIndex, []);
            }
            obstacleRows.get(rowIndex).push(obstacle);
        });
        
        // Process moving obstacles
        this.movingObstacles.getChildren().forEach(obstacle => {
            const rowIndex = Math.floor(obstacle.y / rowHeight);
            if (!obstacleRows.has(rowIndex)) {
                obstacleRows.set(rowIndex, []);
            }
            obstacleRows.get(rowIndex).push(obstacle);
        });
        
        // Check each row for complete blockage
        obstacleRows.forEach((obstacles, rowIndex) => {
            if (obstacles.length >= 4) { // If too many obstacles in a row
                // Sort obstacles by x position
                obstacles.sort((a, b) => a.x - b.x);
                
                // Check for gaps
                let hasGap = false;
                for (let i = 0; i < obstacles.length - 1; i++) {
                    const gap = obstacles[i+1].x - obstacles[i].x;
                    if (gap >= 80) { // Minimum gap width for player passage
                        hasGap = true;
                        break;
                    }
                }
                
                // If no gap found, remove a random obstacle
                if (!hasGap && obstacles.length > 0) {
                    const indexToRemove = Phaser.Math.Between(0, obstacles.length - 1);
                    obstacles[indexToRemove].destroy();
                }
            }
        });
    }

    isPositionOccupied(x, y, existingPositions) {
        const gridX = Math.floor(x/50);
        const gridY = Math.floor(y/50);
        const isMobile = window.innerWidth < 768;
        
        // Adjust spacing based on score for progressive difficulty
        const horizontalSpacing = 1; // Only check immediate neighbors horizontally
        const verticalSpacing = this.score < 200 ? (isMobile ? 2 : 3) : 
                                this.score < 400 ? (isMobile ? 1 : 2) : 
                                (isMobile ? 0 : 1); // Reduce vertical spacing as score increases
        
        for (let dx = -horizontalSpacing; dx <= horizontalSpacing; dx++) {
            for (let dy = -verticalSpacing; dy <= verticalSpacing; dy++) {
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

        // Progressive speed increase
        const baseSpeed = 5;
        const speedIncrease = this.score / 80;
        const maxSpeed = 15;
        this.speed = Math.min(baseSpeed + speedIncrease, maxSpeed);
        this.background.tilePositionY += this.speed;

        // More frequent scoring at higher speeds with score animation
        if (time - this.lastSpeedIncrease > 1000) {
            const scoreIncrease = Math.floor(5 + (this.speed - baseSpeed) * 1.2);
            const oldScore = this.score;
            this.score += scoreIncrease;
            
            // Animate score change for better feedback
            this.tweens.add({
                targets: this.scoreText,
                scale: 1.1,
                duration: 200,
                yoyo: true,
                ease: 'Power2',
                onUpdate: () => {
                    this.scoreText.setText('Score: ' + this.score);
                }
            });
            
            // Make score container pulse
            this.tweens.add({
                targets: this.scoreContainer,
                scale: 1.05,
                duration: 200,
                yoyo: true
            });
            
            this.lastSpeedIncrease = time;
        }

        // Update obstacles
        this.updateObstacles(time);

        // More frequent obstacle spawning at higher scores
        const spawnCheckInterval = Math.max(10 - Math.floor(this.score / 150), 4);
        if (time % spawnCheckInterval === 0) {
            const minObstacles = Math.min(8 + Math.floor(this.score / 80), 20);
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

        // Modern blur backdrop
        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0);
        backdrop.postFX.addBlur(3, 3, 1, 0.1);

        // Create animated container for content
        const container = this.add.container(width / 2, height / 2);
        container.setScale(0);
        
        // Stylish card background with glass morphism
        const card = this.add.rectangle(0, 0, width * 0.8, height * 0.7, 0xFFFFFF, 0.08)
            .setStrokeStyle(1, 0xFFFFFF, 0.2);
        card.postFX.addBlur(1, 1, 1, 0.1);
        
        // Title with modern typography and effects
        const title = this.add.text(0, -height * 0.3, 'New High Score!', {
            fontFamily: UI.fonts.heading,
            fontSize: isMobile ? '36px' : '48px',
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Add glow effect to title
        title.postFX.addGlow(UI.colors.accent, 4, 0, false, 0.2, 8);

        // Score display with improved visual hierarchy
        const scoreText = this.add.text(0, -height * 0.2 + 20, `Score: ${this.score}`, {
            fontFamily: UI.fonts.primary,
            fontSize: isMobile ? '30px' : '36px',
            fontWeight: '600',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Create modern input field
        const inputWidth = Math.min(width * 0.6, 350);
        const inputHeight = isMobile ? 60 : 70;
        
        // Input field background with glass morphism
        const inputBg = this.add.rectangle(0, -30, inputWidth, inputHeight, 0xFFFFFF, 0.15)
            .setInteractive()
            .setStrokeStyle(2, UI.colors.primary, 0.4);
        inputBg.postFX.addBlur(1, 1, 1, 0.05);
        
        // Input field glow effect
        const inputGlow = this.add.rectangle(0, -30, inputWidth - 10, inputHeight - 10, UI.colors.primary, 0.1);
        inputGlow.postFX.addGlow(UI.colors.primary, 4, 0, false, 0.1, 12);
        
        // Label for input field
        const inputLabel = this.add.text(0, -30 - inputHeight/2 - 20, 'ENTER YOUR NAME', {
            fontFamily: UI.fonts.primary,
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: '600',
            fill: '#ffffff',
            alpha: 0.7
        }).setOrigin(0.5);

        // Placeholder text
        this.nameText = this.add.text(0, -30, 'Touch to enter name', {
            fontFamily: UI.fonts.primary,
            fontSize: isMobile ? '22px' : '26px',
            fill: '#999999',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);

        // Modern submit button
        const submitButton = this.createStylishButton(0, height * 0.15, 'Submit', UI.colors.secondary);

        container.add([card, title, scoreText, inputLabel, inputBg, inputGlow, this.nameText, submitButton]);

        // Animate container appearance
        this.tweens.add({
            targets: container,
            scale: 1,
            duration: UI.animations.medium,
            ease: 'Back.easeOut'
        });
        
        // Animate score text for emphasis
        this.tweens.add({
            targets: scoreText,
            scale: 1.2,
            duration: 300,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
            delay: UI.animations.medium
        });

        // Handle input with improved visual feedback
        let playerName = '';
        inputBg.on('pointerover', () => {
            inputBg.setStrokeStyle(2, UI.colors.primary, 0.7);
            this.tweens.add({
                targets: inputGlow,
                alpha: 0.2,
                duration: UI.animations.short
            });
        });
        
        inputBg.on('pointerout', () => {
            inputBg.setStrokeStyle(2, UI.colors.primary, 0.4);
            this.tweens.add({
                targets: inputGlow,
                alpha: 0.1,
                duration: UI.animations.short
            });
        });
        
        inputBg.on('pointerdown', () => {
            // Highlight effect on click
            this.tweens.add({
                targets: inputBg,
                scale: 0.98,
                duration: UI.animations.short,
                yoyo: true
            });
            
            inputBg.setFillStyle(UI.colors.primary, 0.2);
            
            const name = prompt('Enter your name:', '');
            if (name) {
                playerName = name.substring(0, 15);
                this.nameText.setText(playerName);
                this.nameText.setStyle({ fill: '#fff' });
            }
            
            inputBg.setFillStyle(0xFFFFFF, 0.15);
        });

        // Submit button logic
        submitButton.getAt(0).on('pointerup', () => {
            if (playerName.trim() === '') {
                playerName = 'Anonymous';
                this.nameText.setText(playerName);
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
            
            // Animate exit
            this.tweens.add({
                targets: container,
                scale: 0,
                duration: UI.animations.medium,
                ease: 'Back.easeIn',
                onComplete: () => {
                    this.scene.start('LeaderboardScene');
                }
            });
        });
    }
    
    createStylishButton(x, y, text, color) {
        const isMobile = window.innerWidth < 768;
        const buttonWidth = Math.min(200, window.innerWidth * 0.5);
        const buttonHeight = isMobile ? 60 : 70;
        
        const button = this.add.container(x, y);
        
        // Button background with glass effect
        const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, color, 0.2)
            .setInteractive()
            .setStrokeStyle(1, 0xFFFFFF, 0.3);
        bg.postFX.addBlur(1, 1, 1, 0.05);
        
        // Button glow for depth
        const glow = this.add.rectangle(0, 0, buttonWidth - 10, buttonHeight - 10, color, 0.1);
        glow.postFX.addGlow(color, 4, 0, false, 0.1, 8);
        
        // Button text
        const buttonText = this.add.text(0, 0, text, {
            fontFamily: UI.fonts.primary,
            fontSize: isMobile ? '20px' : '22px',
            fontWeight: '600',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        button.add([bg, glow, buttonText]);
        
        // Modern interaction effects
        bg.on('pointerover', () => {
            this.tweens.add({
                targets: button,
                scale: 1.05,
                duration: UI.animations.short,
                ease: 'Power2'
            });
            bg.setFillStyle(color, 0.3);
        });
        
        bg.on('pointerout', () => {
            this.tweens.add({
                targets: button,
                scale: 1,
                duration: UI.animations.short,
                ease: 'Power2'
            });
            bg.setFillStyle(color, 0.2);
        });
        
        bg.on('pointerdown', () => {
            this.tweens.add({
                targets: button,
                scale: 0.95,
                duration: UI.animations.short,
                ease: 'Power2'
            });
            bg.setFillStyle(color, 0.4);
        });
        
        bg.on('pointerup', () => {
            callback();
        });
        
        return button;
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

        // Modern blur backdrop
        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0);
        backdrop.postFX.addBlur(3, 3, 1, 0.1);

        // Create animated container for content
        const container = this.add.container(width / 2, 0);
        container.setAlpha(0);
        
        // Game Over text with modern typography
        const gameOverText = this.add.text(0, height * 0.2, 'Game Over', {
            fontFamily: UI.fonts.heading,
            fontSize: isMobile ? '48px' : '64px',
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Add subtle glow effect
        gameOverText.postFX.addGlow(0xe74c3c, 4, 0, false, 0.1, 12);

        // Score display with modern styling
        const scoreContainer = this.add.container(0, height * 0.3);
        
        // Score label with improved visual hierarchy
        const scoreLabel = this.add.text(0, 0, 'Your Score', {
            fontFamily: UI.fonts.primary,
            fontSize: isMobile ? '24px' : '28px',
            fontWeight: '400',
            fill: '#ffffff',
            alpha: 0.8
        }).setOrigin(0.5);
        
        // Animated score value
        const scoreValueBg = this.add.rectangle(0, 50, 200, 70, 0xFFFFFF, 0.1)
            .setStrokeStyle(1, 0xFFFFFF, 0.3);
        scoreValueBg.postFX.addBlur(1, 1, 1, 0.1);
        
        const scoreValue = this.add.text(0, 50, '0', {
            fontFamily: UI.fonts.heading,
            fontSize: isMobile ? '48px' : '56px',
            fontWeight: 'bold',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        scoreContainer.add([scoreLabel, scoreValueBg, scoreValue]);

        // Create action buttons with improved styling
        const createActionButton = (x, y, text, icon, color, width, callback) => {
            const buttonHeight = isMobile ? 50 : 60;
            
            const button = this.add.container(x, y);
            
            // Button background with glass effect
            const bg = this.add.rectangle(0, 0, width, buttonHeight, color, 0.2)
                .setInteractive()
                .setStrokeStyle(1, 0xFFFFFF, 0.3);
            bg.postFX.addBlur(1, 1, 1, 0.05);
            
            // Button icon
            const iconText = icon ? this.add.text(-width/2 + 30, 0, icon, {
                fontFamily: UI.fonts.primary,
                fontSize: '24px',
                fill: '#ffffff'
            }).setOrigin(0.5) : null;
            
            // Button text
            const buttonText = this.add.text(icon ? 0 : 0, 0, text, {
                fontFamily: UI.fonts.primary,
                fontSize: isMobile ? '20px' : '22px',
                fontWeight: '600',
                fill: '#ffffff'
            }).setOrigin(0.5);
            
            if (icon) {
                button.add([bg, iconText, buttonText]);
            } else {
                button.add([bg, buttonText]);
            }
            
            // Modern interaction effects
            bg.on('pointerover', () => {
                this.tweens.add({
                    targets: button,
                    scale: 1.05,
                    duration: UI.animations.short,
                    ease: 'Power2'
                });
                bg.setFillStyle(color, 0.3);
            });
            
            bg.on('pointerout', () => {
                this.tweens.add({
                    targets: button,
                    scale: 1,
                    duration: UI.animations.short,
                    ease: 'Power2'
                });
                bg.setFillStyle(color, 0.2);
            });
            
            bg.on('pointerdown', () => {
                this.tweens.add({
                    targets: button,
                    scale: 0.95,
                    duration: UI.animations.short,
                    ease: 'Power2'
                });
                bg.setFillStyle(color, 0.4);
            });
            
            bg.on('pointerup', () => {
                callback();
            });
            
            return button;
        };

        // Action buttons with icons
        const buttonY = height * 0.5;
        const buttonSpacing = isMobile ? 70 : 90;
        
        const playButton = createActionButton(0, buttonY, 'Play Again', '🎮', UI.colors.secondary, 200, () => {
            this.scene.start('GameScene');
        });
        
        const saveButton = createActionButton(0, buttonY + buttonSpacing, 'Save Score', '🏆', UI.colors.primary, 200, () => {
            this.scene.start('NameInputScene', { score: this.score });
        });
        
        const leaderButton = createActionButton(0, buttonY + buttonSpacing * 2, 'Leaderboard', '📋', UI.colors.accent, 200, () => {
            this.scene.start('LeaderboardScene');
        });

        container.add([gameOverText, scoreContainer, playButton, saveButton, leaderButton]);

        // Add entrance animation
        this.tweens.add({
            targets: container,
            y: 10,
            alpha: 1,
            duration: UI.animations.long,
            ease: 'Power2'
        });
        
        // Animate score counting
        this.tweens.add({
            targets: {},
            duration: 1500,
            onUpdate: (tween) => {
                const value = Math.floor(tween.progress * this.score);
                scoreValue.setText(value.toString());
            }
        });
    }
}

class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardScene');
    }

    create() {
        const { width, height } = this.game.config;
        const isMobile = window.innerWidth < 768;

        // Modern blur backdrop
        const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0);
        backdrop.postFX.addBlur(3, 3, 1, 0.1);

        // Create animated container for content
        const container = this.add.container(width / 2, 0);
        container.setAlpha(0);
        
        // Title with modern typography and effects
        const title = this.add.text(0, 50, 'LEADERBOARD', {
            fontFamily: UI.fonts.heading,
            fontSize: isMobile ? '36px' : '48px',
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Add subtle glow effect to title
        title.postFX.addGlow(UI.colors.primary, 4, 0, false, 0.1, 8);

        // Create scrollable container with glass morphism card
        const scoreCardWidth = Math.min(width * 0.85, 600);
        const scoreCardHeight = height * 0.6;
        
        const scoreCard = this.add.rectangle(0, height * 0.4, scoreCardWidth, scoreCardHeight, 0xFFFFFF, 0.08)
            .setStrokeStyle(1, 0xFFFFFF, 0.2);
        scoreCard.postFX.addBlur(1, 1, 1, 0.1);
        
        // Create header row with column labels
        const headerY = height * 0.4 - scoreCardHeight/2 + 30;
        const rankHeader = this.add.text(-scoreCardWidth/2 + 40, headerY, 'RANK', {
            fontFamily: UI.fonts.primary,
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: 'bold',
            fill: '#ffffff',
            alpha: 0.7
        }).setOrigin(0, 0.5);
        
        const nameHeader = this.add.text(-scoreCardWidth/2 + 120, headerY, 'NAME', {
            fontFamily: UI.fonts.primary,
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: 'bold',
            fill: '#ffffff',
            alpha: 0.7
        }).setOrigin(0, 0.5);
        
        const scoreHeader = this.add.text(scoreCardWidth/2 - 40, headerY, 'SCORE', {
            fontFamily: UI.fonts.primary,
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: 'bold',
            fill: '#ffffff',
            alpha: 0.7
        }).setOrigin(1, 0.5);
        
        // Add separator line
        const separator = this.add.line(
            0, headerY + 25, 
            -scoreCardWidth/2 + 20, 0, 
            scoreCardWidth/2 - 20, 0, 
            0xFFFFFF, 0.3
        );
        
        // Get high scores
        const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
        const scoreSpacing = isMobile ? 50 : 60;
        const scoreStartY = headerY + 50;
        
        // Create score rows with alternating backgrounds
        highScores.forEach((score, index) => {
            const rowY = scoreStartY + (index * scoreSpacing);
            const name = score.name || 'Anonymous';
            
            // Row background with subtle hover effect
            const rowBg = this.add.rectangle(
                0, rowY,
                scoreCardWidth - 40, scoreSpacing - 10,
                index % 2 === 0 ? 0xFFFFFF : UI.colors.primary,
                index % 2 === 0 ? 0.05 : 0.1
            ).setInteractive();
            
            // Add subtle hover effect
            rowBg.on('pointerover', () => {
                this.tweens.add({
                    targets: rowBg,
                    fillAlpha: index % 2 === 0 ? 0.1 : 0.15,
                    duration: UI.animations.short
                });
            });
            
            rowBg.on('pointerout', () => {
                this.tweens.add({
                    targets: rowBg,
                    fillAlpha: index % 2 === 0 ? 0.05 : 0.1,
                    duration: UI.animations.short
                });
            });
            
            // Rank badge with brand color for top 3
            const rankColor = index < 3 ? 
                [UI.colors.accent, UI.colors.primary, UI.colors.secondary][index] : 
                0xFFFFFF;
            
            const rankBadge = this.add.circle(-scoreCardWidth/2 + 40, rowY, 15, rankColor, index < 3 ? 0.3 : 0.1);
            
            if (index < 3) {
                rankBadge.postFX.addGlow(rankColor, 4, 0, false, 0.1, 8);
            }
            
            const rankText = this.add.text(-scoreCardWidth/2 + 40, rowY, (index + 1).toString(), {
                fontFamily: UI.fonts.primary,
                fontSize: '18px',
                fontWeight: 'bold',
                fill: '#ffffff'
            }).setOrigin(0.5);
            
            // Name with truncation
            let displayName = name;
            if (displayName.length > 15) {
                displayName = displayName.substring(0, 12) + '...';
            }
            
            const nameText = this.add.text(-scoreCardWidth/2 + 120, rowY, displayName, {
                fontFamily: UI.fonts.primary,
                fontSize: isMobile ? '18px' : '20px',
                fill: '#ffffff'
            }).setOrigin(0, 0.5);
            
            // Score with modern styling
            const scoreText = this.add.text(scoreCardWidth/2 - 40, rowY, score.score.toString(), {
                fontFamily: UI.fonts.primary,
                fontSize: isMobile ? '22px' : '24px',
                fontWeight: 'bold',
                fill: '#ffffff'
            }).setOrigin(1, 0.5);
            
            // Date in smaller text
            const dateStr = new Date(score.date).toLocaleDateString();
            const dateText = this.add.text(scoreCardWidth/2 - 40, rowY + 20, dateStr, {
                fontFamily: UI.fonts.primary,
                fontSize: '14px',
                fill: '#ffffff',
                alpha: 0.6
            }).setOrigin(1, 0.5);
            
            container.add([rowBg, rankBadge, rankText, nameText, scoreText, dateText]);
        });
        
        // Add empty state if no scores
        if (highScores.length === 0) {
            const emptyText = this.add.text(0, height * 0.4, 'No scores yet. Play the game!', {
                fontFamily: UI.fonts.primary,
                fontSize: '24px',
                fill: '#ffffff',
                alpha: 0.7
            }).setOrigin(0.5);
            
            container.add(emptyText);
        }

        // Create action buttons
        const createActionButton = (x, y, text, icon, color, width, callback) => {
            const buttonHeight = isMobile ? 50 : 60;
            
            const button = this.add.container(x, y);
            
            // Button background with glass effect
            const bg = this.add.rectangle(0, 0, width, buttonHeight, color, 0.2)
                .setInteractive()
                .setStrokeStyle(1, 0xFFFFFF, 0.3);
            bg.postFX.addBlur(1, 1, 1, 0.05);
            
            // Button icon
            const iconText = icon ? this.add.text(-width/2 + 30, 0, icon, {
                fontFamily: UI.fonts.primary,
                fontSize: '24px',
                fill: '#ffffff'
            }).setOrigin(0.5) : null;
            
            // Button text
            const buttonText = this.add.text(icon ? 0 : 0, 0, text, {
                fontFamily: UI.fonts.primary,
                fontSize: isMobile ? '20px' : '22px',
                fontWeight: '600',
                fill: '#ffffff'
            }).setOrigin(0.5);
            
            if (icon) {
                button.add([bg, iconText, buttonText]);
            } else {
                button.add([bg, buttonText]);
            }
            
            // Modern interaction effects
            bg.on('pointerover', () => {
                this.tweens.add({
                    targets: button,
                    scale: 1.05,
                    duration: UI.animations.short,
                    ease: 'Power2'
                });
                bg.setFillStyle(color, 0.3);
            });
            
            bg.on('pointerout', () => {
                this.tweens.add({
                    targets: button,
                    scale: 1,
                    duration: UI.animations.short,
                    ease: 'Power2'
                });
                bg.setFillStyle(color, 0.2);
            });
            
            bg.on('pointerdown', () => {
                this.tweens.add({
                    targets: button,
                    scale: 0.95,
                    duration: UI.animations.short,
                    ease: 'Power2'
                });
                bg.setFillStyle(color, 0.4);
            });
            
            bg.on('pointerup', () => {
                callback();
            });
            
            return button;
        };

        // Action buttons at the bottom
        const buttonWidth = isMobile ? 140 : 160;
        const buttonY = height - 80;
        
        const backButton = createActionButton(
            -buttonWidth, buttonY, 
            'Back', '←', UI.colors.primary, 
            buttonWidth * 2 - 20,
            () => this.scene.start('GameScene')
        );
        
        const clearButton = createActionButton(
            buttonWidth, buttonY, 
            'Clear All', '🗑️', UI.colors.danger, 
            buttonWidth * 2 - 20,
            () => {
                if (confirm('Are you sure you want to clear all scores?')) {
                    localStorage.removeItem('highScores');
                    this.scene.restart();
                }
            }
        );

        container.add([title, scoreCard, rankHeader, nameHeader, scoreHeader, separator, backButton, clearButton]);

        // Animate container entrance
        this.tweens.add({
            targets: container,
            y: 20,
            alpha: 1,
            duration: UI.animations.long,
            ease: 'Power2'
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