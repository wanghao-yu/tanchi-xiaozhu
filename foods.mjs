export const FOODS = [
  { id: 'apple', name: '苹果', emoji: '🍎', line: '咔嚓！这一口，小猪先吃为敬！' },
  { id: 'banana', name: '香蕉', emoji: '🍌', line: '香蕉弯弯，小猪肚子圆圆！' },
  { id: 'milk-tea', name: '奶茶', emoji: '🧋', line: '奶茶续命！珍珠一颗都不许跑！' },
  { id: 'hotpot', name: '火锅', emoji: '🍲', line: '咕嘟咕嘟，给小猪留个靠锅的位置！' },
  { id: 'barbecue', name: '烧烤', emoji: '🍢', line: '烤串拿稳，小猪要开始炫啦！' },
  { id: 'mango-pomelo', name: '杨枝甘露', emoji: '🥤', line: '杨枝甘露下肚，小猪甜得迷路！' },
  { id: 'mango', name: '芒果', emoji: '🥭', line: '芒果负责甜，小猪负责吃！' },
];

export function chooseFood(current = null, random = Math.random) {
  const candidates = current ? FOODS.filter(food => food.id !== current.id) : FOODS;
  const roll = Math.max(0, Math.min(1, random()));
  return candidates[Math.min(candidates.length - 1, Math.floor(roll * candidates.length))];
}

export function drawFood(ctx, food, x, y, cell) {
  ctx.save();
  ctx.translate(x, y);
  if (food.id !== 'mango-pomelo') {
    ctx.font = `${cell * .9}px 'Segoe UI Emoji','Apple Color Emoji',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(food.emoji, 0, cell * .035);
    ctx.restore();
    return;
  }

  ctx.scale(cell, cell);
  // A clear takeaway cup with a pale mango drink, fruit pieces and sago.
  ctx.beginPath();
  ctx.moveTo(-.31, -.25);
  ctx.lineTo(.31, -.25);
  ctx.lineTo(.23, .35);
  ctx.quadraticCurveTo(0, .41, -.23, .35);
  ctx.closePath();
  ctx.fillStyle = '#ffffffb8';
  ctx.fill();
  ctx.strokeStyle = '#bd965c';
  ctx.lineWidth = .025;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-.278, -.16);
  ctx.lineTo(.278, -.16);
  ctx.lineTo(.208, .315);
  ctx.quadraticCurveTo(0, .365, -.208, .315);
  ctx.closePath();
  ctx.fillStyle = '#ffe6a0';
  ctx.fill();

  ctx.strokeStyle = '#d88d70';
  ctx.lineWidth = .052;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(.09, -.04);
  ctx.lineTo(.045, -.41);
  ctx.lineTo(.18, -.47);
  ctx.stroke();

  ctx.fillStyle = '#ffb52e';
  for (const [cx, cy, angle] of [[-.13, -.07, -.15], [.12, .08, .2], [-.1, .22, .12]]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillRect(-.065, -.055, .13, .11);
    ctx.restore();
  }

  for (const [cx, cy, radius] of [[-.02, .1, .027], [.16, .24, .024], [-.18, .07, .022], [.02, .28, .025]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ec8b86';
    ctx.fill();
  }
  for (const [cx, cy] of [[-.16, .3], [.05, .19], [.18, -.04], [-.04, -.1], [-.19, .14]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, .017, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf2';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.ellipse(0, -.25, .335, .065, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fff6dfb8';
  ctx.fill();
  ctx.strokeStyle = '#bd965c';
  ctx.lineWidth = .023;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-.235, -.12);
  ctx.lineTo(-.19, .25);
  ctx.strokeStyle = '#ffffffb3';
  ctx.lineWidth = .035;
  ctx.stroke();
  ctx.restore();
}
