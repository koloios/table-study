'use strict';
(() => {
  const app=document.querySelector('#app');
  const {units,names,pct}=Course;
  const key='table-study.foundations.v1';
  let saved={};
  try { saved=JSON.parse(localStorage.getItem(key)) || {}; } catch {}
  if (!saved || typeof saved!=='object' || Array.isArray(saved)) saved={};
  const store=()=>{try {localStorage.setItem(key,JSON.stringify(saved));} catch {}};
  const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function record(id) {
    if(!saved[id] || !Number.isInteger(saved[id].seed) || !Number.isInteger(saved[id].at)) {
      saved[id]={seed:Math.floor(Math.random()*10000),at:0,done:false};
    }
    return saved[id];
  }
  let retrySkill='',retryFailed=false,decision='',batch=null;
  let unit,steps=[],entry,feedback='',correct=false,selected=[],river='',bet=2,sample=[];
  function resetStep() {
    feedback='';correct=false;selected=[];river='';bet=2;sample=[];decision='';batch=null;
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
    const suitNames={'♥':'hearts','♣':'clubs','♦':'diamonds','♠':'spades'};
    const rank=code[0]==='T'?'10':code[0], suit=code[1];
    const tag=interactive?'button':'span';
    const attrs=interactive?' type="button" data-action="select" data-value="'+code+'" aria-pressed="'+selected.includes(code)+'"':'';
    return '<'+tag+attrs+' class="card '+('♥♦'.includes(suit)?'red ':'')+(interactive&&selected.includes(code)?'selected':'')+'" aria-label="'+rank+' of '+suitNames[suit]+'">'+rank+'<span>'+suit+'</span></'+tag+'>';
  }
  function group(label,cards,pick=false) {
    return '<div><small>'+label+'</small><div class="cards">'+cards.map(c=>card(c,pick)).join('')+'</div></div>';
  }
  function table(v,seatQuestion=false) {
    const roles=['D · Button','SB · Small blind','BB · Big blind',''];
    const seats=names.map((name,i)=>{
      const roleIndex=(i-v.button+4)%4;
      const hidden=(v.hideYourRole && i===2 && roleIndex!==0 || v.hideBlinds && roleIndex!==0) && !correct;
      const role=i===v.fold?'Folded':hidden?'':roles[roleIndex];
      const interactive=seatQuestion && !correct;
      const tag=interactive?'button':'div';
      const attrs=interactive?' type="button" data-action="answer" data-value="'+name+'"':'';
      return '<'+tag+attrs+' class="seat s'+i+(i===2?' me':'')+(i===v.fold?' fold':'')+'">'+name+'<small>'+role+'</small></'+tag+'>';
    }).join('');
    return '<div class="felt"><div class="row"><span class="over">'+v.street+'</span><span class="badge">Pot · '+v.pot+'</span></div><div class="oval">'+seats+'<div class="center"><span class="big" aria-hidden="true">♠</span>Blinds 1 / 2</div></div><small>'+(seatQuestion&&!correct?'Choose a seat on the table.':'Seats run clockwise · You sit at the bottom')+'</small></div>';
  }
  function riverGrid(v) {
    const possibilities=Course.outcomes(v.deal);
    const detail=river?'<p>'+[ ['You',v.deal.you],['Mira',v.deal.opp] ].map(([who,h])=>{
      const result=Poker.best([...h,...v.deal.board,river]);
      return who+' · '+result.category+' ('+result.cards.join(' ')+')';
    }).join('<br>')+'</p>':'';
    return '<div class="group"><small>Possible rivers · marked cards win for you</small><div class="outs">'+possibilities.map(o=>
      '<button class="out '+(o.result>0?'win':'')+'" data-action="river" data-value="'+o.card+'" aria-label="'+o.card+(o.result>0?' winning river':' losing river')+'" aria-pressed="'+(river===o.card)+'">'+o.card+(o.result>0?'•':'')+'</button>'
    ).join('')+'</div>'+detail+'</div>';
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
    const d=v.deal;
    return '<div class="felt"><div class="row"><span class="over">'+(d.board.length===5?'Showdown':'Turn · one card to come')+'</span><span class="badge">Exposed hands</span></div><div class="group">'+group('Shared cards',d.board,v.select)+'</div><div class="twocol">'+group('Your cards',d.you,v.select)+(v.hiddenOpponent?'<div><small>Mira’s cards</small><p>Face down</p></div>':group('Mira’s cards',d.opp))+'</div>'+
      (v.inspect?riverGrid(v):'')+(v.price?priceView(v):'')+(v.lab?labView(v):'')+'</div>';
  }
  const ranking='<details><summary>Hand rankings, strongest first</summary><ol class="ranklist"><li>Straight flush · five consecutive cards of one suit. Ace-high is a royal flush.</li><li>Four of a kind · four equal ranks</li><li>Full house · three of one rank and two of another</li><li>Flush · five cards of one suit</li><li>Straight · five consecutive ranks. An ace can be high or low.</li><li>Three of a kind</li><li>Two pair</li><li>One pair</li><li>High card</li></ol></details>';
  function library() {
    document.title='Courses · Table Study';
    app.innerHTML=`<section class="intro"><span class="over">Course library</span><h1>Choose your game</h1><p>Take a seat on your own. Learn the rhythm of a hand, then explore the decisions and probabilities behind it.</p></section>
      <div class="catalog"><section class="felt track-card"><span class="over">Six playable lessons</span><h2>Texas Hold’em</h2>
      <p>Follow the button, read your hand and discover what a call is worth.</p><a class="btn main" href="#holdem">Enter Hold’em Foundations</a></section>
      <section class="paper track-card"><span class="over">Planned course</span><h2>Contract bridge</h2><p>Follow suit, read your partner’s play and learn what a contract asks you to do.</p><a class="btn" href="#bridge">Preview Bridge Foundations</a></section></div>`;
  }
  function bridge() {
    document.title='Bridge Foundations · Course preview';
    app.innerHTML=`<section class="intro"><span class="over">Contract bridge / Planned course</span><h1>Bridge Foundations</h1><p>A solo course with a simulated partner and two opponents. Lessons are in planning.</p></section>
      <div class="grid"><section class="paper"><h2>From tricks to contracts</h2><ol class="bridge-map">
      <li><strong>Follow a trick.</strong> Take the South seat, follow suit, and identify who leads next.</li>
      <li><strong>Play with a partner.</strong> Read the four cards played and decide when to save a winner.</li>
      <li><strong>Meet dummy and trumps.</strong> Play a preset contract, see dummy after the opening lead, and discover when a trump wins.</li>
      <li><strong>Keep count.</strong> Track a suit, infer a shortage when someone discards, and revisit what the unseen hands could contain.</li>
      <li><strong>Bid and play a deal.</strong> Connect a simple auction to a contract, play it out and check whether your partnership made it.</li></ol></section>
      <aside class="felt"><span class="over">Example checkpoint</span><h2>Who leads next?</h2><p>In no-trump, West leads 4♠. North plays Q♠, East K♠, and you play 2♠. East wins with the king and leads the next trick.</p><p>Replay with A♠ in your hand. If you play it, the lead comes to you.</p></aside></div>
      <p class="gameLinks"><a href="#library">Back to courses</a></p>`;
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
  function home() {
    const count=units.filter(u=>saved[u.id]?.done).length;
    const resume=units.find(u=>saved[u.id]?.at>0&&!saved[u.id]?.done)||units.find(u=>!saved[u.id]?.done)||units[0];
    const rows=units.map((u,i)=>{
      const state=saved[u.id];
      return '<li><a href="#'+u.id+'"><span class="num">0'+(i+1)+'</span><span><strong>'+u.title+'</strong><span class="desc">'+u.goal+'</span></span><small>'+(state?.done?'Complete':state?.at?'Resume':'')+'</small></a></li>';
    }).join('');
    app.innerHTML='<section class="intro"><span class="over">Self-paced course</span><h1>Hold’em Foundations</h1><p>Take a seat, play through a hand, and learn how to decide whether a call is worth its price.</p></section><div class="grid"><div>'+table({street:'Your first table',button:0,pot:3})+'<div class="gameLinks"><a class="btn main" href="#'+resume.id+'">'+(count===units.length?'Revisit':saved[resume.id]?.at?'Resume':'Start')+' · '+resume.title+'</a></div></div><section class="paper"><span class="over">Course map</span><h2>At the table</h2><p class="note">'+count+' of '+units.length+' lessons complete · saved in this browser</p><ol class="map">'+rows+'</ol></section></div><details><summary>Practice with a real deck</summary><p>Use a 52-card deck alongside a seven-step exercise in shuffling, cutting, dealing and burning cards.</p><a href="turn-study/index.html#dealer-practice">Open the dealer exercise</a></details><details><summary>Next level · Intermediate Hold’em</summary><p>Intermediate Hold’em will use hidden ranges, changing board textures and multi-street decisions. This track is planned.</p></details>';
    app.insertAdjacentHTML('beforeend',retryList());
    document.title='Table Study · Hold’em Foundations';
  }
  function completion() {
    const idx=units.indexOf(unit),next=units[idx+1];
    return '<div class="intro"><span class="over">Lesson complete</span><h1>'+unit.title+'</h1><p>'+unit.goal+'</p></div><div class="paper"><h2>'+(next?'Keep your seat':'Review your progress')+'</h2><p>'+(next?'Your progress is saved. The next lesson is '+next.title.toLowerCase()+'.':units.every(u=>saved[u.id]?.done)?'You’ve completed Hold’em Foundations. On another day, revisit the checkpoints and explain your decisions before revealing the feedback.':'You finished the review hand. The course map shows which other lessons are ready to practise.')+'</p><div class="actions">'+(next?'<a class="btn main" href="#'+next.id+'">Next · '+next.title+'</a>':'<a class="btn main" href="#home">Course map</a>')+btn('Practise this lesson again','repeat')+'</div></div>';
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
    const extras=(s.visual.ranking?ranking:'')+(unit.id==='seats'&&entry.at===0?'<details><summary>Dealing at home?</summary><p>Practise a shuffle, a cut, two rounds of private cards, and the three burns with a real deck.</p><a href="turn-study/index.html#dealer-practice">Open the dealer exercise</a></details>':'')+
      (s.guided?'<p><a class="btn main" href="turn-study/index.html?course=review">Open the coached table</a></p>':'');
    app.innerHTML='<div class="intro"><span class="over">Foundations / '+(retrySkill?'Practice':('Lesson '+(units.indexOf(unit)+1)+' of 6'))+'</span><h1>'+unit.title+'</h1></div><div class="grid"><section aria-label="Current table">'+visual(s.visual,s.choices===names)+'</section><section class="panel"><span class="over">'+label+'</span><h2>'+s.title+'</h2><p>'+s.body+'</p>'+extras+(unit.id==='sample' && entry.at===2 && entry.lastBatch?'<p class="calc">'+batchText(entry.lastBatch,9/44)+'</p>':'')+'<div class="actions">'+actions+'</div><div class="feedback" role="status">'+escape(feedback)+'</div><div class="row controls">'+(retrySkill?'<a href="#holdem">Course map</a>':'<button class="plain" data-action="back" '+(entry.at===0?'disabled':'')+'>Back a step</button>')+'<span>'+(entry.at+1)+' / '+steps.length+'</span></div></section></div>';
  }
  function route() {
    const page=location.hash.slice(1);
    const nav=document.querySelector('#section-nav');
    unit=units.find(u=>u.id===page);
    retrySkill='';
    resetStep();
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
      if(page==='bridge')bridge();
      else if(page==='holdem'||page==='home'||page.startsWith('practice/'))home();
      else library();
      return;
    }
    entry=record(unit.id);steps=unit.build(entry.seed);entry.at=Math.max(0,Math.min(steps.length,entry.at));resetStep();renderLesson();
  }
  function finishPractice() {
    if(!correct || !retrySkill)return;
    if(retryFailed){feedback+=' Try another example to clear this skill.';return;}
    delete saved.practice[retrySkill];store();
    feedback+=' First try. This skill is cleared from your practice list.';
  }
  function next() {
    if(entry.at>=steps.length)return;
    entry.at++;if(entry.at===steps.length)entry.done=true;
    store();resetStep();renderLesson();window.scrollTo(0,0);
  }
  function renderWithFocus(action,value) {
    renderLesson();
    const buttons=app.querySelectorAll('button[data-action]');
    const focus=Array.from(buttons).find(b=>b.dataset.action===action && (value===undefined||b.dataset.value===value));
    focus?.focus({preventScroll:true});
  }
  app.addEventListener('click',event=>{
    const b=event.target.closest('button[data-action]');if(!b||!unit)return;
    const action=b.dataset.action,value=b.dataset.value;
    if(action==='fresh'){route();return;}
    if(action==='repeat'){entry.seed++;entry.at=0;store();route();return;}
    const s=activeStep();if(!s)return;
    if(action==='next'){next();return;}
    if(action==='back'){entry.at=Math.max(0,entry.at-1);store();resetStep();renderLesson();return;}
    if(action==='answer'){
      if(s.quote){
        decision=value;
        if(value!==s.answer)noteMistake();
        feedback='';renderWithFocus('final-pot',String(s.pot));return;
      }
      correct=value===s.answer;
      if(!correct){
        if(unit.id==='rivers' && entry.at===3 && value==='9 wins in 43')remember('unseen');
        else noteMistake();
      }
      feedback=correct?s.explain:'Try again. '+s.hint;
      finishPractice();
      renderWithFocus(correct?'next':'answer',correct?undefined:value);return;
    }
    if(action==='final-pot'){
      correct=Number(value)===s.quote.finalPot;
      if(!correct){remember('pot');feedback='Try again. '+s.hint;}
      else feedback='Final pot: '+s.pot+' + '+s.bet+' + '+s.bet+' = '+s.quote.finalPot+'. You chose '+decision.toLowerCase()+'. '+(decision===s.answer?'That earns more on average. ':'The better action here is '+s.answer.toLowerCase()+'. ')+s.explain;
      renderWithFocus(correct?'next':'final-pot',correct?undefined:value);return;
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
      if(!correct && selected.length===5)noteMistake();
      finishPractice();
      renderWithFocus(correct?'next':'check');return;
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
  window.addEventListener('hashchange',()=>{route();window.scrollTo(0,0);});route();
})();
