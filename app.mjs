import {createGame, queueDirection, step, revive} from './core.mjs';
import {chooseFood, drawFood} from './foods.mjs';

const $ = id => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const avatar = new Image();
avatar.src = './assets/face.png';
avatar.onload = draw;
let game = createGame(14);
let foodStyle = chooseFood();
let best = 0;
try { best = Math.max(0, Number(localStorage.getItem('little-pig-best')) || 0); } catch {}
let lastTick = 0;
let boardWidth = 0;
let toastTimer;
let speechUntil = 0;
const tickMs = 240;

function say(text) {
  $('chatter').textContent = text;
  speechUntil = performance.now() + 3000;
}

function rememberScore() {
  if (game.score <= best) return;
  best = game.score;
  try { localStorage.setItem('little-pig-best', String(best)); } catch {}
}

function update() {
  $('score').textContent = game.score;
  $('best').textContent = best;
  $('lives').innerHTML = `${game.remainingRevives} <small>次</small>`;
  $('lives').setAttribute('aria-label', `剩余${game.remainingRevives}次复活`);
  const active = game.status === 'running';
  $('pause').disabled = !active && game.status !== 'paused';
  $('pause').textContent = game.status === 'paused' ? '▷' : 'Ⅱ';
  $('pause').setAttribute('aria-label', game.status === 'paused' ? '继续游戏' : '暂停游戏');
  $('overlay').hidden = active;
  if (active) {
    $('hint').textContent = `前方美食：${foodStyle.name} · 滑动或点方向键`;
  } else {
    const messages = {
      ready: ['开吃啦！', '吃到美食加 10 分<br>每局有 3 次复活机会', '开始游戏'],
      paused: ['休息一下', '准备好后，再继续吃苹果', '继续游戏'],
      crashed: ['撞到啦！', `已得 ${game.score} 分<br>还可复活 ${game.remainingRevives} 次，分数保留`, '复活继续'],
      over: ['本局结束', `本局 ${game.score} 分 · 本机最高 ${best} 分<br>下一局重新获得 3 次复活`, '再来一局'],
      won: ['吃满啦！', `太厉害了！本局 ${game.score} 分`, '再来一局']
    };
    const [title, text, action] = messages[game.status] || messages.ready;
    $('message-title').textContent = title;
    $('message-text').innerHTML = text;
    $('primary').textContent = action;
    $('hint').textContent = game.status === 'crashed' ? '复活后蛇身恢复初始长度，分数保留' : '滑动棋盘，或点按方向键';
  }
  draw();
}

function begin() {
  const previousStatus = game.status;
  if (game.status === 'crashed') {
    revive(game);
    foodStyle = chooseFood(foodStyle);
    say('小猪满血回归，这顿还没吃够！');
  }
  else if (game.status === 'over' || game.status === 'won') {
    game = createGame(14);
    foodStyle = chooseFood(foodStyle);
    say('小猪已就位，先吃一口再说～');
    game.status = 'running';
  } else game.status = 'running';
  if (previousStatus === 'ready') say('小猪开饭啦，先吃一口～');
  if (previousStatus === 'paused') say('小猪歇够啦，接着吃！');
  lastTick = performance.now() + 450;
  update();
}

function newRound() {
  game = createGame(14);
  foodStyle = chooseFood(foodStyle);
  say('小猪已就位，先吃一口再说～');
  lastTick = performance.now();
  update();
}

function pause() {
  if (game.status === 'running') { game.status = 'paused'; update(); }
  else if (game.status === 'paused') begin();
}

function turn(direction) {
  if (game.status === 'ready') begin();
  queueDirection(game, direction);
}

function trace(points) {
  const p = new Path2D();
  p.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i], next = points[i + 1];
    p.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  if (points.length > 1) p.lineTo(points.at(-1).x, points.at(-1).y);
  return p;
}

function draw() {
  if (!game || !boardWidth) return;
  const width = boardWidth, cell = width / game.size;
  ctx.clearRect(0, 0, width, width);
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, width, width);
  ctx.strokeStyle = '#e9dcc7'; ctx.lineWidth = .55;
  ctx.beginPath();
  for (let i = 1; i < game.size; i++) {
    const n = i * cell;
    ctx.moveTo(n, 0); ctx.lineTo(n, width);
    ctx.moveTo(0, n); ctx.lineTo(width, n);
  }
  ctx.stroke();
  const points = game.snake.map(p => ({x: (p.x + .5) * cell, y: (p.y + .5) * cell}));
  const path = trace(points);
  const body = cell * .66;
  ctx.save();
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.shadowColor = '#96694033'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
  ctx.lineWidth = body + 5; ctx.strokeStyle = '#e4c8a5'; ctx.stroke(path);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.setLineDash([0, cell * .17]);
  ctx.lineWidth = body + 5; ctx.strokeStyle = '#fffdf9'; ctx.stroke(path);
  ctx.setLineDash([]);
  ctx.lineWidth = body + .7; ctx.strokeStyle = '#dbc8b2'; ctx.stroke(path);
  ctx.lineWidth = body; ctx.strokeStyle = '#fffefb'; ctx.stroke(path);
  ctx.lineWidth = body * .32; ctx.strokeStyle = '#f4eee4'; ctx.stroke(path);
  ctx.lineWidth = body * .09; ctx.strokeStyle = '#fffdf8'; ctx.stroke(path);
  // Soft folds stay within each connected segment as the dress grows.
  for (let i = 1; i < points.length; i++) {
    const point = points[i], prev = points[i - 1];
    ctx.save(); ctx.translate(point.x, point.y);
    ctx.rotate(Math.atan2(prev.y - point.y, prev.x - point.x));
    ctx.beginPath(); ctx.moveTo(-cell * .16, -body * .32);
    ctx.quadraticCurveTo(cell * .11, 0, cell * .2, body * .32);
    ctx.strokeStyle = '#ded0bd99'; ctx.lineWidth = .75; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  if (game.food) {
    const x = (game.food.x + .5) * cell, y = (game.food.y + .5) * cell;
    drawFood(ctx, foodStyle, x, y, cell);
  }

  const head = points[0];
  ctx.save(); ctx.translate(head.x, head.y);
  // A small collar and caramel bow keep the photo head tied to the white dress.
  ctx.fillStyle = '#fffef9'; ctx.strokeStyle = '#d6b998'; ctx.lineWidth = .7;
  for (const sign of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sign * cell * .2, cell * .64, cell * .22, cell * .14, sign * -.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#c9a178';
  for (const sign of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sign * cell * .15, cell * .87, cell * .17, cell * .085, sign * .4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(0, cell * .87, cell * .06, 0, Math.PI * 2); ctx.fill();
  if (avatar.complete && avatar.naturalWidth) {
    const size = cell * 1.98;
    ctx.shadowColor = '#73502a30'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
    ctx.drawImage(avatar, -size / 2, -size / 2 - cell * .2, size, size);
  } else {
    ctx.beginPath(); ctx.arc(0, -cell * .15, cell * .54, 0, Math.PI * 2); ctx.fillStyle = '#e0b286'; ctx.fill();
  }
  ctx.restore();
  const speech = $('chatter');
  speech.hidden = game.status !== 'running' || performance.now() > speechUntil;
  if (!speech.hidden) {
    speech.style.maxWidth = `${Math.min(174, width * .44)}px`;
    const bubbleWidth = speech.offsetWidth, bubbleHeight = speech.offsetHeight;
    const right = head.x < width * .48;
    const x = right ? head.x + cell * .7 : head.x - cell * .7 - bubbleWidth;
    speech.style.left = `${Math.max(8, Math.min(width - bubbleWidth - 8, x))}px`;
    speech.style.top = `${Math.max(8, Math.min(width - bubbleHeight - 8, head.y - bubbleHeight - cell * .55))}px`;
    speech.dataset.side = right ? 'right' : 'left';
  }
}

new ResizeObserver(() => {
  boardWidth = canvas.getBoundingClientRect().width;
  const dpr = Math.min(devicePixelRatio || 1, 3);
  canvas.width = Math.round(boardWidth * dpr);
  canvas.height = Math.round(boardWidth * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}).observe(canvas);

function loop(now) {
  if (game.status === 'running' && now - lastTick >= tickMs) {
    lastTick = now;
    const score = game.score;
    step(game);
    if (score !== game.score) {
      say(foodStyle.line);
      foodStyle = chooseFood(foodStyle);
    }
    if (game.status === 'crashed') say('弯没拐过来，小猪的饭还没吃完呢！');
    if (game.status === 'over') say('这顿先吃到这里，下顿小猪还来！');
    rememberScore();
    if (score !== game.score || game.status !== 'running') update();
    else draw();
  }
  if (!$('chatter').hidden && now > speechUntil) $('chatter').hidden = true;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
$('primary').addEventListener('click', begin);
$('pause').addEventListener('click', pause);
$('restart').addEventListener('click', newRound);
for (const button of document.querySelectorAll('[data-direction]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); turn(button.dataset.direction); });
  button.addEventListener('click', event => { if (event.detail === 0) turn(button.dataset.direction); });
}
const keys = {ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right'};
document.addEventListener('keydown', event => {
  if ($('share-dialog').open || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
  if (keys[event.key]) { event.preventDefault(); if (!event.repeat) turn(keys[event.key]); }
  if (event.code === 'Space') {
    if (/BUTTON/.test(event.target.tagName)) return;
    event.preventDefault();
    if (!event.repeat) game.status === 'running' ? pause() : begin();
  }
});
let pointer = null;
canvas.addEventListener('pointerdown', event => {
  if (game.status !== 'running' || !event.isPrimary) return;
  pointer = {x: event.clientX, y: event.clientY, id: event.pointerId};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!pointer || event.pointerId !== pointer.id) return;
  const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
  turn(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
  pointer.x = event.clientX; pointer.y = event.clientY;
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => { pointer = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.status === 'running') pause(); });
window.addEventListener('blur', () => { if (game.status === 'running') pause(); });

function toast(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2400);
}
$('share').addEventListener('click', async () => {
  if (game.status === 'running') pause();
  const url = 'https://wanghao-yu.github.io/tanchi-xiaozhu/';
  try {
    if (navigator.share) await navigator.share({title: '贪吃小猪', text: '来和贪吃小猪一起干饭！每局有3次复活机会。', url});
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); toast('链接已复制，发给朋友就能玩'); }
    else throw new Error('clipboard unavailable');
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('share-url').value = url; $('share-dialog').showModal(); $('share-url').select();
  }
});
$('close-share').addEventListener('click', () => $('share-dialog').close());
update();
