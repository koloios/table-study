'use strict';

// Each seat and the opponent policy see only the information available to that seat.
function createHeadsUpEngine(poker) {
  const streets = ['preflop', 'flop', 'turn', 'river'];

  function shuffledDeck(rng) {
    const cards = [...poker.deck];
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function create({button = 0, stacks = [100, 100], smallBlind = 1, bigBlind = 2, rng = Math.random} = {}) {
    if (![0, 1].includes(button) || !Array.isArray(stacks) || stacks.length !== 2 ||
        ![...stacks, smallBlind, bigBlind].every(n => Number.isSafeInteger(n) && n > 0) ||
        !Number.isSafeInteger(stacks[0] + stacks[1]) || bigBlind <= smallBlind) {
      throw new RangeError('Use two positive chip stacks, valid blinds, and a button seat of 0 or 1.');
    }
    const deck = shuffledDeck(rng);
    const hands = [[], []];
    const blind = 1 - button;
    for (let i = 0; i < 2; i++) {
      hands[blind].push(deck.pop());
      hands[button].push(deck.pop());
    }
    const chips = [...stacks];
    const committed = [0, 0];
    const contributions = [0, 0];
    const board = [];
    const history = [];
    let street = 0;
    let actor = button;
    let result = null;
    let lastRaise = bigBlind;
    let acted = [false, false];

    function record(seat, type, amount) {
      history.push({seat, street: streets[street], type, amount});
    }

    function putIn(seat, amount) {
      chips[seat] -= amount;
      committed[seat] += amount;
      contributions[seat] += amount;
    }

    function post(seat, amount, type) {
      const paid = Math.min(amount, chips[seat]);
      putIn(seat, paid);
      record(seat, type, paid);
    }

    function dealStreet() {
      street++;
      deck.pop(); // Burn one card face down before each community deal.
      board.push(...Array.from({length: street === 1 ? 3 : 1}, () => deck.pop()));
      committed.fill(0);
      acted = [false, false];
      lastRaise = bigBlind;
    }

    function finish(reason, foldWinner = null) {
      // An unmatched wager (including a blind) is returned before a pot is awarded.
      const excess = Math.abs(contributions[0] - contributions[1]);
      if (excess) {
        const seat = contributions[0] > contributions[1] ? 0 : 1;
        chips[seat] += excess;
        committed[seat] -= excess;
        contributions[seat] -= excess;
        record(seat, 'return', excess);
      }
      let winner = foldWinner;
      let categories = null;
      if (reason === 'showdown') {
        while (street < 3) dealStreet();
        const scores = hands.map(hand => poker.best([...hand, ...board]));
        categories = scores.map(hand => hand.category);
        winner = scores[0].score === scores[1].score ? null : Number(scores[1].score > scores[0].score);
      }
      const pot = contributions[0] + contributions[1];
      const payouts = winner === null ? [pot / 2, pot / 2] : [0, 0];
      if (winner !== null) payouts[winner] = pot;
      for (let seat = 0; seat < 2; seat++) chips[seat] += payouts[seat];
      committed.fill(0);
      contributions.fill(0);
      actor = null;
      result = {reason, winner, pot, payouts, categories};
    }

    function advance(next) {
      if (chips.includes(0)) {
        if (chips[next] > 0 && committed[next] < committed[1 - next]) actor = next;
        else finish('showdown');
      } else if (acted.every(Boolean) && committed[0] === committed[1]) {
        if (street === 3) finish('showdown');
        else {
          dealStreet();
          actor = blind;
        }
      } else actor = next;
    }

    function actions(seat) {
      const empty = {canFold: false, canCheck: false, toCall: 0, potIfCalled: 0, minRaiseTo: null, maxRaiseTo: null};
      if (actor === null || actor !== seat) return empty;
      const other = 1 - seat;
      const high = Math.max(...committed);
      const toCall = Math.min(chips[seat], high - committed[seat]);
      const max = committed[seat] + chips[seat];
      const canRaise = chips[other] > 0 && max > high;
      return {
        canFold: toCall > 0,
        canCheck: toCall === 0,
        toCall,
        potIfCalled: contributions[0] + contributions[1] + toCall - (high - committed[seat] - toCall),
        minRaiseTo: canRaise ? Math.min(max, high + lastRaise) : null,
        maxRaiseTo: canRaise ? max : null
      };
    }

    function view(seat) {
      if (seat !== 0 && seat !== 1) throw new RangeError('Unknown seat.');
      return {
        seat, button, actor, street: streets[street], smallBlind, bigBlind,
        board: [...board], hand: [...hands[seat]],
        opponentHand: result?.reason === 'showdown' ? [...hands[1 - seat]] : null,
        stacks: [...chips], committed: [...committed],
        pot: contributions[0] + contributions[1],
        history: history.map(event => ({...event})), legal: actions(seat),
        result: result ? {...result, payouts: [...result.payouts], categories: result.categories && [...result.categories]} : null
      };
    }

    function act(action) {
      if (actor === null) throw new Error('This hand is over.');
      const seat = actor;
      const legal = actions(seat);
      const type = action?.type;
      if (type === 'fold' && legal.canFold) {
        record(seat, type, 0);
        finish('fold', 1 - seat);
        return;
      }
      if (type === 'call' && legal.toCall > 0) {
        putIn(seat, legal.toCall);
        record(seat, type, legal.toCall);
      } else if (type === 'check' && legal.canCheck) {
        record(seat, type, 0);
      } else if (type === 'raise' && legal.minRaiseTo !== null && Number.isSafeInteger(action.to) &&
          action.to >= legal.minRaiseTo && action.to <= legal.maxRaiseTo) {
        const high = Math.max(...committed);
        putIn(seat, action.to - committed[seat]);
        lastRaise = Math.max(lastRaise, action.to - high);
        acted[1 - seat] = false;
        record(seat, high === 0 ? 'bet' : type, action.to);
      } else throw new RangeError('Illegal action for this seat.');
      acted[seat] = true;
      advance(1 - seat);
    }

    post(button, smallBlind, 'small blind');
    post(blind, bigBlind, 'big blind');
    advance(button);
    return {view, act};
  }

  // Sample an unknown opposing hand and the remaining board without replacement.
  // Hidden burns are unknown dead cards, so marginalizing them leaves the same distribution.
  function equity(view, {samples = 192, rng = Math.random} = {}) {
    if (!Number.isSafeInteger(samples) || samples < 1) throw new RangeError('Use a positive sample count.');
    const known = new Set([...view.hand, ...view.board]);
    const pool = poker.deck.filter(card => !known.has(card));
    const needed = 2 + 5 - view.board.length;
    let wins = 0, ties = 0;
    for (let trial = 0; trial < samples; trial++) {
      for (let i = 0; i < needed; i++) {
        const index = i + Math.floor(rng() * (pool.length - i));
        [pool[i], pool[index]] = [pool[index], pool[i]];
      }
      const runout = [...view.board, ...pool.slice(2, needed)];
      const mine = poker.best([...view.hand, ...runout]).score;
      const theirs = poker.best([pool[0], pool[1], ...runout]).score;
      if (mine > theirs) wins++;
      if (mine === theirs) ties++;
    }
    return {equity: (wins + ties / 2) / samples, wins, ties, losses: samples - wins - ties, samples};
  }

  // Every combination of two unseen cards has the same weight under this range.
  function riverEquity(view) {
    if (view.board.length !== 5) throw new RangeError('Exact river equity requires a complete board.');
    const known = new Set([...view.hand, ...view.board]);
    const unseen = poker.deck.filter(card => !known.has(card));
    const mine = poker.best([...view.hand, ...view.board]).score;
    let wins = 0, ties = 0;
    for (let first = 0; first < unseen.length - 1; first++) {
      for (let second = first + 1; second < unseen.length; second++) {
        const theirs = poker.best([unseen[first], unseen[second], ...view.board]).score;
        if (mine > theirs) wins++;
        if (mine === theirs) ties++;
      }
    }
    const samples = unseen.length * (unseen.length - 1) / 2;
    return {equity: (wins + ties / 2) / samples, wins, ties, losses: samples - wins - ties, samples};
  }

  // Transparent practice policy: approximate showdown equity against a random hand, then
  // price calls and size a polarized bet. Its simple continuing-range model is a teaching
  // heuristic; real ranges depend on prior actions and future betting.
  function chooseAction(view, rng = Math.random) {
    if (view.actor !== view.seat) throw new Error('It is not this seat’s turn.');
    const {toCall, minRaiseTo, maxRaiseTo} = view.legal;
    const potAfterCall = view.legal.potIfCalled;
    const {equity: share} = equity(view, {samples: 96, rng});
    if (toCall && share < toCall / potAfterCall) return {type: 'fold'};
    if (minRaiseTo !== null) {
      const matched = view.committed[view.seat] + toCall;
      const to = Math.min(maxRaiseTo, Math.max(minRaiseTo, matched + Math.round(potAfterCall / 2)));
      const extra = Math.min(to - matched, view.stacks[1 - view.seat]);
      const defendFraction = potAfterCall / (potAfterCall + extra);
      // If opponents continue with their strongest defendFraction of hands, a hand near
      // the top half of that continuing range can value bet. Low hands supply some bluffs.
      const valueFraction = defendFraction / 2;
      const bluffToValue = extra / (potAfterCall + extra);
      if (share > 1 - valueFraction || (!toCall && share < valueFraction * bluffToValue)) {
        return {type: 'raise', to};
      }
    }
    return {type: toCall ? 'call' : 'check'};
  }

  return {create, equity, riverEquity, chooseAction};
}

const HeadsUp = typeof Poker !== 'undefined' ? createHeadsUpEngine(Poker) : null;
if (typeof module !== 'undefined' && module.exports) module.exports = createHeadsUpEngine;
