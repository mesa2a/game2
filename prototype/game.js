const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const pieceEl = document.getElementById('piece');

const keys = new Set();
let gameClear = false;

const player = {
  x: 70,
  y: 320,
  z: 0,
  vz: 0,
  speed: 2.1,
  jumpSpeed: 6.8,
  radius: 10,
  hp: 5,
  invuln: 0,
};

const enemy = { x: 365, y: 210, hp: 5, invuln: 0, alive: true };
const exit = { x: 560, y: 60, w: 44, h: 44 };

const lowBlock = { x: 250, y: 188, w: 140, h: 24, height: 14 };
const highBlock = { x: 430, y: 150, w: 70, h: 90, height: 999 };

const state = {
  actionPiece: 'attack', // swapped by 「さしかえ」
  waitQueued: false,
  actionQueuedAt: 0,
};

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);

  if (k === '1') {
    state.actionPiece = state.actionPiece === 'attack' ? 'jump' : 'attack';
  }
  if (k === '2') {
    state.waitQueued = true;
  }
  if (k === 'j') triggerAction();
  if (e.code === 'Space') tryJump();
});

addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function tryJump() {
  if (player.z === 0) player.vz = player.jumpSpeed;
}

function triggerAction() {
  if (state.waitQueued) {
    state.waitQueued = false;
    state.actionQueuedAt = performance.now() + 600;
    return;
  }
  doAction();
}

function doAction() {
  if (state.actionPiece === 'jump') {
    tryJump();
    return;
  }
  if (!enemy.alive) return;
  const d = Math.hypot(player.x - enemy.x, player.y - enemy.y);
  if (d < 42 && player.z < 8 && enemy.invuln <= 0) {
    enemy.hp -= 1;
    enemy.invuln = 38;
    if (enemy.hp <= 0) enemy.alive = false;
  }
}

function circleRectHit(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

function updateMovement() {
  let dx = 0;
  let dy = 0;
  if (keys.has('w')) dy -= 1;
  if (keys.has('s')) dy += 1;
  if (keys.has('a')) dx -= 1;
  if (keys.has('d')) dx += 1;

  if (dx || dy) {
    const l = Math.hypot(dx, dy);
    dx = (dx / l) * player.speed;
    dy = (dy / l) * player.speed;
  }

  const nx = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x + dx));
  const ny = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y + dy));

  const collLow = circleRectHit(nx, ny, player.radius, lowBlock);
  const collHigh = circleRectHit(nx, ny, player.radius, highBlock);

  const canPassLow = player.z > lowBlock.height;
  if (!collHigh && (!collLow || canPassLow)) {
    player.x = nx;
    player.y = ny;
  }
}

function updateJump() {
  if (player.z > 0 || player.vz > 0) {
    player.z += player.vz;
    player.vz -= 0.34;
    if (player.z <= 0) {
      player.z = 0;
      player.vz = 0;
    }
  }
}

function updateCombat() {
  if (enemy.invuln > 0) enemy.invuln--;
  if (player.invuln > 0) player.invuln--;

  if (enemy.alive && player.z < 8 && Math.hypot(player.x - enemy.x, player.y - enemy.y) < 18 && player.invuln <= 0) {
    player.hp -= 1;
    player.invuln = 50;
  }
}

function updateQueuedAction() {
  if (state.actionQueuedAt && performance.now() >= state.actionQueuedAt) {
    state.actionQueuedAt = 0;
    doAction();
  }
}

function updateGoal() {
  if (!enemy.alive &&
      player.x > exit.x && player.x < exit.x + exit.w &&
      player.y > exit.y && player.y < exit.y + exit.h) {
    gameClear = true;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#202737';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#2f6f8f';
  ctx.fillRect(lowBlock.x, lowBlock.y, lowBlock.w, lowBlock.h);
  ctx.fillStyle = '#6c2d2d';
  ctx.fillRect(highBlock.x, highBlock.y, highBlock.w, highBlock.h);

  ctx.strokeStyle = '#82cfff';
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);

  if (enemy.alive) {
    ctx.fillStyle = enemy.invuln > 0 ? '#ffb3b3' : '#ff6666';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 6, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // player body elevated by z
  ctx.fillStyle = player.invuln > 0 ? '#b9d6ff' : '#7aa2ff';
  ctx.beginPath();
  ctx.arc(player.x, player.y - player.z, player.radius, 0, Math.PI * 2);
  ctx.fill();

  if (player.z > 0) {
    ctx.strokeStyle = '#c2f0ff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#ddd';
  ctx.fillText(`HP:${player.hp}`, 12, 18);
  ctx.fillText(`Enemy:${enemy.alive ? enemy.hp : 0}`, 12, 34);
}

function renderText() {
  if (gameClear) {
    statusEl.textContent = 'クリア！ 敵を倒して出口へ到達しました。';
  } else if (player.hp <= 0) {
    statusEl.textContent = 'ゲームオーバー。ページを再読み込みしてください。';
  } else {
    statusEl.textContent = '目標: 敵を倒してから右上の出口へ。';
  }

  const queued = state.actionQueuedAt ? '（次のアクション遅延中）' : '';
  pieceEl.textContent = `現在のアクションピース: ${state.actionPiece} ${queued}`;
}

function loop() {
  if (!gameClear && player.hp > 0) {
    updateMovement();
    updateJump();
    updateCombat();
    updateQueuedAction();
    updateGoal();
  }
  draw();
  renderText();
  requestAnimationFrame(loop);
}

loop();
