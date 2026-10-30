export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 }),
});

function initialSnake(size) {
  const x = Math.max(3, Math.floor(size / 2));
  const y = Math.floor(size / 2);
  return Array.from({ length: 4 }, (_, index) => ({ x: x - index, y }));
}

export function spawnFood(game, random = Math.random) {
  const occupied = new Set(game.snake.map(({ x, y }) => y * game.size + x));
  const free = [];
  for (let y = 0; y < game.size; y += 1) {
    for (let x = 0; x < game.size; x += 1) {
      if (!occupied.has(y * game.size + x)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  let roll = 0.5;
  try {
    const sample = random();
    if (Number.isFinite(sample)) roll = Math.max(0, Math.min(1, sample));
  } catch {
    // A faulty random source must not prevent a playable game.
  }
  return free[Math.min(free.length - 1, Math.floor(roll * free.length))];
}

export function createGame(size = 14, random = Math.random) {
  if (!Number.isInteger(size) || size < 4) {
    throw new RangeError('Board size must be an integer of at least 4.');
  }
  const game = {
    size,
    snake: initialSnake(size),
    direction: 'right',
    queue: [],
    food: null,
    score: 0,
    remainingRevives: 3,
    status: 'ready',
  };
  game.food = spawnFood(game, random);
  return game;
}

export function queueDirection(game, name) {
  if (game.status !== 'running' || !Object.hasOwn(DIRECTIONS, name) || game.queue.length >= 2) {
    return false;
  }
  const previous = game.queue.at(-1) || game.direction;
  const from = DIRECTIONS[previous];
  const to = DIRECTIONS[name];
  if (previous === name || (from.x + to.x === 0 && from.y + to.y === 0)) return false;
  game.queue.push(name);
  return true;
}

export function step(game, random = Math.random) {
  if (game.status !== 'running') return { type: 'idle' };
  if (game.queue.length) game.direction = game.queue.shift();
  const direction = DIRECTIONS[game.direction];
  const head = { x: game.snake[0].x + direction.x, y: game.snake[0].y + direction.y };
  const eating = game.food !== null && head.x === game.food.x && head.y === game.food.y;
  const outside = head.x < 0 || head.x >= game.size || head.y < 0 || head.y >= game.size;
  // The tail leaves its cell on a normal move, so entering that cell is legal.
  const occupiedLength = game.snake.length - (eating ? 0 : 1);
  const body = game.snake.slice(0, occupiedLength).some(({ x, y }) => x === head.x && y === head.y);
  if (outside || body) {
    game.status = game.remainingRevives > 0 ? 'crashed' : 'over';
    game.queue.length = 0;
    return { type: 'crash', cause: outside ? 'wall' : 'body' };
  }
  game.snake.unshift(head);
  if (!eating) {
    game.snake.pop();
    return { type: 'move' };
  }
  game.score += 10;
  game.food = spawnFood(game, random);
  if (game.food === null) {
    game.status = 'won';
    return { type: 'win' };
  }
  return { type: 'eat' };
}

export function revive(game, random = Math.random) {
  if (game.status !== 'crashed' || game.remainingRevives <= 0) return false;
  game.snake = initialSnake(game.size);
  game.direction = 'right';
  game.queue = [];
  game.food = spawnFood(game, random);
  game.remainingRevives -= 1;
  game.status = 'running';
  return true;
}
