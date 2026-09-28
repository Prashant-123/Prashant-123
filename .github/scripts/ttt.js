// Tic-tac-toe played through issues. Human = X, bot = O.
// Usage: node ttt.js "<issue title>" "<login>"  -> prints reply comment, rewrites game.json + README.md
const fs = require('fs');

const REPO = process.env.GITHUB_REPOSITORY || 'Prashant-123/Prashant-123';
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const NAMES = ['A1','B1','C1','A2','B2','C2','A3','B3','C3'];
const BOT_MISTAKE_RATE = 0.25; // ponytail: keeps the bot beatable; set 0 for perfect play

const fresh = (stats = { human: 0, bot: 0, draw: 0, wins: {} }, log = []) =>
  ({ board: Array(9).fill(''), over: false, winner: null, line: null, stats, log });

function winner(b) {
  for (const l of LINES) if (b[l[0]] && l.every(i => b[i] === b[l[0]])) return { who: b[l[0]], line: l };
  return b.every(Boolean) ? { who: 'draw', line: null } : null;
}

function minimax(b, turn) {
  const w = winner(b);
  if (w) return { score: w.who === 'O' ? 1 : w.who === 'X' ? -1 : 0 };
  let best = { score: turn === 'O' ? -2 : 2, move: -1 };
  b.forEach((v, i) => {
    if (v) return;
    b[i] = turn;
    const { score } = minimax(b, turn === 'O' ? 'X' : 'O');
    b[i] = '';
    if (turn === 'O' ? score > best.score : score < best.score) best = { score, move: i };
  });
  return best;
}

function botMove(b, rand = Math.random) {
  const free = b.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
  if (rand() < BOT_MISTAKE_RATE) return free[Math.floor(rand() * free.length)];
  return minimax(b, 'O').move;
}

function finish(g, w) {
  g.over = true; g.winner = w.who; g.line = w.line;
  if (w.who === 'X') g.stats.human++; else if (w.who === 'O') g.stats.bot++; else g.stats.draw++;
}

// Returns reply text; mutates g.
function play(g, title, user, rand) {
  const [, cmd, arg] = title.trim().split('|');
  if (cmd === 'new') { Object.assign(g, fresh(g.stats, g.log)); return `🔄 Fresh board, @${user}. Your move!`; }
  const cell = Number(arg);
  if (cmd !== 'move' || !Number.isInteger(cell) || cell < 0 || cell > 8) return `🤔 Couldn't read that move, @${user}.`;
  if (g.over) Object.assign(g, fresh(g.stats, g.log));
  if (g.board[cell]) return `🚫 ${NAMES[cell]} is taken, @${user}. Pick an empty square.`;

  g.board[cell] = 'X';
  g.log.unshift({ user, move: NAMES[cell] });
  g.log = g.log.slice(0, 5);
  let w = winner(g.board);
  if (w) {
    finish(g, w);
    if (w.who === 'X') { g.stats.wins[user] = (g.stats.wins[user] || 0) + 1; return `🏆 @${user} beat the bot with ${NAMES[cell]}! You're on the leaderboard.`; }
    return `🤝 Draw, @${user}. Respect.`;
  }
  const b = botMove(g.board, rand);
  g.board[b] = 'O';
  w = winner(g.board);
  if (w) { finish(g, w); return w.who === 'O' ? `🤖 You played ${NAMES[cell]}, bot answered ${NAMES[b]} and won. Rematch?` : `🤝 Draw after ${NAMES[b]}. Respect.`; }
  return `✅ You played ${NAMES[cell]}. 🤖 Bot answered ${NAMES[b]}. Your move!`;
}

const issueLink = (title, label) =>
  `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(`Just hit **Create** 👇 — the bot replies in ~30s and updates the profile.\n\n_${label}_`)}`;

function render(g) {
  const tile = i => {
    const v = g.board[i].toLowerCase();
    const win = g.line && g.line.includes(i) ? 'w' : '';
    const img = `<img src="assets/ttt/${v ? v + win : 'empty'}.svg" width="72" alt="${NAMES[i]}">`;
    return !v && !g.over ? `<a href="${issueLink(`ttt|move|${i}`, `Play ${NAMES[i]}`)}">${img}</a>` : img;
  };
  const rows = [0, 3, 6].map(r => `<tr>${[0, 1, 2].map(c => `<td>${tile(r + c)}</td>`).join('')}</tr>`).join('\n');
  const status = !g.over ? '🟢 **Your turn** — you are <kbd>X</kbd>, click any empty square'
    : g.winner === 'X' ? '🏆 **Human wins!** Click a square to start a new game'
    : g.winner === 'O' ? '🤖 **Bot wins.** Click a square for a rematch'
    : '🤝 **Draw.** Click a square to go again';
  const board = g.over ? g.board.map(() => '') : null; // after game over, show clickable fresh board below
  const leaders = Object.entries(g.stats.wins).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([u, n], i) => `${['🥇', '🥈', '🥉', '4.', '5.'][i]} [@${u}](https://github.com/${u}) · ${n}`).join(' &nbsp; ') || '_nobody yet — be the first_';
  const moves = g.log.map(m => `[@${m.user}](https://github.com/${m.user}) → ${m.move}`).join(' · ') || '_no moves yet_';

  let restart = '';
  if (board) {
    const cells = [0, 3, 6].map(r => `<tr>${[0, 1, 2].map(c => `<td><a href="${issueLink(`ttt|move|${r + c}`, `Play ${NAMES[r + c]}`)}"><img src="assets/ttt/empty.svg" width="40" alt="${NAMES[r + c]}"></a></td>`).join('')}</tr>`).join('\n');
    restart = `\n<sub>▼ new game — pick your opening</sub>\n<table>\n${cells}\n</table>\n`;
  }
  return `<!--TTT:START-->
<div align="center">

<table>
${rows}
</table>

${status}
${restart}
| 👤 Humans | 🤖 Bot | 🤝 Draws |
|:-:|:-:|:-:|
| **${g.stats.human}** | **${g.stats.bot}** | **${g.stats.draw}** |

**Hall of fame** &nbsp; ${leaders}

<sub>last moves: ${moves}</sub>

</div>
<!--TTT:END-->`;
}

function main() {
  const [title = '', user = 'someone'] = process.argv.slice(2);
  const g = fs.existsSync('game.json') ? JSON.parse(fs.readFileSync('game.json', 'utf8')) : fresh();
  const reply = play(g, title, user);
  fs.writeFileSync('game.json', JSON.stringify(g, null, 2) + '\n');
  const md = fs.readFileSync('README.md', 'utf8');
  fs.writeFileSync('README.md', md.replace(/<!--TTT:START-->[\s\S]*<!--TTT:END-->/, render(g)));
  process.stdout.write(reply);
}

if (require.main === module) main();
module.exports = { fresh, play, render, winner, minimax };
