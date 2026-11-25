'use strict';

const Strategy = (() => {
  function hiddenHands(seed) {
    const guided=Intermediate.rangeDeals[0];
    const rotate=hand=>hand.map(code=>code[0]+Poker.suits[(Poker.suits.indexOf(code[1])+seed)%4]);
    const fresh=Intermediate.rangeDeals[1];
    const independent={hero:rotate(fresh.hero),board:rotate(fresh.board),candidates:fresh.candidates.map(rotate),pot:16,bet:10};
    function pair(deal,checkpoint) {
      // The check history supplies the lesson's explicit 1:3 distribution.
      const result=Intermediate.analyzeRange(deal,false);
      const [a,b]=result.rows;
      const shown={you:deal.hero,board:deal.board,opp:a.hand};
      const price=Poker.callPrice(deal.pot,deal.bet,a.equity);
      const context='Mira bets her last '+deal.bet+' into '+deal.pot+'. A call costs '+deal.bet+' for a final pot of '+price.finalPot+'. ';
      const cards=hand=>hand.join(' ');
      const step=(title,body,hidden,ev,explain,hint)=>({
        title,body,visual:{kind:'cards',deal:shown,hiddenOpponent:hidden},choices:['Call','Fold'],
        answer:ev>0?'Call':'Fold',explain,hint,checkpoint
      });
      const threshold='The call needs '+deal.bet+' ÷ '+price.finalPot+' ≈ '+Course.pct(price.breakEven)+'.';
      return [
        step(checkpoint?'A fresh turn, cards face up':'Start with one exposed hand',context+
          (checkpoint?'Count your winning rivers. ':'You win on '+a.wins.length+' of 44 rivers. ')+
          'Which action earns more on average?',false,price.ev,
          'Your winning rivers are '+cards(a.wins)+'. That gives '+a.wins.length+' ÷ 44 ≈ '+Course.pct(a.equity)+'. '+threshold,
          'Count the cards that beat this exact hand, then compare your chance with the cost divided by the final pot.'),
        step(checkpoint?'Commit against the hidden hand':'Cover Mira’s cards',context+
          'Keep your cards and the board. This time Mira holds '+cards(a.hand)+' one time in four or '+cards(b.hand)+
          ' three times in four. '+(checkpoint?'':'Against the first holding you win on '+a.wins.length+' rivers. Against the second you win on '+b.wins.length+'. ')+
          'Would you call at the same price?',true,result.ev,
          (checkpoint?'Against '+cards(b.hand)+', your winners are '+cards(b.wins)+'. ':'A heart beats the exposed aces, but gives '+cards(b.hand)+' a higher flush. Against that hand, the remaining sevens and eights win. ')+
          'You see six cards. For each holding you consider, set its two cards aside as well, leaving 44 possible rivers. Weight each count by how often that holding occurs: ('+a.count+' × '+a.wins.length+' + '+b.count+' × '+b.wins.length+
          ') ÷ (4 × 44) ≈ '+Course.pct(result.equity)+'. '+threshold,
          'Count your wins separately against each pair. Give the second count three times the weight of the first.')
      ];
    }
    return [...pair(guided,false),...pair(independent,true)];
  }

  function preflop(seed) {
    const suited=['8♠','7♠'];
    const variant=[['7♥','6♥'],['9♦','8♦'],['8♣','7♣']][seed%3];
    const open='Raise to 5', fold='Fold', call='Call 6', raise='Raise to 18';
    const assumption='Four players start with 200 chips each and blinds of 1/2. The button often reraises an early open. Both blinds frequently fold to a button raise. ';
    const scene=(hand,button,raised=false)=>({kind:'table',button,street:'Preflop · Your action',pot:raised?9:3,
      fold:button===2&&!raised?1:undefined,pocket:hand,stack:200});
    const question=(title,body,visual,choices,answer,explain,hint,checkpoint=false)=>({title,body,visual,choices,answer,explain,hint,checkpoint});
    return [
      {title:'Build a starting plan',body:assumption+'For these opponents, use a conservative plan. Open strong pairs from either seat. Add small suited connectors (two consecutive cards of the same suit) on the button when everyone before you folds. Against a tight opening raise, fold those connectors and reraise aces for value.',
        visual:scene(suited,3),button:'Try the first seat'},
      question('First to act', 'You hold 8♠ 7♠ in the cutoff, the seat before the button. All three opponents still have cards. Which opening line fits the plan?',
        scene(suited,3),[open,fold],fold,'The aggressive button can reraise and still act after you on later streets. This plan passes on the small suited connector from the cutoff.',
        'Count the players left, including the aggressive button.'),
      question('Move the same cards to the button','Sol folds from the cutoff. You still hold 8♠ 7♠. Which opening line fits now?',
        scene(suited,2),[open,fold],open,'Only the blinds remain. They often fold, and if a blind calls, you act last after the flop. The plan opens to 5 to try to win the 3 chips already in the pot.',
        'Which two players remain, and who acts last if you see a flop?'),
      question('One change before your turn','Keep the button and 8♠ 7♠. This time Sol opens to 6 from the cutoff. Sol usually opens strong pairs or high aces. How does your response change?',
        scene(suited,2,true),[fold,call,raise],fold,'Sol has already shown strength and the blinds can still raise. This plan folds small suited connectors against that tight opening range.',
        'Did everyone before you fold this time?'),
      question('Play a fresh unopened pot','You hold '+variant.join(' ')+'. '+(seed%2?'Sol folds to your button.':'You act first in the cutoff.')+' Apply the same opponent assumptions.',
        scene(variant,seed%2?2:3),[open,fold],seed%2?open:fold,
        seed%2?'With two frequently folding blinds behind, this suited connector joins your button opens.':'With three players behind and an aggressive button, the plan folds this suited connector.',
        'Locate the button and count the players still to act.',true),
      question('Keep the connectors against a raise','You have '+variant.join(' ')+' on the button. Sol has opened to 6 with the same tight range. What does your plan do now?',
        scene(variant,2,true),[fold,call,raise],fold,'Winning the unopened blinds is no longer an option. Sol is already invested with a strong range and the blinds can still reraise.',
        'Consider who has put in a voluntary raise before you.',true),
      question('Face an opening raise','Sol opens to 6 from the cutoff. You hold A♥ A♠ on the button. Sol can continue against a reraise with worse pairs. Which line builds the pot for value?',
        scene(['A♥','A♠'],2,true),[fold,call,raise],raise,'Raising to 18 puts more chips in while worse pairs can call. The stack depth leaves chips to play after the flop. This sizing is the practice plan for these opponents.',
        'You want a worse hand to put more chips in before the flop.',true)
    ];
  }

  const units=[
    {id:'hidden-hand',title:'From one hand to a range',goal:'Price the same call when Mira’s cards go face down.',build:hiddenHands,onward:'#intermediate/ranges',nextTitle:'Read a weighted range'},
    {id:'preflop',title:'Choose a preflop line',goal:'Choose an opening or a response at a four-handed table.',build:preflop,onward:'#table',nextTitle:'Play at the Practice Table'}
  ];
  return {units};
})();
