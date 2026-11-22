'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context=vm.createContext({});
for(const name of ['poker','intermediate','progress']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',name+'.js'),'utf8'),context);
}
const course=vm.runInContext('Intermediate',context);
for(const [index,deal] of course.rangeDeals.entries()){
  for(const bet of [true,false]){
    const result=course.analyzeRange(deal,bet);
    const [first,second,blocked]=result.rows;
    assert.deepEqual([first.wins.length,second.wins.length],index===0?[9,6]:[12,15]);
    assert.equal(first.total,44);assert.equal(second.total,44);assert.equal(blocked.weight,0);
    assert.equal(first.weight,bet?0.75:0.25);
    assert.equal(result.ev>0,index===0?bet:!bet);
  }
}
for(const deal of course.streetDeals){
  for(const size of [0,10,15]){
    const quiet=course.analyzeTurn(deal,0,size);
    const dangerous=course.analyzeTurn(deal,1,size);
    assert(quiet.equity>dangerous.equity);
    assert.equal(quiet.stack,deal.stack-size);
    assert.equal(quiet.pot,deal.pot+size*2);
    assert(quiet.rows.every(r=>r.total===44));
    const plan=new Map(Object.entries({size:String(size),reason:size?'value':'control',blank:'value',danger:'caution',stack:String(deal.stack-size)}));
    const task=course.streetExercise(deal,false);
    assert.equal(task.assess(plan),'');
    plan.set('danger','fixed');
    assert(task.assess(plan));
  }
}
const bridge=require('../assets/bridge.js');
for(const seed of [0,1,2,3]){
  const first=bridge.createEnding(seed);
  const cards=[...Object.values(first.hands).flat(),...first.trick.map(p=>p.card)];
  assert.equal(new Set(cards).size,12);
  assert.equal(bridge.winner(first.trick),seed?'South':'North');
  const legal=bridge.legalCards(first.hands[first.turn],first.trick);
  assert.equal(legal.length,2);
  const illegal=first.hands[first.turn].find(c=>!legal.includes(c));
  assert.equal(bridge.advance(first,illegal),false);
  const endings=new Set();
  function explore(state,actions){
    if(state.finished.length===3){
      endings.add(state.ns);
      assert.deepEqual(bridge.resume(seed,actions),state);
      return;
    }
    const options=state.trick.length===4?['collect']:bridge.legalCards(state.hands[state.turn],state.trick);
    for(const action of options){
      const copy=structuredClone(state);
      assert(bridge.advance(copy,action));explore(copy,[...actions,action]);
    }
  }
  explore(first,[]);
  assert(endings.has(7));assert([...endings].some(n=>n<7));
}
assert.equal(bridge.winner([{seat:'North',card:'5♣'},{seat:'East',card:'A♥'},{seat:'South',card:'9♣'},{seat:'West',card:'Q♣'}]),'West');
const progress=vm.runInContext('CourseProgress',context);
const records=new Map([['table-study.foundations.v1',JSON.stringify({review:{seed:9,at:1},practice:{outs:{seed:1}}})]]);
const storage={getItem:key=>records.get(key)??null,setItem:(k,v)=>records.set(k,v)};
const open=()=>progress.open(storage,['review','seats'],['outs']);
const a=open(), b=open();
a.saved.review.at=2;a.store();
b.saved.seats={seed:1,at:4,done:false};b.store();
delete b.saved.practice.outs;b.store();
a.refresh();
assert.equal(a.saved.seats.at,4);assert.equal(a.saved.review.at,2);assert.equal(a.saved.practice.outs,undefined);
assert.equal(open().saved.practice.outs,undefined);
console.log('Weighted ranges, multi-street plans, bridge endings and multi-tab progress checks passed.');
