// Game variables
let canvas, ctx;
let player;
let asteroids = [];
let bullets = [];
let powerUps = [];
let score = 0;
let gameLoop;
let gameActive = false;

// Screen elements
const menuScreen = document.getElementById('menu');
const gameScreen = document.getElementById('game');
const scoreScreen = document.getElementById('scoreScreen');
const currentScoreElement = document.getElementById('currentScore');
const highScoresElement = document.getElementById('highScores');

// Button handlers
document.getElementById('playButton').addEventListener('click', startGame);
document.getElementById('scoreButton').addEventListener('click', showScores);
document.getElementById('backButton').addEventListener('click', showMenu);

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.rotation = 0;
        this.velocity = { x: 0, y: 0 };
        this.thrust = 0.3;
        this.friction = 0.99;
        this.rotationSpeed = 5;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.colorIndex = 0;
        this.colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        
        // Change color if invincible
        if (this.isInvincible) {
            ctx.strokeStyle = this.colors[Math.floor(this.colorIndex)];
            this.colorIndex = (this.colorIndex + 0.2) % this.colors.length;
        } else {
            ctx.strokeStyle = 'white';
        }
        
        ctx.stroke();
        ctx.restore();
    }

    rotate(dir) {
        this.rotation += dir * (this.rotationSpeed * Math.PI / 180);
    }

    move() {
        if (keys.ArrowUp) {
            this.velocity.x += Math.cos(this.rotation) * this.thrust;
            this.velocity.y += Math.sin(this.rotation) * this.thrust;
        }

        // Apply friction/drag
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        // Wrap around screen
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
    }

    shoot() {
        bullets.push(new Bullet(
            this.x + Math.cos(this.rotation) * 20,
            this.y + Math.sin(this.rotation) * 20,
            this.rotation
        ));
    }

    update() {
        // Update invincibility
        if (this.isInvincible) {
            this.invincibleTimer++;
            if (this.invincibleTimer >= 600) { // 10 seconds at 60fps
                this.isInvincible = false;
                this.invincibleTimer = 0;
            }
        }
    }
}

// Asteroid class
class Asteroid {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = size * 10;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.06;
        
        // Create irregular shape
        this.vertices = [];
        const numVertices = Math.floor(Math.random() * 4) + 7; // 7-10 vertices
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const radiusVariation = this.radius * (0.5 + Math.random() * 0.5);
            this.vertices.push({
                x: Math.cos(angle) * radiusVariation,
                y: Math.sin(angle) * radiusVariation
            });
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.stroke();
        
        ctx.restore();
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.rotation += this.rotationSpeed;

        // Wrap around screen
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
    }
}

// Bullet class
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.speed = 7;
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
        this.lifetime = 50;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.lifetime--;
        return this.lifetime <= 0;
    }
}

// Power-up class
class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.color = '#ffff00';
        this.type = 'invincibility';
        this.pulseSize = 0;
        this.pulseDirection = 0.2;
    }

    draw() {
        // Draw pulsing star
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw star shape
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5;
            const radius = this.radius + this.pulseSize;
            ctx.lineTo(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius
            );
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();

        // Update pulse animation
        this.pulseSize += this.pulseDirection;
        if (this.pulseSize > 5 || this.pulseSize < 0) {
            this.pulseDirection *= -1;
        }
    }
}

// Game controls
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    Space: false
};

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
        if (e.code === 'Space') {
            e.preventDefault();
            player.shoot();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

// Game functions
function createAsteroid() {
    let x, y;
    
    // Spawn asteroids outside the screen
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -20 : canvas.width + 20;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -20 : canvas.height + 20;
    }
    
    // Random size between 2 and 4 (increased from 1-3)
    const size = Math.random() * 2 + 2;
    
    asteroids.push(new Asteroid(x, y, size));
}

function startGame() {
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    scoreScreen.classList.add('hidden');

    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Set canvas size to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize game
    score = 0;
    currentScoreElement.textContent = score;
    player = new Player(canvas.width / 2, canvas.height / 2);
    asteroids = [];
    bullets = [];
    powerUps = [];
    gameActive = true;

    // Create initial asteroids with varying sizes
    for (let i = 0; i < 5; i++) {
        createAsteroid();
    }

    // Start game loop
    if (!gameLoop) {
        gameLoop = setInterval(update, 1000 / 60);
    }
}

function update() {
    if (!gameActive) return;

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update player
    if (keys.ArrowLeft) player.rotate(-1);
    if (keys.ArrowRight) player.rotate(1);
    player.move();
    player.update();
    player.draw();

    // Update power-ups
    powerUps.forEach((powerUp, index) => {
        powerUp.draw();
        
        // Check collision with player
        const dx = player.x - powerUp.x;
        const dy = player.y - powerUp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.radius + powerUp.radius) {
            // Activate power-up
            if (powerUp.type === 'invincibility') {
                player.isInvincible = true;
                player.invincibleTimer = 0;
            }
            powerUps.splice(index, 1);
        }
    });

    // Update bullets
    bullets = bullets.filter(bullet => {
        bullet.draw();
        return !bullet.update();
    });

    // Update asteroids
    asteroids.forEach((asteroid, i) => {
        asteroid.update();
        asteroid.draw();

        // Check collision with bullets
        bullets.forEach((bullet, j) => {
            const dx = bullet.x - asteroid.x;
            const dy = bullet.y - asteroid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < asteroid.radius) {
                // Remove bullet and asteroid
                bullets.splice(j, 1);
                asteroids.splice(i, 1);
                
                // Add score based on asteroid size
                score += Math.floor(asteroid.size * 100);
                currentScoreElement.textContent = score;

                // Chance to spawn power-up (3% chance)
                if (Math.random() < 0.03) {
                    powerUps.push(new PowerUp(asteroid.x, asteroid.y));
                }

                // Create smaller asteroids if size is big enough
                if (asteroid.size > 1) {
                    const numFragments = Math.floor(asteroid.size); // More fragments for bigger asteroids
                    for (let k = 0; k < numFragments; k++) {
                        asteroids.push(new Asteroid(
                            asteroid.x,
                            asteroid.y,
                            asteroid.size / 2
                        ));
                    }
                }
            }
        });

        // Check collision with player
        const dx = player.x - asteroid.x;
        const dy = player.y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < asteroid.radius + player.radius) {
            if (player.isInvincible) {
                // Destroy asteroid if player is invincible
                asteroids.splice(i, 1);
                score += Math.floor(asteroid.size * 100);
                currentScoreElement.textContent = score;
                
                // Create smaller asteroids if size is big enough
                if (asteroid.size > 1) {
                    const numFragments = Math.floor(asteroid.size);
                    for (let k = 0; k < numFragments; k++) {
                        asteroids.push(new Asteroid(
                            asteroid.x,
                            asteroid.y,
                            asteroid.size / 2
                        ));
                    }
                }
            } else {
                gameOver();
            }
        }
    });

    // Create new asteroids with increasing frequency based on score
    const spawnChance = Math.min(0.03, 0.01 + (score / 10000) * 0.02); // Increases with score up to 3%
    if (Math.random() < spawnChance && asteroids.length < 20) { // Increased max asteroids
        createAsteroid();
    }
}

function gameOver() {
    gameActive = false;
    clearInterval(gameLoop);
    gameLoop = null;
    
    // Create name input modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        padding: 20px;
        border: 2px solid white;
        text-align: center;
        z-index: 1000;
    `;
    
    const message = document.createElement('p');
    message.textContent = 'Enter your name (5 letters):';
    message.style.color = 'white';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 5;
    input.minLength = 5;
    input.style.cssText = `
        margin: 10px;
        padding: 5px;
        font-size: 18px;
        text-transform: uppercase;
    `;
    
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.style.cssText = `
        display: block;
        margin: 10px auto;
        padding: 5px 15px;
        background: white;
        color: black;
        border: none;
        cursor: pointer;
    `;
    
    modal.appendChild(message);
    modal.appendChild(input);
    modal.appendChild(submitButton);
    document.body.appendChild(modal);
    
    input.focus();
    
    submitButton.onclick = () => {
        const name = input.value.toUpperCase();
        if (name.length === 5) {
            saveScore(name);
            document.body.removeChild(modal);
            showMenu();
        }
    };
    
    input.onkeypress = (e) => {
        if (e.key === 'Enter' && input.value.length === 5) {
            submitButton.click();
        }
    };
}

function saveScore(playerName) {
    const highScores = JSON.parse(localStorage.getItem('asteroidScores') || '[]');
    highScores.push({
        name: playerName,
        score: score
    });
    
    // Sort by score and keep only top 5
    highScores.sort((a, b) => b.score - a.score);
    highScores.splice(5);
    
    localStorage.setItem('asteroidScores', JSON.stringify(highScores));
}

function showScores() {
    menuScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    scoreScreen.classList.remove('hidden');

    // Display high scores
    const highScores = JSON.parse(localStorage.getItem('asteroidScores') || '[]');
    highScoresElement.innerHTML = highScores
        .map((entry, index) => `
            <div class="score-entry">
                ${index + 1}. ${entry.name} - ${entry.score}
            </div>
        `)
        .join('');
}

function showMenu() {
    menuScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    scoreScreen.classList.add('hidden');
}
