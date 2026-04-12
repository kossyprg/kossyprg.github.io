const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl    = document.getElementById('cpuScore');
const playerReachEl = document.getElementById('playerReach');
const cpuReachEl    = document.getElementById('cpuReach');
const message = document.getElementById('message');

const W = canvas.width, H = canvas.height;
const PADDLE_W = 14, PADDLE_H = 90, BALL_R = 9;
const PADDLE_SPEED = 9;
const WIN_SCORE = 3;

let state = 'idle'; // idle | playing | scored | won

const player = { x: 30, y: H/2 - PADDLE_H/2, score: 0, dy: 0 };
const cpu    = { x: W - 30 - PADDLE_W, y: H/2 - PADDLE_H/2, score: 0 };
const ball   = { x: W/2, y: H/2, vx: 0, vy: 0, speed: 0 };

const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ((e.key === ' ' || e.key === 'Spacebar') && (state === 'idle' || state === 'scored')) {
    serve();
  }
});
document.addEventListener('keyup', e => keys[e.key] = false);
canvas.addEventListener('click', () => {
  if (state === 'idle' || state === 'scored') serve();
});

function serve() {
  ball.speed = 5.5;
  const dir = Math.random() < 0.5 ? 1 : -1;
  ball.x = W/2;
  ball.y = H/2;
  ball.vx = dir * ball.speed;
  ball.vy = 0; // 最初のボールは水平
  state = 'playing';
  message.textContent = '';
}

function resetBall() {
  ball.x = W/2; ball.y = H/2; ball.vx = 0; ball.vy = 0;
}

function updateScore() {
  const reach = WIN_SCORE - 1;
  const badge = '<span class="match-pt">MATCH PT</span>';
  playerScoreEl.textContent = player.score;
  cpuScoreEl.textContent    = cpu.score;
  playerReachEl.innerHTML   = player.score === reach ? badge : '';
  cpuReachEl.innerHTML      = cpu.score   === reach ? badge : '';
}

// CPU AI
function moveCPU() {
  const center = cpu.y + PADDLE_H / 2;
  const target = ball.y;
  const diff = target - center;
  const speed = 5.04 + Math.min(player.score + cpu.score, 8) * 0.216;
  if (Math.abs(diff) > 4) {
    cpu.y += diff > 0 ? speed : -speed;
  }
  cpu.y = Math.max(0, Math.min(H - PADDLE_H, cpu.y));
}

function update() {
  // プレイ中だけプレイヤーがパドルを動かせる
  if (state === 'playing') {
    if ((keys['w'] || keys['W'] || keys['ArrowUp']) && player.y > 0)
      player.y -= PADDLE_SPEED;
    if ((keys['s'] || keys['S'] || keys['ArrowDown']) && player.y < H - PADDLE_H)
      player.y += PADDLE_SPEED;
  }

  if (state !== 'playing') return;

  moveCPU();

  // Ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Top/bottom wall bounce
  if (ball.y - BALL_R <= 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
  if (ball.y + BALL_R >= H) { ball.y = H - BALL_R; ball.vy = -Math.abs(ball.vy); }

  // Player paddle collision
  if (
    ball.vx < 0 &&
    ball.x - BALL_R <= player.x + PADDLE_W &&
    ball.x + BALL_R >= player.x &&
    ball.y + BALL_R >= player.y &&
    ball.y - BALL_R <= player.y + PADDLE_H
  ) {
    ball.x = player.x + PADDLE_W + BALL_R;

    const hitPos = (ball.y - (player.y + PADDLE_H/2)) / (PADDLE_H/2);
    const maxAngle = Math.PI / 3.5;

    // 当たった位置の角度
    let angle = hitPos * maxAngle;

    // ランダム補正を追加
    const randomAngle = (Math.random() - 0.5) * (Math.PI / 8); // -22.5度〜+22.5度
    angle += randomAngle;

    // 角度が付きすぎないよう制限
    angle = Math.max(-maxAngle, Math.min(maxAngle, angle));

    ball.speed = Math.min(ball.speed + 0.3, 13);
    ball.vx =  ball.speed * Math.cos(angle);
    ball.vy =  ball.speed * Math.sin(angle);
  }

  // CPU paddle collision
  if (
    ball.vx > 0 &&
    ball.x + BALL_R >= cpu.x &&
    ball.x - BALL_R <= cpu.x + PADDLE_W &&
    ball.y + BALL_R >= cpu.y &&
    ball.y - BALL_R <= cpu.y + PADDLE_H
  ) {
    ball.x = cpu.x - BALL_R;

    const hitPos = (ball.y - (cpu.y + PADDLE_H/2)) / (PADDLE_H/2);
    const maxAngle = Math.PI / 3.5;

    // 当たった位置の角度
    let angle = hitPos * maxAngle;

    // ランダム補正を追加
    const randomAngle = (Math.random() - 0.5) * (Math.PI / 8); // -22.5度〜+22.5度
    angle += randomAngle;

    // 角度が付きすぎないよう制限
    angle = Math.max(-maxAngle, Math.min(maxAngle, angle));

    ball.speed = Math.min(ball.speed + 0.3, 13);
    ball.vx = -ball.speed * Math.cos(angle);
    ball.vy =  ball.speed * Math.sin(angle);
  }

  // Score: ball goes off left
  if (ball.x + BALL_R < 0) {
    cpu.score++;
    updateScore();
    checkWin('CPU');
  }
  // Score: ball goes off right
  if (ball.x - BALL_R > W) {
    player.score++;
    updateScore();
    checkWin('Player');
  }
}

function checkWin(who) {
  resetBall();
  if (player.score >= WIN_SCORE || cpu.score >= WIN_SCORE) {
    state = 'won';
    message.textContent = who === 'Player' ? 'You Win!  Press SPACE to play again' : 'CPU Wins!  Press SPACE to play again';
    player.score = 0; cpu.score = 0;
    updateScore();
    // Allow restart
    const restart = (e) => {
      if (e.key === ' ' || e.type === 'click') {
        player.y = H/2 - PADDLE_H/2;
        cpu.y    = H/2 - PADDLE_H/2;
        state = 'scored';
        message.textContent = 'Press SPACE or click to serve';
        document.removeEventListener('keydown', restart);
        canvas.removeEventListener('click', restart);
      }
    };
    document.addEventListener('keydown', restart);
    canvas.addEventListener('click', restart);
  } else {
    player.y = H/2 - PADDLE_H/2;
    cpu.y    = H/2 - PADDLE_H/2;
    state = 'scored';
    message.textContent = who === 'Player' ? 'Point! Press SPACE to serve' : 'CPU scores! Press SPACE to serve';
  }
}

function drawCourt() {
  // Center line dashed
  ctx.setLineDash([14, 12]);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Net
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(W/2 - 2, 0, 4, H);
}

function drawPaddle(p, color) {
  const radius = 7;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, PADDLE_W, PADDLE_H, radius);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBall() {
  ctx.fillStyle = '#f7e733';
  ctx.shadowColor = '#f7e733';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawIdle() {
  // Draw static paddles and ball when not playing
  drawPaddle(player, '#4fc3f7');
  drawPaddle(cpu, '#ef9a9a');
  ctx.fillStyle = '#f7e733';
  ctx.beginPath();
  ctx.arc(W/2, H/2, BALL_R, 0, Math.PI*2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawCourt();
  if (state === 'playing') {
    drawPaddle(player, '#4fc3f7');
    drawPaddle(cpu, '#ef9a9a');
    drawBall();
  } else {
    drawIdle();
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

updateScore();
loop();