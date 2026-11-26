'use strict';

const BigBlindHand = (() => {
  const roles = ['Button', 'Small blind', 'Big blind', 'Cutoff'];
  const decisionCount = 7;
  const foldedSeats = ['Ivo', 'Sol'];

  function deal(seed) {
    const rotate = cards => cards.map(card => card[0] + Poker.suits[(Poker.suits.indexOf(card[1]) + seed) % 4]);
    const queens = Math.floor(seed / 32) % 2 === 1;
    const top = queens ? 'Q' : 'J';
    const hero = rotate([top+'♦', queens?'J♦':'T♦']);
    const board = rotate([top+'♣','7♠','2♥','4♣','9♥']);
    const value = rotate(['A♠',top+'♥']);
    const bluff = rotate(['A♣','5♣']);
    const bet = Math.floor(seed / 4) % 2 ? 14 : 7;
    return {hero, board, value, bluff, bet, pair:queens?'queens':'jacks'};
  }

  function frames(hand) {
    const {hero, board, value, bluff, bet, pair} = hand;
    const common = {hero, folded:foldedSeats};
    const preflop = {...common, street:'Preflop', board:[], pot:9};
    const flop = {...common, street:'Flop', board:board.slice(0,3), pot:13};
    return [
      {...preflop, title:'Count what you owe',
        context:'Four players start with 100 chips each. Sol posts 1 and you post the big blind of 2. Ivo folds. Mira raises to 6 on the button and Sol folds.',
        prompt:'You already have chips in the pot. How many more would match Mira’s raise?',
        options:['2 more','4 more','6 more']},
      {...preflop, title:'Defend your big blind',
        context:'Mira often opens on the button. You have two suited cards with consecutive ranks. You are the last player to act this round.',
        prompt:'Practise calling or folding. Calling closes this round. Folding leaves your posted blind in the pot.',
        options:['Call 4','Fold']},
      {...flop, title:'Find the first player on the flop',
        context:'Your call brings the pot to 13. Only you and Mira remain.',
        prompt:'The dealer puts out the flop. Who acts first now?',
        options:['You','Mira']},
      {...flop, title:'Pass the action to the button',
        context:'You have top pair and check. That passes the action to Mira without adding chips.',
        prompt:'What can Mira do after your check?',
        options:['Check or bet','She must check too']},
      {...flop, pot:17, title:'Respond to the flop bet',
        context:'After your check, Mira bets 4 into 13. The action comes back to you.',
        prompt:'You still have your pair of '+pair+'. Choose whether to match the 4 or give up the pot.',
        options:['Call 4','Fold']},
      {...common, street:'Turn', board:board.slice(0,4), pot:21, title:'Follow a checked turn',
        context:'You call, bringing the pot to 21. On the turn you check again and Mira checks behind.',
        prompt:'Both remaining players have checked. What happens now?',
        options:['See the river for free','Call another 4','Go straight to showdown']},
      {...common, street:'River', board, pot:21+bet, title:'Catch a bluff at this price?',
        context:'You check the river. Mira bets '+bet+' into 21. For this exercise, when she bets this size she holds '+value.join(' ')+' three times for every one time she holds '+bluff.join(' ')+'.',
        prompt:'Your pair of '+pair+' can catch her bluff. Against these bets, which choice earns more chips on average?',
        hint:'Compare your pair with each holding. Work out how often you win across four bets. Then divide the chips you would call by the final pot after that call.',
        options:['Call '+bet,'Fold']}
    ];
  }

  function explain(hand, index, action) {
    switch (index) {
      case 0: return 'Mira has put in 6 and your blind already counts for 2. You owe 6 − 2 = 4.';
      case 1: return action==='Fold'?'Folding costs 0 more. You finish the hand down the 2 you posted.':
        'Your extra 4 closes the betting. Your 6, Mira’s 6 and Sol’s 1 make 13. The small blind stays in the pot after Sol folds.';
      case 2: return 'You act first. Start clockwise from the button and skip the folded small blind. Mira acts last on every remaining street.';
      case 3: return 'Mira can check behind to see the turn for free, or bet. A bet gives you another decision on this street.';
      case 4: return 'A call costs 4. It would make the pot 13 + 4 + 4 = 21 and take you to the turn. Your pair beats some bets and loses to others.';
      case 5: return 'Two checks close the turn. No chips change hands. The dealer puts out the river and the pot stays at 21.';
      default: {
        const quote = Poker.callPrice(21,hand.bet,1/4);
        return 'Both players have a pair against '+hand.value.join(' ')+', but Mira’s ace kicker wins. Against '+hand.bluff.join(' ')+', your pair beats ace high. You win 1 of 4 calls, or 25%. '+
          'A call needs '+hand.bet+' ÷ '+quote.finalPot+' ≈ '+(100*quote.breakEven).toFixed(1)+'%. Calling averages (0.25 × '+quote.finalPot+') − '+hand.bet+' = '+quote.ev.toFixed(2)+
          ' chips. Folding adds 0 from this decision. '+(quote.ev>0?'Calling':'Folding')+' earns more at this price.';
      }
    }
  }

  function settle(seed, hand, view, action) {
    if (action === 'Fold') {
      // Both live players have matched the same amount up to Mira's latest bet or raise.
      const uncalled = view.street==='River'?hand.bet:4;
      const pot = view.pot-uncalled;
      const invested = (pot-1)/2; // Sol's folded small blind is the extra chip.
      return {title:'You folded', pot, net:-invested, folded:[...foldedSeats,'You'],
        detail:'Mira takes the '+pot+'-chip pot. Her '+uncalled+' uncalled chips go back to her stack. Her cards stay face down.'};
    }
    const opp = Math.floor(seed / 8) % 4 === 3 ? hand.bluff : hand.value;
    const yours = Poker.best([...hand.hero,...hand.board]);
    const theirs = Poker.best([...opp,...hand.board]);
    const pot = view.pot+hand.bet;
    const payout = yours.score>theirs.score?pot:yours.score===theirs.score?pot/2:0;
    const reason = opp===hand.bluff?'Your pair beats Mira’s ace high.':'You both have a pair of '+hand.pair+'. Mira’s ace kicker plays.';
    return {title:payout?'You win at showdown':'Mira wins at showdown', opp, board:hand.board,
      pot, net:payout-10-hand.bet, folded:foldedSeats,
      detail:reason+' Your share of the '+pot+'-chip pot is '+payout+'.'};
  }

  function resume(seed, actions) {
    if (!Number.isInteger(seed) || seed<0 || seed>=704 || !Array.isArray(actions) || actions.length>decisionCount) return null;
    const hand = deal(seed), steps = frames(hand), history=[];
    let view=steps[0], result=null;
    for (const [index,action] of actions.entries()) {
      if (result || !view.options.includes(action)) return null;
      history.push({view,action,explanation:explain(hand,index,action)});
      if (action==='Fold' || index===decisionCount-1) result=settle(seed,hand,view,action);
      else view=steps[index+1];
    }
    return {view,result,history};
  }
  return {roles,decisionCount,resume};
})();
