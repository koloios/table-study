'use strict';
(() => {
  const app=document.querySelector('#app');
  // A cached entry page can still request the pre-release script URLs.
  if(typeof CardNotes==='undefined' || typeof CardNotes.name!=='function' || typeof Course==='undefined' || typeof Course.riverHand!=='function' || typeof Strategy==='undefined'){
    const url=new URL(location.href);
    if(url.searchParams.get('edition')!=='strategy-1'){
      url.searchParams.set('edition','strategy-1');
      location.replace(url.href);
    } else app.textContent='The lesson files could not load. Refresh this page to try again.';
    return;
  }
  const {units,names,pct}=Course;
  const allUnits=[...units,...Strategy.units];
  let storage;
  try {storage=window.localStorage;} catch {}
  const progress=CourseProgress.open(storage,[...allUnits.map(u=>u.id),'river-hand'],Object.keys(Practice.skills));
  const {saved,store}=progress;
  const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function record(id,initialSeed) {
    if(!saved[id] || !Number.isInteger(saved[id].seed) || !Number.isInteger(saved[id].at)) {
      saved[id]={seed:initialSeed??Math.floor(Math.random()*10000),at:0,done:false};
      store();
    }
    return saved[id];
  }
  let retrySkill='',retryFailed=false,decision='',potConfirmed=false,batch=null;
  let unit,steps=[],entry,feedback='',correct=false,selected=[],river='',heartBlocked=false,bet=2,sample=[];
  function resetStep() {
    feedback='';correct=false;selected=[];river='';heartBlocked=false;bet=2;sample=[];decision='';potConfirmed=false;batch=null;
  }
  function activeStep(){
    const step=steps[entry.at];
    if(unit.id!=='sample'||entry.at!==2||!entry.lastBatch)return step;
    const {hits,n}=entry.lastBatch;
    const answer='Resetting restores the same 44 possible rivers';
    return {...step,title:'Interpret your own batch',
      body:'You just observed '+hits+' wins in a batch of '+n+'. Why can another batch of the same size produce a different count?',
      choices:['The deck adjusts to the last batch',answer,'The next batch must offset this one'],
      answer,explain:'Each river is a fresh random draw from the same 44 identities. Batch counts can vary even while the chance per deal stays fixed.',
      hint:'Which cards are available again after each reset?'};
  }
  function btn(label,action,value='',extra='') {
    return '<button type="button" class="btn '+(extra==='main'?'main':'')+'" data-action="'+action+'" data-value="'+escape(value)+'" '+(extra==='off'?'disabled':'')+'>'+escape(label)+'</button>';
  }
  function card(code,interactive=false) {
    const rank=code[0]==='T'?'10':code[0], suit=code[1];
    const tag=interactive?'button':'span';
    const attrs=interactive?' type="button" data-action="select" data-value="'+code+'" aria-pressed="'+selected.includes(code)+'"':' role="img"';
    return '<'+tag+attrs+' class="card '+('♥♦'.includes(suit)?'red ':'')+(interactive&&selected.includes(code)?'selected':'')+'" aria-label="'+CardNotes.name(code)+'">'+rank+'<span>'+suit+'</span></'+tag+'>';
  }
  function group(label,cards,pick=false) {
    return '<div><small>'+label+'</small><div class="cards">'+cards.map(c=>card(c,pick)).join('')+'</div></div>';
  }
  function table(v,seatQuestion=false) {
    const roles=['D · Button','SB · Small blind','BB · Big blind',v.pocket?'Cutoff':''];
    const seats=names.map((name,i)=>{
      const roleIndex=(i-v.button+4)%4;
      const hidden=(v.hideYourRole && i===2 && roleIndex!==0 || v.hideBlinds && roleIndex!==0) && !correct;
      const role=i===v.fold?'Folded':hidden?'':roles[roleIndex];
      const interactive=seatQuestion && !correct;
      const tag=interactive?'button':'div';
      const attrs=interactive?' type="button" data-action="answer" data-value="'+name+'"':'';
      return '<'+tag+attrs+' class="seat s'+i+(i===2?' me':'')+(i===v.fold?' fold':'')+'">'+name+'<small>'+role+'</small></'+tag+'>';
    }).join('');
    return '<div class="felt"><div class="row"><span class="over">'+v.street+'</span><span class="badge">Pot · '+v.pot+'</span></div><div class="oval">'+seats+'<div class="center"><span class="big" aria-hidden="true">♠</span>Blinds 1 / 2</div></div><small>'+(seatQuestion&&!correct?'Choose a seat on the table.':'Seats run clockwise · You sit at the bottom')+'</small>'+(v.pocket?'<div class="group">'+group('Your cards · starting stack '+v.stack,v.pocket)+'</div>':'')+'</div>';
  }
  function heartCounter(deal) {
    const known=new Set([...deal.board,...deal.you,...deal.opp]);
    const hearts=Array.from('A23456789TJQK',rank=>rank+'♥');
    const seen=hearts.filter(code=>known.has(code)).length;
    const rivers=Course.outcomes(deal);
    const wins=rivers.filter(row=>row.result>0).length;
    const presets=[['base',Course.base],['blocked',Course.blocked]];
    return '<section class="prob-study"><h3>Count the winning hearts</h3>'+
      '<div class="prob-switch" role="group" aria-label="Mira’s exposed aces"><small>Mira’s exposed aces</small>'+
      presets.map(([key,d])=>'<button type="button" data-action="heart-hand" data-value="'+key+'" aria-pressed="'+(deal===d)+'" aria-describedby="heart-result">'+CardNotes.hand(d.opp)+'</button>').join('')+'</div>'+
      '<div class="heart-strip">'+hearts.map(code=>CardNotes.card(code,known.has(code)?'already visible':'winning river')).join('')+'</div>'+
      '<small>Crossed-out hearts are already visible. Each remaining heart wins.</small>'+
      '<div class="prob-result" id="heart-result" role="status"><strong>'+wins+' in '+rivers.length+'</strong> '+pct(wins/rivers.length)+' chance to win</div>'+
      '<p>13 hearts − '+seen+' visible = '+wins+' winning rivers. '+wins+' ÷ '+rivers.length+' ≈ '+(wins/rivers.length).toFixed(4)+'. Multiply by 100 to express that chance as '+pct(wins/rivers.length)+'.</p>'+
      '<details id="river-denominator"><summary>Why '+rivers.length+' possible rivers?</summary><p>You see your two cards, Mira’s two and the four on the board. That leaves 52 − '+known.size+' = '+rivers.length+' unseen cards. Each is equally likely to be the river.</p></details></section>';
  }
  function riverGrid(v) {
    const possibilities=Course.outcomes(v.deal);
    const detail=river?'<p>'+[ ['You',v.deal.you],['Mira',v.deal.opp] ].map(([who,h])=>{
      const result=Poker.best([...h,...v.deal.board,river]);
      return who+' · '+result.category+' ('+CardNotes.hand(result.cards)+')';
    }).join('<br>')+'</p>':'';
    return '<details class="group river-options" id="river-options"><summary>Explore the 44 possible rivers</summary><small>Marked cards win for you</small><div class="outs">'+possibilities.map(o=>
      '<button class="out '+(o.result>0?'win':'')+'" data-action="river" data-value="'+o.card+'" aria-label="'+CardNotes.name(o.card)+(o.result>0?' winning river':' losing river')+'" aria-pressed="'+(river===o.card)+'">'+o.card.replace('T','10')+(o.result>0?'•':'')+'</button>'
     ).join('')+'</div>'+detail+'</details>';
  }
  function priceView(v) {
    const list=Course.outcomes(v.deal);
    const chance=list.filter(o=>o.result>0).length/list.length;
    const q=Poker.callPrice(12,bet,chance);
    return '<div class="group"><small>Mira’s all-in · pot before bet 12</small><div class="actions">'+[2,8].map(n=>'<button class="btn" data-action="bet" data-value="'+n+'" aria-pressed="'+(bet===n)+'">'+n+' chips</button>').join('')+'</div><p class="group calc">Final pot = 12 + '+bet+' + '+bet+' = '+q.finalPot+'<br>Break-even = '+bet+' ÷ '+q.finalPot+' = '+pct(q.breakEven)+'<br>Winning chance = '+pct(chance)+'<br>Average gain = ('+chance.toFixed(4)+'… × '+q.finalPot+') − '+bet+' ≈ '+q.ev.toFixed(2)+' chips</p></div>';
  }
  function labView(v) {
    const hits=sample.filter(x=>x.result===1).length,n=sample.length,p=9/44;
    return '<div class="group"><div class="actions">'+btn('Deal 10','deal',10)+btn('Add 100','deal',100)+btn('Reset sample','clear')+'</div><p class="group" role="status">'+(n?hits+' wins in '+n+' trials · '+pct(hits/n)+' observed':'No rivers dealt yet')+'</p><div class="bar"><b style="width:'+(n?100*hits/n:0)+'%"></b><i style="left:'+100*p+'%"></i></div><small>Mark · '+pct(p)+' expected'+(n?' · '+(n*p).toFixed(1)+' wins on average':'')+'</small><div class="bits" aria-hidden="true">'+sample.slice(-32).map(x=>'<i class="'+(x.result===1?'hit':'')+'"></i>').join('')+'</div>'+(n?'<small>Latest river '+sample[n-1].card+' · pale squares mark wins</small>':'')+(batch?'<details class="batch-note"><summary>How surprising was this batch?</summary><p>'+batchText(batch,p)+'</p><p>'+ (batch.hits===0?'All '+batch.n+' deals missed. Multiply the miss chance once per deal: (35/44)^'+batch.n+'.':'For exactly '+batch.hits+' wins, count the possible arrangements of wins and misses, then multiply by (9/44)^'+batch.hits+' × (35/44)^'+(batch.n-batch.hits)+'.')+'</p></details>':'')+'</div>';
  }
  function visual(v,seatQuestion=false) {
    if(v.kind==='table') return table(v,seatQuestion);
    if(v.inspect && heartBlocked) v={...v,deal:Course.blocked};
    const d=v.deal;
    return '<div class="felt"><div class="row"><span class="over">'+(d.board.length===5?'Showdown':'Turn · one card to come')+'</span><span class="badge">'+(v.hiddenOpponent?'Hidden opponent':'Exposed hands')+'</span></div><div class="group">'+group('Shared cards',d.board,v.select)+'</div><div class="twocol">'+group('Your cards',d.you,v.select)+(v.hiddenOpponent?'<div><small>Mira’s cards</small><p>Face down</p></div>':group('Mira’s cards',d.opp))+'</div>'+
      (v.inspect?heartCounter(d)+riverGrid(v):'')+(v.price?priceView(v):'')+(v.lab?labView(v):'')+'</div>';
  }
  const ranking='<details><summary>Hand rankings, strongest first</summary><ol class="ranklist"><li>Straight flush · five consecutive cards of one suit. Ace-high is a royal flush.</li><li>Four of a kind · four equal ranks</li><li>Full house · three of one rank and two of another</li><li>Flush · five cards of one suit</li><li>Straight · five consecutive ranks. An ace can be high or low.</li><li>Three of a kind</li><li>Two pair</li><li>One pair</li><li>High card</li></ol></details>';
  function library() {
    document.title='Courses · Table Study';
    app.innerHTML=`<section class="intro"><span class="over">Course library</span><h1>Choose your game</h1><p>Take a seat on your own. Learn the rhythm of a hand, then explore the decisions and probabilities behind it.</p></section>
      <div class="catalog"><section class="felt track-card"><span class="over">Foundations and intermediate</span><h2>Texas Hold’em</h2>
      <p>Follow the button, read your hand and discover what a call is worth.</p>
      <nav class="course-entrances" aria-label="Texas Hold’em">
        <a class="btn main" href="#holdem">Enter Hold’em Foundations</a>
        <a class="btn outlined" href="#table">Play at the Practice Table</a>
        <a class="btn outlined" href="#intermediate">Enter Intermediate Hold’em</a>
      </nav></section>
      <section class="paper track-card"><span class="over">Playable pilot</span><h2>Contract bridge</h2><p>Follow suit, read your partner’s play and learn what a contract asks you to do.</p><a class="btn" href="#bridge">Enter Bridge Foundations</a></section></div>`;
  }
  function intermediate() {
    const resumeLabel=(id,verb)=>{
      const {stage}=Intermediate.status(id);
      return stage===2?'Revisit the unit':stage===1?'Resume independent hand':verb;
    };
    document.title='Intermediate Hold’em · Table Study';
    app.innerHTML=`<section class="intro"><span class="over">Texas Hold’em / Intermediate</span>
      <h1>Think beyond your hand</h1><p>Start with the hands Mira could hold. Then choose a bet and plan what you’ll do when the board changes.</p><a href="#hidden-hand">Start with one exposed hand</a></section>
      <div class="catalog"><section class="felt track-card"><span class="over">Unit 1 · Opponent ranges</span>
      <h2>What could Mira hold?</h2><p>Face the same price twice. See how blockers and Mira’s betting history change which cards can win for you.</p>
      <a class="btn main" href="#intermediate/ranges">${resumeLabel('ranges','Study the range')}</a></section>
      <section class="paper track-card"><span class="over">Unit 2 · Bet sizing</span><h2>Plan the next street</h2>
      <p>Choose a flop size and a reason. Commit to a plan for two different turns before seeing the next card.</p>
      <a class="btn" href="#intermediate/streets">${resumeLabel('streets','Play the flop')}</a></section></div>
      <p class="gameLinks"><a href="#table/river">Practise catching a river bluff</a> · <a href="#holdem">Revisit Foundations</a></p>`;
  }
  function bridge() {
    document.title='Bridge Foundations · Table Study';
    app.innerHTML=`<section class="intro"><span class="over">Contract bridge / Foundations</span><h1>Learn your first tricks</h1>
      <p>Sit South as declarer. Choose cards for your hand and your partner’s exposed hand, called dummy.</p></section>
      <div class="grid"><section class="felt track-card"><span class="over">Playable pilot · No-trump</span><h2>Bring the contract home</h2>
      <p>Find the opening leader, follow the suit led and win tricks with three cards left in each hand. Then try a fresh ending.</p>
      <a class="btn main" href="#bridge/play">Play the no-trump lesson</a></section>
      <section class="paper"><h2>At a bridge table</h2><ol class="bridge-map"><li>Each trick starts with a lead. Everyone plays one card clockwise.</li>
      <li>Follow the suit led whenever you can. In no-trump, the highest card in that suit wins the trick.</li>
      <li>The winner leads next. North and South count their tricks together.</li></ol><p class="note">The pilot begins with a contract already agreed. Bidding is a later topic.</p></section></div>`;
  }
  function retryList() {
    const items=Object.entries(saved.practice || {}).filter(([id])=>Object.hasOwn(Practice.skills,id));
    if(!items.length)return '';
    return '<section class="paper retry-list"><h2>Your practice hands</h2><p>Try a fresh example of a skill that needed a retry. A first-try answer clears it from this list.</p><div class="actions">'+items.map(([id])=>'<a class="btn" href="#practice/'+id+'">'+Practice.skills[id]+'</a>').join('')+'</div></section>';
  }
  function remember(skill) {
    if(!skill)return;
    saved.practice ||= {};
    if(!saved.practice[skill])saved.practice[skill]={seed:(entry.seed+1)%10000};
    if(retrySkill)retryFailed=true;
    store();
  }
  function noteMistake() {remember(retrySkill || Practice.skillAt(unit.id,entry.at));}
  function batchText(batch,p) {
    const {n,hits}=batch;
    const frequency=pct(hits/n);
    const probability=Practice.batchProbability(n,hits,p);
    const likely=probability<0.0005?'under 0.1%':pct(probability);
    return 'Your last '+n+' deals produced '+hits+' wins ('+frequency+'). At '+pct(p)+' per deal, the expected count is '+(n*p).toFixed(1)+'. The chance of exactly '+hits+' wins in a batch this size is '+likely+'.';
  }
  // Keep the first submitted result for each checkpoint on this run of the lesson.
  function recordAttempt(step, passed) {
    if(retrySkill || !step.checkpoint)return;
    entry.attempts ||= {};
    const previous=entry.attempts[entry.at];
    if(previous==='first' || previous==='assisted' || (previous==='retry' && !passed))return;
    entry.attempts[entry.at]=passed ? (previous==='retry'?'assisted':'first') : 'retry';
    store();
  }
  function attemptSummary(state) {
    const attempts=Object.values(state?.attempts || {});
    if(!attempts.length)return '';
    const first=attempts.filter(v=>v==='first').length;
    const assisted=attempts.filter(v=>v==='assisted').length;
    const retry=attempts.filter(v=>v==='retry').length;
    return first+' first try · '+assisted+' after a retry'+(retry?' · '+retry+' still practising':'');
  }
  function focusHeading(selector,preventScroll=true) {
    const heading=app.querySelector?.(selector);
    if(!heading)return;
    heading.tabIndex=-1;
    heading.focus({preventScroll});
  }
  function focusStep() {
    const step=steps[entry.at];
    const needsTable=step?.choices===names || step?.pick || step?.lab;
    focusHeading(!step || needsTable?'h1':'.panel h2');
  }
  function home() {
    const count=units.filter(u=>saved[u.id]?.done).length;
    const resume=units.find(u=>saved[u.id]?.at>0&&!saved[u.id]?.done)||units.find(u=>!saved[u.id]?.done)||units[0];
    const rows=units.map((u,i)=>{
      const state=saved[u.id];
      return '<li><a href="#'+u.id+'"><span class="num">0'+(i+1)+'</span><span><strong>'+u.title+'</strong><span class="desc">'+u.goal+'</span>'+(attemptSummary(state)?'<span class="desc">'+attemptSummary(state)+'</span>':'')+'</span><small>'+(state?.done?'Complete':state?.at?'Resume':'')+'</small></a></li>';
    }).join('');
    app.innerHTML='<section class="intro"><span class="over">Self-paced course</span><h1>Hold’em Foundations</h1><p>Take a seat, play through a hand, and learn how to decide whether a call is worth its price.</p></section><div class="grid"><div>'+table({street:'Your first table',button:0,pot:3})+'<div class="gameLinks"><a class="btn main" href="#'+resume.id+'">'+(count===units.length?'Revisit':saved[resume.id]?.at?'Resume':'Start')+' · '+resume.title+'</a></div></div><section class="paper"><span class="over">Course map</span><h2>At the table</h2><p class="note">'+count+' of '+units.length+' lessons complete · saved in this browser</p><ol class="map">'+rows+'</ol></section></div><details><summary>Practice with a real deck</summary><p>Use a 52-card deck alongside a seven-step exercise in shuffling, cutting, dealing and burning cards.</p><a href="turn-study/index.html#dealer-practice">Open the dealer exercise</a></details><p class="gameLinks"><a href="#preflop">Choose a preflop line</a> · <a href="#hidden-hand">From one hand to a range</a> · <a href="#intermediate">Intermediate Hold’em</a></p>';
    app.insertAdjacentHTML('beforeend','<p class="gameLinks"><a class="btn" href="#table">Play at the Practice Table</a></p>'+retryList());
    document.title='Table Study · Hold’em Foundations';
  }
  function completion() {
    const idx=units.indexOf(unit),next=units[idx+1];
    const summary=attemptSummary(entry);
    if(unit.onward){
      return '<div class="intro"><span class="over">Lesson complete</span><h1>'+unit.title+'</h1></div><section class="paper"><p>'+unit.goal+'</p>'+
        (summary?'<p class="calc">Independent checkpoints · '+summary+'</p>':'')+
        '<div class="actions"><a class="btn main" href="'+unit.onward+'">'+unit.nextTitle+'</a>'+btn('Replay this lesson','repeat')+'</div></section>';
    }
    if(unit.id==='rivers'){
      return '<div class="intro"><span class="over">Lesson complete</span><h1>Count the rivers</h1></div>'+
        '<section class="paper"><h2>Put your outs to work</h2><p>Take a fresh turn hand. Mira moves all-in. Count the cards that can beat her, then decide whether to pay for the river.</p>'+
        (summary?'<p class="calc">Independent checkpoints · '+summary+'</p>':'')+
        '<div class="actions"><a class="btn main" href="#rivers/play">Play the turn hand</a><a class="btn" href="#price">Next · Price a call</a>'+
        btn('Practise this lesson again','repeat')+'</div></section>';
    }
    return '<div class="intro"><span class="over">Lesson complete</span><h1>'+unit.title+'</h1><p>'+unit.goal+'</p></div><div class="paper"><h2>'+(next?'Keep your seat':'Review your progress')+'</h2><p>'+(next?'Your progress is saved. The next lesson is '+next.title.toLowerCase()+'.':units.every(u=>saved[u.id]?.done)?'You’ve completed Hold’em Foundations. On another day, revisit the checkpoints and explain your decisions before revealing the feedback.':'You finished the review hand. The course map shows which other lessons are ready to practise.')+'</p>'+(summary?'<p class="calc">Independent checkpoints · '+summary+'</p>':'')+'<div class="actions">'+(next?'<a class="btn main" href="#'+next.id+'">Next · '+next.title+'</a>':'<a class="btn main" href="#table">Play at the Practice Table</a> <a class="btn" href="#home">Course map</a>')+(unit.id==='seats'?'<a class="btn" href="#preflop">Practise preflop strategy</a>':'')+btn('Practise this lesson again','repeat')+'</div></div>';
  }
  function renderRiverHand() {
    const state=record('river-hand',saved.rivers?saved.rivers.seed+1:undefined);
    const {deal,winners,reason,total,chance,pot,bet,quote}=Course.riverHand(state.seed);
    const played=['Call','Fold'].includes(state.choice);
    const best=quote.ev>0?'Call':'Fold';
    const review=played?'<h2>Your '+state.choice.toLowerCase()+'</h2><p>'+
      (state.choice===best?'You chose the more profitable action.':'The other action earns more on average.')+
      '</p><h3>Which rivers win?</h3><p>'+CardNotes.hand(winners)+'</p><p>'+reason+' Eight cards are exposed, so '+
      winners.length+' of the '+total+' unseen cards win ('+pct(chance)+').</p>'+
      '<h3>What does the call cost?</h3><p>The final pot would be '+pot+' + '+bet+' + '+bet+' = '+quote.finalPot+' chips. You pay '+bet+
      ' to play for '+quote.finalPot+', so you need to win '+pct(quote.breakEven)+' of the time. Your '+pct(chance)+' chance is '+
      (best==='Call'?'above':'below')+' that price.</p><details><summary>Average chips per call</summary><p>Across all '+total+' rivers, a win gains '+
      (pot+bet)+' chips and a loss costs '+bet+'. ('+winners.length+' × '+(pot+bet)+' − '+(total-winners.length)+' × '+bet+') ÷ '+total+
      ' ≈ '+quote.ev.toFixed(2)+' chips per call. Folding adds 0 from this decision.</p></details>'+
      '<div class="actions"><a class="btn main" href="#price">Continue to Price a call</a><a class="btn" href="#hidden-hand">Try a hidden hand</a>'+btn('Deal another hand','new-turn')+'</div>':
      '<h2>Call or fold?</h2><p>The pot holds '+pot+' chips. Mira bets her last '+bet+'. You can see her cards for this exercise. Calling costs '+
      bet+' and takes you to showdown. Folding gives Mira the pot.</p>'+
      '<details><summary>How do I weigh the call?</summary><p>Count the rivers that beat Mira and divide by the number of unseen cards. Compare that chance with your call divided by the final pot, including both players’ bets.</p></details>'+
      '<div class="actions">'+btn('Call · '+bet+' '+(bet===1?'chip':'chips'),'turn-choice','Call')+btn('Fold','turn-choice','Fold')+'</div>';
    document.title='Play the turn hand · Table Study';
    app.innerHTML='<div class="intro"><span class="over">Foundations / River practice</span><h1>Play the turn hand</h1></div>'+
      '<div class="grid"><section aria-label="Current table">'+visual({kind:'cards',deal})+'</section>'+
      '<section class="panel"><span class="over">'+(played?'Decision review':'Your turn')+'</span>'+review+'</section></div>';
  }
  function renderLesson() {
    document.title=unit.title+' · Table Study';
    if(entry.at>=steps.length){app.innerHTML=completion()+retryList();return;}
    const s=activeStep();
    const label=retrySkill?'Targeted practice':s.checkpoint?'Independent checkpoint':s.choices||s.pick?'Your decision':'Guided practice';
    let actions='';
    if(correct && retrySkill) actions=retryFailed?btn('Try a fresh hand','fresh','','main'):'<a class="btn main" href="#holdem">Return to course map</a>';
    else if(correct) actions=btn(entry.at===steps.length-1?'Finish lesson':'Continue','next','','main');
    else if(s.quote && decision) {
      const amounts=[s.pot,s.pot+s.bet,s.quote.finalPot];
      actions='<p>You chose '+escape(decision.toLowerCase())+'. If you called, what would the final pot be?</p><div class="actions">'+amounts.map(n=>btn(n+' chips','final-pot',n)).join('')+'</div>';
    }
    else if(s.choices===names) actions='<span class="note">Tap your answer on the table.</span>';
    else if(s.choices) actions=s.choices.map(x=>btn(x,'answer',x)).join('');
    else if(s.pick) actions=btn('Check my five ('+selected.length+'/5)','check','','main');
    else actions=btn(s.button,'next','',s.lab&&!sample.length?'off':'main');
    const extras=(unit.id==='preflop' && entry.at>0?'<details><summary>Recall the table reads and plan</summary><p>'+CardNotes.text(steps[0].body)+'</p></details>':'')+(s.visual.ranking?ranking:'')+(unit.id==='seats'&&entry.at===0?'<details><summary>Dealing at home?</summary><p>Practise a shuffle, a cut, two rounds of private cards, and the three burns with a real deck.</p><a href="turn-study/index.html#dealer-practice">Open the dealer exercise</a></details>':'')+
      (s.guided?'<p><a class="btn main" href="turn-study/index.html?course=review">Open the coached table</a></p>':'');
    app.innerHTML='<div class="intro"><span class="over">'+(unit.onward?'Hold’em strategy':'Foundations')+' / '+(unit.onward?'Practice lesson':retrySkill?'Practice':('Lesson '+(units.indexOf(unit)+1)+' of 6'))+'</span><h1>'+unit.title+'</h1></div><div class="grid"><section aria-label="Current table">'+visual(s.visual,s.choices===names)+'</section><section class="panel"><span class="over">'+label+'</span><h2>'+s.title+'</h2><p>'+CardNotes.text(s.body)+'</p>'+extras+(unit.id==='sample' && entry.at===2 && entry.lastBatch?'<p class="calc">'+batchText(entry.lastBatch,9/44)+'</p>':'')+'<div class="actions">'+actions+'</div><div class="feedback" role="status">'+CardNotes.text(feedback)+'</div><div class="row controls">'+(retrySkill?'<a href="#holdem">Course map</a>':'<button class="plain" data-action="back" '+(entry.at===0?'disabled':'')+'>Back a step</button>')+'<span>'+(entry.at+1)+' / '+steps.length+'</span></div></section></div>';
  }
  function route() {
    let page=location.hash.slice(1);
    progress.refresh();
    if(page==='review/independent'){
      page='review';
      const review=record('review');
      if(review.at===0){review.at=1;store();}
      window.history?.replaceState(null,'','#review');
    }
    const nav=document.querySelector('#section-nav');
    unit=allUnits.find(u=>u.id===page);
    retrySkill='';
    resetStep();
    if(page==='rivers/play'){
      nav.textContent='Count the rivers';nav.href='#rivers';
      renderRiverHand();return;
    }
    if(page.startsWith('practice/')){
      const id=page.slice(9);
      if(Object.hasOwn(Practice.skills,id) && saved.practice?.[id]) {
        retrySkill=id;retryFailed=false;
        const seed=saved.practice[id].seed++;
        store();
        entry={at:0,seed};
        steps=[Practice.build(id,seed)];
        unit={id:'practice',title:'Your practice hand'};
        nav.textContent='Course map';nav.href='#holdem';
        renderLesson();return;
      }
    }
    nav.textContent=unit?'Course map':'Courses';nav.href=unit?'#holdem':'#library';
    if(!unit){
      if(['table','table/river','table/slumbot'].includes(page)) PracticeTable.mount(app,page,card);
      else if(page==='bridge/play'){
        nav.textContent='Bridge Foundations';nav.href='#bridge';
        document.title='No-trump lesson · Table Study';
        app.innerHTML='<div class="course-module"></div>';Bridge.mount(app.firstElementChild);
      }
      else if(page==='intermediate/ranges'||page==='intermediate/streets'){
        nav.textContent='Intermediate Hold’em';nav.href='#intermediate';
        document.title=(page.endsWith('ranges')?'Opponent ranges':'Plan the next street')+' · Table Study';
        app.innerHTML='<div class="course-module"></div>';Intermediate.mount(app.firstElementChild,page.split('/')[1]);
      }
      else if(page==='bridge')bridge();
      else if(page==='intermediate')intermediate();
      else if(page==='holdem'||page==='home'||page.startsWith('practice/'))home();
      else library();
      return;
    }
    entry=record(unit.id);steps=unit.build(entry.seed);entry.at=Math.max(0,Math.min(steps.length,entry.at));resetStep();renderLesson();
  }
  function finishPractice() {
    if(!correct || !retrySkill)return;
    if(retryFailed){feedback+=' Try another example to clear this skill.';return;}
    if(saved.practice[retrySkill]?.seed!==entry.seed+1){
      retryFailed=true;
      feedback+=' A newer hand is available for this skill.';
      return;
    }
    delete saved.practice[retrySkill];store();
    feedback+=' First try. This skill is cleared from your practice list.';
  }
  function next() {
    if(entry.at>=steps.length)return;
    entry.at++;if(entry.at===steps.length)entry.done=true;
    store();resetStep();renderLesson();focusStep();window.scrollTo(0,0);
  }
  function renderWithFocus(action,value) {
    const openDetails=action==='heart-hand'||action==='river' ? Array.from(app.querySelectorAll('details[id][open]'),el=>el.id) : [];
    renderLesson();
    for(const id of openDetails) app.querySelector('#'+id).open=true;
    const buttons=app.querySelectorAll('button[data-action]');
    const focus=Array.from(buttons).find(b=>b.dataset.action===action && (value===undefined||b.dataset.value===value));
    if(focus)focus.focus({preventScroll:true});
    else if(retrySkill && correct)app.querySelector?.('.panel .actions a, .panel .actions button')?.focus({preventScroll:true});
  }
  function gradeReviewDecision(s) {
    correct=decision===s.answer;
    recordAttempt(s,correct);
    const potWork=s.pot+' + '+s.bet+' + '+s.bet+' = '+s.quote.finalPot+' chips. ';
    if(correct) feedback=potWork+s.explain;
    else {
      decision='';
      feedback=potWork+'Your pot calculation is right. Compare the price of '+pct(s.quote.breakEven)+' with your chance of winning, then choose again.';
    }
    renderWithFocus(correct?'next':'answer');
  }
  function syncProgress(key=null) {
    const changes=progress.refresh(key);
    if(!changes.length)return false;
    if(location.hash==='#rivers/play' && changes.some(f=>f.id==='river-hand')){
      renderRiverHand();return true;
    }
    if(unit && !retrySkill && changes.some(f=>f.group==='lesson'&&f.id===unit.id)) {
      const fresh=saved[unit.id];
      if(!fresh || fresh.seed!==entry.seed || fresh.at!==entry.at){route();return true;}
      entry=fresh;
    }
    if(retrySkill && !saved.practice[retrySkill]){route();return true;}
    const page=location.hash.slice(1);
    if(page==='holdem' || page==='home')home();
    return false;
  }
  app.addEventListener('click',event=>{
    const b=event.target.closest('button[data-action]');if(!b||syncProgress())return;
    const action=b.dataset.action,value=b.dataset.value;
    if(location.hash==='#rivers/play'){
      const state=saved['river-hand'];
      const played=['Call','Fold'].includes(state.choice);
      if(action==='turn-choice' && !played && ['Call','Fold'].includes(value))state.choice=value;
      else if(action==='new-turn' && played){state.seed++;delete state.choice;}
      else return;
      store();renderRiverHand();
      if(action==='new-turn'){focusHeading('h1');window.scrollTo(0,0);}
      else focusHeading('.panel h2',false);
      return;
    }
    if(!unit)return;
    if(action==='fresh'){route();focusStep();return;}
    if(action==='repeat'){entry.seed++;entry.at=0;delete entry.attempts;store();route();focusStep();return;}
    const s=activeStep();if(!s)return;
    if(action==='next'){if(!s.quote || correct)next();return;}
    if(action==='back'){entry.at=Math.max(0,entry.at-1);store();resetStep();renderLesson();focusStep();return;}
    if(action==='answer'){
      if(s.quote){
        decision=value;
        if(value!==s.answer){recordAttempt(s,false);noteMistake();}
        if(potConfirmed){gradeReviewDecision(s);return;}
        feedback='';renderWithFocus('final-pot',String(s.pot));return;
      }
      correct=value===s.answer;
      recordAttempt(s,correct);
      if(!correct){
        if(unit.id==='rivers' && entry.at===3 && value==='9 wins in 43')remember('unseen');
        else noteMistake();
      }
      feedback=correct?s.explain:'Try again. '+s.hint;
      finishPractice();
      renderWithFocus(correct?'next':'answer',correct?undefined:value);return;
    }
    if(action==='final-pot'){
      potConfirmed=Number(value)===s.quote.finalPot;
      if(potConfirmed)gradeReviewDecision(s);
      else {recordAttempt(s,false);remember('pot');feedback='Try again. '+s.hint;renderWithFocus('final-pot',value);}
      return;
    }
    if(action==='select'){
      if(correct)return;
      if(selected.includes(value)) selected=selected.filter(c=>c!==value);
      else if(selected.length<5)selected.push(value);
      else {feedback='Five cards selected. Tap one to replace it.';renderWithFocus('select',value);return;}
      feedback='';renderWithFocus('select',value);return;
    }
    if(action==='check'){
      const deal=s.visual.deal;
      correct=selected.length===5 && Poker.five(selected).score===Poker.best([...deal.you,...deal.board]).score;
      feedback=correct?s.explain:selected.length<5?'Select five cards from your hand and the board.':'Another five are stronger. Compare pairs first, then the highest remaining kickers.';
      if(selected.length===5){recordAttempt(s,correct);if(!correct)noteMistake();}
      finishPractice();
      renderWithFocus(correct?'next':'check');return;
    }
    if(action==='heart-hand' && s.visual.inspect){
      heartBlocked=value==='blocked';
      const deal=heartBlocked?Course.blocked:Course.base;
      if(deal.opp.includes(river))river='';
      renderWithFocus(action,value);
      return;
    }
    if(action==='river'){river=value;renderWithFocus(action,value);return;}
    if(action==='bet'){bet=Number(value);renderWithFocus(action,value);return;}
    if(action==='clear'){sample=[];batch=null;delete entry.lastBatch;store();renderWithFocus(action);return;}
    if(action==='deal'){
      const possibilities=Course.outcomes(s.visual.deal);
      for(let i=0;i<Number(value);i++)sample.push(possibilities[Math.floor(Math.random()*possibilities.length)]);
      const n=Number(value);
      batch={n,hits:sample.slice(-n).filter(o=>o.result===1).length};entry.lastBatch=batch;store();
      renderWithFocus(action,value);
    }
  });
  window.addEventListener('storage',e=>syncProgress(e.key));
  window.addEventListener('hashchange',()=>{route();focusHeading('h1');window.scrollTo(0,0);});route();
})();
