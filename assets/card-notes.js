'use strict';

const CardNotes = (() => {
  const suits = {'♥':'hearts', '♦':'diamonds', '♠':'spades', '♣':'clubs'};
  const ranks = {A:'ace', K:'king', Q:'queen', J:'jack', T:'10'};
  const escape = text => text.replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

  function name(code) {
    const rank = code.slice(0, -1);
    return (ranks[rank] || rank) + ' of ' + suits[code.slice(-1)];
  }
  function card(code, state = '') {
    const suit = code.slice(-1);
    const rank = code.slice(0, -1);
    const label = name(code) + (state ? ', ' + state : '');
    const classes = ['note-card', '♥♦'.includes(suit) ? 'red' : '', state === 'already visible' ? 'seen' : ''].join(' ');
    return '<span class="'+classes+'" role="img" aria-label="'+label+'" title="'+label+'">'+(rank === 'T' ? '10' : rank)+suit+'</span>';
  }

  function hand(cards) {
    return '<span class="note-hand">'+cards.map(code => card(code)).join(' ')+'</span>';
  }

  function text(prose) {
    return escape(prose).replace(/(?:10|[2-9TJQKA])[♥♦♣♠](?: (?:10|[2-9TJQKA])[♥♦♣♠])*/g, match => hand(match.split(' ')));
  }
  return {card, hand, text, name};
})();
