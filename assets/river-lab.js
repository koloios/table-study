'use strict';

const RiverLab = (() => {
  // This game starts after the learner checks. Mira may check back or bet all-in.
  // Each of the six unblocked combinations has the same prior probability.
  const pot = 40;
  const bet = 20;
  const board = ['K♣', '9♦', '6♠', '3♣', '2♥'];
  const hero = ['K♦', 'J♦'];
  const sets = [['9♣','9♥'], ['9♣','9♠'], ['9♥','9♠']];
  const draws = [['J♣','T♣'], ['J♥','T♥'], ['J♠','T♠']];

  function equilibrium(potBeforeBet, wager) {
    // A bluff breaks even when folds win the old pot as often, in chips, as calls cost the bet.
    const callFrequency = potBeforeBet / (potBeforeBet + wager);
    // A bluff-catcher breaks even when it wins its call's share of the final pot.
    const bluffShare = wager / (potBeforeBet + 2 * wager);
    // All sets bet. With equally many draws and sets, the bluff-to-value ratio is also
    // the fraction of draws that should bet to achieve that share among bets.
    return {callFrequency, bluffFrequency: bluffShare / (1 - bluffShare)};
  }

  const balanced = equilibrium(pot, bet);
  const profiles = {
    balanced: {label:'Balanced', bluffFrequency:balanced.bluffFrequency},
    frequent: {label:'Frequent bluffs', bluffFrequency:2/3},
    rare: {label:'Rare bluffs', bluffFrequency:1/6}
  };

  function analyze(profile) {
    const {bluffFrequency} = profiles[profile];
    const bluffWeight = draws.length * bluffFrequency;
    const equity = bluffWeight / (sets.length + bluffWeight);
    return {equity, ...Poker.callPrice(pot, bet, equity)};
  }

  // Sample the conditional range the learner actually faces after observing a bet.
  function dealAfterBet(profile, random = Math.random) {
    const bluffed = random() < analyze(profile).equity;
    const choices = bluffed ? draws : sets;
    return {cards:choices[Math.floor(random() * choices.length)], bluffed};
  }

  const percent = n => Number((100*n).toFixed(1)) + '%';
  function chips(n) {
    const rounded = Number(n.toFixed(2));
    return rounded > 0 ? '+' + rounded : String(rounded).replace('-', '−');
  }

  function cards(hand) {
    const suits = {'♣':'clubs','♦':'diamonds','♥':'hearts','♠':'spades'};
    return '<div class="cards">' + hand.map(code => {
      const rank = code[0] === 'T' ? '10' : code[0];
      const suit = code[1];
      return '<span role="img" class="card ' + ('♦♥'.includes(suit) ? 'red' : '') +
        '" aria-label="' + rank + ' of ' + suits[suit] + '">' + rank + '<span>' + suit + '</span></span>';
    }).join('') + '</div>';
  }

  function mount(root) {
    root.innerHTML = `
      <div class="grid river-grid">
        <section class="felt river-table" aria-label="River table">
          <div class="row"><div><small>River</small><h2>Catch a bluff</h2></div><span class="badge">60 in pot</span></div>
          <small>Community cards</small>${cards(board)}
          <small>Your hand</small>${cards(hero)}
          <p>You checked your pair of kings. Mira moved all-in for 20 chips into a pot of 40.</p>
          <details><summary>Which hands could Mira hold?</summary>
            <p>In this exercise, Mira reaches the river with one of six equally likely hands. Three combinations of pocket nines give her three of a kind. The other three are suited jack-ten draws that missed.</p>
            <p>The sets are 9♣ 9♥, 9♣ 9♠ and 9♥ 9♠.<br>The missed draws are J♣ 10♣, J♥ 10♥ and J♠ 10♠. Your J♦ rules out the diamond combination.</p>
          </details>
        </section>
        <section class="panel river-decision" aria-label="River decision">
          <div class="over">Your decision</div><h2>Call or fold?</h2>
          <p>Your kings beat a missed draw and lose to three nines. Mira always bets three nines. Choose how often she bluffs with a missed draw.</p>
          <label for="river-profile">Mira’s style</label>
          <select id="river-profile" class="btn">${Object.entries(profiles).map(([key, p]) =>
            '<option value="' + key + '">' + p.label + '</option>').join('')}</select>
          <p class="note" data-style></p>
          <div class="actions" data-choices></div>
          <div data-review tabindex="-1"></div>
          <details><summary>Hint</summary><p>Count how many sets and bluffs would make this bet. What fraction of those bets can your kings beat?</p></details>
          <details><summary>Show the math</summary><div class="calc" data-math></div></details>
          <details><summary>Where does the balanced strategy come from?</summary>
            <p>We solve this one-bet river game exactly. A bluff risks 20 to win 40. If you call two times in three, its average gain is (1/3 × 40) − (2/3 × 20) = 0. Mira can then check or bet a missed draw.</p>
            <p>You risk 20 for a final pot of 80, so your call breaks even when one bet in four is a bluff. With equal numbers of sets and missed draws before betting, Mira reaches that mix by betting every set and one draw in three. Together these choices form an equilibrium for this exercise.</p>
          </details>
        </section>
      </div>`;

    const select = root.querySelector('#river-profile');
    const choices = root.querySelector('[data-choices]');
    const review = root.querySelector('[data-review]');
    let deal;
    let finished = false;

    function reset() {
      const profile = select.value;
      const drawCount = Math.round(6 * profiles[profile].bluffFrequency);
      const {equity, ev, finalPot, breakEven} = analyze(profile);
      deal = dealAfterBet(profile);
      finished = false;
      review.innerHTML = '';
      choices.innerHTML = '<button type="button" class="btn main" data-river="call">Call 20</button>' +
        '<button type="button" class="btn" data-river="fold">Fold</button>';
      root.querySelector('[data-style]').textContent = 'Mira bluffs with ' + drawCount + ' out of 6 missed draws on average.';
      root.querySelector('[data-math]').innerHTML = `
        <p>Imagine six sets and six missed draws before Mira acts. She bets all six sets and, on average, ${drawCount} draws. Among the bets you face, ${drawCount} of ${6 + drawCount} are bluffs. Your chance of winning is <strong>${percent(equity)}</strong>.</p>
        <p>The pot holds 60 after her bet. Calling adds 20, making ${finalPot}. You need 20 ÷ ${finalPot} = <strong>${percent(breakEven)}</strong> to break even.</p>
        <p>A win earns 60 more chips than folding. A loss costs 20. The average gain from calling is (${drawCount}/${6+drawCount} × 60) − (6/${6+drawCount} × 20) = <strong>${chips(ev)} chips</strong>. Folding adds 0.</p>`;
    }

    select.onchange = reset;
    choices.onclick = event => {
      const action = event.target.closest('[data-river]')?.dataset.river;
      if (action === 'replay') {
        reset();
        choices.querySelector('button').focus();
        return;
      }
      if (finished || (action !== 'call' && action !== 'fold')) return;
      finished = true;
      const {ev} = analyze(select.value);
      const assessment = Math.abs(ev) < 1e-9 ? 'Calling and folding both average 0 chips.' :
        ev > 0 ? 'Calling earns ' + chips(ev) + ' chips on average. Folding earns 0.' :
        'Folding earns 0 chips. Calling averages ' + chips(ev) + ' chips.';
      const result = action === 'fold' ? 'You folded. Mira takes the pot with her cards face down.' :
        'Mira shows ' + deal.cards.join(' ').replaceAll('T', '10') + '. ' +
        (deal.bluffed ? 'Your kings win the 80-chip pot.' : 'Her three nines win the 80-chip pot.');
      review.innerHTML = '<div class="feedback"><strong>' + assessment + '</strong><p>' + result +
        '</p>Change Mira’s style to try the same price against a different range of bets.</div>';
      choices.innerHTML = '<button type="button" class="btn" data-river="replay">Play this spot again</button>';
      review.focus();
    };
    reset();
  }

  return {mount, equilibrium, analyze, dealAfterBet, board, hero, sets, draws};
})();
