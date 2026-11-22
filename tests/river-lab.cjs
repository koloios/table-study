'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
for (const file of ['poker.js', 'river-lab.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets', file), 'utf8'), context);
}
const lab = vm.runInContext('RiverLab', context);
const poker = vm.runInContext('Poker', context);
const equal = (actual, expected) => assert(Math.abs(actual - expected) < 1e-10, actual + ' ≠ ' + expected);
const heroStrength = poker.best([...lab.board, ...lab.hero]).score;
const possibleHands = [...lab.sets, ...lab.draws];
assert.equal(possibleHands.length, 6);
assert.equal(new Set(possibleHands.map(h => h.join())).size, 6);
for (const hand of possibleHands) {
  assert.equal(new Set([...lab.board, ...lab.hero, ...hand]).size, 9);
  assert.equal(poker.best([...lab.board, ...hand]).score > heroStrength, lab.sets.includes(hand));
}
// Verify the two indifference conditions across several pot and bet sizes.
for (const pot of [1, 30, 40, 100]) {
  for (const bet of [1, 15, 20, 50]) {
    const {callFrequency, bluffFrequency} = lab.equilibrium(pot, bet);
    const bluffShare = bluffFrequency / (1 + bluffFrequency);
    equal((1 - callFrequency) * pot - callFrequency * bet, 0);
    equal(bluffShare * (pot + bet) - (1 - bluffShare) * bet, 0);
  }
}
for (const [profile, chance, ev] of [['balanced', 1/4, 0], ['frequent', 2/5, 12], ['rare', 1/7, -60/7]]) {
  const report = lab.analyze(profile);
  equal(report.equity, chance);
  equal(report.ev, ev);
  equal(report.breakEven, 1/4);
  const total = 420;
  let wins = 0;
  const faces = new Set();
  // A stratified grid exercises every hand and the boundary between bluffs and sets.
  for (let n = 0; n < total; n++) {
    const samples = [(n + 0.5) / total, ((n % 3) + 0.5) / 3];
    const hand = lab.dealAfterBet(profile, () => samples.shift());
    faces.add(hand.cards.join());
    if (hand.bluffed) wins++;
    assert.equal(hand.bluffed, poker.best([...lab.board, ...hand.cards]).score < heroStrength);
    assert.deepEqual(lab.analyze(profile), report, 'A hidden deal changed the public analysis.');
  }
  equal(wins / total, chance);
  assert.equal(faces.size, 6);
}
console.log('River equilibrium, conditional range, and decision-value checks passed.');
