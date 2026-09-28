const assert = require('assert');
const { fresh, play, winner, minimax, render } = require('./ttt');
// perfect bot blocks an immediate win
assert.strictEqual(minimax(['X','X','','O','','','','',''], 'O').move, 2);
// bot takes its own win
assert.strictEqual(minimax(['X','X','','O','O','','X','',''], 'O').move, 5);
assert.deepStrictEqual(winner(['X','X','X','','','','','','']), { who: 'X', line: [0,1,2] });
// full game vs perfect bot never lets human win
const g = fresh(); const never = () => 0.99;
for (const c of [0, 1, 2, 3, 4, 5, 6, 7, 8]) if (!g.over && !g.board[c]) play(g, `ttt|move|${c}`, 'tester', never);
assert.ok(g.over && g.winner !== 'X');
assert.match(play(g, 'ttt|move|4', 'tester', never), /B2/); // move after game over starts new game
assert.match(play(g, 'ttt|move|4', 'tester', never), /taken/);
assert.match(play(g, 'ttt|move|99', 'tester', never), /Couldn't/);
assert.ok(render(g).includes('<!--TTT:END-->'));
console.log('ok');
