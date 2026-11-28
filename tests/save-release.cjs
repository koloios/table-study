'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const records=new Map();
const storage={
  getItem:key=>records.get(key)??null,
  setItem:(key,value)=>records.set(key,value)
};
function element(){
  const children=new Map();
  return {innerHTML:'',querySelector(selector){
    if(selector.startsWith('[data-') && !this.innerHTML.includes(selector.slice(1,-1)))return null;
    if(!children.has(selector))children.set(selector,element());
    return children.get(selector);
  },focus(){},setAttribute(){},addEventListener(type,fn){this['on'+type]=fn;},
    replaceChildren(child){this.child=child;}};
}
const document={createElement:element};
const box=vm.createContext({document,localStorage:storage,FormData:class{constructor(target){return target;}}});
for(const name of ['poker','card-notes','progress','bridge','intermediate']){
  vm.runInContext(read('assets/'+name+'.js'),box);
}
const {Bridge,Intermediate}=vm.runInContext('({Bridge,Intermediate})',box);
function mountStreets(){
  const root=element();Intermediate.mount(root,'streets');
  function prepare(){
    const form=new Map(Object.entries({size:'10',reason:'value',blank:'value',danger:'caution',stack:'26'}));
    root.querySelector('form').onsubmit({preventDefault(){},target:form});
    const prediction=root.querySelector('[data-price-prediction]');
    if(prediction){
      const data=new Map([['smallCount','4']]);
      data.getAll=()=>['J♣ 10♣','10♦ 9♥','7♥ 6♥'];
      prediction.onsubmit({preventDefault(){},target:data});
    }
    assert(root.querySelector('[data-next]'),'The accepted plan has a finish control');
  }
  return {root,prepare,hint:()=>root.querySelector('[data-hint]').ontoggle({currentTarget:{open:true}}),
    finish:()=>root.querySelector('[data-next]').onclick(),replay:()=>root.querySelector('[data-restart]').onclick()};
}
const key='table-study.intermediate.streets.v1';
function independent(){records.set(key,JSON.stringify({stage:1,clean:true}));}
function get(){return JSON.parse(records.get(key));}
independent();
let a=mountStreets(),b=mountStreets();
a.prepare();a.finish();b.hint();
assert.deepEqual(get(),{stage:2,clean:true,attempt:0});
assert.match(b.root.innerHTML,/Lesson complete/);
independent();
a=mountStreets();b=mountStreets();
b.prepare();a.hint();b.finish();
assert.deepEqual(get(),{stage:2,clean:false,attempt:0});
assert.match(b.root.innerHTML,/with practice/);
// Advance a replay to the same stage an old tab displays. Its stale click still belongs to the first attempt.
independent();
a=mountStreets();b=mountStreets();
a.prepare();a.finish();a.replay();
assert.deepEqual(get(),{stage:0,clean:true,attempt:1});
records.set(key,JSON.stringify({...get(),stage:1}));
b.hint();
assert.deepEqual(get(),{stage:1,clean:true,attempt:1});

const bridgeKey='table-study.bridge-pilot.v1';
function mountBridge(){
  const outer=element();Bridge.mount(outer);
  const root=outer.child;
  function click(data){return root.onclick({target:{closest:()=>({dataset:data})}});}
  return {root,click};
}
const south=mountBridge(),other=mountBridge();
south.click({bridge:'West'});south.click({card:'K♠'});
other.click({bridge:'West'});
assert.deepEqual(JSON.parse(records.get(bridgeKey)).actions,['K♠']);
assert.equal(other.root.innerHTML,south.root.innerHTML);
assert.match(other.root.querySelector('[role="status"]').textContent,/updated in another tab/);

// A failed write should still leave the current hand playable in memory.
box.localStorage={getItem:storage.getItem,setItem(){throw Error('Storage is full');}};
independent();
a=mountStreets();a.hint();a.prepare();a.finish();
assert.match(a.root.innerHTML,/Lesson complete/);
assert.match(a.root.innerHTML,/with practice/);
assert.equal(get().stage,1);
records.delete(bridgeKey);
const offline=mountBridge();
offline.click({bridge:'West'});offline.click({card:'K♠'});
assert.match(offline.root.innerHTML,/south played king of spades/i);

function originalHand(){
  const nodes=new Map(),doc=element(),storage={getItem:()=>null,setItem(){}};
  doc.querySelector=selector=>{
    if(selector==='.work[open]')return null;
    if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);
  };
  const html=read('turn-study/index.html');
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{
    document:doc,location:{search:'',hash:''},window:{localStorage:storage,sessionStorage:storage},localStorage:storage,URLSearchParams
  });
  function click(cmd){
    assert(['#nav','#lesson'].some(s=>doc.querySelector(s).innerHTML.includes('data-cmd="'+cmd+'"')));
    doc.onclick({target:{closest:()=>({dataset:{cmd}})}});
  }
  return {click,table:()=>doc.querySelector('#table').innerHTML,lesson:()=>doc.querySelector('#lesson').innerHTML};
}
for(const price of [2,8])for(const action of ['call','fold']){
  const hand=originalHand();
  hand.click('jump2');hand.click('price'+price);hand.click(action);
  const award=action==='call'?12+2*price:12;
  assert(hand.table().includes('Pot · '+award+'</span>'));
  assert.equal(hand.table().includes('riverCard'),action==='call');
  if(action==='fold'){
    assert(hand.lesson().includes('wins the 12-chip pot'));
    assert(hand.lesson().includes('uncalled '+price+' chips return'));
  }else{
    assert(hand.lesson().includes(award+'-chip pot'));
  }
}
console.log('Stale Intermediate and Bridge tabs, replay generations, unavailable storage, and original hand awards passed.');

require('node:test')('Restricted lock permission still allows a hand to advance once', async () => {
  const error=Object.assign(new Error('Locks disallowed'),{name:'SecurityError'});
  box.navigator={locks:{request:()=>Promise.reject(error)}};
  box.localStorage=storage;
  records.delete(bridgeKey);
  const hand=mountBridge();
  await hand.click({bridge:'West'});
  await hand.click({card:'K♠'});
  assert.deepEqual(JSON.parse(records.get(bridgeKey)).actions,['K♠']);
  let attempts=0;
  box.navigator={locks:{request:async(key,action)=>action()}};
  const lock=vm.runInContext('CourseProgress.withLock',box);
  await assert.rejects(lock('test',()=>{attempts++;throw error;}),error);
  assert.equal(attempts,1);
});
