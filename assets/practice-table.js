'use strict';
const PracticeTable = (() => {
  const streets = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
  const names = ['You', 'Mira'];
  const modes = [
    ['table', 'Coached table'], ['table/river', 'River bluff lab'], ['table/slumbot', 'Play Slumbot']
  ];
  let game, handNumber = 0, decisions = [], reviewIndex = null, hint = false;
  let replay, drill = null;
  const reviewKey = 'table-study.completed-table.v1';
  let opponentTimer;
  const percentage = n => (n * 100).toFixed(1) + '%';

  function randomSeed() { return Math.floor(Math.random() * 0x100000000); }
  function randomFrom(seed) {
    return () => {
      seed = (Math.imul(1664525,seed) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
  }
  function startHand(setup) {
    game = HeadsUp.create({button:setup.button,stacks:setup.stacks,rng:randomFrom(setup.deckSeed)});
    replay = {...setup, moves:[]};
    handNumber = setup.number;
    decisions = [];
    reviewIndex = null;
    drill = null;
    hint = false;
  }
  function deal(button, stacks) {
    startHand({button,stacks,number:handNumber+1,deckSeed:randomSeed(),coachSeed:randomSeed()});
    try { sessionStorage.removeItem(reviewKey); } catch {}
  }

  function play(action, estimate = null) {
    const view=game.view(0);
    game.act(action);
    replay.moves.push(action);
    if(view.actor!==0)return;
    const label=action.type==='raise'?(view.committed.every(n=>n===0)?'bet ':'raise to ')+action.to:
      action.type==='call'?'call '+view.legal.toCall:action.type;
    decisions.push({view,label,estimate});
  }
  function saveReview() {
    try {sessionStorage.setItem(reviewKey,JSON.stringify({replay,reviewIndex,drill}));} catch {}
  }
  function restoreReview() {
    try {
      const saved=JSON.parse(sessionStorage.getItem(reviewKey));
      if(!saved)return false;
      const setup=saved.replay;
      if(![setup.deckSeed,setup.coachSeed,setup.number].every(Number.isSafeInteger) || setup.number<1 ||
         !Array.isArray(setup.moves) || setup.stacks[0]+setup.stacks[1]!==200)return false;
      startHand(setup);
      for(const move of setup.moves)play(move);
      if(!game.view(0).result)return false;
      if(Number.isInteger(saved.reviewIndex) && decisions[saved.reviewIndex]){
        reviewIndex=saved.reviewIndex;
        const d=decisions[reviewIndex];
        d.estimate=estimateShare(d.view,reviewIndex);
        const prior=saved.drill;
        if(prior && skillsFor(d.view).includes(prior.skill) && Number.isSafeInteger(prior.seed) && prior.seed>=0){
          const task=Practice.build(prior.skill,prior.seed);
          drill={skill:prior.skill,seed:prior.seed,answer:task.choices.includes(prior.answer)?prior.answer:null};
        }
      }
      return true;
    } catch {return false;}
  }

  function skillsFor(view) {
    const skills=[];
    if(view.legal.toCall)skills.push('price');
    if(view.street==='turn')skills.push('outs');
    return skills;
  }

  function moveText(move) {
    switch (move.type) {
      case 'raise': return 'raised to ' + (move.to ?? move.amount);
      case 'bet': return 'bet ' + (move.to ?? move.amount);
      case 'call': return 'called ' + move.amount;
      case 'check': return 'checked';
      case 'fold': return 'folded';
      case 'return': return 'received ' + move.amount + ' uncalled';
      default: return 'posted the ' + move.type + ' · ' + move.amount;
    }
  }

  function controls(v) {
    const { canFold, canCheck, toCall, minRaiseTo, maxRaiseTo } = v.legal;
    const quick = (type, label, main = false) => '<button class="btn' + (main ? ' main' : '') +
      '" data-move="' + type + '">' + label + '</button>';
    const verb = v.committed.every(n => n === 0) ? 'Bet' : 'Raise to';
    const raise = maxRaiseTo > 0 && minRaiseTo > 0 && maxRaiseTo >= minRaiseTo
      ? '<form class="wager"><label>' + verb + ' <input name="amount" type="number" required step="1" min="' +
        minRaiseTo + '" max="' + maxRaiseTo + '" value="' + minRaiseTo + '"> chips</label>' +
        '<button class="btn" type="submit">' + (verb === 'Bet' ? 'Bet' : 'Raise') + '</button></form>'
      : '';
    return '<div class="actions">' + (canCheck ? quick('check', 'Check', true) : quick('call', 'Call ' + toCall, true)) +
      (canFold ? quick('fold', 'Fold') : '') + '</div>' + raise;
  }

  function price(v) {
    const cost = v.legal.toCall;
    if (!cost) return '<p>Checking costs 0 chips and keeps the pot the same.</p>';
    const finalPot = v.legal.potIfCalled;
    const closesBetting = v.street === 'river' || v.stacks[0] === cost || v.stacks[1] === 0;
    return '<p class="calc">Call ' + cost + ' to contest ' + finalPot + ' chips.<br>' +
      cost + ' ÷ ' + finalPot + ' = <strong>' + percentage(cost / finalPot) + '</strong></p><p>' +
      (closesBetting ? 'This call closes the betting. A call earns chips on average when your expected share of the pot exceeds that price.'
        : 'This is the immediate price. Later bets and folds can change what this call earns.') + '</p>';
  }

  function estimateShare(v,index) {
    return v.street === 'river' ? HeadsUp.riverEquity(v) : HeadsUp.equity(v, {samples:400,rng:randomFrom(replay.coachSeed+index)});
  }

  function math(v, estimate) {
    const river = v.street === 'river';
    const {toCall, potIfCalled} = v.legal;
    let comparison = '';
    if (toCall && (river || v.stacks[0] === toCall || v.stacks[1] === 0)) {
      const gain = estimate.equity * potIfCalled - toCall;
      const verdict = Math.abs(gain) < 0.005 ? 'Both actions break even' :
        gain > 0 ? 'Calling earns more than folding' : 'Folding earns more than calling';
      comparison = '<p class="calc">Call value = pot share × ' + potIfCalled + ' − ' + toCall +
        ' = <strong>' + gain.toFixed(2) + ' chips</strong>. Folding earns 0. ' + verdict +
        ' under this random-hand assumption' + (river ? '.' : ' in this sample.') + '</p>';
    }
    return price(v) + '<p>Assume Mira could hold any two unseen cards with equal probability. ' +
      (river ? 'Count every possible pair of unseen cards.' : 'Deal the remaining board at random.') +
      ' A tie counts as half a win.</p><p class="calc">(' +
      estimate.wins + ' wins + ½ × ' + estimate.ties + ' ties) ÷ ' + estimate.samples +
      (river ? ' possible hands' : ' simulated deals') + ' = <strong>' + percentage(estimate.equity) +
      (river ? ' exact' : ' estimated') + ' equity</strong></p><p class="note">' +
      (river ? '' : 'Repeated samples can differ. ') + 'Mira’s betting can narrow the hands she holds.</p>' + comparison;
  }

  function mount(app, mode, card) {
    clearTimeout(opponentTimer);
    document.title = modes.find(([id]) => id === mode)[1] + ' · Table Study';
    app.innerHTML = '<section class="intro table-intro"><span class="over">Texas Hold’em / Heads-up</span>' +
      '<h1>Practice Table</h1></section><nav class="table-modes" aria-label="Practice mode">' +
      modes.map(([id, label]) => '<a href="#' + id + '"' + (mode === id ? ' aria-current="page"' : '') +
        '>' + label + '</a>').join('') + '</nav><div class="table-mode"></div>';
    const root = app.querySelector('.table-mode');
    if (mode === 'table/river') { RiverLab.mount(root); return; }
    if (mode === 'table/slumbot') { HostedOpponent.mount(root); return; }
    if (!game && !restoreReview()) {handNumber=0;deal(0,[100,100]);}
    let currentEstimate = null;

    function player(v, seat) {
      const cards = seat === 0 ? v.hand : v.opponentHand;
      const role = v.button === seat ? 'Dealer · Small blind' : 'Big blind';
      return '<div class="table-player"><div class="pocket" aria-label="' + (seat === 0 ? 'Your' : 'Mira’s') + ' cards">' +
        (cards ? cards.map(c => card(c)).join('') : '<span class="covered-pair" role="img" aria-label="Two face-down cards"></span>') +
        '</div><div><b>' + names[seat] + '</b> <span class="stack">' + v.stacks[seat] + ' chips</span><small>' +
        role + '</small></div></div>';
    }

    function felt(v) {
      const shown = v.board.map(c => card(c)).join('');
      const slots = '<span class="board-slot" aria-hidden="true"></span>'.repeat(5 - v.board.length);
      const log = v.history.map(h => '<li><small>' + streets[h.street] + '</small> ' +
        names[h.seat] + ' ' + moveText(h) + '</li>').join('');
      return '<section class="felt live-felt" aria-label="Current table"><div class="row"><span class="over">Hand ' +
        handNumber + ' · ' + streets[v.street] + '</span><span class="badge">Blinds 1 / 2</span></div>' +
        player(v, 1) + '<div class="table-board"><div class="pot-chip">Pot <b>' + (v.result?.pot ?? v.pot) +
        '</b></div><div class="board-cards" aria-label="Community cards">' + shown + slots + '</div></div>' +
        player(v, 0) + '</section><details class="table-history"><summary>Hand history</summary><ol>' + log + '</ol></details>';
    }

    function actionPanel(v) {
      const last = v.history.at(-1);
      const before = last && last.seat === 1 ? 'Mira ' + moveText(last) + '. ' : '';
      const turn = v.legal.toCall ? 'It costs ' + v.legal.toCall + ' more to call.' : 'You can check for free.';
      const next = v.street === 'preflop' ? 'The dealer posts the small blind and acts first before the flop.'
        : 'The big blind acts first on the flop, turn and river.';
      return '<span class="over">Coached table · Local opponent</span><h2>Your turn</h2><p>' + before + turn +
        '</p>' + controls(v) + '<div class="table-coach"><button class="plain" data-ui="hint" aria-expanded="' + hint +
        '">' + (hint ? 'Hide hint' : 'Get a hint') + '</button>' + (hint ? '<p>' + next + ' ' +
        (v.legal.toCall ? 'Compare the chips you owe with the pot you could win.' : 'Consider which weaker hands would call a bet.') +
        '</p>' + (currentEstimate ? math(v, currentEstimate) : '<button class="btn" data-ui="math">Show the math</button>') : '') +
        '</div>';
    }

    function resultPanel(v) {
      const r = v.result, won = r.winner === null ? 'Split pot' : r.winner === 0 ? 'You won the pot' : 'Mira won the pot';
      return '<span class="over">Hand complete</span><h2>' + won + '</h2><p>' +
        (r.reason === 'fold' ? (r.winner === 0 ? 'Mira folded.' : 'You folded.') :
          'Your best hand was ' + r.categories[0] + '. Mira showed ' + r.categories[1] + '.') +
        '</p><p class="note">Each stack includes the chips awarded.</p><div class="actions"><button class="btn main" data-ui="next">' +
        (v.stacks.includes(0) ? 'Start a new match' : 'Deal next hand') + '</button>' +
        (decisions.length ? '<button class="btn" data-ui="review">Review a decision</button>' : '') + '</div>';
    }

    function reviewPanel() {
      const d = decisions[reviewIndex];
      const options = decisions.map((d, i) => '<option value="' + i + '"' + (i === reviewIndex ? ' selected' : '') +
        '>' + (i + 1) + ' · ' + streets[d.view.street] + ' · ' + d.label + '</option>').join('');
      return '<span class="over">Hand review</span><h2>Your decision</h2><label>Decision <select data-review>' +
        options + '</select></label><p>At this point you chose to ' + d.label + '.</p>' + math(d.view, d.estimate) +
        '<div class="actions">'+skillsFor(d.view).map(skill=>'<button class="btn" data-drill="'+skill+'">'+
          (skill==='price'?'Practise this call price on a fresh hand':'Practise counting winning rivers')+'</button>').join('')+
        '<button class="btn" data-ui="back">Back to result</button></div>';
    }

    function renderDrill() {
      const task=Practice.build(drill.skill,drill.seed);
      const {board,you,opp}=task.visual.deal;
      const group=(label,cards)=>'<div class="group"><small>'+label+'</small><div class="cards">'+cards.map(c=>card(c)).join('')+'</div></div>';
      const response=drill.answer===null?
        '<div class="actions">'+task.choices.map(answer=>'<button class="btn" data-response="'+answer+'">'+answer+'</button>').join('')+'</div>':
        '<p class="feedback" tabindex="-1">You chose '+drill.answer+'. '+(drill.answer===task.answer?'Correct. ':'The answer is '+task.answer+'. ')+CardNotes.text(task.explain)+'</p>';
      root.innerHTML='<div class="grid practice-grid"><section class="felt"><span class="over">Fresh exercise · Exposed hands</span>'+
        group('Turn board',board)+group('Your cards',you)+group('Mira’s cards',opp)+'</section>'+
        '<section class="panel decision-panel"><span class="over">From hand '+handNumber+' · Decision '+(reviewIndex+1)+'</span><h2 tabindex="-1">'+
        Practice.skills[drill.skill]+'</h2><p>'+task.body+'</p>'+response+
        '<div class="actions"><button class="btn" data-ui="return-review">Return to this decision</button></div></section></div>';
    }
    function render(focus) {
      const v = game.view(0);
      if(v.result)saveReview();
      if(drill){
        renderDrill();
        if(focus)root.querySelector(focus)?.focus();
        return;
      }
      const reviewing = reviewIndex !== null;
      const thinking = !v.result && v.actor === 1;
      const panel = reviewing ? reviewPanel() : v.result ? resultPanel(v) : thinking ?
        '<span class="over">Coached table · Local opponent</span><h2>Mira’s turn</h2><p>Mira is choosing an action.</p>' : actionPanel(v);
      root.innerHTML = '<div class="grid practice-grid"><div>' + felt(reviewing ? decisions[reviewIndex].view : v) +
        '</div><section class="panel decision-panel" aria-label="Decision controls" tabindex="-1">' + panel +
        '</section></div><details class="table-rules"><summary>How does Mira play?</summary>' +
        '<p>Mira is a local computer opponent. She estimates hand strength against random unseen cards and considers the price to call. Her strategy sometimes bluffs. You both start with 100 play chips and swap the button each hand.</p></details>';
      if (focus) (root.querySelector(focus) || root.querySelector('.decision-panel')).focus({preventScroll:true});
      if (thinking) {
        clearTimeout(opponentTimer);
        opponentTimer = setTimeout(() => {
          if (!root.isConnected) return;
          play(HeadsUp.chooseAction(game.view(1)));
          render('.decision-panel');
        }, 360);
      }
    }

    function take(action) {
      const view = game.view(0);
      if (view.actor !== 0 || view.result) return;
      play(action,currentEstimate);
      hint = false;
      currentEstimate = null;
      render('.decision-panel');
    }

    root.addEventListener('submit', event => {
      event.preventDefault();
      if (event.target.matches('.wager') && event.target.reportValidity())
        take({type:'raise', to:event.target.elements.amount.valueAsNumber});
    });
    root.addEventListener('change', event => {
      if (event.target.matches('[data-review]')) {
        reviewIndex = Number(event.target.value);
        const d = decisions[reviewIndex];
        d.estimate ||= estimateShare(d.view,reviewIndex);
        render('[data-review]');
      }
    });
    root.addEventListener('click', event => {
      const b = event.target.closest('button');
      if (!b) return;
      if (b.dataset.move) { take({type:b.dataset.move}); return; }
      const v = game.view(0);
      if(b.dataset.drill && reviewIndex!==null && skillsFor(decisions[reviewIndex].view).includes(b.dataset.drill)){
        drill={skill:b.dataset.drill,seed:randomSeed(),answer:null};
        render('h2');return;
      }
      if(drill && b.dataset.response && !drill.answer){
        const task=Practice.build(drill.skill,drill.seed);
        if(task.choices.includes(b.dataset.response))drill.answer=b.dataset.response;
        render('.feedback');return;
      }
      switch (b.dataset.ui) {
        case 'return-review': drill=null;render('[data-review]');break;
        case 'hint': hint = !hint; render('[data-ui="hint"]'); break;
        case 'math':
          currentEstimate ||= estimateShare(v,decisions.length);
          render('[data-ui="hint"]'); break;
        case 'review':
          reviewIndex = decisions.length - 1;
          decisions[reviewIndex].estimate ||= estimateShare(decisions[reviewIndex].view,reviewIndex);
          render('[data-review]'); break;
        case 'back': reviewIndex = null; render('[data-ui="review"]'); break;
        case 'next':
          deal(1 - v.button, v.stacks.includes(0) ? [100, 100] : v.stacks);
          currentEstimate = null;
          render('.decision-panel'); break;
      }
    });
    render();
  }

  return {mount};
})();
