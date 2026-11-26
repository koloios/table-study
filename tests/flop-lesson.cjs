'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
for (const name of ['poker','lessons','flop-lesson']) {
  const script = fs.readFileSync(path.join(__dirname,'../assets',name+'.js'),'utf8');
  vm.runInContext(script,context);
}
const lesson = vm.runInContext('FlopLesson',context);
const poker = vm.runInContext('Poker',context);
const percent = (hits,total) => (100 * hits / total).toFixed(1)+'%';

// Enumerate ordered deals directly and count physical suit symbols in the
// player's available cards. The lesson computes its answers using complements.
function countFlushes(deal) {
  const known = [...deal.you,...deal.board];
  const suit = deal.you[0].slice(-1);
  const available = poker.deck.filter(card => !known.includes(card));
  function hasFlush(cards) {
    return cards.filter(card => card.endsWith(suit)).length >= 5;
  }
  let turnHits = 0, runoutHits = 0, total = 0, bothCardsHit = 0;
  for (const turn of available) {
    const turnCards = [...known,turn];
    if (hasFlush(turnCards)) turnHits++;
    for (const river of available) {
      if (turn === river) continue;
      total++;
      if (hasFlush([...turnCards,river])) runoutHits++;
      if (turn.endsWith(suit) && river.endsWith(suit)) bothCardsHit++;
    }
  }
  return {turnHits,turnTotal:available.length,runoutHits,total,bothCardsHit};
}

const [prediction,oneCard,miss,twoCards,showdown] = lesson.build(0);
assert.equal(prediction.visual.deal.board.length,3);
assert.deepEqual(prediction.visual.deal,oneCard.visual.deal);
assert.deepEqual(prediction.visual.deal,twoCards.visual.deal);
assert.equal(prediction.visual.deal.opp.length,0);
assert.equal(prediction.visual.hiddenOpponent,true);
assert.equal(oneCard.visual.betContext.split(' · ').slice(0,2).join('|'),twoCards.visual.betContext.split(' · ').slice(0,2).join('|'));
assert.match(oneCard.visual.betContext,/20 each behind/);
assert.match(twoCards.visual.betContext,/all-in/);
const guided = countFlushes(prediction.visual.deal);
assert.deepEqual(guided,{turnHits:9,turnTotal:47,runoutHits:756,total:2162,bothCardsHit:72});
assert.equal(prediction.answer,guided.turnHits+'/'+guided.turnTotal);
assert(prediction.explain.includes(percent(guided.turnHits,guided.turnTotal)));
assert.equal(twoCards.answer,'1 − (38/47 × 37/46)');
assert(twoCards.explain.includes(percent(guided.runoutHits,guided.total)));
assert.equal(twoCards.showDrawPathsAfterAnswer,true);
// Each double-heart runout is counted twice when the two single-card hit rates are added.
assert.equal(2*guided.turnHits*(guided.turnTotal-1)-guided.bothCardsHit,guided.runoutHits);

const turnDeal = miss.visual.deal;
assert.deepEqual([...turnDeal.board].slice(0,3),[...prediction.visual.deal.board]);
const unknown = poker.deck.filter(card => ![...turnDeal.you,...turnDeal.board].includes(card));
const riverHits = unknown.filter(card => [...turnDeal.you,...turnDeal.board,card].filter(c=>c.endsWith('♥')).length>=5);
assert.equal(miss.answer,riverHits.length+'/'+unknown.length);
assert(miss.explain.includes(percent(riverHits.length,unknown.length)));
const end = showdown.visual.deal;
assert.equal(new Set([...end.you,...end.opp,...end.board]).size,9);
assert.equal(poker.best([...end.you,...end.board]).category,'flush');
assert.equal(poker.best([...end.opp,...end.board]).category,'full house');
assert.equal(showdown.answer,'Mira');

const byDeal = new Map();
for (let seed=0;seed<8;seed++) {
  const steps = lesson.build(seed);
  for (const step of steps) {
    assert(step.choices.includes(step.answer));
    assert.equal(new Set(step.choices).size,step.choices.length);
  }
  const check = steps.at(-1);
  assert(check.checkpoint);
  assert(!check.showDrawPathsAfterAnswer);
  assert(!check.body.includes('%'));
  assert(!check.hint.includes('%'));
  const deal = check.visual.deal;
  assert(check.visual.hiddenOpponent);
  assert.equal(new Set([...deal.you,...deal.board]).size,5);
  assert.notDeepEqual(deal,prediction.visual.deal);
  const allIn = check.visual.betContext.includes('all-in');
  const odds = countFlushes(deal);
  const expected = allIn ? percent(odds.runoutHits,odds.total) : percent(odds.turnHits,odds.turnTotal);
  assert.equal(check.answer,expected+(allIn?' · two guaranteed cards':' · one guaranteed card'));
  assert(check.explain.includes(expected));
  const key = [...deal.board,...deal.you].join(' ');
  if (!byDeal.has(key)) byDeal.set(key,new Set());
  byDeal.get(key).add(allIn);
}
assert.equal(byDeal.size,4);
for (const horizons of byDeal.values()) assert.equal(horizons.size,2);
console.log('Flop lesson probabilities, price comparison, counterexample and fresh horizons passed.');
