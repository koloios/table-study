/* Run with node tests/course-flow.cjs. Exercises the review hand's rendered controls. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let saved = JSON.stringify({review: {seed: 0, at: 1, done: false}});
let handleClick;
const app = {
  innerHTML: '',
  addEventListener(type, listener) { if (type === 'click') handleClick = listener; },
  querySelectorAll() { return []; }
};
const context = vm.createContext({
  document: {querySelector: selector => selector === '#app' ? app : {}},
  location: {hash: '#review'},
  window: {addEventListener() {}, scrollTo() {}},
  localStorage: {getItem: () => saved, setItem: (_, value) => { saved = value; }}
});
for (const name of ['poker', 'lessons', 'practice', 'course']) {
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
assert.equal(JSON.parse(saved).review.at, 1);
click('answer', 'Call');
click('next');
assert.equal(JSON.parse(saved).review.at, 2);
assert(JSON.parse(saved).practice.price);

// The second hand must require its own pot calculation, even with a correct action.
click('answer', 'Fold');
click('final-pot', '12');
assertAwaiting('final-pot');
click('final-pot', '16');
click('next');
assert.equal(JSON.parse(saved).review.at, 3);
assert(JSON.parse(saved).practice.pot);
console.log('Two-part review checkpoint checks passed.');
