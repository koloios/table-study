'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map();
const box = vm.createContext({
  document:{}, localStorage:{
    getItem:key=>storage.get(key) ?? null,
    setItem:(key,v)=>storage.set(key,v)
  }
});
for (const name of ['poker','card-notes','capstone']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',name+'.js'),'utf8'),box);
}
const cap = vm.runInContext('Capstone',box);
const poker = vm.runInContext('Poker',box);
const lead = ['Sol','Raise to 6','9 of 47 · 19.1%','Call 6'];
assert.equal(cap.status(),'new');
assert.equal(cap.resume(704,[]),null);
assert.equal(cap.resume(1,['Sol','Raise to 200']),null);
assert.equal(cap.resume(1,['Sol','Fold','Call 6']),null);

for(let rotation=0;rotation<4;rotation++){
  for(const extra of [0,4]){
    const seed=rotation+extra;
    const bet=extra===0?8:16;
    const turn=cap.resume(seed,lead);
    assert.deepEqual(Array.from(turn.history,e=>e.view.pot),[3,3,24,24]);
    assert.equal(turn.view.pot,30+bet);
    const boards=turn.history.map(e=>Array.from(e.view.board));
    assert.deepEqual(boards.map(b=>b.length).join(','),'0,0,3,3');
    assert.equal(turn.view.board.length,4);
    const hands=turn.view.prompt.match(/[2-9TJQKA][♥♦♣♠]/g);
    const counts=[hands.slice(0,2),hands.slice(2,4)].map(opp=>{
      const rivers=poker.rivers({you:turn.view.hero,board:turn.view.board,opp});
      assert.equal(rivers.length,44);
      assert(rivers.every(r=>r.result!==0));
      return rivers.filter(r=>r.result>0).length;
    });
    assert.deepEqual(counts,[12,7]);
    for (const foldAt of [1,3,4]){
      const state=cap.resume(seed,[...lead.slice(0,foldAt),'Fold']);
      assert.equal(state.result.net,foldAt===1?0:foldAt===3?-6:-12);
      assert.equal(state.result.opp,undefined);
      assert.equal(state.result.board,undefined);
    }
    const final=cap.resume(seed,[...lead,'Call '+bet]);
    assert.match(final.history.at(-1).explanation,/21\.6%/);
    assert(final.history.at(-1).explanation.startsWith(extra===0?'Calling':'Folding'));
    assert.equal(final.result.pot,30+bet*2);
    const scores=[turn.view.hero,final.result.opp].map(hand=>poker.best([...hand,...final.result.board]).score);
    assert.equal(final.result.net,(scores[0]>scores[1]?final.result.pot:0)-12-bet);
    assert.equal(new Set([...turn.view.hero,...final.result.opp,...final.result.board]).size,9);
    // Every decision snapshot stays identical across hidden holdings and rivers.
    const other=cap.resume(seed+8+16*33,[...lead,'Call '+bet]);
    assert.deepEqual(other.history,final.history);
    assert.notDeepEqual(other.result.opp,final.result.opp);
  }
}

function mount(){
  const handlers={},focus=[];
  const root={innerHTML:'',addEventListener:(type,fn)=>handlers[type]=fn,querySelector:selector=>({focus(){focus.push(selector);}})};
  cap.mount(root);
  function click(action){handlers.click({target:{closest:()=>({dataset:{cap:action}})}});}
  function review(index){handlers.change({target:{matches:()=>true,value:String(index)}});}
  return {root,click,review,focus};
}
let route=mount();
route.click('choose-1');
assert.equal(cap.status(),'resume');
route.click('choose-0');
route.click('choose-0');
route.click('choose-0');
const savedView=route.root.innerHTML;
route=mount();
assert.equal(route.root.innerHTML,savedView);
assert.match(savedView,/Price the last bet/);
route.click('choose-0');
const finish=route.root.innerHTML;
assert.equal(cap.status(),'complete');
assert.match(finish,/Share|share/);
route.click('review');
route.review(0);
assert.match(route.root.innerHTML,/Who is first to act/);
assert.doesNotMatch(route.root.innerHTML,/Shared cards|Mira’s cards|The river is|full house/);
route.review(2);
assert.match(route.root.innerHTML,/Shared cards/);
assert.doesNotMatch(route.root.innerHTML,/Mira’s actual cards|Mira’s cards|The river is/);
route.click('result');
assert.equal(route.root.innerHTML,finish);
route.click('again');
assert.match(route.root.innerHTML,/Who is first to act/);
assert.match(route.root.innerHTML,/<h1 tabindex="-1"/);
assert.equal(route.focus.at(-1),'h1');
assert.equal(cap.status(),'resume');
const otherTab=mount();
route.click('choose-1');
otherTab.click('choose-0');
assert.equal(otherTab.root.innerHTML,route.root.innerHTML);
assert.match(otherTab.root.innerHTML,/Open from the button/);
otherTab.click('choose-1');
assert.equal(cap.status(),'complete');
route.click('choose-0');
assert.equal(route.root.innerHTML,otherTab.root.innerHTML);
assert.match(route.root.innerHTML,/You folded/);
assert.doesNotMatch(route.root.innerHTML,/Shared cards|Mira’s cards|The river is/);
route.click('review');
assert.match(route.root.innerHTML,/You chose <strong>Fold/);
otherTab.click('again');
route.review(0);
assert.match(route.root.innerHTML,/Who is first to act/);
assert.doesNotMatch(route.root.innerHTML,/Decision review/);
const key='table-study.holdem-capstone.v1';
for (const index of [1,3,4]) {
  storage.set(key,JSON.stringify({seed:0,actions:[...lead.slice(0,index),'Fold'],completed:false}));
  assert.equal(cap.status(),'complete');
  const ended=mount();
  assert.match(ended.root.innerHTML,/Review a decision/);
}
storage.set(key,JSON.stringify({seed:0,actions:['Sol'],completed:true}));
assert.equal(cap.status(),'resume');
for(const key of storage.keys())storage.set(key,'{"seed":8,"actions":["<img>"]}');
route=mount();
assert.match(route.root.innerHTML,/Who is first to act/);
assert.doesNotMatch(route.root.innerHTML,/<img>/);
console.log('Four-seat sequence, pot accounting, sampled showdowns, review privacy and persistence passed.');
