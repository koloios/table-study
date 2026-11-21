'use strict';
// Scores are base-15 digits: category first, then all five tie-break positions.
const Poker = (() => {
  const ranks = '23456789TJQKA';
  const suits = ['♥','♠','♦','♣'];
  const deck = suits.flatMap(suit => Array.from(ranks, rank => rank + suit));
  const categories = ['high card','one pair','two pair','three of a kind','straight','flush','full house','four of a kind','straight flush'];
  function five(cards) {
    const values = cards.map(c => ranks.indexOf(c[0])+2).sort((a,b)=>b-a);
    const counts = new Map();
    for (const n of values) counts.set(n,(counts.get(n)||0)+1);
    const groups = [...counts].sort((a,b)=>b[1]-a[1] || b[0]-a[0]);
    const flush = cards.every(c=>c[1]===cards[0][1]);
    const straight = groups.length===5 && (values[0]-values[4]===4 || values.join() === '14,5,4,3,2');
    let category = 0, ties = groups.map(g=>g[0]);
    if (straight && flush) category = 8;
    else if (groups[0][1]===4) category = 7;
    else if (groups[0][1]===3 && groups[1][1]===2) category = 6;
    else if (flush) category = 5;
    else if (straight) category = 4;
    else if (groups[0][1]===3) category = 3;
    else if (groups[0][1]===2) category = groups[1][1]===2 ? 2 : 1;
    if (straight) ties = [values[0]===14 && values[1]===5 ? 5 : values[0]];
    let score = category;
    for(let i=0;i<5;i++) score = score*15+(ties[i]||0);
    return {score,category:categories[category]};
  }
  function best(cards) {
    let winner;
    for(let a=0;a<cards.length-4;a++)
      for(let b=a+1;b<cards.length-3;b++)
        for(let c=b+1;c<cards.length-2;c++)
          for(let d=c+1;d<cards.length-1;d++)
            for(let e=d+1;e<cards.length;e++){
              const selection=[cards[a],cards[b],cards[c],cards[d],cards[e]];
              const result=five(selection);
              if(!winner || result.score>winner.score) winner={...result,cards:selection};
            }
    return winner;
  }
  function rivers(deal) {
    const known = [...deal.you,...deal.opp,...deal.board];
    return deck.filter(c=>!known.includes(c)).map(card=>{
      const board=[...deal.board,card];
      const result=Math.sign(best([...deal.you,...board]).score-best([...deal.opp,...board]).score);
      return {card,result};
    });
  }
  function callPrice(pot,bet,chance) {
    const finalPot=pot+2*bet;
    return {finalPot,breakEven:bet/finalPot,ev:chance*finalPot-bet};
  }
  return {deck,suits,categories,best,five,rivers,callPrice};
})();
