'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const env = vm.createContext({});
for (const file of ['poker','big-blind']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file+'.js'),'utf8'),env);
}
const hand = vm.runInContext('BigBlindHand',env);
const poker = vm.runInContext('Poker',env);
const lead = ['4 more','Call 4','You','Check or bet','Call 4','See the river for free'];
assert.deepEqual(Array.from(hand.roles),['Button','Small blind','Big blind','Cutoff']);
assert.equal(hand.decisionCount,7);
for(const seed of [-1,704,0.5,null]) assert.equal(hand.resume(seed,[]),null);
assert.equal(hand.resume(0,['Call 6']),null);
assert.equal(hand.resume(0,['4 more','Fold','Check']),null);
const earnings = new Map();
for(let seed=0;seed<704;seed++){
  const bet = (seed & 4)?14:7;
  const river = hand.resume(seed,lead);
  assert.deepEqual(Array.from(river.history,e=>e.view.pot),[9,9,13,13,17,21]);
  assert.deepEqual(Array.from(river.history,e=>e.view.board.length),[0,0,3,3,3,4]);
  assert.equal(river.view.board.length,5);
  assert.equal(river.view.pot,21+bet);
  const final = hand.resume(seed,[...lead,'Call '+bet]);
  const {result} = final;
  assert.equal(result.pot,21+2*bet);
  assert.equal(new Set([...river.view.hero,...result.board,...result.opp]).size,9);
  const hero = poker.best([...river.view.hero,...result.board]);
  const opp = poker.best([...result.opp,...result.board]);
  const winner = hero.score>opp.score;
  assert.notEqual(hero.score,opp.score);
  assert.equal(result.net,(winner?result.pot:0)-10-bet);
  const model = river.view.context.match(/[2-9TJQKA][♥♦♣♠]/g);
  assert.deepEqual(Array.from(result.opp),winner?model.slice(2):model.slice(0,2));
  assert.equal(hero.category,'one pair');
  assert.equal(opp.category,winner?'high card':'one pair');
  // Suit rotation and hand family cannot predict which of the two holdings is dealt.
  const group = river.view.hero.join(' ')+' / '+bet;
  const price = earnings.get(group) || {bet,calls:0,wins:0,net:0};
  price.calls++;
  if(winner)price.wins++;
  // Measure from the river decision. Earlier contributions are already committed.
  price.net += result.net+10;
  earnings.set(group,price);
  if(seed>=64)continue;
  const alternative = hand.resume(seed^16,[...lead,'Call '+bet]);
  assert.deepEqual(alternative.history,final.history);
  for (const [index,loss,pot] of [[1,-2,5],[4,-6,13],[6,-10,21]]) {
    const fold = hand.resume(seed,[...lead.slice(0,index),'Fold']);
    assert.equal(fold.result.net,loss);
    assert.equal(fold.result.pot,pot);
    assert.equal(fold.result.opp,undefined);
    assert.equal(fold.result.board,undefined);
    assert.equal(fold.view.pot-pot,index===6?bet:4);
    assert.deepEqual(Array.from(fold.result.folded),['Ivo','Sol','You']);
  }
  assert(final.history.at(-1).explanation.includes((bet===7?'Calling':'Folding')+' earns more'));
  for (const entry of final.history.slice(0,-1)) {
    assert(!entry.view.context.includes(model[0]+' '+model[1]));
    assert(!entry.view.context.includes(model[2]+' '+model[3]));
  }
}
assert.equal(earnings.size,16);
for(const {bet,calls,wins,net} of earnings.values()) {
  assert.equal(wins/calls,0.25);
  assert.equal(net/calls,bet===7?1.75:-1.75);
}
const mistaken=hand.resume(0,['6 more','Call 4','Mira','She must check too']);
assert.equal(mistaken.view.title,'Respond to the flop bet');
assert.match(mistaken.history[0].explanation,/owe 6 − 2 = 4/);
assert.match(mistaken.history[2].explanation,/You act first/);
assert.match(mistaken.history[3].explanation,/Mira can check behind/);
console.log('Big-blind prices, fold refunds, decision-time privacy and both river bets passed.');
