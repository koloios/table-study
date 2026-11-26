/* Run with node tests/course-flow.cjs. Exercises the review hand's rendered controls. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const records=new Map([['table-study.foundations.v1',JSON.stringify({review:{seed:0,at:1,done:false}})]]);
const load=id=>JSON.parse(records.get('table-study.foundations.v2.'+id));
let handleClick;
let changeRoute;
const app = {
  innerHTML: '',
  addEventListener(type, listener) { if (type === 'click') handleClick = listener; },
  querySelectorAll() { return []; }
};
const context = vm.createContext({
  document: {querySelector: selector => selector === '#app' ? app : {}},
  location: {hash: '#review'},
  window: {addEventListener(type, listener) { if(type==='hashchange') changeRoute=listener; }, scrollTo() {}},
  localStorage: {getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key,value)}
});
context.window.localStorage=context.localStorage;
for (const name of ['poker', 'card-notes', 'flop-lesson', 'lessons', 'practice', 'progress', 'intermediate', 'strategy', 'capstone', 'course']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets', name + '.js'), 'utf8'), context);
}
function click(action, value = '') {
  assert(app.innerHTML.includes('data-action="' + action + '" data-value="' + value + '"'));
  handleClick({target: {closest: () => ({dataset: {action, value}})}});
}
function assertAwaiting(action) {
  assert(app.innerHTML.includes('data-action="' + action + '"'));
  assert(!app.innerHTML.includes('data-action="next"'));
}

// A correct pot cannot validate an unprofitable action. Keep its calculation for the retry.
click('answer', 'Fold');
click('final-pot', '56');
assertAwaiting('answer');
click('answer', 'Fold');
assertAwaiting('answer');
assert.equal(load('lesson.review').at, 1);
click('answer', 'Call');
click('next');
assert.equal(load('lesson.review').at, 2);
assert(load('skill.price'));

// The second hand must require its own pot calculation, even with a correct action.
click('answer', 'Fold');
click('final-pot', '12');
assertAwaiting('final-pot');
click('final-pot', '16');
click('next');
assert.equal(load('lesson.review').at, 3);
assert(load('skill.pot'));
assert.deepEqual(load('lesson.review').attempts, {1:'assisted',2:'assisted'});
console.log('Two-part review checkpoint checks passed.');

context.location.hash='#rivers';
changeRoute();
assert.match(app.innerHTML,/aria-label="ace of clubs"/);
click('next');
click('answer','9');
click('next');
function checkCount(wins) {
  assert(app.innerHTML.includes(wins+' in 44'));
  assert.equal((app.innerHTML.match(/data-action="river"/g)||[]).length,44);
  assert.equal((app.innerHTML.match(/ winning river" aria-pressed/g)||[]).length,wins);
}
checkCount(9);
click('river','A♥');
click('heart-hand','blocked');
checkCount(8);
assert(!app.innerHTML.includes('data-value="A♥"'));
assert.match(app.innerHTML,/ace of hearts, already visible/);
click('heart-hand','base');
checkCount(9);
click('next');
assert(!app.innerHTML.includes('data-action="heart-hand"'));
console.log('Inline cards, blocker changes and river explorer checks passed.');

// Finish the existing lesson, then enter the optional hand from its completion screen.
const course=vm.runInContext('Course',context);
const riverSteps=course.units.find(u=>u.id==='rivers').build(load('lesson.rivers').seed);
for(const step of riverSteps.slice(3)){
  click('answer',step.answer);
  click('next');
}
assert.match(app.innerHTML,/href="#rivers\/play"/);
const completed=load('lesson.rivers');
context.location.hash='#rivers/play';
changeRoute();
for(const action of ['Fold','Call']){
  assert(!app.innerHTML.includes('Which rivers win?'));
  const hand=course.riverHand(load('lesson.river-hand').seed);
  click('turn-choice',action);
  assert.match(app.innerHTML,new RegExp('Your '+action.toLowerCase()));
  assert(app.innerHTML.includes(hand.quote.ev.toFixed(2)+' chips per call'));
  assert(app.innerHTML.includes(course.pct(hand.quote.breakEven)));
  assert(app.innerHTML.includes((hand.quote.ev>0)===(action==='Call')?'You chose the more profitable action.':'The other action earns more'));
  assert(app.innerHTML.includes('href="#price"'));
  const review=app.innerHTML;
  changeRoute();
  assert.equal(app.innerHTML,review);
  click('new-turn');
  assert.notDeepEqual(course.riverHand(load('lesson.river-hand').seed).deal,hand.deal);
}
assert.deepEqual(load('lesson.rivers'),completed);
console.log('River lesson handoff, first decision, saved review and redeal checks passed.');

// A returning visitor can receive an old index with newer assets. Recover once,
// retaining the lesson anchor, even when this happens on a direct lesson link.
const cachedApp={};
const cachedLocation={href:'https://example.test/table-study/?mode=practice#rivers/play',replace(value){this.href=value;}};
const oldEntry=vm.createContext({document:{querySelector:()=>cachedApp},location:cachedLocation,URL});
const boot=fs.readFileSync(path.join(__dirname,'../assets/course.js'),'utf8');
vm.runInContext(boot,oldEntry);
const recovered=new URL(cachedLocation.href);
assert.equal(recovered.hash,'#rivers/play');
assert.equal(recovered.searchParams.get('mode'),'practice');
assert.equal(recovered.searchParams.get('edition'),'flop-capstone');
vm.runInContext(boot,oldEntry);
assert.match(cachedApp.textContent,/Refresh/);
// The reverse mix can also occur: a cached launcher opens a newer module.
cachedLocation.href='https://example.test/table-study/#intermediate/ranges';
vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/intermediate.js'),'utf8'),oldEntry);
vm.runInContext("Intermediate.mount(document.querySelector('#app'),'ranges')",oldEntry);
assert.equal(new URL(cachedLocation.href).searchParams.get('edition'),'river-practice');
assert.equal(new URL(cachedLocation.href).hash,'#intermediate/ranges');

const strategy=vm.runInContext('Strategy',context);
const evaluateDeal=vm.runInContext('Poker.rivers',context);
for(const unit of strategy.units){
  context.location.hash='#'+unit.id;
  changeRoute();
  const checkpoint=load('lesson.'+unit.id);
  const steps=unit.build(checkpoint.seed);
  for(const [index,step] of steps.entries()){
    assert(app.innerHTML.includes(step.title));
    if(step.choices){
      assert(!app.innerHTML.includes(step.explain));
      if(step.checkpoint && !step.visual.hiddenOpponent){
        click('answer',step.choices.find(a=>a!==step.answer));
        assertAwaiting('answer');
      }
      click('answer',step.answer);
      assert(app.innerHTML.includes('data-action="next"'));
    }
    click('next');
    assert.equal(load('lesson.'+unit.id).at,index+1);
    changeRoute();
  }
  assert(app.innerHTML.includes('href="'+unit.onward+'"'));
  assert.equal(load('lesson.'+unit.id).done,true);
}
assert.deepEqual(load('lesson.rivers'),completed);
for(let seed=0;seed<4;seed++){
  const steps=strategy.units[0].build(seed);
  for(let i=0;i<steps.length;i+=2){
    const [shown,hidden]=steps.slice(i,i+2);
    const known=shown.visual.deal;
    assert.deepEqual(known,hidden.visual.deal);
    const cards=hidden.body.match(/(?:[2-9TJQKA][♣♠♦♥])/g);
    assert.deepEqual(Array.from(known.opp),cards.slice(0,2));
    const counts=[known.opp,cards.slice(2,4)].map(opp=>{
      const runouts=evaluateDeal({...known,opp});
      assert.equal(runouts.length,44);
      assert(runouts.every(out=>out.result!==0));
      return runouts.filter(out=>out.result===1).length;
    });
    const win=(counts[0]+3*counts[1])/(4*44);
    assert(hidden.explain.includes(course.pct(win)));
    const cost=i===0?3:10, pot=i===0?12:16;
    assert.equal(hidden.answer,win*(pot+2*cost)>cost?'Call':'Fold');
    assert.notEqual(shown.answer,hidden.answer);
  }
}
console.log('Strategy comparisons, checkpoints, resume and onward routes passed.');

// Returning learners keep all six original completions and are directed to the new unit.
for(const u of course.units.filter(u=>u.id!=='flop-odds')){
  records.set('table-study.foundations.v2.lesson.'+u.id,JSON.stringify({seed:12,at:u.build(12).length,done:true}));
}
context.location.hash='#holdem';
changeRoute();
assert.match(app.innerHTML,/6 of 7 lessons complete/);
assert.match(app.innerHTML,/class="btn main" href="#flop-odds"/);
for(const id of ['capstone','preflop','hidden-hand','intermediate/ranges','intermediate/streets']){
  assert(app.innerHTML.includes('href="#'+id+'"'));
}
context.location.hash='#flop-odds';
changeRoute();
const flopUnit=course.units.find(u=>u.id==='flop-odds');
for(const step of flopUnit.build(load('lesson.flop-odds').seed)){
  assert(!app.innerHTML.includes('Count the two-card runouts'));
  if(step.checkpoint)click('answer',step.choices.find(choice=>choice!==step.answer));
  click('answer',step.answer);
  if(step.showDrawPathsAfterAnswer){
    assert.match(app.innerHTML,/Count the two-card runouts/);
    assert.match(app.innerHTML,/414 \+ 342/);
  }
  click('next');
  changeRoute();
}
assert.match(app.innerHTML,/href="#price"/);
context.location.hash='#holdem';
changeRoute();
assert.match(app.innerHTML,/7 of 7 lessons complete/);
assert.match(app.innerHTML,/class="btn main" href="#capstone"/);
assert.equal(load('lesson.price').seed,12);

assert.match(app.innerHTML,/href="#practice\/horizon"/);
const retrySeed=load('skill.horizon').seed;
context.location.hash='#practice/horizon';
changeRoute();
click('answer',flopUnit.build(retrySeed).at(-1).answer);
context.location.hash='#holdem';
changeRoute();
assert(!app.innerHTML.includes('href="#practice/horizon"'));
