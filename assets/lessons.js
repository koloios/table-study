'use strict';
const Course = (() => {
  const names=['Mira','Sol','You','Ivo'];
  const base={you:['8♥','7♥'],opp:['A♣','A♦'],board:['K♥','2♠','4♥','J♣']};
  const blocked={...base,opp:['A♥','A♦']};
  const riverCache=new Map();
  function outcomes(deal) {
    const key=[...deal.you,...deal.opp,...deal.board].join('');
    if (!riverCache.has(key)) riverCache.set(key,Poker.rivers(deal));
    return riverCache.get(key);
  }
  function changeSuits(deal,rotation) {
    const rotate=cards=>cards.map(c=>c[0]+Poker.suits[(Poker.suits.indexOf(c[1])+rotation)%4]);
    return {you:rotate(deal.you),opp:rotate(deal.opp),board:rotate(deal.board)};
  }
  const pct=n=>(100*n).toFixed(1)+'%';
  const table=(button,street,pot,fold=-1)=>({kind:'table',button,street,pot,fold});
  const cards=(deal,extra={})=>({kind:'cards',deal,...extra});
  function read(title,body,visual,button='Continue') { return {title,body,visual,button}; }
  function ask(title,body,visual,choices,answer,explain,hint,checkpoint=false){
    return {title,body,visual,choices,answer,explain,hint,checkpoint};
  }
  function numericChoices(right,others) {return [...new Set([right,...others])].sort((a,b)=>a-b).map(String);}
  function seats(seed) {
    const checkpointButton=seed%4, first=(checkpointButton+3)%4, small=(checkpointButton+1)%4;
    const raiseTo=[6,8,10,12][seed%4];
    return [
      read('Sit at the table','You have the bottom seat throughout this course. The dealer button marks the starting point for the deal. Going clockwise from it, the next two players put in the small blind (1) and big blind (2) before seeing their cards. These 3 chips start the pot.',table(0,'Hand 1 · Blinds',3),'Follow the opening round'),
      ask('Who opens the betting?','Everyone receives two private cards. These belong only to that player. Before the flop (the first three shared cards), the player clockwise from the big blind acts first. Trace that route on the table.',table(0,'Hand 1 · Before the flop',3),names,'Ivo','Ivo can fold, call 2, or raise. If everyone folds, the big blind wins the pot straight away.','Find your BB badge, then move one seat clockwise.'),
      read('Follow a round of betting','Ivo folds. Mira calls 2, Sol adds 1 to match, and you check because your big blind already covers the price. All players still in have matched 2. The dealer can reveal the three-card flop.',table(0,'Hand 1 · Preflop complete',6,3),'See who acts on the flop'),
      ask('Who acts after the flop?','Each later round starts at the first remaining player clockwise from the button. At your turn you can check when there is no bet to match, or open the betting yourself.',table(0,'Hand 1 · Flop',6,3),names,'Sol','Sol is the small blind and still holds cards. If she checks, you act next. The turn and river each bring one further board card and a new betting round.','Start from Mira’s dealer button this time.'),
      ask('The button moves','Hand 2 starts with Sol on the button. Which opening bet do you post now?',{...table(1,'Hand 2 · Blinds',3),hideYourRole:true},['None','Small blind · 1','Big blind · 2'],'Small blind · 1','Your chair stays put as the roles rotate.','Look one seat clockwise from Sol.'),
      ask('Play from the button','On hand 3 you have the button. Ivo has the small blind and Mira the big blind. Who acts before you preflop?',table(2,'Hand 3 · Before the flop',3),names,'Sol','Sol acts first. You get to see that decision before making yours.','Find Mira and move one seat clockwise.'),
      ask('Finish the orbit','Hand 4 gives Ivo the button. Who is first to act preflop?',table(3,'Hand 4 · Before the flop',3),names,'You','All four positions have now passed your seat.','Start from the big blind and move clockwise.'),
      ask('Read a fresh deal','A new hand begins. Identify the first player before the flop.',table(checkpointButton,'New hand · Before the flop',3),names,names[first],'The first preflop decision belongs to the seat clockwise from the big blind.','Locate the two forced bets before choosing a seat.',true),
      ask('Skip a folded seat','The small blind folded before the flop. The other three players remain. Who opens this round?',table(checkpointButton,'Flop · Three players remain',7,small),names,names[(small+1)%4],'Start at the button and skip the folded small blind. The big blind acts first here.','Follow the live seats clockwise from the button.',true),
      ask('What does calling cost?','In another hand you posted the big blind of 2. Mira raises to '+raiseTo+' total and Sol folds. How many additional chips do you put in to call?',table(0,'Before the flop · Facing a raise',raiseTo+3,1),numericChoices(raiseTo-2,[raiseTo,raiseTo+2]),String(raiseTo-2),'You already paid 2 this round. Matching '+raiseTo+' costs '+(raiseTo-2)+' more.','Subtract the chips already committed on this street.',true)
    ];
  }
  function showdowns(seed) {
    const pair={you:['A♠','Q♣'],opp:['A♦','J♣'],board:['A♥','9♠','6♦','4♣','2♥']};
    const shared={you:['2♦','3♣'],opp:['7♥','7♠'],board:['A♣','K♦','Q♠','J♥','T♣']};
    const fresh=changeSuits(seed%2 ? {you:['K♠','4♥'],opp:['Q♣','Q♦'],board:['K♥','9♣','9♦','5♠','2♣']} :
      {you:['J♠','J♥'],opp:['Q♣','7♦'],board:['Q♥','8♣','8♦','5♠','2♣']},seed%4);
    const winner=Poker.best([...fresh.you,...fresh.board]).score>Poker.best([...fresh.opp,...fresh.board]).score?'You':'Mira';
    return [
      read('Use the best five','When betting ends with two or more players still in, they show their cards. Each makes the strongest five-card hand from their two private cards and the five shared cards. You can use zero, one or both private cards. Ranks run from 2 up to ace. A pair means two cards of equal rank. Here both players have a pair of aces. Compare the other three cards, called kickers, from highest to lowest.',cards(pair,{ranking:true}),'Build your hand'),
      {...read('Pick your five','Tap your best five from your seven available cards. Keep both aces, then choose your three highest remaining ranks.',cards(pair,{select:true})),pick:true,explain:'Your five are A♠ A♥ Q♣ 9♠ 6♦. Mira’s highest kicker is a jack, so your queen decides the pot.'},
      ask('When the board plays','Everyone can use the five shared cards. Who gets this pot?',cards(shared,{ranking:true}),['You','Mira','Split the pot'],'Split the pot','The board itself is an ace-high straight. Both players use exactly that same five-card hand.','Read the five board ranks in order. A pair loses to a straight.'),
      ask('Award a fresh pot','Both players remain at showdown. Who has the stronger five cards?',cards(fresh,{ranking:true}),['You','Mira','Split the pot'],winner,'Both have two pair. Compare the higher pair first: '+(winner==='You'?'kings beat queens.':'queens beat jacks.'),'Consider the paired board alongside each player’s private cards.',true),
      {...read('Show your evidence','Select the best five cards available to you on this deal.',cards(fresh,{select:true})),pick:true,checkpoint:true,explain:'Those five make your strongest hand. Equal-ranked interchangeable cards are accepted.'}
    ];
  }
  const drawFamilies = [
    {deal:base, hint:'Count the unseen cards of the suit that would complete your flush.'},
    {deal:{you:['7♦','8♣'], opp:['K♣','K♥'], board:['5♠','6♥','K♦','2♣']},
      hint:'Your four consecutive ranks can make a straight at either end. Count both ranks.'},
    {deal:{you:['Q♥','J♣'], opp:['A♥','A♠'], board:['8♦','9♠','A♣','2♥']},
      hint:'Find the rank that fills the gap between your nine and jack. A pair cannot beat three aces.'},
    {deal:{you:['Q♥','Q♣'], opp:['K♦','K♣'], board:['2♥','5♦','9♣','J♠']},
      hint:'Which single rank turns your smaller pair into three of a kind?'}
  ];
  function freshDraw(seed) {
    const family=drawFamilies[seed % drawFamilies.length];
    const deal=changeSuits(family.deal, Math.floor(seed / drawFamilies.length) % 4);
    const winners=outcomes(deal).filter(o=>o.result>0).map(o=>o.card);
    return {deal, winners, hint:family.hint};
  }
  function draws(seed) {
    const {deal:fresh, winners, hint}=freshDraw(seed);
    const wins=winners.length;
    return [
      read('One card to come','The river is the final shared card. You have four hearts across your hand and the board. Mira shows two aces. A heart makes your flush; every other river leaves Mira ahead. A winning river card is called an out.',cards(base),'Count the hearts'),
      ask('Count the outs','There are 13 hearts in the deck. How many winning hearts are still unseen?',cards(base),['4','9','13'],'9','Subtract four visible hearts from thirteen. Each remaining heart wins this particular hand.','Count the two hearts you hold and the two on the board.'),
      read('Build the denominator','You know eight card identities: two of yours, two of Mira’s, and four shared cards. That leaves 52 − 8 = 44 possible river cards. Nine win, so 9 ÷ 44 × 100 = 20.5%, rounded. Choose a river below to see each player’s best five.',cards(base,{inspect:true}),'Change one card'),
      ask('Reveal a blocker','Replace Mira’s ace of clubs with the ace of hearts. It is still a pair of aces. What changes?',cards(blocked),['8 wins in 44','9 wins in 43','9 wins in 44'],'8 wins in 44','Another heart is visible, so one fewer winning river remains. The total number of known cards stays eight.','Recount visible hearts, then visible cards of any suit.'),
      ask('Count a fresh draw','How many rivers win for you on this deal?',cards(fresh),numericChoices(wins,[wins+1,wins+2,wins-1]),String(wins),'The winning cards are '+winners.join(' ')+'. That gives '+wins+' of 44, or '+pct(wins/44)+'.',hint,true),
      ask('What about a burn card?','The dealer takes the next card off the deck face down before dealing the river. Which probability now applies from your seat?',cards(fresh),[wins+' / 44',wins+' / 43',(wins-1)+' / 43'],wins+' / 44','A burn changes where the river sits in the deck. Its identity is unknown, so every one of the 44 unseen identities still has an equal chance to be the river.','Ask whether you learned the identity of a card.',true)
    ];
  }
  function pricing(seed) {
    const pot=18+2*(seed%5),bet=seed%2?2:10;
    const quote=Poker.callPrice(pot,bet,9/44);
    return [
      read('Price the same hand twice','Start with a 12-chip pot and Mira’s exposed aces. You win on 9 of 44 rivers. Mira bets her remaining chips (an all-in), so there will be no further betting. Move between the two prices. At what point does the price ask for more wins than the deck gives you?',cards(base,{price:true}),'Work through a call'),
      ask('Recover the cost of calling','Mira bets 2 into 12. If you call, the pot contains 12 + 2 + 2 = 16. What share of the final pot does your call cost?',cards(base),['2 / 12','2 / 14','2 / 16'],'2 / 16','You pay 2 for a chance to receive 16 including your call. This comparison is called pot odds. Break-even is 2 ÷ 16 = 12.5%. You win 20.5% here.','Include both Mira’s bet and your call in the final pot.'),
      read('Count chips over every river','At the 2-chip price, a win gains 14 net and a loss costs 2. Across all 44 possible rivers the total is 9 × 14 − 35 × 2 = 56. Dividing by 44 gives +1.27 chips per call. At 8 chips the same calculation gives −2.27. Folding adds 0 from this decision.',cards(base,{price:true}),'Try a fresh price'),
      ask('Build the final pot','There are '+pot+' chips in the middle before Mira bets '+bet+' all-in. If you call, how many chips are paid to the winner?',cards(base),numericChoices(quote.finalPot,[pot,pot+bet]),String(quote.finalPot),'The pot is '+pot+' + '+bet+' + '+bet+' = '+quote.finalPot+'.','Add both matching bets to the existing pot.',true),
      ask('Make the decision','The call costs '+bet+' and the final pot would be '+quote.finalPot+'. You win 9 of the 44 rivers. Which action earns more on average?',cards(base),['Call','Fold'],quote.ev>0?'Call':'Fold','The price needs '+pct(quote.breakEven)+' wins. You have '+pct(9/44)+'. Calling averages '+quote.ev.toFixed(2)+' chips; folding adds 0.','Divide the call by the final pot and compare with 9/44.',true)
    ];
  }
  function samples(seed) {
    const n=[44,88,132,176][seed%4],expect=9*n/44;
    return [
      ask('Predict a batch','With one river to come you win 9/44 of the time. If we reset the same turn and draw 44 separate rivers, how many wins should we expect on average?',cards(base),['Exactly 44','About 9','About 35'],'About 9','Expected count = 44 × 9/44 = 9. Individual batches can land above or below nine.','Multiply the number of trials by the win probability.'),
      {...read('Try the river experiment','Deal 10 rivers and look at the observed rate. Then add 100. Every trial starts again with all 44 possibilities. The vertical mark shows the calculated 20.5% chance.',cards(base,{lab:true}),'Explain the result'),lab:true},
      ask('Could a batch miss every time?','A miss has probability 35/44. In ten independent trials, what is the chance that every trial misses?',cards(base),['Zero after four misses','(35/44)¹⁰','10 × (35/44)'],'(35/44)¹⁰','Multiply the ten independent miss probabilities: about 10.1%. Even a profitable call can lose ten times in a row.','Every reset leaves the next river with the same chance to miss.'),
      ask('Predict another sample','You reset this exact hand before each of '+n+' river deals. How many wins would you expect on average?',cards(base),numericChoices(expect,[9*(n/44+1),Math.round(n/2)]),String(expect),n+' × 9/44 = '+expect+' expected wins. The observed count can differ.','Scale the nine expected wins per 44 trials to the new sample size.',true),
      ask('The next river','When you reset the deck for the next trial, what is the chance of a heart?',cards(base),['9 / 44','9 / 41','A heart is due'],'9 / 44','The lab restores every card between trials. Drawing several cards from one deck without replacing them would be a different experiment.','Check whether the missed cards stay out of the deck.',true)
    ];
  }
  function review(seed) {
    const {deal:fresh,winners}=freshDraw(seed);
    const wins=winners.length, chance=wins/44;
    const scenarios=[{pot:Math.max(40,Math.ceil(8/chance)),bet:8},{pot:8,bet:4}];
    if(seed%2) scenarios.reverse();
    const decisions=scenarios.map(({pot,bet},i)=>{
      const quote=Poker.callPrice(pot,bet,chance);
      return {
        ...ask(i===0?'Choose your line':'Try the other pot',
          'The pot begins at '+pot+' chips. Mira bets her last '+bet+'. You can see both hands and have '+wins+' winning rivers out of 44. Pick an action, then show how you priced it.',
          cards(fresh), ['Call','Fold'], quote.ev>0?'Call':'Fold',
          'Your chance to win is '+pct(chance)+'. A '+bet+'-chip call needs '+bet+' ÷ '+quote.finalPot+' = '+pct(quote.breakEven)+' wins to break even. Calling averages '+quote.ev.toFixed(2)+' chips. Folding adds zero.',
          'Include the starting pot, Mira’s bet and your call.',true),
        quote, pot, bet
      };
    });
    return [
      {...read('Play the whole hand','Take the big blind, follow the other seats, then count and price a river draw. Return to Foundations when you are ready for a fresh decision.',cards(base),'Continue to the independent hand'),guided:true},
      ...decisions,
      ask('Explain the reversal','Why is paying 8 chips profitable in one deal while paying 4 loses chips on average in the other?',cards(fresh),['The bigger bet creates more outs','The 8-chip call costs a smaller fraction of its final pot','A cheap call always wins less often'],'The 8-chip call costs a smaller fraction of its final pot','You paid 8 for a final pot of '+(scenarios.find(s=>s.bet===8).pot+16)+', or 4 for a final pot of 16. The cards gave you the same chance in both deals.','Compare each call with its own final pot.',true)
    ];
  }
  const units=[
    {id:'seats',title:'Take your seat',goal:'Follow the blinds, the button and the action.',build:seats},
    {id:'showdown',title:'Read a showdown',goal:'Pick the best five and award the pot.',build:showdowns},
    {id:'rivers',title:'Count the rivers',goal:'Find your outs and explain the denominator.',build:draws},
    {id:'price',title:'Price a call',goal:'Use the final pot to choose between calling and folding.',build:pricing},
    {id:'sample',title:'Test a prediction',goal:'Compare a river sample with its calculated probability.',build:samples},
    {id:'review',title:'Play the review hand',goal:'Play through the hand and defend a fresh decision.',build:review}
  ];
  return {units,names,base,outcomes,pct};
})();
