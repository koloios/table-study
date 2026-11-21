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
  let unit,steps=[],entry,feedback='',correct=false,selected=[],river='',bet=2,sample=[];
  function resetStep() {
    feedback='';correct=false;selected=[];river='';bet=2;sample=[];
  }
  function activeStep(){return steps[entry.at];}
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
  function table(v) {
    const roles=['D · Button','SB · Small blind','BB · Big blind',''];
    return '<div class="felt"><div class="row"><span class="over">'+v.street+'</span><span class="badge">Pot · '+v.pot+'</span></div><div class="oval">'+names.map((n,i)=>
      '<div class="seat s'+i+(i===2?' me':'')+(i===v.fold?' fold':'')+'">'+n+'<small>'+(i===v.fold?'Folded':roles[(i-v.button+4)%4])+'</small></div>'
    ).join('')+'<div class="center"><span class="big" aria-hidden="true">♠</span>Blinds 1 / 2</div></div><small>Seats run clockwise · You sit at the bottom</small></div>';
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
    return '<div class="group"><div class="actions">'+btn('Deal 10','deal',10)+btn('Add 100','deal',100)+btn('Reset sample','clear')+'</div><p class="group" role="status">'+(n?hits+' wins in '+n+' trials · '+pct(hits/n)+' observed':'No rivers dealt yet')+'</p><div class="bar"><b style="width:'+(n?100*hits/n:0)+'%"></b><i style="left:'+100*p+'%"></i></div><small>Mark · '+pct(p)+' expected'+(n?' · '+(n*p).toFixed(1)+' wins on average':'')+'</small><div class="bits" aria-hidden="true">'+sample.slice(-32).map(x=>'<i class="'+(x.result===1?'hit':'')+'"></i>').join('')+'</div>'+(n?'<small>Latest river '+sample[n-1].card+' · pale squares mark wins</small>':'')+'</div>';
  }
  function visual(v) {
    if(v.kind==='table') return table(v);
    const d=v.deal;
    return '<div class="felt"><div class="row"><span class="over">'+(d.board.length===5?'Showdown':'Turn · one card to come')+'</span><span class="badge">Exposed hands</span></div><div class="group">'+group('Shared cards',d.board,v.select)+'</div><div class="twocol">'+group('Your cards',d.you,v.select)+group('Mira’s cards',d.opp)+'</div>'+
      (v.inspect?riverGrid(v):'')+(v.price?priceView(v):'')+(v.lab?labView(v):'')+'</div>';
  }
  const ranking='<details><summary>Hand rankings, strongest first</summary><ol class="ranklist"><li>Straight flush · five consecutive cards of one suit. Ace-high is a royal flush.</li><li>Four of a kind · four equal ranks</li><li>Full house · three of one rank and two of another</li><li>Flush · five cards of one suit</li><li>Straight · five consecutive ranks. An ace can be high or low.</li><li>Three of a kind</li><li>Two pair</li><li>One pair</li><li>High card</li></ol></details>';
  function home() {
    const count=units.filter(u=>saved[u.id]?.done).length;
    const resume=units.find(u=>saved[u.id]?.at>0&&!saved[u.id]?.done)||units.find(u=>!saved[u.id]?.done)||units[0];
    const rows=units.map((u,i)=>{
      const state=saved[u.id];
      return '<li><a href="#'+u.id+'"><span class="num">0'+(i+1)+'</span><span><strong>'+u.title+'</strong><span class="desc">'+u.goal+'</span></span><small>'+(state?.done?'Complete':state?.at?'Resume':'')+'</small></a></li>';
    }).join('');
    app.innerHTML='<section class="intro"><span class="over">Self-paced course</span><h1>Hold’em Foundations</h1><p>Take a seat, play through a hand, and learn how to decide whether a call is worth its price.</p></section><div class="grid"><div>'+table({street:'Your first table',button:0,pot:3})+'<div class="gameLinks"><a class="btn main" href="#'+resume.id+'">'+(count===units.length?'Revisit':saved[resume.id]?.at?'Resume':'Start')+' · '+resume.title+'</a></div></div><section class="paper"><span class="over">Course map</span><h2>At the table</h2><p class="note">'+count+' of '+units.length+' lessons complete · saved in this browser</p><ol class="map">'+rows+'</ol></section></div><details><summary>Practice with a real deck</summary><p>Use a 52-card deck alongside a seven-step exercise in shuffling, cutting, dealing and burning cards.</p><a href="turn-study/index.html#dealer-practice">Open the dealer exercise</a></details><details><summary>Coming later · Intermediate Hold’em and bridge</summary><p>Intermediate Hold’em will use hidden ranges, changing board textures and multi-street decisions. Bridge will start with turn order, following suit, and winning a trick with a partner.</p></details>';
    document.title='Table Study · Hold’em Foundations';
  }
  function completion() {
    const idx=units.indexOf(unit),next=units[idx+1];
    return '<div class="intro"><span class="over">Lesson complete</span><h1>'+unit.title+'</h1><p>'+unit.goal+'</p></div><div class="paper"><h2>'+(next?'Keep your seat':'Review your progress')+'</h2><p>'+(next?'Your progress is saved. The next lesson is '+next.title.toLowerCase()+'.':units.every(u=>saved[u.id]?.done)?'You’ve completed Hold’em Foundations. On another day, revisit the checkpoints and explain your decisions before revealing the feedback.':'You finished the review hand. The course map shows which other lessons are ready to practise.')+'</p><div class="actions">'+(next?'<a class="btn main" href="#'+next.id+'">Next · '+next.title+'</a>':'<a class="btn main" href="#home">Course map</a>')+btn('Practise this lesson again','repeat')+'</div></div>';
  }
  function renderLesson() {
    document.title=unit.title+' · Table Study';
    if(entry.at>=steps.length){app.innerHTML=completion();return;}
    const s=activeStep();
    const label=s.checkpoint?'Independent checkpoint':s.choices||s.pick?'Your decision':'Guided practice';
    let actions='';
    if(correct) actions=btn(entry.at===steps.length-1?'Finish lesson':'Continue','next','','main');
    else if(s.choices) actions=s.choices.map(x=>btn(x,'answer',x)).join('');
    else if(s.pick) actions=btn('Check my five ('+selected.length+'/5)','check','','main');
    else actions=btn(s.button,'next','',s.lab&&!sample.length?'off':'main');
    const extras=(s.visual.ranking?ranking:'')+(unit.id==='seats'&&entry.at===0?'<details><summary>Dealing at home?</summary><p>Practise a shuffle, a cut, two rounds of private cards, and the three burns with a real deck.</p><a href="turn-study/index.html#dealer-practice">Open the dealer exercise</a></details>':'')+
      (s.guided?'<p><a class="btn main" href="turn-study/index.html?course=review">Open the coached table</a></p>':'');
    app.innerHTML='<div class="intro"><span class="over">Foundations / Lesson '+(units.indexOf(unit)+1)+' of 6</span><h1>'+unit.title+'</h1></div><div class="grid"><section aria-label="Current table">'+visual(s.visual)+'</section><section class="panel"><span class="over">'+label+'</span><h2>'+s.title+'</h2><p>'+s.body+'</p>'+extras+'<div class="actions">'+actions+'</div><div class="feedback" role="status">'+escape(feedback)+'</div><div class="row controls"><button class="plain" data-action="back" '+(entry.at===0?'disabled':'')+'>Back a step</button><span>'+(entry.at+1)+' / '+steps.length+'</span></div></section></div>';
  }
  function route() {
    unit=units.find(u=>u.id===location.hash.slice(1));
    if(!unit){home();return;}
    entry=record(unit.id);steps=unit.build(entry.seed);entry.at=Math.max(0,Math.min(steps.length,entry.at));resetStep();renderLesson();
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
    if(action==='repeat'){entry.seed++;entry.at=0;store();route();return;}
    const s=activeStep();if(!s)return;
    if(action==='next'){next();return;}
    if(action==='back'){entry.at=Math.max(0,entry.at-1);store();resetStep();renderLesson();return;}
    if(action==='answer'){correct=value===s.answer;feedback=correct?s.explain:'Try again. '+s.hint;renderWithFocus(correct?'next':'answer',correct?undefined:value);return;}
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
      renderWithFocus(correct?'next':'check');return;
    }
    if(action==='river'){river=value;renderWithFocus(action,value);return;}
    if(action==='bet'){bet=Number(value);renderWithFocus(action,value);return;}
    if(action==='clear'){sample=[];renderWithFocus(action);return;}
    if(action==='deal'){
      const possibilities=Course.outcomes(s.visual.deal);
      for(let i=0;i<Number(value);i++)sample.push(possibilities[Math.floor(Math.random()*possibilities.length)]);
      renderWithFocus(action,value);
    }
  });
  window.addEventListener('hashchange',()=>{route();window.scrollTo(0,0);});route();
})();
