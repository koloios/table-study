'use strict';

// A scripted four-seat hand. Only the action log and deal seed need to be saved.
const Capstone = (() => {
  const key = 'table-study.holdem-capstone.v1';
  const seedCount = 4 * 2 * 2 * 44;
  const seatNames = ['Mira', 'Sol', 'You', 'Ivo'];
  const roles = ['Big blind', 'Cutoff', 'Button', 'Small blind'];
  const pct = n => (100 * n).toFixed(1) + '%';
  const freshSeed = () => Math.floor(Math.random() * seedCount);

  function setup(seed) {
    const rotate = cards => cards.map(card => card[0] + Poker.suits[(Poker.suits.indexOf(card[1]) + seed) % 4]);
    const hero = rotate(['A♥','7♥']);
    const board = rotate(['K♥','4♥','2♣','9♠']);
    const range = [rotate(['K♣','Q♣']), rotate(['K♦','K♠'])];
    const starting = Math.floor(seed / 4) % 2 ? 28 : 20;
    return {hero, board, range, starting};
  }

  function turnMath(deal) {
    const rows = deal.range.map(opp => {
      const rivers = Poker.rivers({you:deal.hero, board:deal.board, opp});
      const wins = rivers.filter(row => row.result > 0).length;
      const ties = rivers.filter(row => row.result === 0).length;
      return {wins, ties, total:rivers.length};
    });
    const equity = rows.reduce((sum, r) => sum + (r.wins + r.ties / 2) / r.total, 0) / rows.length;
    return {rows, equity, ...Poker.callPrice(30, deal.starting - 12, equity)};
  }

  function decision(deal, index) {
    const common = {hero:deal.hero, board:[], pot:3, folded:[], street:'Preflop', context:''};
    if (index === 0) return {...common, title:'Who is first to act?',
      context:'Four players, blinds 1/2, and the button is yours. Mira starts with '+deal.starting+' chips. The other players start with 100. Ivo posts 1 and Mira posts 2.',
      prompt:'Follow the seats clockwise. Who has the first preflop decision?', options:seatNames};
    if (index === 1) return {...common, folded:['Sol'], title:'Open from the button',
      context:'Sol folds. Both blinds are still in. In this exercise, they often fold weak hands to a button raise.',
      prompt:'You have a suited ace and will act last after the flop. Choose between opening to 6 and folding.', options:['Raise to 6','Fold']};

    const flop = {...common, board:deal.board.slice(0,3), pot:24, folded:['Sol'], street:'Flop'};
    if (index === 2) return {...flop, title:'What does the next card offer?',
      context:'Ivo and Mira call your raise. The pot is 18. Ivo checks. Mira bets 6 and has '+(deal.starting - 12)+' behind.',
      prompt:'For this estimate, assume the betting gives no clues about anyone’s cards. With four cards of one suit visible, what is your chance of completing a flush on the turn?',
      options:['9 of 47 · 19.1%', 'About 35% over two cards', '9 of 44 · 20.5%']};
    if (index === 3) return {...flop, title:'Face the flop bet',
      context:'The pot now holds 24, including Mira’s 6. Ivo checked and still acts after you.',
      prompt:'Compare calling 6 with folding. If Ivo calls or folds, a call gets you to the turn. Ivo can also raise now, and another bet is possible on the turn.',
      options:['Call 6','Fold']};

    const bet = deal.starting - 12;
    return {...common, board:deal.board.slice(), pot:30+bet, folded:['Sol','Ivo'], street:'Turn',
      title:'Price the last bet', context:'You call 6 and Ivo folds. With 30 in the pot, Mira bets her last '+bet+'.',
      prompt:'For this decision the coach gives '+deal.range[0].join(' ')+' and '+deal.range[1].join(' ')+
        ' equal weight. Mira’s actual cards are face down. Which action earns more chips on average against this range?',
      options:['Call '+bet,'Fold'], hint:'Count winning rivers against each holding separately. An ace can beat one pair. Some flush cards pair the board and give three kings a full house. Divide each count by 44 possible rivers. The holdings are equally likely, so average the two percentages. Compare that average with the call price, '+bet+' chips divided by the '+(30+2*bet)+' chips that would be in the final pot.'};
  }

  function explanation(deal, index, action) {
    if (index === 0) return (action==='Sol'?'Yes. ':'Sol acts first. ')+'Start clockwise from Mira, the big blind. Sol acts before you, then Ivo and Mira.';
    if (index === 1) return action==='Fold'?'Folding costs you 0 more chips. Against these blinds, a raise with a suited ace can win the blinds immediately and can play in position when called.':
      'Raising gives both blinds a chance to fold. If either calls, the button acts last on later streets.';
    if (index === 2) return (action.startsWith('9 of 47')?'Correct. ':'Use the one-card chance here. ')+
      'You see two hole cards and three board cards. Of 47 unseen cards, nine complete your flush on the turn. Counting two draws gives about 35.0% by the river.';
    if (index === 3) return 'If Ivo folds, calling costs 6 for a 30-chip pot, an immediate price of 20.0%. The turn flush chance is 19.1%. '+
      'You may also improve with an ace or face another bet. The flush chance alone cannot settle this decision.';
    const math = turnMath(deal);
    const bet = deal.starting - 12;
    const best = math.ev > 0 ? 'Calling' : 'Folding';
    return best+' earns more on average under the stated model. Against '+deal.range[0].join(' ')+', the nine flush cards and three remaining aces win. Against '+
      deal.range[1].join(' ')+', two flush cards pair the board and give Mira a full house. Your chance is ('+math.rows[0].wins+' + '+math.rows[1].wins+
      ') ÷ (2 × 44) ≈ '+pct(math.equity)+'. The price is '+bet+' ÷ '+math.finalPot+' ≈ '+pct(math.breakEven)+'. A call averages '+
      math.ev.toFixed(2)+' chips. Folding adds 0 from here.';
  }

  function settle(seed, deal, index, action) {
    if (action === 'Fold') {
      const folded = [...decision(deal,index).folded,'You'];
      const net = index===1?0:index===3?-6:-12;
      return {title:'You folded', net, folded, detail:index===4?
        'Mira takes the 30-chip pot and keeps her uncalled bet. Her cards stay face down.':
        'Your hand is over. The remaining players still have action. Their cards stay face down.'};
    }
    const opp = deal.range[Math.floor(seed / 8) % 2];
    const rivers = Poker.rivers({you:deal.hero, board:deal.board, opp});
    const river = rivers[Math.floor(seed / 16)].card;
    const board = [...deal.board,river];
    const yours = Poker.best([...deal.hero,...board]);
    const theirs = Poker.best([...opp,...board]);
    const bet = deal.starting - 12, finalPot = 30 + 2*bet;
    const won = Math.sign(yours.score - theirs.score);
    const payout = won>0?finalPot:won===0?finalPot/2:0;
    return {title:won>0?'You win at showdown':won===0?'Split pot':'Mira wins at showdown', net:payout-12-bet,
      pot:finalPot, folded:['Sol','Ivo'], board, opp,
      detail:'The river is '+river+'. You have '+yours.category+' and Mira has '+theirs.category+'. Your share of the '+finalPot+'-chip pot is '+payout+'.'};
  }

  function resume(seed, actions) {
    if (!Number.isInteger(seed) || seed < 0 || seed >= seedCount || !Array.isArray(actions) || actions.length > 5) return null;
    const deal = setup(seed), history = [];
    let view = decision(deal,0), result = null;
    for (const [index, action] of actions.entries()) {
      if (result || !view.options.includes(action)) return null;
      history.push({view, action, explanation:explanation(deal,index,action)});
      if (action==='Fold' || index===4) result = settle(seed,deal,index,action);
      else view = decision(deal,index+1);
    }
    return {view, result, history};
  }

  function readRecord() {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function load(raw) {
    try {
      const saved = JSON.parse(raw);
      if (saved && resume(saved.seed,saved.actions)) return saved;
    } catch {}
    return null;
  }

  function status() {
    const saved = load(readRecord());
    if (!saved) return 'new';
    return saved.actions.at(-1)==='Fold' || saved.actions.length===5?'complete':'resume';
  }

  function faces(hand) {
    return '<div class="cards">'+hand.map(card=>'<span class="card '+('♥♦'.includes(card[1])?'red':'')+
      '" role="img" aria-label="'+CardNotes.name(card)+'">'+(card[0]==='T'?'10':card[0])+'<span>'+card[1]+'</span></span>').join('')+'</div>';
  }

  function felt(view, result) {
    const folded = result?.folded || view.folded;
    const seats = seatNames.map((name,i)=>'<div class="seat s'+i+(name==='You'?' me':'')+(folded.includes(name)?' fold':'')+'">'+name+
      '<small>'+(folded.includes(name)?'Folded':roles[i])+'</small></div>').join('');
    const showdown = Boolean(result?.opp);
    const board = result?.board || view.board;
    const pot = result?.pot ?? (result && view.street==='Turn'?30:view.pot);
    return '<section class="felt" aria-label="Four-handed table"><div class="row"><span class="over">'+(showdown?'Showdown':view.street)+
      '</span><span class="badge">Pot · '+pot+'</span></div><div class="oval">'+seats+
      '<div class="center"><span class="big" aria-hidden="true">♠</span>Blinds 1 / 2</div></div>'+
      (board.length?'<small>Shared cards</small>'+faces(board):'')+'<small>Your cards</small>'+faces(view.hero)+
      (showdown?'<small>Mira’s cards</small>'+faces(result.opp):'')+'</section>';
  }

  function mount(root) {
    document.title = 'Play a four-handed hand · Table Study';
    let previousRecord = readRecord();
    let saved = load(previousRecord) || {seed:freshSeed(),actions:[]};
    let review = null;
    function save() {
      const raw = JSON.stringify(saved);
      try {localStorage.setItem(key,raw);previousRecord=raw;} catch {}
    }
    function anotherTabChangedHand() {
      const raw = readRecord();
      if (raw===previousRecord) return false;
      previousRecord=raw;
      saved=load(raw) || {seed:freshSeed(),actions:[]};
      review=null;
      render(true);
      return true;
    }
    const button = (label,action,main=false)=>'<button type="button" class="btn'+(main?' main':'')+'" data-cap="'+action+'">'+label+'</button>';
    function render(focus=false) {
      const state = resume(saved.seed,saved.actions);
      const frame = review===null?null:state.history[review];
      const view = frame?.view || state.view;
      let panel;
      if (frame) {
        const options = state.history.map((entry,i)=>'<option value="'+i+'"'+(i===review?' selected':'')+'>'+entry.view.street+' · '+entry.view.title+'</option>').join('');
        panel='<span class="over">Decision review</span><h2 tabindex="-1">'+view.title+'</h2><label>Decision <select data-cap-review>'+options+
          '</select></label><p>'+CardNotes.text(view.context)+'</p><p>'+CardNotes.text(view.prompt)+'</p><p>You chose <strong>'+frame.action+
          '</strong>.</p><p class="calc">'+CardNotes.text(frame.explanation)+'</p>'+button('Back to result','result');
      } else if (state.result) {
        const result = state.result;
        panel='<span class="over">Hand complete</span><h2 tabindex="-1">'+result.title+'</h2><p>'+CardNotes.text(result.detail)+
          '</p><p>Net change for the hand: '+(result.net>0?'+':'')+result.net+' chips.</p><p class="calc">'+CardNotes.text(state.history.at(-1).explanation)+
          '</p><div class="actions">'+button('Review a decision','review',true)+button('Deal a fresh hand','again')+'<a class="btn" href="#table">Practice Table</a></div>';
      } else {
        const previous = state.history.at(-1);
        panel='<span class="over">Decision '+(state.history.length+1)+' of 5</span><h2 tabindex="-1">'+view.title+'</h2>'+
          (previous?'<p class="calc">'+CardNotes.text(previous.explanation)+'</p>':'')+'<p>'+CardNotes.text(view.context)+'</p><p>'+CardNotes.text(view.prompt)+'</p>'+
          (view.hint?'<details><summary>Hint</summary><p>'+view.hint+'</p></details>':'')+
          '<div class="actions">'+view.options.map((label,i)=>button(label,'choose-'+i)).join('')+'</div>';
      }
      root.innerHTML='<section class="intro"><span class="over">Texas Hold’em / Capstone</span><h1 tabindex="-1">Play a four-handed hand</h1></section>'+
        '<div class="grid">'+felt(view,frame?null:state.result)+'<section class="panel decision-panel">'+panel+'</section></div>';
      if (focus) root.querySelector(focus==='review'?'[data-cap-review]':focus==='start'?'h1':'h2')?.focus();
    }

    root.addEventListener('click',event=>{
      const target = event.target.closest('button[data-cap]');
      if (!target || anotherTabChangedHand()) return;
      const action = target.dataset.cap;
      const state = resume(saved.seed,saved.actions);
      if (action==='again' && state.result) {
        const seed = freshSeed();
        // Match a new runout with the other turn price on every replay.
        saved={seed:(seed & ~4) | ((saved.seed ^ 4) & 4),actions:[]};
        review=null;save();render('start');return;
      }
      if (action==='review' && state.result) {review=state.history.length-1;render();root.querySelector('[data-cap-review]').focus();return;}
      if (action==='result' && state.result) {review=null;render(true);return;}
      if (state.result || !/^choose-[0-9]+$/.test(action)) return;
      const selected = state.view.options[Number(action.slice(7))];
      if (!selected) return;
      saved.actions.push(selected);
      save();render(true);
    });
    root.addEventListener('change',event=>{
      if (!event.target.matches('[data-cap-review]') || anotherTabChangedHand()) return;
      const index=Number(event.target.value);
      if (Number.isInteger(index) && index>=0 && index<saved.actions.length) {review=index;render('review');}
    });
    render();
  }
  return {mount,status,resume};
})();
