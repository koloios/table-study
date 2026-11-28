'use strict';

const Bridge = (() => {
  const seats = ['North', 'East', 'South', 'West'];
  const suits = ['♠', '♥', '♣', '♦'];
  const suitNames = {'♠':'spades', '♥':'hearts', '♣':'clubs', '♦':'diamonds'};
  const ranks = '23456789TJQKA';
  const rankNames = {A:'ace', K:'king', Q:'queen', J:'jack', T:'10'};
  const nextSeat = seat => seats[(seats.indexOf(seat) + 1) % 4];
  const partners = seat => seat === 'North' || seat === 'South';
  const strength = card => ranks.indexOf(card[0]);
  const cardName = card => (rankNames[card[0]] || card[0]) + ' of ' + suitNames[card[1]];
  const face = card => (card[0] === 'T' ? '10' : card[0]) + card[1];

  function winner(trick) {
    const leadSuit = trick[0].card[1];
    return trick.reduce((high, play) => play.card[1] === leadSuit &&
      strength(play.card) > strength(high.card) ? play : high).seat;
  }

  function legalCards(hand, trick) {
    if (!trick.length) return hand.slice();
    const matching = hand.filter(card => card[1] === trick[0].card[1]);
    return matching.length ? matching : hand.slice();
  }

  function createEnding(seed) {
    const fresh = seed > 0;
    const suitIndex = fresh ? 1 + seed % 3 : 0;
    const suit = suits[suitIndex], side = suits[(suitIndex + 3) % 4], spare = suits[(suitIndex + 2) % 4];
    const leader = fresh ? 'East' : 'West';
    const ace = nextSeat(leader), follower = nextSeat(ace), fourth = nextSeat(follower);
    const low = (fresh ? ['3','5','7'][seed % 3] : '2') + suit;
    const hands = {
      [leader]: ['Q'+suit, 'T'+suit, 'K'+side],
      [ace]: ['A'+suit, '4'+suit, '2'+side],
      [follower]: ['J'+suit, 'Q'+side, 'A'+spare],
      [fourth]: ['K'+suit, low, 'A'+side]
    };
    const state = {hands, turn:leader, trick:[], finished:[], ns:4};
    for (const card of ['Q'+suit, 'A'+suit, 'J'+suit]) play(state, card);
    return state;
  }

  function play(state, card) {
    if (state.finished.length === 3 || state.trick.length === 4) return false;
    const hand = state.hands[state.turn];
    if (!legalCards(hand, state.trick).includes(card)) return false;
    hand.splice(hand.indexOf(card), 1);
    state.trick.push({seat:state.turn, card});
    state.turn = nextSeat(state.turn);
    return true;
  }

  function collect(state) {
    if (state.trick.length !== 4) return false;
    const seat = winner(state.trick);
    state.finished.push({trick:state.trick, winner:seat});
    if (partners(seat)) state.ns++;
    state.turn = seat;
    state.trick = [];
    return true;
  }

  function advanceDefenders(state) {
    while (state.finished.length < 3 && state.trick.length < 4 && !partners(state.turn)) {
      const options = legalCards(state.hands[state.turn], state.trick);
      // The defenders follow low and lead their highest card in this three-trick ending.
      options.sort((a,b) => state.trick.length ? strength(a) - strength(b) : strength(b) - strength(a));
      play(state, options[0]);
    }
  }

  function advance(state, action) {
    const accepted = action === 'collect' ? collect(state) : partners(state.turn) && play(state, action);
    if (accepted) advanceDefenders(state);
    return accepted;
  }

  function resume(seed, actions) {
    const state = createEnding(seed);
    for (const action of actions) if (!advance(state, action)) return null;
    return state;
  }

  const storageKey = 'table-study.bridge-pilot.v1';
  const initial = () => ({phase:'opening', seed:0, attempt:0, actions:[], guidedComplete:false, checkpointComplete:false});

  function decodeProgress(raw) {
    try {
      const p = JSON.parse(raw);
      if (p && ['opening','guided','fresh'].includes(p.phase) && Number.isSafeInteger(p.seed) &&
          p.seed >= 0 && Array.isArray(p.actions) && p.actions.length <= 12 &&
          typeof p.guidedComplete === 'boolean' && typeof p.checkpointComplete === 'boolean' &&
          (p.phase === 'fresh' ? p.seed > 0 : p.seed === 0) && resume(p.seed,p.actions)) {
        return {...p,attempt:Number.isSafeInteger(p.attempt) && p.attempt>=0 ? p.attempt : 0};
      }
    } catch {}
    return initial();
  }

  function mount(root) {
    document.title = 'Play a no-trump ending · Table Study';
    function readRaw() {
      try { return localStorage.getItem(storageKey); } catch { return null; }
    }
    let previous = readRaw();
    let progress = decodeProgress(previous);
    let persistent = true;
    let state = resume(progress.seed, progress.actions);
    let note = '';
    let pickedWinner = '';

    function save() {
      if (!persistent) return;
      const raw = JSON.stringify(progress);
      try { localStorage.setItem(storageKey,raw);previous=raw; } catch { persistent=false; }
    }

    function start(phase) {
      pickedWinner = '';
      progress.phase = phase;
      progress.attempt++;
      progress.seed = phase === 'fresh' ? (progress.seed ? progress.seed % 3 + 1 : 1 + Math.floor(Math.random() * 3)) : 0;
      progress.actions = [];
      state = createEnding(progress.seed);
      note = '';
      save();
      render(true);
    }

    function cardTile(card, interactive) {
      const colour = '♥♦'.includes(card[1]) ? ' red' : '';
      const attr = ' class="card'+colour+'" aria-label="'+cardName(card)+'"';
      const content = (card[0] === 'T' ? '10' : card[0]) + '<span>'+card[1]+'</span>';
      return interactive ? '<button type="button" data-card="'+card+'"'+attr+'>'+content+'</button>' :
        '<span role="img"'+attr+'>'+content+'</span>';
    }

    const button = (text, action, main=false) =>
      '<button type="button" class="btn'+(main?' main':'')+'" data-bridge="'+action+'">'+text+'</button>';

    function hand(seat) {
      const cards = state.hands[seat];
      const active = state.trick.length < 4 && state.turn === seat && state.finished.length < 3;
      return '<h3>'+seat+(seat === 'North' ? ' · Dummy' : ' · Declarer')+'</h3>' +
        '<div class="cards">'+(cards.length ? cards.map(c => cardTile(c, active)).join('') : 'No cards left')+'</div>';
    }

    function table() {
      const plays = state.trick.map(p => '<li>'+p.seat+' played '+cardName(p.card)+'.</li>').join('');
      return '<section class="felt" aria-label="Bridge table"><div class="row"><span class="over">No-trump · South declares</span>' +
        '<span class="badge">North–South · '+state.ns+' / 7 tricks</span></div>'+hand('North')+hand('South')+
        '<h3>Current trick</h3>'+(plays ? '<ol>'+plays+'</ol>' : '<p>'+state.turn+' leads.</p>')+'</section>';
    }

    function prompt() {
      if (state.trick.length === 4) {
        if (progress.phase==='fresh' && pickedWinner) return '<h2 tabindex="-1">What decided this trick?</h2><p>You picked '+pickedWinner+'. Which rule gives that seat the next lead?</p><div class="actions">'+button('Highest card in the suit led','led')+button('Highest card in any suit','any')+button('Declarer leads after each trick','declarer')+'</div>';
        if (state.finished.length === 0 || progress.phase==='fresh') return '<h2 tabindex="-1">Who leads the next trick?</h2><p>In no-trump the highest card in the led suit wins. Its player leads next.</p><div class="actions">'+seats.map(s=>button(s,s)).join('')+'</div>';
        const w = winner(state.trick), winningCard = state.trick.find(p=>p.seat===w).card;
        return '<h2 tabindex="-1">'+w+' wins this trick</h2><p>The '+cardName(winningCard)+' is the highest card in the led suit.</p><div class="actions">'+
          button(state.finished.length===2 ? 'Count the contract' : 'Start the next trick','collect',true)+'</div>';
      }
      const first = state.finished.length === 0;
      let text = state.turn === 'North' ? 'You choose a card from dummy’s face-up hand.' : 'Choose a card from your South hand.';
      if (progress.phase === 'guided' && first) text += ' Dummy’s ace already wins this trick. Can you follow suit and keep your king for later?';
      else if (state.trick.length) text += ' Follow '+suitNames[state.trick[0].card[1]]+' if you hold any.';
      else text += ' You may lead any suit.';
      return '<h2 tabindex="-1">Play from '+state.turn+'</h2><p>'+text+'</p>';
    }

    function render(focus) {
      let body;
      if (progress.phase === 'opening') {
        body = '<section class="panel"><h2 tabindex="-1">Who makes the opening lead?</h2><p>You sit South and declare one no-trump (1NT). Your partnership needs seven of the thirteen tricks. Each trick is one card from each seat.</p><p>The player on declarer’s left leads the first card. Play goes clockwise: South, West, North, East. After the opening lead, your partner North lays down a hand called dummy. You choose cards for both hands.</p><div class="actions">'+seats.map(s=>button(s,s)).join('')+'</div></section>';
      } else if (state.finished.length === 3) {
        const made = state.ns >= 7;
        const history = state.finished.map((t, i) => '<li>Trick '+(i+11)+' · '+t.winner+' won with '+cardName(t.trick.find(p=>p.seat===t.winner).card)+'.</li>').join('');
        body = '<section class="panel"><span class="over">'+(progress.phase==='fresh'?'Independent checkpoint':'Guided hand')+'</span><h2 tabindex="-1">'+(made ? 'You made one no-trump' : 'The contract is down '+(7-state.ns))+'</h2><p>North–South won '+state.ns+' of thirteen tricks. The contract needed seven.</p><ol>'+history+'</ol>' +
          '<p>'+ (made ? 'Keeping a high card when partner already held the winning card let your side collect a later trick.' : 'Replay the ending. Keep separate winners in the two hands when your partnership already has the trick.')+'</p><div class="actions">'+
          (made ? button(progress.phase==='guided'?'Try a fresh checkpoint':'Try another checkpoint','fresh',true) : button('Replay this ending','replay',true))+
          '<a class="btn" href="#bridge">Bridge course map</a></div></section>';
      } else {
        const mode = progress.phase === 'guided' ? 'Guided hand' : 'Independent checkpoint';
        body = '<p>Ten tricks are complete. Your side won four and needs the last three. The defenders play automatically.</p><div class="grid">'+table()+
          '<section class="panel"><span class="over">'+mode+' · Trick '+(11+state.finished.length)+'</span>'+prompt()+'</section></div>';
      }
      root.innerHTML = '<section class="intro"><span class="over">Bridge Foundations</span><h1>Play a no-trump ending</h1></section>'+body+
        '<p class="feedback" role="status"></p><p class="gameLinks"><a href="#bridge">Back to Bridge Foundations</a></p>';
      root.querySelector('[role="status"]').textContent = note;
      if (focus) (root.querySelector('[data-card]') || root.querySelector('h2'))?.focus({preventScroll:true});
    }

    function feedback(message) {
      root.querySelector('[role="status"]').textContent = message;
    }

    function commit(action, message) {
      if (!advance(state, action)) return false;
      progress.actions.push(action);
      if (state.finished.length === 3 && state.ns >= 7) {
        if (progress.phase === 'guided') progress.guidedComplete = true;
        else progress.checkpointComplete = true;
      }
      note = message;
      save();
      render(true);
      return true;
    }

    // A fresh container scopes the listener to this visit even when the app reuses its main element.
    const outer = root;
    root = document.createElement('div');
    outer.replaceChildren(root);
    root.addEventListener('click', event => {
      const b = event.target.closest('button');
      if (!b) return;
      const apply = () => {
        if (b.isConnected===false) return;
        const latest = persistent ? readRaw() : previous;
        if (latest!==previous) {
          previous=latest;
          progress=decodeProgress(latest);
          state=resume(progress.seed,progress.actions);
          pickedWinner='';
          note='This hand was updated in another tab. Continue from the current trick.';
          render(true);
          return;
        }
        handleChoice(b);
      };
      if (typeof CourseProgress!=='undefined' && CourseProgress.withLock) return CourseProgress.withLock(storageKey,apply);
      apply();
    });
    function handleChoice(b) {
      const action = b.dataset.bridge;
      if (b.dataset.card) {
        const card = b.dataset.card;
        if (!commit(card,'')) feedback('You have '+suitNames[state.trick[0].card[1]]+'. Follow that suit before discarding.');
      } else if (progress.phase === 'opening') {
        if (action === 'West') start('guided');
        else feedback('South declares. From South, move one seat clockwise to find the opening leader.');
      } else if (action === 'fresh') start('fresh');
      else if (action === 'replay') {
        progress.attempt++;
        progress.actions = []; state = createEnding(progress.seed); note=''; save(); render(true);
      } else if (state.trick.length === 4) {
        const w = winner(state.trick);
        if (progress.phase==='fresh' && action===w && !pickedWinner) {
          pickedWinner=w;note='';render(true);return;
        }
        if (pickedWinner && action!=='led') {feedback('Start with the suit of the first card. Only cards of that suit can win in no-trump.');return;}
        if (action === w || action === 'collect' || (action==='led' && pickedWinner===w)) {
          pickedWinner='';
          const high = state.trick.find(p=>p.seat===w).card;
          commit('collect',w+' won with the '+cardName(high)+'.'+(state.finished.length===2?' That was the final trick.':' '+w+' has the next lead.'));
        } else feedback('Check the led suit and find its highest card. The seat that played it leads next.');
      }
    }
    render(false);
  }

  return {mount, createEnding, legalCards, winner, advance, resume};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Bridge;
