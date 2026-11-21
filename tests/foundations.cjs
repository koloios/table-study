/* Run with node tests/foundations.cjs. No package installation is required. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
for (const file of ['poker.js', 'lessons.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets', file), 'utf8'), context);
}
const poker = vm.runInContext('Poker', context);
const course = vm.runInContext('Course', context);
const best = hand => poker.best(hand.split(' '));
assert(best('A♠ 2♠ 3♣ 4♠ 5♠ K♥ Q♦').score < best('2♦ 3♣ 4♥ 5♠ 6♠ K♥ Q♦').score);
assert.equal(best('A♣ A♦ A♥ K♣ K♦ K♥ 2♠').category, 'full house');
assert.equal(best('A♣ K♦ Q♠ J♥ T♣ 2♦ 3♣').score, best('A♣ K♦ Q♠ J♥ T♣ 7♥ 7♠').score);
assert(poker.callPrice(12, 2, 9/44).ev > 0);
assert(poker.callPrice(12, 8, 9/44).ev < 0);
for (let seed = 0; seed < 60; seed++) {
  for (const unit of course.units) {
    const steps = unit.build(seed);
    assert(steps.some(step => step.checkpoint));
    for (const step of steps) {
      if (step.choices) {
        assert(step.choices.includes(step.answer));
        assert.equal(new Set(step.choices).size, step.choices.length);
      }
      const deal = step.visual.deal;
      if (!deal) continue;
      const visible = [...deal.you, ...deal.opp, ...deal.board];
      assert.equal(new Set(visible).size, visible.length);
      if (deal.board.length === 4) {
        const outcomes = course.outcomes(deal);
        const winners = outcomes.filter(o => o.result > 0);
        const suit = deal.you[0][1];
        assert.equal(outcomes.length, 44);
        assert(outcomes.every(o => o.result !== 0 && !visible.includes(o.card)));
        assert.equal(winners.length, 13 - visible.filter(c => c[1] === suit).length);
        assert(winners.every(o => o.card[1] === suit));
      }
      if (step.title === 'Award a fresh pot') {
        const yourScore = poker.best([...deal.you, ...deal.board]).score;
        const otherScore = poker.best([...deal.opp, ...deal.board]).score;
        assert.equal(step.answer, yourScore > otherScore ? 'You' : 'Mira');
      }
    }
  }
}
console.log('Foundations checks passed.');
