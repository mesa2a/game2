const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const pieceEl = document.getElementById('piece');
const ghostEl = document.getElementById('ghost');
const resultEl = document.getElementById('result');
const stageEl = document.getElementById('stage');

const keys = new Set();
const BEST_KEY = 'piece_prototype_best_sec';
let gameClear = false;
const assets = {
  player: new Image(),
  enemy: new Image(),
  tiles: new Image(),
};
assets.player.src = './assets/player.svg';
assets.enemy.src = './assets/enemy.svg';
assets.tiles.src = './assets/tiles.svg';

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

const stageDefs = [
  {
    name: 'Stage 1: 教室前廊下',
    enemy: { x: 365, y: 210, hp: 5 },
    exit: { x: 560, y: 60, w: 44, h: 44 },
    lowBlocks: [{ x: 250, y: 188, w: 140, h: 24, height: 14 }],
    highBlocks: [{ x: 430, y: 150, w: 70, h: 90, height: 999 }],
    gate: { x: 518, y: 118, w: 20, h: 120, open: false },
  },
  {
    name: 'Stage 2: 渡り廊下',
    enemy: { x: 220, y: 110, hp: 6 },
    exit: { x: 585, y: 340, w: 36, h: 36 },
    lowBlocks: [
      { x: 120, y: 200, w: 120, h: 20, height: 12 },
      { x: 300, y: 120, w: 100, h: 22, height: 12 },
    ],
    highBlocks: [
      { x: 370, y: 230, w: 96, h: 96, height: 999 },
      { x: 500, y: 110, w: 56, h: 140, height: 999 },
    ],
    gate: { x: 280, y: 258, w: 120, h: 18, open: false },
  },
];

const stage = {
  idx: 0,
  enemy: { x: 0, y: 0, hp: 0, invuln: 0, alive: true },
  exit: { x: 0, y: 0, w: 0, h: 0 },
  lowBlocks: [],
  highBlocks: [],
  gate: { x: 0, y: 0, w: 0, h: 0, open: false },
};

const state = {
  actionPiece: 'attack', // swapped by 「さしかえ」
  waitQueued: false,
  repeatQueued: false,
  actionQueuedAt: 0,
  followupActionAt: 0,
  showHint: false,
  swaps: 0,
  actionsUsed: 0,
  startedAt: performance.now(),
  comboReady: false,
  comboWindowUntil: 0,
  enemyAttackAt: performance.now() + 1500,
  enemyAttackResolveAt: 0,
  parryWindowUntil: 0,
  commandText: '',
  commandTextUntil: 0,
};

function cloneRect(r) {
  return { x: r.x, y: r.y, w: r.w, h: r.h, height: r.height };
}

function applyStage(i) {
  stage.idx = i;
  const def = stageDefs[i];
  stage.enemy = { x: def.enemy.x, y: def.enemy.y, hp: def.enemy.hp, invuln: 0, alive: true };
  stage.exit = { ...def.exit };
  stage.lowBlocks = def.lowBlocks.map(cloneRect);
  stage.highBlocks = def.highBlocks.map(cloneRect);
  stage.gate = { ...def.gate };

  player.x = 70;
  player.y = 320;
  player.z = 0;
  player.vz = 0;
  player.hp = 5;
  player.invuln = 0;
}

function resetRun() {
  gameClear = false;
  state.actionPiece = 'attack';
  state.waitQueued = false;
  state.repeatQueued = false;
  state.actionQueuedAt = 0;
  state.followupActionAt = 0;
  state.swaps = 0;
  state.actionsUsed = 0;
  state.startedAt = performance.now();
  state.comboReady = false;
  state.comboWindowUntil = 0;
  state.enemyAttackAt = performance.now() + 1500;
  state.enemyAttackResolveAt = 0;
  state.parryWindowUntil = 0;
  state.commandText = '';
  state.commandTextUntil = 0;
  applyStage(0);
}

resetRun();

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);

  if (k === '1') {
    state.actionPiece = state.actionPiece === 'attack' ? 'jump' : 'attack';
    state.swaps += 1;
  }
  if (k === '2') state.waitQueued = true;
  if (k === '3') state.repeatQueued = true;
  if (k === 'h') state.showHint = !state.showHint;
  if (k === 'r') resetRun();
  if (k === 'k') tryGuard();
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
  const now = performance.now();
  state.actionsUsed += 1;

  if (state.repeatQueued) {
    state.repeatQueued = false;
    state.followupActionAt = performance.now() + 240;
  }

  if (state.actionPiece === 'jump') {
    tryJump();
    return;
  }

  if (!stage.enemy.alive) return;
  const d = Math.hypot(player.x - stage.enemy.x, player.y - stage.enemy.y);
  if (d < 50 && player.z < 8 && stage.enemy.invuln <= 0) {
    if (state.comboReady && now <= state.comboWindowUntil) {
      stage.enemy.hp -= 2;
      stage.enemy.invuln = 42;
      state.comboReady = false;
      state.commandText = 'アクション成功！ 追加ダメージ';
      state.commandTextUntil = now + 800;
    } else {
      stage.enemy.hp -= 1;
      stage.enemy.invuln = 30;
      state.comboReady = true;
      state.comboWindowUntil = now + 340;
      state.commandText = 'タイミングよくJで追撃！';
      state.commandTextUntil = now + 700;
    }
    if (stage.enemy.hp <= 0) stage.enemy.alive = false;
  }
}

function tryGuard() {
  const now = performance.now();
  if (now <= state.parryWindowUntil && state.enemyAttackResolveAt > 0) {
    state.enemyAttackResolveAt = 0;
    stage.enemy.invuln = Math.max(stage.enemy.invuln, 20);
    state.commandText = 'ガード成功！ ダメージ無効';
    state.commandTextUntil = now + 700;
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

  const collLow = stage.lowBlocks.some((b) => circleRectHit(nx, ny, player.radius, b));
  const collHigh = stage.highBlocks.some((b) => circleRectHit(nx, ny, player.radius, b));
  const collGate = !stage.gate.open && circleRectHit(nx, ny, player.radius, stage.gate);

  const canPassLow = stage.lowBlocks.some((b) => circleRectHit(nx, ny, player.radius, b) && player.z > b.height);
  if (!collHigh && !collGate && (!collLow || canPassLow)) {
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
  const now = performance.now();
  if (stage.enemy.invuln > 0) stage.enemy.invuln--;
  if (player.invuln > 0) player.invuln--;
  if (state.comboReady && now > state.comboWindowUntil) state.comboReady = false;

  if (!stage.enemy.alive || player.z >= 8) return;

  const d = Math.hypot(player.x - stage.enemy.x, player.y - stage.enemy.y);
  if (d < 85 && now >= state.enemyAttackAt && state.enemyAttackResolveAt === 0) {
    state.parryWindowUntil = now + 260;
    state.enemyAttackResolveAt = now + 300;
    state.enemyAttackAt = now + 1700;
  }

  if (state.enemyAttackResolveAt > 0 && now >= state.enemyAttackResolveAt) {
    state.enemyAttackResolveAt = 0;
    if (d < 40 && player.invuln <= 0) {
      player.hp -= 1;
      player.invuln = 60;
      state.commandText = '被弾！ Kでタイミングガード可能';
      state.commandTextUntil = now + 800;
    }
  }
}

function updateQueuedAction() {
  if (state.actionQueuedAt && performance.now() >= state.actionQueuedAt) {
    state.actionQueuedAt = 0;
    doAction();
  }
  if (state.followupActionAt && performance.now() >= state.followupActionAt) {
    state.followupActionAt = 0;
    doAction();
  }
}

function updateGate() {
  // 2秒周期: 開1秒 / 閉1秒
  stage.gate.open = Math.floor(performance.now() / 1000) % 2 === 0;
}

function updateGoal() {
  const onExit =
    player.x > stage.exit.x && player.x < stage.exit.x + stage.exit.w &&
    player.y > stage.exit.y && player.y < stage.exit.y + stage.exit.h;

  if (!stage.enemy.alive && onExit) {
    if (stage.idx < stageDefs.length - 1) {
      applyStage(stage.idx + 1);
    } else {
      gameClear = true;
      const sec = Number(((performance.now() - state.startedAt) / 1000).toFixed(1));
      const best = Number(localStorage.getItem(BEST_KEY) || 0);
      if (!best || sec < best) localStorage.setItem(BEST_KEY, String(sec));
    }
  }
}

function scoreText() {
  const sec = ((performance.now() - state.startedAt) / 1000).toFixed(1);
  const best = localStorage.getItem(BEST_KEY) || '-';
  return `time:${sec}s / actions:${state.actionsUsed} / swaps:${state.swaps} / best:${best}s`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#202737';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const hasTiles = assets.tiles.complete && assets.tiles.naturalWidth > 0;
  for (const b of stage.lowBlocks) {
    if (hasTiles) ctx.drawImage(assets.tiles, 0, 0, 32, 32, b.x, b.y, b.w, b.h);
    else {
      ctx.fillStyle = '#2f6f8f';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }

  for (const b of stage.highBlocks) {
    if (hasTiles) ctx.drawImage(assets.tiles, 32, 0, 32, 32, b.x, b.y, b.w, b.h);
    else {
      ctx.fillStyle = '#6c2d2d';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }

  if (stage.gate.open && hasTiles) {
    ctx.drawImage(assets.tiles, 64, 0, 32, 32, stage.gate.x, stage.gate.y, stage.gate.w, stage.gate.h);
  } else {
    ctx.fillStyle = stage.gate.open ? '#4caf50' : '#cc4444';
    ctx.fillRect(stage.gate.x, stage.gate.y, stage.gate.w, stage.gate.h);
  }

  ctx.strokeStyle = '#82cfff';
  ctx.strokeRect(stage.exit.x, stage.exit.y, stage.exit.w, stage.exit.h);

  if (stage.enemy.alive) {
    const hasEnemy = assets.enemy.complete && assets.enemy.naturalWidth > 0;
    if (hasEnemy) {
      ctx.save();
      if (stage.enemy.invuln > 0) ctx.globalAlpha = 0.65;
      ctx.drawImage(assets.enemy, stage.enemy.x - 16, stage.enemy.y - 18, 32, 32);
      ctx.restore();
    } else {
      ctx.fillStyle = stage.enemy.invuln > 0 ? '#ffb3b3' : '#ff6666';
      ctx.beginPath();
      ctx.arc(stage.enemy.x, stage.enemy.y, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (state.comboReady && performance.now() <= state.comboWindowUntil) {
    ctx.strokeStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(stage.enemy.x, stage.enemy.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (state.enemyAttackResolveAt > 0) {
    ctx.strokeStyle = '#9ef0ff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 16, 0, Math.PI * 2);
    ctx.stroke();
  }

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 6, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const hasPlayer = assets.player.complete && assets.player.naturalWidth > 0;
  if (hasPlayer) {
    ctx.save();
    if (player.invuln > 0) ctx.globalAlpha = 0.65;
    ctx.drawImage(assets.player, player.x - 16, player.y - player.z - 18, 32, 32);
    ctx.restore();
  } else {
    // player body elevated by z
    ctx.fillStyle = player.invuln > 0 ? '#b9d6ff' : '#7aa2ff';
    ctx.beginPath();
    ctx.arc(player.x, player.y - player.z, player.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (player.z > 0) {
    ctx.strokeStyle = '#c2f0ff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#ddd';
  ctx.fillText(`HP:${player.hp}`, 12, 18);
  ctx.fillText(`Enemy:${stage.enemy.alive ? stage.enemy.hp : 0}`, 12, 34);
}

function renderText() {
  if (gameClear) {
    statusEl.textContent = '全ステージクリア！ Rで再挑戦できます。';
  } else if (player.hp <= 0) {
    statusEl.textContent = 'ゲームオーバー。Rキーでリトライ。';
  } else {
    statusEl.textContent = '目標: 敵を倒してから出口へ。Jで攻撃、Kでタイミングガード。';
  }
  if (state.commandText && performance.now() <= state.commandTextUntil) {
    statusEl.textContent += ` / ${state.commandText}`;
  }

  const queued = state.actionQueuedAt ? '（次アクション遅延中）' : '';
  const rep = state.repeatQueued ? '（次アクション2連続）' : '';
  pieceEl.textContent = `現在のアクションピース: ${state.actionPiece} ${queued}${rep}`;
  resultEl.textContent = scoreText();
  stageEl.textContent = `現在ステージ: ${stageDefs[stage.idx].name}`;

  if (!state.showHint) {
    ghostEl.textContent = '';
    return;
  }

  if (stage.enemy.alive && Math.hypot(player.x - stage.enemy.x, player.y - stage.enemy.y) < 80) {
    ghostEl.textContent = '幽霊: マリオRPGみたいに、当たる瞬間にJやKを押すと有利になるよ。';
  } else if (!stage.gate.open && player.x > 460) {
    ghostEl.textContent = '幽霊: ゲートは時間で開く。くり返すでタイミングを合わせる手もあるよ。';
  } else {
    ghostEl.textContent = '幽霊: 観察して、仮説を立てて、札を組み替えてみよう。';
  }
}

function loop() {
  if (!gameClear && player.hp > 0) {
    updateMovement();
    updateJump();
    updateCombat();
    updateQueuedAction();
    updateGate();
    updateGoal();
  }
  draw();
  renderText();
  requestAnimationFrame(loop);
}

loop();
