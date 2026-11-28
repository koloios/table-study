'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const records=new Map();
const box=vm.createContext({
  document:{}, FormData:class { constructor(target){return target;} },
  localStorage:{getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)}
});
for(const file of ['poker','card-notes','intermediate']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file+'.js'),'utf8'),box);
}
const I=vm.runInContext('Intermediate',box);

function element(){
  const nodes=new Map();
  return {
    innerHTML:'',focus(){},setAttribute(){},querySelectorAll(){return [];},
    querySelector(s) {
      if(s.startsWith('[data-') && !this.innerHTML.includes(s.slice(1,-1)))return null;
      if(!nodes.has(s))nodes.set(s,element());
      return nodes.get(s);
    }
  };
}
function submit(form,values){
  const data=new Map(Object.entries(values));
  data.getAll=k=>values[k]||[];
  form.onsubmit({target:data,preventDefault(){}});
}
const rangeKey='table-study.intermediate.ranges.v1';
const positions=new Set();
for(const stage of [0,1]){
  const deal=I.rangeDeals[stage];
  const blocked=deal.candidates[2];
  const blocker=blocked.find(c=>[...deal.hero,...deal.board].includes(c));
  for(let attempt=0;attempt<3;attempt++){
    records.set(rangeKey,JSON.stringify({stage,attempt,clean:true}));
    const root=element();
    I.mount(root,'ranges');
    assert.match(root.innerHTML,/Which visible card rules it out/);
    assert.doesNotMatch(root.innerHTML,/Mira’s betting history|Inspect the river counts|data-holdings|name="betShare"/);
    const choices=root.innerHTML.match(/<select name="blocked".*?<\/select>/)[0];
    const options=Array.from(choices.matchAll(/<option value="([^"]+)"/g),m=>m[1]);
    positions.add(options.indexOf(blocked.join(' ')));
    submit(root.querySelector('form'),{blocked:blocked.join(' '),blocker:deal.board.at(-1)});
    assert.match(root.querySelector('[data-error]').textContent,/Which of its cards/);
    assert.doesNotMatch(root.innerHTML,/Mira’s betting history/);
    submit(root.querySelector('form'),{blocked:blocked.join(' '),blocker});
    assert.match(root.innerHTML,/Mira’s betting history/);
    assert.match(root.innerHTML,/Inspect the river counts/);
    if(stage===1)assert.equal(JSON.parse(records.get(rangeKey)).clean,false);
    for(const bet of [true,false]){
      const result=I.analyzeRange(deal,bet);
      assert.deepEqual(Array.from(result.rows,r=>r.weight),bet?[0.75,0.25,0]:[0.25,0.75,0]);
      if(stage===0)assert.equal((100*result.equity).toFixed(1),bet?'18.8':'15.3');
    }
  }
}
assert.deepEqual(Array.from(positions).sort(),[0,1,2]);

const streetKey='table-study.intermediate.streets.v1';
for(const stage of [0,1]){
  const deal=I.streetDeals[stage], root=element();
  records.set(streetKey,JSON.stringify({stage,clean:true}));
  I.mount(root,'streets');
  submit(root.querySelector('form'),{size:'10',reason:'value',blank:'value',danger:'caution',stack:String(deal.stack-10)});
  assert.match(root.innerHTML,/Replay this flop against a different opponent/);
  assert.doesNotMatch(root.innerHTML,/How the price changes her range|data-next/);
  const prediction=root.querySelector('[data-price-prediction]');
  const names=Array.from(deal.range,hand=>hand.join(' ').replaceAll('T','10'));
  submit(prediction,{smallCount:'4',continues:names});
  assert.match(root.querySelector('[data-error]').textContent,/Match each holding/);
  assert.doesNotMatch(root.innerHTML,/How the price changes her range/);
  const small=I.sizingBranch(deal,10), large=I.sizingBranch(deal,15);
  assert.equal(small.callChance,1);
  assert.equal(large.callChance,0.75);
  assert.equal(small.calledPot,40);
  assert.equal(large.calledPot,50);
  assert.equal(large.awarded,20);
  assert.equal(large.refund,15);
  assert.deepEqual(Array.from(large.callers,hand=>hand.join(' ')),Array.from(deal.range.slice(0,3),hand=>hand.join(' ')));
  submit(prediction,{smallCount:'4',continues:names.slice(0,3)});
  assert.match(root.innerHTML,/after a call the pot is 20 \+ 15 \+ 15 = 50/i);
  assert.match(root.innerHTML,/1\/4.*25% each/);
  assert.match(root.innerHTML,/1\/3.*33.3% each/);
  assert.match(root.innerHTML,/win the 20 already in the pot and get your uncalled 15 back/);
  root.querySelector('[data-next]').onclick();
  assert.equal(JSON.parse(records.get(streetKey)).stage,stage+1);
}
console.log('Blocker gate, replay order, called/folded branches and independent predictions passed.');
