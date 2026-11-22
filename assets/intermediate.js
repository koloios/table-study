'use strict';

const Intermediate = (() => {
  const rangeDeals = [
    {hero:['8♥','7♥'], board:['K♥','2♠','4♥','J♣'], candidates:[['A♣','A♦'],['A♥','Q♥'],['K♥','K♦']], pot:12, bet:3},
    {hero:['Q♣','J♣'], board:['T♣','9♦','2♣','4♠'], candidates:[['A♣','K♣'],['A♥','A♦'],['Q♣','Q♦']], pot:12, bet:9}
  ];
  const streetDeals = [
    {hero:['A♠','A♦'], board:['J♥','T♥','4♣'], range:[['K♥','Q♥'],['9♣','8♣'],['Q♣','J♣'],['J♦','9♦']],
      turns:['2♠','9♥'], pot:20, stack:100, value:'one-pair jacks', threat:'K♥ Q♥ makes a straight flush. J♦ 9♦ makes two pair.'},
    {hero:['A♠','9♠'], board:['9♣','8♣','3♥'], range:[['J♣','T♣'],['T♦','9♥'],['7♥','6♥'],['8♦','7♦']],
      turns:['2♦','7♣'], pot:20, stack:36, value:'a nine with a weaker kicker and a pair of eights', threat:'J♣ 10♣ makes a straight flush. 8♦ 7♦ makes two pair.'}
  ];
  const titles = {ranges:'Read a weighted range', streets:'Size a bet and plan the turn'};
  const combinations = hand => hand.join(' ').replaceAll('T', '10');
  const pct = value => Number((value * 100).toFixed(1)) + '%';
  const chips = value => (value > 0 ? '+' : '') + Number(value.toFixed(2));
  const scoreCache = new Map();

  function countRivers(hand, board, opp) {
    const key = [...hand, ...board, ...opp].join('|');
    if (!scoreCache.has(key)) {
      const rivers = Poker.rivers({you:hand, board, opp});
      const wins = rivers.filter(r => r.result > 0).map(r => r.card);
      const ties = rivers.filter(r => r.result === 0).map(r => r.card);
      scoreCache.set(key, {wins, ties, total:rivers.length, equity:(wins.length + ties.length/2) / rivers.length});
    }
    return scoreCache.get(key);
  }

  function analyzeRange(deal, flopBet) {
    const known = new Set([...deal.hero, ...deal.board]);
    const rows = deal.candidates.map((hand, index) => {
      if (hand.some(card => known.has(card))) return {hand, weight:0};
      // In the supplied histories, equally weighted prior shoves are split 3:1
      // between the two survivors for one signal, or 1:3 for the other.
      const count = ((index === 0) === flopBet) ? 3 : 1;
      return {hand, count, ...countRivers(deal.hero, deal.board, hand)};
    });
    const total = rows.reduce((n, row) => n + (row.count || 0), 0);
    for (const row of rows) row.weight = (row.count || 0) / total;
    const equity = rows.reduce((n, row) => n + row.weight * (row.equity || 0), 0);
    return {rows, equity, ...Poker.callPrice(deal.pot, deal.bet, equity)};
  }

  function analyzeTurn(deal, index, wager) {
    const board = [...deal.board, deal.turns[index]];
    const hands = deal.range.filter(hand => !hand.some(card => board.includes(card)));
    const rows = hands.map(hand => ({hand, ...countRivers(deal.hero, board, hand)}));
    const pot = deal.pot + 2*wager;
    return {rows, equity:rows.reduce((n,r) => n+r.equity, 0) / rows.length,
      pot, stack:deal.stack-wager, spr:(deal.stack-wager)/pot};
  }

  function status(page) {
    let record;
    try { record = JSON.parse(localStorage.getItem('table-study.intermediate.'+page+'.v1')); } catch {}
    return {stage:[0,1,2].includes(record?.stage) ? record.stage : 0, clean:record?.clean !== false};
  }

  function write(page, record) {
    try { localStorage.setItem('table-study.intermediate.'+page+'.v1', JSON.stringify(record)); } catch {}
  }

  function field(id, label, options) {
    return '<label>' + label + '<select name="' + id + '" required><option value="">Choose…</option>' +
      options.map(([value, text]) => '<option value="'+value+'">'+text+'</option>').join('')+'</select></label>';
  }

  function cards(hand) {
    const suits = {'♣':'clubs','♦':'diamonds','♥':'hearts','♠':'spades'};
    return '<div class="cards">' + hand.map(c => '<span class="card '+('♥♦'.includes(c[1])?'red':'')+
      '" role="img" aria-label="'+(c[0]==='T'?'10':c[0])+' of '+suits[c[1]]+'">'+
      (c[0]==='T'?'10':c[0])+'<span>'+c[1]+'</span></span>').join('')+'</div>';
  }

  function rangeFacts(deal) {
    const [a,b] = deal.candidates.map(combinations);
    return '<p>You face an all-in of '+deal.bet+' into '+deal.pot+' on the turn. There is one river to come.</p>'+
      '<h3>Mira’s betting history</h3><p>Among comparable turn shoves, these two possible holdings occur equally often before you check the flop history.</p>'+
      '<p>With '+a+', Mira bet the flop in 3 of 4 such hands. With '+b+', she bet the flop in 1 of 4. In each remaining hand she checked.</p>';
  }

  function rangeExercise(deal, guided) {
    const [bet, check] = [analyzeRange(deal,true),analyzeRange(deal,false)];
    const actions = [['call','Call'],['fold','Fold']];
    const blockedOptions = [deal.candidates[2], deal.candidates[0], deal.candidates[1]];
    const formulas = '<p>For each possible holding, remove its two cards together with your two cards and the four on the board. Count your wins over 44 possible rivers.</p>'+
      '<ul>'+bet.rows.filter(r=>r.weight).map(r=>'<li>'+combinations(r.hand)+' gives '+r.wins.length+' wins and '+r.ties.length+' ties. Winning rivers: '+combinations(r.wins)+'.</li>').join('')+'</ul>';
    const forms = [true,false].map(flopBet => {
      const id=flopBet?'bet':'check';
      return '<fieldset><legend>Mira '+(flopBet?'bet':'checked')+' the flop</legend><label>Chance you win (%) '+
        '<input type="number" min="0" max="100" step="0.1" name="'+id+'Share" required placeholder="0–100"></label>'+
        field(id+'Action','Your response to the turn all-in',actions)+'</fieldset>';
    }).join('');
    return {scene:rangeFacts(deal), prompt:'Which hands and histories matter?', body:
      '<p>Compare the same cards and price under two flop histories. Use the river counts below and enter your weighted chance to the nearest tenth of a percent.</p>'+
      '<details><summary>Inspect the river counts</summary>'+formulas+'</details>'+
      field('blocked','Which candidate is impossible?',blockedOptions.map(h=>[combinations(h),combinations(h)]))+forms,
      hint:'Cross out a hand that uses a visible card. After a flop bet, weight the first available holding three times as heavily as the second. After a check, reverse the weights. Divide the call by the final pot to find the price.',
      assess(data) {
        if (data.get('blocked')!==combinations(deal.candidates[2])) return 'A candidate includes a card in your hand or on the board. Remove that exact combination.';
        for (const [id,calc] of [['bet',bet],['check',check]]) {
          const history = id==='bet'?'flop bet':'flop check';
          if (Math.abs(Number(data.get(id+'Share'))-100*calc.equity) > 0.051)
            return 'Revisit the '+history+'. Multiply each holding’s win count by its share among hands with this history, add the results, then divide by 44.';
          if (data.get(id+'Action') !== (calc.ev>0?'call':'fold'))
            return 'Revisit the '+history+'. Compare your weighted chance with '+deal.bet+' divided by the final pot of '+calc.finalPot+'.';
        }
        return '';
      },
      review:'<p>'+combinations(deal.candidates[2])+' overlaps a visible card. The other two holdings survive. A flop bet weights them 3 to 1, and a flop check weights them 1 to 3.</p>'+
        [bet,check].map((r,i)=>'<p class="calc"><strong>After a flop '+(i?'check':'bet')+'</strong><br>('+r.rows[0].count+' × '+r.rows[0].wins.length+' + '+r.rows[1].count+' × '+r.rows[1].wins.length+') ÷ (4 × 44) = '+pct(r.equity)+
        '. A call averages '+chips(r.ev)+' chips. Folding adds 0.</p>').join('')+
        '<p>The call needs '+deal.bet+' ÷ '+bet.finalPot+' = '+pct(bet.breakEven)+'. The history changes the mix of hands you face and reverses the decision.</p>'+
        [bet,check].map((result,i)=>'<div class="range-compare"><span>After a flop '+(i?'check':'bet')+' · '+pct(result.equity)+' equity</span><div class="bar" aria-hidden="true"><b style="width:'+100*result.equity+'%"></b><i style="left:'+100*bet.breakEven+'%"></i></div></div>').join('')+'<small>The vertical mark is the break-even price.</small>',
      guide:guided?'Start with the two compatible holdings. For a flop bet, three examples carry the first holding and one carries the second. For example, (3 × 9 + 1 × 6) ÷ (4 × 44) gives 18.8% to one decimal place. Now reverse the weights for the other history.':''
    };
  }

  const reasons = [['value','Get called by weaker pairs and charge draws'], ['control','Keep a smaller pot and take the free turn'], ['guarantee','Guarantee that all drawing hands will fold']];
  const turnLines = [['value','Consider betting again for value if worse hands continue'],['caution','Check behind to preserve showdown value as strong draws arrive'],
    ['fixed','Bet automatically because my flop hand was ahead']];
  function streetExercise(deal, guided) {
    return {scene:'<p>You are on the button with '+deal.stack+' chips each behind a '+deal.pot+'-chip flop pot. Mira checks to you.</p>'+
      '<h3>What will she continue with?</h3><p>For this comparison, Mira holds one of four equally likely hands: '+deal.range.map(combinations).join(', ')+
      '. She calls either offered bet with all four, and checks to you again on the turn. If you check back, the same four hands reach the turn.</p>',
      prompt:'Make a two-street plan', body:
        '<p>Choose a flop line and its purpose. Plan for two possible turns before one is dealt. Your turn aim is to take value when weaker hands can call and control the pot when several draws improve.</p>'+
        field('size','Your flop action',[['0','Check back'],['10','Bet 10 · half pot'],['15','Bet 15 · three-quarter pot']])+
        field('reason','Reason for your flop line',reasons)+
        field('blank','If a low, off-suit card changes little',turnLines)+
        field('danger','If a suited connector completes draws',turnLines)+
        '<label>Chips left in your effective stack if your line reaches the turn <input type="number" required name="stack" min="0" max="'+deal.stack+'" step="1"></label>',
      hint:'From the button you act last after the flop. Checking ends this round and takes a free card. From the big blind a check could still face a bet. A value bet needs weaker hands that can call. With both bets called equally often here, the larger bet builds a larger pot and leaves less room to act later. Subtract your own bet once from your remaining stack.',
      assess(data) {
        const size=Number(data.get('size'));
        if (![0,10,15].includes(size)) return 'Choose a legal flop action.';
        if (data.get('reason') !== (size ? 'value' : 'control')) return 'Match the reason to your line. Mira continues with every listed hand against both sizes in this model.';
        if (Number(data.get('stack')) !== deal.stack-size) return 'Each player pays their own bet. Subtract your contribution from your starting stack.';
        if (data.get('blank')!=='value') return 'On a quiet turn, name a worse pair that can continue. A further value bet deserves consideration under the stated aim.';
        if (data.get('danger')!=='caution') return 'On the connecting turn, some draws now beat you. Consider taking the free river to protect your remaining stack.';
        return '';
      }, guide:guided?'You can justify checking for pot control, or betting either size for value. Plan what a change to the board would do to each hand in Mira’s range.':''
    };
  }

  function streetReview(deal, size, turnIndex) {
    const r = analyzeTurn(deal,turnIndex,size);
    return '<p><strong>'+ (size?'You bet '+size+' and Mira called.':'You checked back.') + '</strong> The turn pot is '+r.pot+
      ', with '+r.stack+' behind each. The effective stack is '+Number(r.spr.toFixed(2))+' times the pot.</p>'+
      '<p>Mira checks the '+deal.turns[turnIndex]+'. '+(turnIndex===0?'Your hand still leads '+deal.value+'. A bet can earn value if worse hands call.':deal.threat+' Checking behind keeps the pot unchanged.')+'</p>'+
      '<details><summary>Show the turn equity</summary><ul>'+r.rows.map(row=>'<li>'+combinations(row.hand)+': '+row.wins.length+' wins, '+row.ties.length+' ties in '+row.total+' rivers.</li>').join('')+'</ul>'+
      '<p>Weight each hand equally and count ties as half a win. Your showdown equity is '+pct(r.equity)+'. Future bets can change how much of the pot you actually win.</p></details>';
  }

  function mount(root, page) {
    if (!Object.hasOwn(titles,page)) return;
    const record = status(page);
    const onward = page==='ranges' ? ['#intermediate/streets',titles.streets] : ['#table/river','Try the river bluff lab'];
    let accepted=false, chosenSize, turnIndex;
    function render() {
      const guided = record.stage===0;
      const index = guided ? 0 : 1;
      const deal = (page==='ranges'?rangeDeals:streetDeals)[index];
      const task = page==='ranges'?rangeExercise(deal,guided):streetExercise(deal,guided);
      const intro='<section class="intro"><a href="#intermediate">Intermediate Hold’em</a><h1>'+titles[page]+'</h1></section>';
      if (record.stage===2) {
        root.innerHTML=intro+'<section class="paper"><h2>Lesson complete</h2><p>'+
          (record.clean?'You completed the independent hand on your first attempt without a hint.':'You completed the independent hand with practice.')+
          '</p><div class="actions"><a class="btn main" href="'+onward[0]+'">'+onward[1]+'</a><button class="btn" data-restart>Replay lesson</button></div></section>';
        root.querySelector('[data-restart]').onclick=()=>{record.stage=0;record.clean=true;accepted=false;write(page,record);render();};
        return;
      }
      const feedback = accepted ? '<div class="feedback" tabindex="-1" data-feedback><strong>Decision review</strong>'+
        (page==='ranges'?task.review:streetReview(deal,chosenSize,turnIndex))+'</div>'+
        (page==='streets'?'<button type="button" class="btn" data-other>Compare the other turn</button> ':'')+
        '<button class="btn main" data-next>'+(guided?'Try an independent hand':'Finish lesson')+'</button>' : '';
      root.innerHTML=intro+'<div class="grid intermediate-grid"><section class="felt"><span class="over">'+(guided?'Guided hand':'Independent hand')+
        ' · '+(page==='ranges'?'Turn':'Flop')+'</span><h2>At the table</h2><small>Community cards</small>'+cards(deal.board)+
        '<small>Your hand</small>'+cards(deal.hero)+task.scene+'</section><section class="panel decision-panel"><h2>'+task.prompt+'</h2>'+
        (accepted?feedback:'<form class="intermediate-fields">'+(task.guide?'<p>'+task.guide+'</p>':'')+task.body+
        '<details data-hint><summary>Hint</summary><p>'+task.hint+'</p></details><div class="feedback" role="status" data-error></div><div class="actions"><button class="btn main" type="submit">'+
        (page==='ranges'?'Check my decisions':'Commit my plan and see the turn')+'</button></div></form>')+'</section></div>';
      if (accepted) {
        root.querySelector('[data-next]').onclick=()=>{record.stage++;accepted=false;write(page,record);render();root.querySelector('h1').setAttribute('tabindex','-1');root.querySelector('h1').focus();};
        const compare=root.querySelector('[data-other]');
        if (compare) compare.onclick=()=>{turnIndex=1-turnIndex;render();root.querySelector('[data-other]').focus();};
        return;
      }
      const markAssisted = () => {if(!guided){record.clean=false;write(page,record);}};
      root.querySelector('[data-hint]').ontoggle=event=>{if(event.currentTarget.open) markAssisted();};
      root.querySelector('form').onsubmit=event=>{
        event.preventDefault();
        const data=new FormData(event.target);
        const error=task.assess(data);
        if(error) {
          markAssisted();
          root.querySelector('[data-error]').textContent=error;
          return;
        }
        accepted=true;
        chosenSize=Number(data.get('size'));
        turnIndex=Math.random()<0.5 ? 0 : 1;
        render();
        root.querySelector('[data-feedback]').focus();
      };
    }
    document.title=titles[page]+' · Table Study';
    render();
  }

  return {mount,status,rangeDeals,streetDeals,analyzeRange,analyzeTurn,rangeExercise,streetExercise};
})();
