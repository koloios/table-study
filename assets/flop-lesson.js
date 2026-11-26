'use strict';

const FlopLesson = (() => {
  const suits = {'♥':'heart', '♦':'diamond', '♣':'club', '♠':'spade'};
  const guided = {you:['A♥','7♥'], board:['K♥','4♥','2♣'], opp:[]};
  const freshDeals = [
    {you:['Q♣','8♣'], board:['J♣','5♦','3♣'], opp:[]},
    {you:['K♦','J♠'], board:['8♦','6♦','2♦'], opp:[]},
    {you:['J♠','9♠'], board:['A♠','6♦','3♠'], opp:[]},
    {you:['Q♦','8♣'], board:['J♦','7♦','4♦'], opp:[]}
  ];

  function chances(deal) {
    const suit = deal.you[0][1];
    const visible = [...deal.you, ...deal.board];
    const unseen = Poker.deck.filter(card => !visible.includes(card));
    const total = unseen.length;
    const hits = unseen.filter(card => card[1] === suit).length;
    const misses = total - hits;
    const next = hits / total;
    const byRiver = deal.board.length === 3 ? 1 - (misses / total) * ((misses - 1) / (total - 1)) : next;
    return {
      suitName:suits[suit], total, hits, misses, next:Course.pct(next), byRiver:Course.pct(byRiver)
    };
  }

  function visual(deal, betContext) {
    return {kind:'cards', deal, hiddenOpponent:deal.opp.length === 0, betContext};
  }

  function build(seed) {
    const flop = chances(guided);
    const turn = {...guided, board:[...guided.board,'5♠']};
    const turnOdds = chances(turn);
    const showdown = {...guided, board:[...guided.board,'2♥','Q♣'], opp:['K♣','K♦']};
    const fresh = freshDeals[seed % freshDeals.length];
    const freshOdds = chances(fresh);
    const allIn = (seed + Math.floor(seed / freshDeals.length)) % 2 === 1;
    const firstPrice = '12 in the pot before the bet · Call 4 · 20 each behind after a call';
    const lastPrice = '12 in the pot before the bet · Call 4 · Mira is all-in';
    const turnOnly = 'Only the turn. Another bet could come before the river.';
    const both = 'The turn and river. Calling ends the betting.';
    const missBoth = '1 − (38/47 × 37/46)';
    return [
      {
        title:'Predict the next card',
        body:'You hold A♥ 7♥ on K♥ 4♥ 2♣. One more heart completes your flush. Mira’s cards are hidden. Assume a fair shuffle and that her bet gives no clue about her cards. Of the cards you haven’t seen, what fraction are hearts?',
        visual:visual(guided, firstPrice),
        choices:['9/44','9/47','13/47'], answer:'9/47',
        explain:'A♥ 7♥ and K♥ 4♥ account for four of the thirteen hearts. You know five cards in total, leaving 52 − 5 = 47 unseen. Nine of those are hearts. Your chance on the turn is 9 ÷ 47 ≈ '+flop.next+'.',
        hint:'Count only cards whose identities you can see. Mira’s two hidden cards are among the unseen cards.'
      },
      {
        title:'What does this call buy?',
        body:'Mira bets 4 into 12. You can cover her bet. If you call, both of you still have 20 chips. Which cards does this call guarantee you will see?',
        visual:visual(guided, firstPrice),
        choices:[turnOnly,both], answer:turnOnly,
        explain:'The dealer reveals the turn. You have a '+flop.next+' chance to hit your heart there. You might see the river for free if both players check, or you might face another price. Try the call and see the turn.',
        hint:'Look at the chips still available to bet after this round.'
      },
      {
        title:'A spade on the turn',
        body:'You called. The pot grew to 12 + 4 + 4 = 20. The dealer turns 5♠ and Mira bets 6. Before deciding again, update the chance of completing your flush on the river.',
        visual:visual(turn,'20 in the pot before the bet · Call 6 · One river left'),
        choices:['8/46','9/47','9/46'], answer:'9/46',
        explain:'The 5♠ used up one unseen card. All nine hearts are still available, so 9 ÷ 46 ≈ '+turnOdds.next+'. Seeing the river now costs another 6 chips.',
        hint:'Did the spade use up a heart? How many card identities are still unseen?'
      },
      {
        title:'Replay the flop with Mira all-in',
        body:'Back to the original flop. Mira again bets 4 into 12, this time with her last 4 chips. Only the two of you remain. Calling guarantees both remaining cards. Which calculation gives the chance of seeing at least one heart?',
        visual:visual(guided,lastPrice), showDrawPathsAfterAnswer:true,
        choices:['2 × (9/47)',missBoth,'9/47 × 8/46'], answer:missBoth,
        explain:'There are 38 non-hearts among 47 unseen cards. After a miss, 37 non-hearts remain among 46. Missing twice has probability (38 ÷ 47) × (37 ÷ 46). Subtract that from 1 to get approximately '+flop.byRiver+' for at least one heart. Simply doubling the turn probability counts two-heart runouts twice.',
        hint:'Count the runouts that miss on both cards. Every other runout contains at least one heart.'
      },
      {
        title:'A flush at showdown',
        body:'One possible runout is 2♥ then Q♣. You made your flush, and Mira turns over K♣ K♦. Who wins this pot?',
        visual:visual(showdown,'All-in · Pot 20'), choices:['You','Mira','Split the pot'], answer:'Mira',
        explain:'Mira uses K♣ K♦ K♥ 2♣ 2♥ for a full house, which beats your ace-high flush. The '+flop.byRiver+' calculation counted runouts containing a heart. To price the call, you would need your expected share of the pot against the hands Mira could hold.',
        hint:'The board contains a pair of twos and a king. Combine those with Mira’s kings.'
      },
      {
        title:'Choose the horizon on a fresh board',
        body:'Count the '+freshOdds.suitName+'s in your hand and on the flop. Mira bets '+(allIn?'her last 6':'6')+' into 18. '+
          (allIn?'You cover the bet, and only the two of you remain.':'You can cover the bet, and both players would have 24 chips behind after a call.')+
          ' For the cards this call guarantees, which chance of making your flush applies, and why?',
        visual:visual(fresh, '18 in the pot before the bet · Call 6 · '+(allIn?'Mira is all-in':'24 each behind after a call')),
        choices:[freshOdds.next+' · one guaranteed card',freshOdds.byRiver+' · two guaranteed cards','38.3% · double the next-card chance'],
        answer:allIn?freshOdds.byRiver+' · two guaranteed cards':freshOdds.next+' · one guaranteed card',
        explain:'Four '+freshOdds.suitName+'s are visible. There are '+freshOdds.hits+' left among '+freshOdds.total+' unseen cards. '+
          (allIn?'Calling ends the betting, so both cards count. 1 − ('+freshOdds.misses+'/47 × 37/46) ≈ '+freshOdds.byRiver+'.':
                 'Chips remain to bet, so only the turn is guaranteed. '+freshOdds.hits+' ÷ '+freshOdds.total+' ≈ '+freshOdds.next+'.'),
        hint:'Could Mira ask for more chips on the turn? Match the fraction to the cards you are sure to see.',
        checkpoint:true
      }
    ];
  }

  return {id:'flop-odds',title:'One card or two?',goal:'Match a flush draw to the cards a flop call guarantees.',build};
})();
