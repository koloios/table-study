'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const records=new Map();
const sessionStorage={getItem:key=>records.get(key)??null,setItem:(key,v)=>records.set(key,v),removeItem:key=>records.delete(key)};
function openTable(){
  const events={};
  const root={innerHTML:'',isConnected:true,addEventListener:(k,fn)=>events[k]=fn,querySelector:()=>({focus(){}})};
  const app={querySelector:()=>root};
  let timer;
  const box=vm.createContext({document:{},sessionStorage,setTimeout:fn=>timer=fn,clearTimeout:()=>{timer=null;}});
  for(const file of ['poker','heads-up','flop-lesson', 'lessons','practice','card-notes','practice-table']){
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file+'.js'),'utf8'),box);
  }
  // Control only the opponent for this scenario. The real engine processes every move.
  vm.runInContext("HeadsUp.chooseAction = v => v.street==='turn' ? {type:'raise',to:v.legal.minRaiseTo} : {type:v.legal.canCheck?'check':'call'}",box);
  const mount=vm.runInContext('PracticeTable.mount',box);
  mount(app,'table',code=>'<i>'+code+'</i>');
  function click(dataset){events.click({target:{closest:()=>({dataset})}});}
  function opponent(){assert(timer);const fn=timer;timer=null;fn();}
  return {root,click,opponent};
}
let page=openTable();
page.click({move:'call'});page.opponent();page.opponent(); // preflop and flop checks
page.click({move:'check'});page.opponent(); // Mira bets on the turn
assert.match(page.root.innerHTML,/Your turn/);
page.click({move:'fold'});
page.click({ui:'review'});
const review=page.root.innerHTML;
assert.match(review,/Hand 1 · Turn/);
assert.match(review,/Two face-down cards/);
assert.match(review,/data-drill="price"/);
assert.match(review,/data-drill="outs"/);
for(const skill of ['price','outs']){
  page.click({drill:skill});
  const exercise=page.root.innerHTML;
  assert.match(exercise,/From hand 1 · Decision 3/);
  assert.match(exercise,/Fresh exercise · Exposed hands/);
  assert.doesNotMatch(exercise,/You chose/);
  const answer=exercise.match(/data-response="([^"]+)"/)[1];
  page.click({response:answer});
  const graded=page.root.innerHTML;
  assert(graded.includes('You chose '+answer));
  page=openTable(); // A full reload replays the hand, exercise, and response.
  assert.equal(page.root.innerHTML,graded);
  page.click({ui:'return-review'});
  assert.equal(page.root.innerHTML,review);
}
page.click({ui:'back'});
page.click({ui:'next'});
assert.match(page.root.innerHTML,/Hand 2/);
assert.equal(records.size,0);
console.log('Fresh drills, hidden cards, decision return and completed-hand replay passed.');
