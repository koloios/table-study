/* Run with node tests/heads-up.cjs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/poker.js'), 'utf8'), context);
const poker = vm.runInContext('Poker', context);
const HeadsUp = require('../assets/heads-up.js')(poker);

function random(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

for (const button of [0, 1]) {
  const big = 1 - button;
  const game = HeadsUp.create({button, rng: random(27)});
  const view = seat => game.view(seat);
  assert.equal(view(button).actor, button);
  assert.equal(view(button).pot, 3);
  assert.equal(view(button).legal.toCall, 1);
  assert.equal(view(button).legal.minRaiseTo, 4);
  assert.equal(view(button).legal.potIfCalled, 4);
  assert.equal(view(big).opponentHand, null);
  assert.equal(view(big).legal.canCheck, false);
  assert.throws(() => game.act({type:'check'}));
  assert.throws(() => game.act({type:'raise', to:3}));
  assert.throws(() => game.act({type:'raise', to:101}));
  game.act({type:'call'});
  assert.equal(view(big).actor, big); // Big blind option after a limp.
  game.act({type:'check'});
  for (const street of ['flop', 'turn', 'river']) {
    assert.equal(view(big).street, street);
    assert.equal(view(big).actor, big);
    assert.equal(view(big).legal.minRaiseTo, 2);
    game.act({type:'check'});
    assert.equal(view(button).actor, button);
    game.act({type:'check'});
  }
  const final = view(big);
  assert.equal(final.result.reason, 'showdown');
  assert.equal(new Set([...final.board, ...final.hand, ...final.opponentHand]).size, 9);
  assert.equal(final.result.pot, 4);
  assert.equal(final.actor, null);
  assert.equal(final.pot, 0);
  assert.throws(() => game.act({type:'check'}));
}

// No shuffle: last cards are dealt first. Burn cards never enter the board or public history.
const ordered = HeadsUp.create({button:0, rng:() => 0.999999});
assert.deepEqual([...ordered.view(1).hand], ['A♣','Q♣']);
assert.deepEqual([...ordered.view(0).hand], ['K♣','J♣']);
for (const type of ['call','check','check','check','check','check']) ordered.act({type});
assert.deepEqual([...ordered.view(0).board], ['9♣','8♣','7♣','5♣','3♣']);
const before = ordered.view(0);
before.hand.pop();
before.board.splice(0);
before.stacks.fill(0);
before.history[0].type = 'broken';
assert.equal(ordered.view(0).board.length, 5);
assert.equal(ordered.view(0).hand.length, 2);
assert.equal(ordered.view(0).history[0].type, 'small blind');

const betting = HeadsUp.create({rng: random(17)});
betting.act({type:'raise', to:7});
assert.equal(betting.view(1).legal.minRaiseTo, 12);
betting.act({type:'raise', to:20});
assert.equal(betting.view(0).legal.minRaiseTo, 33);
betting.act({type:'fold'});
const fold = betting.view(0);
assert.equal(fold.opponentHand, null);
assert.equal(fold.result.categories, null);
assert.equal(fold.result.reason, 'fold');
assert.deepEqual([...fold.stacks], [93,107]);
assert.equal(fold.result.pot, 14);
assert.equal(fold.history.at(-1).type, 'return');

const allIn = HeadsUp.create({button: 0, stacks:[90,13], rng:random(91)});
allIn.act({type:'raise', to:90});
const short = allIn.view(1);
assert.equal(short.legal.toCall, 11);
assert.equal(short.legal.potIfCalled, 26);
assert.equal(short.legal.minRaiseTo, null);
allIn.act({type:'call'});
assert.equal(allIn.view(0).result.pot, 26);
assert.equal(allIn.view(0).board.length, 5);
assert.equal(allIn.view(0).history.at(-1).amount, 77);

const shortRaise = HeadsUp.create({stacks:[100,6], rng:random(15)});
shortRaise.act({type:'raise', to:5});
assert.equal(shortRaise.view(1).legal.minRaiseTo, 6);
shortRaise.act({type:'raise', to:6});
assert.equal(shortRaise.view(0).legal.minRaiseTo, null);
shortRaise.act({type:'call'});
assert.equal(shortRaise.view(0).result.pot, 12);

for (const stacks of [[1,70], [70,1], [2,2], [1,1]]) {
  const game = HeadsUp.create({stacks, rng:random(11)});
  if (game.view(0).actor !== null) game.act({type:'call'});
  assert.equal(game.view(0).result.reason, 'showdown');
  assert.equal(game.view(0).result.pot, 2 * Math.min(...stacks));
}

// Stress the betting branches and odd-sized raises; total chips stay accounted for at all times.
let splits = 0;
for (let seed = 0; seed < 700; seed++) {
  const rng = random(seed + 45377);
  const stacks = [1 + Math.floor(rng()*100), 1 + Math.floor(rng()*100)];
  const total = stacks[0] + stacks[1];
  const game = HeadsUp.create({stacks, button:seed % 2, rng});
  let actions = 0;
  while (game.view(0).actor !== null) {
    const view = game.view(game.view(0).actor);
    const legal = view.legal;
    assert.equal(view.stacks[0] + view.stacks[1] + view.pot, total);
    assert(view.stacks.every(n => n >= 0));
    assert.equal(view.opponentHand, null);
    const roll = rng();
    if (roll < 0.12 && legal.canFold) game.act({type:'fold'});
    else if (roll > 0.65 && legal.minRaiseTo !== null) {
      const span = legal.maxRaiseTo - legal.minRaiseTo + 1;
      game.act({type:'raise', to:legal.minRaiseTo + Math.floor(rng()*span)});
    } else game.act({type:legal.canCheck ? 'check' : 'call'});
    assert(++actions < 260);
  }
  const final = game.view(0);
  assert.equal(final.stacks[0] + final.stacks[1], total);
  if (final.result.winner === null) {
    splits++;
    assert.equal(final.result.payouts[0], final.result.payouts[1]);
  }
}
assert(splits > 0);

// Neither the policy nor its equity calculation can see a hidden hole card or the stored deck.
const visibility = HeadsUp.create({rng:random(3)}).view(0);
const equity = HeadsUp.equity(visibility, {samples:30, rng:random(229)});
assert.equal(equity.samples, equity.wins+equity.ties+equity.losses);
assert.equal(equity.equity, (equity.wins+equity.ties/2)/equity.samples);
assert.deepEqual(HeadsUp.chooseAction(visibility, random(9)),
  HeadsUp.chooseAction({...visibility, opponentHand:['A♠','A♦'], deck:[]}, random(9)));
assert.throws(() => HeadsUp.equity(visibility, {samples:0}));
assert.throws(() => HeadsUp.create({stacks:[0,100]}));
const riverTie = {...visibility, hand:['2♠','3♠'], board:['A♦','K♦','Q♦','J♦','T♦']};
assert.equal(HeadsUp.equity(riverTie, {samples:15, rng:random(6)}).equity, 0.5);
assert.deepEqual(HeadsUp.riverEquity(riverTie), {
  equity:0.5, wins:0, ties:990, losses:0, samples:990
});
const nuts = {...visibility, hand:['A♠','K♠'], board:['Q♠','J♠','T♠','3♥','4♦']};
assert.equal(HeadsUp.riverEquity(nuts).wins, 990);
assert.throws(() => HeadsUp.riverEquity(visibility));
for (let seed = 0; seed < 6; seed++) {
  const game = HeadsUp.create({button:seed % 2, rng:random(seed)});
  const choices = random(seed + 7);
  while (game.view(0).actor !== null) {
    const view = game.view(game.view(0).actor);
    game.act(HeadsUp.chooseAction(view, choices));
  }
}
console.log('Heads-up betting, payouts, seat privacy and opponent checks passed.');
