const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GROUND_HEIGHT = 80; // Height of the ground area from bottom
const PLAYER_MAX_HEALTH = 3; // Add maxHealth constant at the top
const INVINCIBILITY_DURATION = 2000; // 2 seconds in milliseconds
const ENEMY_INVINCIBILITY_DURATION = 500; // 0.5 seconds in milliseconds for enemies
const menuContainer = document.getElementById('menuContainer');
const startButton = document.getElementById('startButton');
const bgMusic = document.getElementById('bgMusic');
const BG_MUSIC_VOLUME = 1.0;    // 100% volume for background music
const BULLET_VOLUME = 0.2;      // 60% volume for bullet sounds
const EXPLOSION_SOUND_VOLUME = 0.2; // Match bullet volume

bgMusic.volume = BG_MUSIC_VOLUME;

const ENEMY_TYPES = [
    { src: 'enemies/enemyspaceship1.png', speed: 2, height: 40, shootInterval: 2000, maxHealth: 3, bulletSrc: 'enemies/enemybim1.png', soundSrc: 'enemies/e1.mp3' },
    { src: 'enemies/enemyspaceship2.png', speed: 3, height: 35, shootInterval: 2500, maxHealth: 3, bulletSrc: 'enemies/enemybim2.png', soundSrc: 'enemies/e2.mp3' },
    { src: 'enemies/enemyspaceship3.png', speed: 1.5, height: 45, shootInterval: 3000, maxHealth: 3, bulletSrc: 'enemies/enemybim3.png', soundSrc: 'enemies/e3.mp3' },
    { src: 'enemies/enemyspaceship4.png', speed: 4, height: 30, shootInterval: 2200, maxHealth: 3, bulletSrc: 'enemies/enemybim4.png', soundSrc: 'enemies/e4.mp3' },
    { src: 'enemies/enemyspaceship5.png', speed: 2.5, height: 42, shootInterval: 2800, maxHealth: 3, bulletSrc: 'enemies/enemybim5.png', soundSrc: 'enemies/e5.mp3' }
];

// Add isMobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Update function to show/hide mobile controls
function toggleMobileControls(show) {
    if (isMobile) {
        document.getElementById('mobileControls').style.display = show ? 'flex' : 'none';
    }
}

// Update resizeCanvas function
function resizeCanvas() {
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    const scale = Math.min(maxWidth / 800, maxHeight / 600);
    canvas.style.width = `${800 * scale}px`;
    canvas.style.height = `${600 * scale}px`;
}

// Update mobile controls handling
const mobileControls = {
    leftBtn: document.getElementById('leftBtn'),
    rightBtn: document.getElementById('rightBtn'),
    upBtn: document.getElementById('upBtn'),
    downBtn: document.getElementById('downBtn'),
    shootBtn: document.getElementById('shootBtn')
};

// Improved touch event handling
Object.entries(mobileControls).forEach(([key, btn]) => {
    if (btn) {
        ['touchstart', 'mousedown'].forEach(eventType => {
            btn.addEventListener(eventType, (e) => {
                e.preventDefault();
                if (key === 'shootBtn') {
                    if (gameStarted) player.shoot();
                } else {
                    const direction = key.replace('Btn', '').toLowerCase();
                    keys[`Arrow${direction.charAt(0).toUpperCase() + direction.slice(1)}`] = true;
                }
            });
        });

        ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(eventType => {
            btn.addEventListener(eventType, (e) => {
                e.preventDefault();
                if (key !== 'shootBtn') {
                    const direction = key.replace('Btn', '').toLowerCase();
                    keys[`Arrow${direction.charAt(0).toUpperCase() + direction.slice(1)}`] = false;
                }
            });
        });
    }
});

// Add resize listener
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);

// Initialize canvas size
resizeCanvas();

class Background {
    constructor() {
        this.x = 0;
        this.speed = 1;
        this.image = new Image();
        this.image.src = 'background.jpg';
        this.width = canvas.width;
        this.height = canvas.height;
    }

    update() {
        this.x -= this.speed;
        if (this.x <= -this.width) {
            this.x = 0;
        }
    }

    draw() {
        // Draw two copies of the background side by side
        ctx.drawImage(this.image, this.x, 0, this.width, this.height);
        ctx.drawImage(this.image, this.x + this.width, 0, this.width, this.height);
    }
}

class Player {
    constructor() {
        this.height = 40; // Fixed height for both ships
        this.width = this.height; // Temporary width, will be adjusted when image loads
        this.x = 20; // Left side with small padding
        this.y = canvas.height/2 - this.height/2; // Center vertically
        this.speed = 5;
        this.bullets = [];
        
        this.image = new Image();
        this.image.onload = () => {
            // Set width based on image aspect ratio
            this.width = (this.image.width / this.image.height) * this.height;
        };
        this.image.src = 'heroes/spaceship1.png';
        
        this.maxHealth = PLAYER_MAX_HEALTH; // Add maxHealth to Player class
        this.health = this.maxHealth;
        this.isInvincible = false;
        this.invincibilityTimer = 0;
        this.flickerRate = 100; // ms between visibility toggles
        this.isVisible = true;
        this.shootSound = new Audio('heroes/h1.mp3');
        this.shootSound.volume = BULLET_VOLUME;
    }

    draw() {
        // Handle flicker effect during invincibility
        if (this.isInvincible) {
            if (Date.now() % this.flickerRate < this.flickerRate/2) {
                this.isVisible = !this.isVisible;
            }
        }

        // Only draw if visible
        if (this.isVisible || !this.isInvincible) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }

        // Always draw health bar
        const barWidth = this.width * 0.3;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;
        const barX = this.x + (this.width - barWidth) / 2;
        
        // Background (empty health bar)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(barX, this.y - barHeight - 2, barWidth, barHeight);
        
        // Foreground (filled health bar)
        ctx.fillStyle = 'rgb(0, 255, 0)';
        ctx.fillRect(barX, this.y - barHeight - 2, barWidth * healthPercent, barHeight);
    }

    move(direction) {
        if (direction === 'left' && this.x > 0) {
            this.x -= this.speed;
        }
        if (direction === 'right' && this.x < canvas.width - this.width) {
            this.x += this.speed;
        }
        if (direction === 'up' && this.y > 0) {
            this.y -= this.speed;
        }
        if (direction === 'down' && this.y < canvas.height - GROUND_HEIGHT - this.height) {
            this.y += this.speed;
        }
    }

    shoot() {
        this.bullets.push(new Bullet(this.x + this.width, this.y + this.height / 2));
        this.shootSound.currentTime = 0;
        this.shootSound.play();
    }

    makeInvincible() {
        this.isInvincible = true;
        this.isVisible = true;
        
        setTimeout(() => {
            this.isInvincible = false;
            this.isVisible = true;
        }, INVINCIBILITY_DURATION);
    }
}

class EnemyBullet {
    constructor(x, y, bulletSrc) {
        this.width = 20;
        this.height = 10;
        this.x = x;
        this.y = y;
        this.speed = 5;
        this.image = new Image();
        this.image.src = bulletSrc;
    }

    draw() {
        if (this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }

    update() {
        this.x -= this.speed;
    }
}

class Enemy {
    constructor() {
        const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        this.height = type.height;
        this.width = this.height;
        this.x = canvas.width + this.width;
        this.y = Math.random() * (canvas.height - GROUND_HEIGHT - this.height);
        this.baseSpeed = type.speed;
        this.speed = this.baseSpeed;
        this.bullets = [];
        this.lastShot = 0;
        this.shootInterval = type.shootInterval;
        this.maxHealth = type.maxHealth;
        this.health = this.maxHealth;
        
        // Movement pattern variables
        this.direction = 1; // 1 for down, -1 for up
        this.verticalSpeed = this.baseSpeed * 0.5;
        this.movementTimer = 0;
        this.moveForward = false;
        
        this.image = new Image();
        this.image.onload = () => {
            this.width = (this.image.width / this.image.height) * this.height;
        };
        this.image.src = type.src;

        this.isInvincible = false;
        this.flickerRate = 100;
        this.isVisible = true;
        this.bulletSrc = type.bulletSrc;
        this.shootSound = new Audio(type.soundSrc);
        this.shootSound.volume = BULLET_VOLUME;
    }

    makeInvincible() {
        this.isInvincible = true;
        this.isVisible = true;
        
        setTimeout(() => {
            this.isInvincible = false;
            this.isVisible = true;
        }, ENEMY_INVINCIBILITY_DURATION);
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shootInterval) {
            this.bullets.push(new EnemyBullet(this.x, this.y + this.height/2, this.bulletSrc));
            this.shootSound.currentTime = 0;
            this.shootSound.play();
            this.lastShot = now;
        }
    }

    update() {
        // Vertical movement
        this.y += this.verticalSpeed * this.direction;
        
        // Change direction when hitting boundaries
        if (this.y <= 0 || this.y >= canvas.height - GROUND_HEIGHT - this.height) {
            this.direction *= -1;
        }
        
        // Horizontal movement
        this.movementTimer++;
        if (this.movementTimer > 120) { // Change direction every 2 seconds
            this.moveForward = !this.moveForward;
            this.movementTimer = 0;
        }
        
        this.x += this.moveForward ? this.baseSpeed : -this.baseSpeed;
        
        // Keep enemy within bounds
        this.x = Math.max(canvas.width/2, Math.min(canvas.width - this.width, this.x));
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.x > 0;
        });
        
        // Try to shoot
        this.shoot();
    }

    draw() {
        // Handle flicker effect during invincibility
        if (this.isInvincible) {
            if (Date.now() % this.flickerRate < this.flickerRate/2) {
                this.isVisible = !this.isVisible;
            }
        }

        // Only draw if visible
        if (this.isVisible || !this.isInvincible) {
            ctx.save();
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.scale(-1, 1);
            ctx.drawImage(this.image, -this.width/2, -this.height/2, this.width, this.height);
            ctx.restore();
        }

        // Always draw health bar
        // Draw health bar with 30% width of the jet
        const barWidth = this.width * 0.3; // Changed from 0.5 to 0.3
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;
        
        // Center the health bar above the jet
        const barX = this.x + (this.width - barWidth) / 2;
        
        // Background (empty health bar)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(barX, this.y - barHeight - 2, barWidth, barHeight);
        
        // Foreground (filled health bar)
        ctx.fillStyle = 'rgb(0, 255, 0)';
        ctx.fillRect(barX, this.y - barHeight - 2, barWidth * healthPercent, barHeight);

        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw());
    }
}

class Bullet {
    constructor(x, y) {
        this.width = 20;
        this.height = 10;
        this.x = x;
        this.y = y;
        this.speed = 7;
        this.image = new Image();
        this.image.src = 'heroes/herobim1.png';
    }

    draw() {
        if (this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }

    update() {
        this.x += this.speed;
    }
}

class Explosion {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.image = new Image();
        this.image.src = 'explosion.png'; // Single explosion PNG
        this.opacity = 1;
        this.alive = true;
        this.sound = new Audio('explode.mp3');
        this.sound.volume = EXPLOSION_SOUND_VOLUME;
        this.sound.play(); // Play sound when explosion is created
        
        // Fade out effect
        this.fadeSpeed = 0.05;
    }

    draw() {
        if (this.image.complete) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.drawImage(
                this.image,
                this.x - this.size/2,
                this.y - this.size/2,
                this.size,
                this.size
            );
            ctx.restore();

            // Fade out
            this.opacity -= this.fadeSpeed;
            if (this.opacity <= 0) {
                this.alive = false;
            }
        }
    }
}

// Add explosions array at the top level
let explosions = [];

const player = new Player();
const background = new Background();
let enemies = [];
let keys = {};
let gameStarted = false;
let gameLoop;
let spawnInterval;

function detectCollision(rect1, rect2) {
    // More accurate collision detection
    const left1 = rect1.x;
    const right1 = rect1.x + rect1.width;
    const top1 = rect1.y;
    const bottom1 = rect1.y + rect1.height;
    
    const left2 = rect2.x;
    const right2 = rect2.x + rect2.width;
    const top2 = rect2.y;
    const bottom2 = rect2.y + rect2.height;
    
    // Smaller collision boxes (70% of original size) for more forgiving gameplay
    const shrinkFactor = 0.7;
    const shrinkX1 = (rect1.width * (1 - shrinkFactor)) / 2;
    const shrinkY1 = (rect1.height * (1 - shrinkFactor)) / 2;
    const shrinkX2 = (rect2.width * (1 - shrinkFactor)) / 2;
    const shrinkY2 = (rect2.height * (1 - shrinkFactor)) / 2;

    return !(
        right1 - shrinkX1 <= left2 + shrinkX2 ||
        left1 + shrinkX1 >= right2 - shrinkX2 ||
        bottom1 - shrinkY1 <= top2 + shrinkY2 ||
        top1 + shrinkY1 >= bottom2 - shrinkY2
    );
}

function showMenu() {
    menuContainer.style.display = 'flex';
}

function hideMenu() {
    menuContainer.style.display = 'none';
}

// Update initGame function
function initGame() {
    hideMenu();
    gameStarted = true;
    bgMusic.play();
    canvas.style.opacity = '1'; // Restore canvas opacity when game starts
    toggleMobileControls(true); // Show controls when game starts
    startGame();
}

function startGame() {
    // Reset game state
    player.health = player.maxHealth;
    enemies = [];
    explosions = [];
    
    spawnInterval = setInterval(() => {
        // Spawn 1-2 enemies with longer interval
        const count = Math.floor(Math.random() * 2) + 1;
        for(let i = 0; i < count; i++) {
            setTimeout(() => {
                enemies.push(new Enemy());
            }, i * 1000); // Longer delay between spawns
        }
    }, 5000); // Longer interval between spawn waves

    gameLoop = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw background first
        background.update();
        background.draw();
        
        // Draw semi-transparent ground
        ctx.fillStyle = 'rgba(102, 51, 0, 0.3)'; // Brown with 0.3 opacity
        ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
        
        if (keys['ArrowLeft']) player.move('left');
        if (keys['ArrowRight']) player.move('right');
        if (keys['ArrowUp']) player.move('up');
        if (keys['ArrowDown']) player.move('down');
        
        player.draw();
        
        // Update and draw explosions
        explosions = explosions.filter(explosion => {
            explosion.draw();
            return explosion.alive;
        });

        // Update and draw bullets
        player.bullets = player.bullets.filter(bullet => {
            bullet.update();
            bullet.draw();
            return bullet.x < canvas.width;
        });

        // Update and draw enemies
        enemies = enemies.filter(enemy => {
            enemy.update();
            enemy.draw();

            // Check enemy bullet collisions with player
            enemy.bullets = enemy.bullets.filter(bullet => {
                if (detectCollision(bullet, player) && !player.isInvincible) {
                    player.health--; // Modify the enemy bullet collision section
                    if (player.health <= 0) {
                        explosions.push(new Explosion(
                            player.x + player.width/2,
                            player.y + player.height/2,
                            player.height
                        ));
                        gameOver();
                    } else {
                        player.makeInvincible();
                    }
                    return false;
                }
                return bullet.x > 0;
            });

            // Check bullet collisions
            for (let i = player.bullets.length - 1; i >= 0; i--) {
                const bullet = player.bullets[i];
                if (detectCollision(bullet, enemy) && !enemy.isInvincible) {
                    enemy.health--;
                    player.bullets.splice(i, 1);
                    
                    // Only destroy enemy and create explosion if health reaches 0
                    if (enemy.health <= 0) {
                        explosions.push(new Explosion(
                            enemy.x + (enemy.width / 2),
                            enemy.y + (enemy.height / 2),
                            Math.max(enemy.width, enemy.height)
                        ));
                        return false;
                    } else {
                        enemy.makeInvincible();
                    }
                }
            }

            // Check player collision
            if (detectCollision(player, enemy) && !player.isInvincible) {
                player.health = 0; // Instant death on direct collision
                explosions.push(new Explosion(
                    player.x + (player.width / 2),
                    player.y + (player.height / 2),
                    Math.max(player.width, player.height)
                ));
                gameOver();
                return false;
            }

            return enemy.x > -enemy.width; // New boundary check for leftward movement
        });
    }, 1000/60);
}

// Update gameOver function
function gameOver() {
    clearInterval(gameLoop);
    clearInterval(spawnInterval);
    bgMusic.pause();
    bgMusic.currentTime = 0;
    showMenu();
    canvas.style.opacity = '0.5';
    toggleMobileControls(false); // Hide controls when game ends
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') {
        player.shoot();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

startButton.addEventListener('click', initGame);
startButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent double-firing on mobile devices
    initGame();
});

// Add touch event prevention to the menu container
menuContainer.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling while touching menu
}, { passive: false });

// Initialize with controls hidden
toggleMobileControls(false);

showMenu();
canvas.style.opacity = '0.5'; // Dim the canvas when menu is showing
