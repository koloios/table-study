/* Run with node tests/foundations.cjs. No package installation is required. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
for (const file of ['poker.js', 'flop-lesson.js', 'lessons.js', 'practice.js']) {
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
      if (deal.board.length === 4 && !step.visual.hiddenOpponent) {
        const outcomes = course.outcomes(deal);
        const winners = outcomes.filter(o => o.result > 0);
        const suit = deal.you[0][1];
        assert.equal(outcomes.length, 44);
        assert(outcomes.every(o => o.result !== 0 && !visible.includes(o.card)));
        if (deal.you[0][1] === deal.you[1][1]) {
          assert.equal(winners.length, 13 - visible.filter(c => c[1] === suit).length);
          assert(winners.every(o => o.card[1] === suit));
        }
        if (step.title === 'Count a fresh draw') {
          assert.equal(winners.length, [9, 8, 4, 2][seed % 4]);
          assert.equal(Number(step.answer), winners.length);
        }
        if (step.quote) {
          assert.equal(step.quote.ev, poker.callPrice(step.pot, step.bet, winners.length / 44).ev);
        }
      }
      if (step.title === 'Award a fresh pot') {
        const yourScore = poker.best([...deal.you, ...deal.board]).score;
        const otherScore = poker.best([...deal.opp, ...deal.board]).score;
        assert.equal(step.answer, yourScore > otherScore ? 'You' : 'Mira');
      }
    }
  }
}
const practice = vm.runInContext('Practice', context);
const linesByFamily=Array.from({length:4},()=>new Set());
for(let seed=0;seed<16;seed++){
  const hand=course.riverHand(seed);
  const rivers=poker.rivers(hand.deal);
  assert.equal(hand.total,44);
  assert.equal(rivers.length,hand.total);
  assert(rivers.every(r=>r.result!==0));
  assert.deepEqual(hand.winners,rivers.filter(r=>r.result>0).map(r=>r.card));
  assert.deepEqual(hand.quote,poker.callPrice(hand.pot,hand.bet,hand.winners.length/44));
  assert.notDeepEqual(hand.deal,course.base);
  linesByFamily[seed%4].add(Math.sign(hand.quote.ev));
}
assert(linesByFamily.every(lines=>lines.has(1)&&lines.has(-1)&&!lines.has(0)));
for(let seed=0;seed<24;seed++){
  const prices=course.units.at(-1).build(seed).filter(s=>s.quote);
  assert.equal(prices.length,2);
  assert.equal(prices.find(s=>s.bet===8).answer,'Call');
  assert.equal(prices.find(s=>s.bet===4).answer,'Fold');
  assert.equal(prices[0].bet, seed%2 ? 4 : 8);
  for(const skill of Object.keys(practice.skills)){
    const s=practice.build(skill,seed);
    if(s.choices) assert(s.choices.includes(s.answer));
    if(s.visual.deal){
      const {you,opp,board}=s.visual.deal;
      assert.equal(new Set([...you,...opp,...board]).size,you.length+opp.length+board.length);
    }
  }
}
for(const n of [10,100]){
  let total=0;
  for(let wins=0;wins<=n;wins++) total+=practice.batchProbability(n,wins,9/44);
  assert(Math.abs(total-1)<1e-12);
}
assert.equal((100*practice.batchProbability(10,0,9/44)).toFixed(1),'10.1');
console.log('Foundations and targeted practice checks passed.');
