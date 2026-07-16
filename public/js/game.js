// --- Stage definitions ---
const STAGES = [
  { key: 'S1', name: 'Bull in a China Shop', minScore: 0,   bg: 'BG1', dragonObstacle: false, meteor: false, matador: false, shiba: false, oscillate: false },
  { key: 'S2', name: 'Firecracker Frenzy',    minScore: 20,  bg: 'BG2', dragonObstacle: false, meteor: true,  matador: true,  shiba: false, oscillate: false },
  { key: 'S3', name: 'Meteor Chaos',          minScore: 40,  bg: 'BG3', dragonObstacle: false, meteor: true,  matador: true,  shiba: false, oscillate: true  },
  { key: 'S4', name: 'Legendary Chonk',       minScore: 80,  bg: 'BG4', dragonObstacle: true,  meteor: true,  matador: true,  shiba: false, oscillate: true  },
];
function getStage(score) {
  let s = STAGES[0];
  for (const st of STAGES) if (score >= st.minScore) s = st;
  return s;
}

// background crossfade state
let curBgKey = STAGES[0].bg;
let prevBgKey = null;
let bgFadeStart = 0;
const BG_FADE_MS = 700;

function setStage(newStage) {
  if (newStage.bg !== curBgKey) {
    prevBgKey = curBgKey;
    curBgKey = newStage.bg;
    bgFadeStart = performance.now();
  }
}

let bull, pipes, score, gameOver, started, frame;
let extras = [];
let powerups = [];
let pendingMeteors = []; // telegraphed meteor spawns
let powerModeUntil = 0;
let particles = []; // spark / debris / fire fx
let shake = 0;

const BASE_PIPE_SPEED = 2.7;
const SPEED_RAMP_START_SCORE = 15;
const SPEED_RAMP_PER_POINT = 0.035;
const MAX_PIPE_SPEED = 7.2;
let PIPE_SPEED = BASE_PIPE_SPEED;

function updatePipeSpeed() {
  if (score > SPEED_RAMP_START_SCORE) {
    const over = score - SPEED_RAMP_START_SCORE;
    PIPE_SPEED = Math.min(MAX_PIPE_SPEED, BASE_PIPE_SPEED + over * SPEED_RAMP_PER_POINT);
  } else {
    PIPE_SPEED = BASE_PIPE_SPEED;
  }
}

function reset() {
  bull = { x: 80, y: H/2, vy: 0, r: 24, rot: 0, flapAnim: 0, animFrame: 0, animTimer: 0 };
  pipes = [];
  extras = [];
  powerups = [];
  pendingMeteors = [];
  particles = [];
  powerModeUntil = 0;
  shake = 0;
  score = 0;
  PIPE_SPEED = BASE_PIPE_SPEED;
  gameOver = false;
  started = false;
  frame = 0;
  scoreBox.textContent = '0';
  curBgKey = STAGES[0].bg;
  prevBgKey = null;
  msg.style.display = 'flex';
  msg.innerHTML = '<div class="tapicon">\ud83d\udc02</div><div class="big">Tap to Buck</div><div class="small">Don\'t smash the china!</div>';
}

const GRAVITY = 0.46;
const FLAP = -8.1;
const PIPE_GAP_BASE = 148;
const PIPE_GAP_MIN = 105;
function getPipeGap(score) {
  const reduction = Math.min(PIPE_GAP_BASE - PIPE_GAP_MIN, score * 0.6);
  return PIPE_GAP_BASE - reduction;
}
const PIPE_W = 58;
const PIPE_INTERVAL = 92;

function isPoweredUp() { return frame < powerModeUntil; }

function flap() {
  if (gameOver) { reset(); return; }
  if (!started) {
    started = true;
    msg.style.display = 'none';
  }
  bull.vy = FLAP;
  bull.flapAnim = 8;
  bull.animFrame = 1;
  bull.animTimer = 0;
  sfxFlap();
}

window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); flap(); } });
canvas.addEventListener('mousedown', flap);
canvas.addEventListener('touchstart', e => { e.preventDefault(); flap(); }, {passive:false});

const SHELF_VARIANTS = [
  { body: 'ROCK_BODY_1', cap: null },
  { body: 'ROCK_BODY_2', cap: null },
];
const LANTERN_VARIANTS = [
  { body: 'LANTERN_BODY_1', cap: 'LANTERN_BODY_1' }, // no dedicated cap yet, reuse body
];

function spawnPipe() {
  const margin = 55;
  const gap = getPipeGap(score);
  const centerY = margin + Math.random() * (GROUND_Y*0.9 - margin*2 - gap) + gap/2;
  const sv = SHELF_VARIANTS[Math.floor(Math.random()*SHELF_VARIANTS.length)];
  const lv = LANTERN_VARIANTS[Math.floor(Math.random()*LANTERN_VARIANTS.length)];
  const stage = getStage(score);
  const oscFactor = Math.max(0, Math.min(1, (score - 40) / 40)); // 0 at score40, 1 at score80+
  const oscChance = 0.15 + oscFactor * 0.55;
  const oscillate = stage.oscillate && Math.random() < oscChance;
  pipes.push({
    x: W + 20, centerY, baseCenterY: centerY, passed: false, gap,
    shelfBody: sv.body, shelfCap: sv.cap, lanternBody: lv.body, lanternCap: lv.cap,
    oscillate, oscAmp: 30 + Math.random()*30, oscSpeed: 0.02 + Math.random()*0.02, oscPhase: Math.random()*Math.PI*2
  });

  if (Math.random() < 0.22) {
    powerups.push({ x: W + 20 + PIPE_W/2, y: centerY, r: 15, taken: false });
  }
}

function spawnExtra(stage) {
  // progressive difficulty: stays gentle right after unlocking, ramps up to full intensity by score 80 ("chaos total")
  const diffFactor = Math.max(0, Math.min(1, (score - 20) / 60)); // 0 at score20, 1 at score80+
  if (stage.meteor && Math.random() < (0.15 + diffFactor * 0.45)) {
    // meteors streak in diagonally from the right side of the screen
    const mx = W * 0.55 + Math.random() * (W * 0.4);
    // telegraph: drop a powerup first so the player has warning + a chance to survive
    powerups.push({ x: mx, y: -30, r: 15, taken: false, telegraph: true });
    pendingMeteors.push({ frame: frame + 46, x: mx });
  }
  if (stage.matador && Math.random() < (0.2 + diffFactor * 0.5)) {
    extras.push({ type: 'matador', x: 50 + Math.random()*(W-100), y: -90, vy: 3.3, vx: 0, r: 34, wob: Math.random()*10 });
    sfxOleCrowd();
  }
  if (stage.shiba && Math.random() < 0.5) {
    const fromLeft = Math.random() < 0.5;
    extras.push({ type: 'shiba', x: fromLeft ? -50 : W+50, y: 90 + Math.random()*220, vy: 0, vx: fromLeft ? 3.4 : -3.4, r: 26 });
  }
}

function spawnParticles(x, y, color, n, opts) {
  opts = opts || {};
  for (let i=0;i<n;i++) {
    particles.push({
      x, y,
      vx: (Math.random()-0.5)*(opts.spread || 6),
      vy: (Math.random()-0.5)*(opts.spread || 6) - (opts.up || 2),
      life: (opts.life || 30) + Math.random()*(opts.lifeVar || 20),
      maxLife: (opts.life || 30) + (opts.lifeVar || 20),
      color,
      size: opts.size || 3,
      grav: opts.grav !== undefined ? opts.grav : 0.15
    });
  }
}

function spawnFireAura() {
  const ang = Math.random()*Math.PI*2;
  const dist = bull.r * (0.9 + Math.random()*0.5);
  const colors = ['#ffdd55','#ff9d2e','#ff6a2e'];
  particles.push({
    x: bull.x + Math.cos(ang)*dist,
    y: bull.y + Math.sin(ang)*dist,
    vx: Math.cos(ang)*0.8,
    vy: Math.sin(ang)*0.8 - 1.2,
    life: 16 + Math.random()*10, maxLife: 26,
    color: colors[Math.floor(Math.random()*colors.length)],
    size: 3 + Math.random()*3, grav: -0.02
  });
}

function spawnMeteorTrail(e) {
  // build a wide tapering tail starting right at the meteor's trailing edge (not its center)
  const speed = Math.hypot(e.vx, e.vy) || 1;
  const bx = -e.vx / speed, by = -e.vy / speed; // unit vector pointing backward (behind the meteor)
  const perpX = by, perpY = -bx; // perpendicular vector, for tail width/wobble
  const edge = e.r * 1.8; // approx radius of the drawn meteor sprite (w = e.r*3.6 -> half = e.r*1.8)
  const count = 9;
  for (let i = 0; i < count; i++) {
    const t = i / count; // 0 = right at the meteor's trailing edge, ~1 = far end of the tail
    const dist = edge + e.r * t * 3.5;
    const jitter = (Math.random()-0.5) * e.r * (0.5 + t*1.3);
    particles.push({
      x: e.x + bx*dist + perpX*jitter,
      y: e.y + by*dist + perpY*jitter,
      vx: bx*(0.7 - t*0.35) + (Math.random()-0.5)*0.3,
      vy: by*(0.7 - t*0.35) + (Math.random()-0.5)*0.3,
      life: (24 - t*12) + Math.random()*6, maxLife: 28,
      color: t < 0.3 ? '#fff3b0' : (t < 0.65 ? '#ff9d2e' : '#ff5a1f'),
      size: (6.5 - t*4) + Math.random()*1.6, grav: 0
    });
  }
}

// Custom per-frame widths (as fractions of total sheet width) since frames are NOT equal width.
const CHONK_FRAME_FRACTIONS = [
  507/2560, 431/2560, 437/2560, 686/2560, 499/2560
];
const CHONK_ANIM_FRAMES = CHONK_FRAME_FRACTIONS.length;
const CHONK_ANIM_SPEED = 6; // game-frames per sprite-frame

function drawBull() {
  const powered = isPoweredUp();

  // advance sprite animation (normal state only; power-up pose is static)
  if (!powered) {
    bull.animTimer++;
    if (bull.animTimer >= CHONK_ANIM_SPEED) {
      bull.animTimer = 0;
      bull.animFrame = (bull.animFrame + 1) % CHONK_ANIM_FRAMES;
    }
  }

  ctx.save();
  ctx.translate(bull.x, bull.y);
  const tilt = Math.max(-0.5, Math.min(0.9, bull.vy * 0.06));
  const flapBoost = bull.flapAnim > 0 ? -0.15 * (bull.flapAnim/8) : 0;
  ctx.rotate(tilt + flapBoost);
  const sprite = powered ? IMG.CHONK_POWER : IMG.CHONK;
  const bobble = 1 + Math.sin(frame*0.15)*0.03;
  const w = bull.r * 3.6 * bobble;

  if (powered) {
    // static single-frame pose (superman-style flying)
    const frameW = sprite.naturalWidth;
    const frameH = sprite.naturalHeight;
    const h = w * (frameH / frameW || 0.6);
    ctx.shadowColor = '#ff2a2a';
    ctx.shadowBlur = 26;
    ctx.drawImage(sprite, 0, 0, frameW, frameH, -w/2, -h/2, w, h);
  } else {
    // variable-width animation sheet: compute this frame's slice from fractions
    const totalW = sprite.naturalWidth;
    const frameH = sprite.naturalHeight;
    let sx = 0;
    for (let i = 0; i < bull.animFrame; i++) sx += CHONK_FRAME_FRACTIONS[i] * totalW;
    const frameW = CHONK_FRAME_FRACTIONS[bull.animFrame] * totalW;
    const h = w * (frameH / frameW || 0.6);
    ctx.drawImage(sprite, sx, 0, frameW, frameH, -w/2, -h/2, w, h);
  }
  ctx.restore();
  if (bull.flapAnim > 0) bull.flapAnim--;
}

// Modular obstacle renderer: draws a fixed-size "cap" at the anchored end (floor or ceiling)
// then repeats a seamless "body" tile to fill the remaining height.
function drawModularVertical(bodyImg, capImg, x, w, top, height, anchorBottom) {
  if (height <= 0 || !bodyImg.naturalWidth) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, top, w, height);
  ctx.clip();

  let capH = 0;
  if (capImg && capImg.naturalWidth) {
    capH = Math.min(height, w * (capImg.naturalHeight / capImg.naturalWidth));
  }

  const bodyUnitH = w * (bodyImg.naturalHeight / bodyImg.naturalWidth);
  const remaining = height - capH;
  if (bodyUnitH > 0 && remaining > 0) {
    const count = Math.ceil(remaining / bodyUnitH) + 1;
    for (let i = 0; i < count; i++) {
      const y = anchorBottom
        ? (top + height) - bodyUnitH * (i + 1)
        : top + capH + bodyUnitH * i;
      ctx.drawImage(bodyImg, x, y, w, bodyUnitH);
    }
  }

  if (capImg && capImg.naturalWidth && capH > 0) {
    const capY = anchorBottom ? top : (top + height) - capH;
    ctx.drawImage(capImg, x, capY, w, capH);
  }
  ctx.restore();
}

function drawShelf(p, stage) {
  const bottomH = GROUND_Y - (p.centerY + p.gap/2);
  if (bottomH > 0) {
    if (stage.dragonObstacle) {
      drawModularVertical(IMG.DRAGON_SHELF, IMG.DRAGON_SHELF, p.x, PIPE_W, GROUND_Y - bottomH, bottomH, true);
    } else {
      drawModularVertical(IMG[p.shelfBody], p.shelfCap ? IMG[p.shelfCap] : null, p.x, PIPE_W, GROUND_Y - bottomH, bottomH, true);
    }
  }
  const topH = p.centerY - p.gap/2;
  if (topH > 0) {
    drawModularVertical(IMG[p.lanternBody], IMG[p.lanternCap], p.x, PIPE_W, 0, topH, false);
  }
}

function drawGround() {
  ctx.fillStyle = '#c9a876';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, GROUND_Y, W, 6);
  ctx.strokeStyle = '#a8895f';
  ctx.lineWidth = 2;
  for (let x = -((frame*PIPE_SPEED)%40); x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x+20, H);
    ctx.stroke();
  }
}

function drawExtras() {
  for (const e of extras) {
    if (e.type === 'meteor') {
      let w = e.r * 3.6;
      let h = w * (IMG.METEOR.naturalHeight / IMG.METEOR.naturalWidth || 1);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(frame * 0.09 + e.r); // tumbling rotation as it falls
      ctx.shadowColor = '#ff6a00';
      ctx.shadowBlur = 22;
      ctx.drawImage(IMG.METEOR, -w/2, -h/2, w, h);
      ctx.restore();
    } else if (e.type === 'matador') {
      const wobble = Math.sin(frame*0.25 + e.wob) * 0.12;
      const w = e.r * 3.2;
      const h = w * (IMG.MATADOR.naturalHeight / IMG.MATADOR.naturalWidth || 1) * 0.9;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(wobble);
      ctx.transform(1, 0, Math.sin(frame*0.3+e.wob)*0.14, 1, 0, 0); // cape/limb flutter shear
      ctx.drawImage(IMG.MATADOR, -w/2, -h/2, w, h);
      ctx.restore();
      if (frame % 4 === 0) {
        spawnParticles(e.x - w*0.25, e.y - h*0.1, '#c62828', 1, {spread:2, up:0.5, life:14, lifeVar:6, size:3, grav:0.05});
      }
    } else if (e.type === 'shiba') {
      const w = e.r * 2.6;
      const h = w * (IMG.SHIBA.naturalHeight / IMG.SHIBA.naturalWidth || 1);
      const bob = Math.sin(frame*0.2)*4;
      ctx.save();
      ctx.translate(e.x, e.y + bob);
      ctx.drawImage(IMG.SHIBA, -w/2, -h/2, w, h);
      ctx.restore();
    }
  }
}

function drawPowerups() {
  for (const pu of powerups) {
    if (pu.taken) continue;
    const bob = Math.sin(frame*0.12 + pu.x) * 5;
    const pulse = 1 + Math.sin(frame*0.2)*0.08;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 12;
    const s = pu.r*2*pulse;
    ctx.drawImage(IMG.POWERUP_ICON, pu.x - s/2, pu.y - s/2 + bob, s, s);
    ctx.restore();
  }
}

function drawParticles() {
  for (const pt of particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size || 3, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax-bx, dy = ay-by;
  return Math.sqrt(dx*dx+dy*dy) < (ar+br);
}

function update() {
  frame++;
  if (started && !gameOver) {
    const stage = getStage(score);
    setStage(stage);

    bull.vy += GRAVITY;
    bull.y += bull.vy;

    if (frame % PIPE_INTERVAL === 0) spawnPipe();
    if (frame % 60 === 0) spawnExtra(stage);

    if (isPoweredUp() && frame % 2 === 0) spawnFireAura();

    for (let i = pendingMeteors.length - 1; i >= 0; i--) {
      if (frame >= pendingMeteors[i].frame) {
        extras.push({ type: 'meteor', x: pendingMeteors[i].x, y: -70, vy: 5.0, vx: -2.2, r: 30 });
        sfxMeteor();
        pendingMeteors.splice(i, 1);
      }
    }

    for (const p of pipes) {
      p.x -= PIPE_SPEED;
      if (p.oscillate) {
        p.centerY = p.baseCenterY + Math.sin(frame * p.oscSpeed + p.oscPhase) * p.oscAmp;
        const margin = 55;
        const minC = margin + p.gap/2;
        const maxC = GROUND_Y*0.9 - margin - p.gap/2;
        p.centerY = Math.max(minC, Math.min(maxC, p.centerY));
      }
      if (!p.passed && p.x + PIPE_W < bull.x) {
        p.passed = true;
        score++;
        scoreBox.textContent = score;
        updatePipeSpeed();
      }
      const withinX = bull.x + bull.r*0.7 > p.x && bull.x - bull.r*0.7 < p.x + PIPE_W;
      if (withinX && !isPoweredUp()) {
        const topEdge = p.centerY - p.gap/2;
        const botEdge = p.centerY + p.gap/2;
        if (bull.y - bull.r*0.6 < topEdge || bull.y + bull.r*0.6 > botEdge) {
          die();
        }
      }
    }
    pipes = pipes.filter(p => p.x > -PIPE_W - 10);

    for (const pu of powerups) {
      if (!pu.telegraph) pu.x -= PIPE_SPEED;
      else pu.y += 2.1; // telegraphed powerups fall straight down ahead of the meteor
      if (!pu.taken && circleHit(bull.x, bull.y, bull.r*0.7, pu.x, pu.y, pu.r)) {
        pu.taken = true;
        powerModeUntil = frame + 300;
        sfxPowerup();
        setBgmMode('power');
        spawnParticles(pu.x, pu.y, '#ffe066', 14);
      }
    }
    powerups = powerups.filter(pu => pu.x > -40 && pu.y < H + 40 && !pu.taken);

    for (const e of extras) {
      e.x += e.vx;
      e.y += e.vy;
      if (e.type === 'meteor') spawnMeteorTrail(e);
      const isDangerous = e.type !== 'shiba';
      if (isDangerous && !isPoweredUp() && circleHit(bull.x, bull.y, bull.r*0.6, e.x, e.y, e.r*0.65)) {
        die();
      }
    }
    extras = extras.filter(e => e.y < H + 80 && e.x > -80 && e.x < W + 80);

    for (const pt of particles) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += pt.grav !== undefined ? pt.grav : 0.15;
      pt.life--;
    }
    particles = particles.filter(pt => pt.life > 0);

    if (isPoweredUp()) {
      powerBar.style.display = 'block';
      const remain = (powerModeUntil - frame) / 300;
      powerFill.style.width = Math.max(0, remain*100) + '%';
    } else {
      powerBar.style.display = 'none';
      if (bgmMode === 'power') setBgmMode('normal');
    }

    if (bull.y + bull.r > GROUND_Y || bull.y - bull.r < 0) {
      die();
    }
  }
  if (shake > 0) shake *= 0.85;
}

function die() {
  if (gameOver) return;
  gameOver = true;
  shake = 10;
  sfxCrash();
  setBgmMode('normal');
  spawnParticles(bull.x, bull.y, '#ffffff', 20);
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(BEST_KEY, String(bestScore));
    bestBox.textContent = 'BEST ' + bestScore;
  }
  if (currentUsername && score > 0) {
    submitScore(currentUsername, score);
  }
  msg.style.display = 'flex';
  msg.classList.add('gameover');
  msg.innerHTML = '<div class="tapicon">\ud83d\udca5</div><div class="big">Crashed! You smashed the china</div><div class="small">Score ' + score + ' &mdash; Tap to try again</div><button id="backHomeBtn" class="wsBtn secondary" style="font-size:12px; padding:8px 20px;">\u27f5 Back to Home</button>';
  const backBtn = document.getElementById('backHomeBtn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goHome();
    });
  }
}

function goHome() {
  gameOver = false;
  started = false;
  msg.classList.remove('gameover');
  msg.style.display = 'none';
  walletScreen.style.display = 'flex';
  walletScreen.classList.add('animateIn');
  fetchLeaderboard();
  fetchStreak();
}

function draw() {
  ctx.save();
  if (shake > 0.3) {
    ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake);
  }
  ctx.clearRect(-20, -20, W+40, H+40);

  if (allLoaded()) {
    const now = performance.now();
    const elapsed = now - bgFadeStart;
    if (prevBgKey && elapsed < BG_FADE_MS) {
      ctx.drawImage(IMG[prevBgKey], 0, 0, W, H);
      ctx.globalAlpha = Math.min(1, elapsed / BG_FADE_MS);
      ctx.drawImage(IMG[curBgKey], 0, 0, W, H);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(IMG[curBgKey], 0, 0, W, H);
    }
  } else {
    ctx.fillStyle = '#e0c097';
    ctx.fillRect(0, 0, W, H);
  }

  const stage = getStage(score);
  for (const p of pipes) drawShelf(p, stage);
  drawExtras();
  drawPowerups();
  drawParticles();
  drawGround();
  drawBull();
  ctx.restore();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

if (runningInTelegram) {
  fetchLeaderboard();
  fetchStreak();

  startBtn.addEventListener('click', () => {
    walletScreen.style.display = 'none';
    initAudio();
    playBgm();
  });

  reset();
  loop();
}
