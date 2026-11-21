'use strict';
// A targeted retry uses a new example, independent of the learner's lesson cursor.
const Practice = (() => {
  const skills = {
    order:'Find the next player', blind:'Read the blinds', cost:'Count the chips owed',
    best:'Read the best five', winner:'Award the pot', outs:'Count winning rivers',
    unseen:'Count unseen cards', pot:'Build the final pot', price:'Price a call',
    count:'Predict a sample count', independent:'Reason about independent deals'
  };
  const byStep = {
    seats:[null,'order',null,'order','blind','order','order','order','order','cost'],
    showdown:[null,'best','winner','winner','best'],
    rivers:[null,'outs',null,'outs','outs','unseen'],
    price:[null,'pot',null,'pot','price'],
    sample:['count',null,'independent','count','independent'],
    review:[null,'price','price','price']
  };
  function skillAt(unit,index) {return byStep[unit]?.[index];}
  function numeric(n,values) {return [...new Set([n,...values])].sort((a,b)=>a-b).map(String);}
  function build(skill,seed) {
    const name=skills[skill], variant=seed%4;
    const draw=Course.units.find(u=>u.id==='rivers').build(seed)[4];
    const visual=draw.visual;
    const wins=Number(draw.answer);
    function question(body,choices,answer,explain,hint,view=visual) {
      return {title:name,body,choices,answer:String(answer),explain,hint,visual:view,checkpoint:true};
    }
    if(skill==='order'||skill==='blind'||skill==='cost'){
      const button=variant, small=(button+1)%4, blind=(button+2)%4;
      const table={kind:'table',button,street:'New practice hand',pot:3,fold:-1};
      if(skill==='order'){
        const flop=Math.floor(seed/4)%2===1;
        table.street=flop?'Flop · Small blind folded':'Before the flop';
        if(flop){table.fold=small;table.pot=7;}
        return question(flop?'The small blind folded. Tap the first player to act on the flop.':'Tap the first player to act before the flop.',Course.names,Course.names[flop?blind:(blind+1)%4],flop?'Start clockwise from the button and skip the folded seat.':'Move one seat clockwise from the big blind.','Follow the seats clockwise.',table);
      }
      if(skill==='blind'){
        table.hideYourRole=true;
        table.hideBlinds=true;
        return question('The button marks the dealer position. Which forced bet do you post?', ['Small blind','Big blind','Neither'],small===2?'Small blind':blind===2?'Big blind':'Neither','The first two seats clockwise from the button post the small and big blinds.','Your seat is at the bottom.',table);
      }
      const total=2*(variant+4), posted=(Math.floor(seed/4)%2)+1;
      table.button=posted===1?1:0;
      table.street='Before the flop · Facing a raise';
      table.pot=total+3;
      return question('You have posted '+posted+'. An opponent raises to '+total+' total. How many chips must you add?',numeric(total-posted,[total,total+posted]),total-posted,total+' − '+posted+' = '+(total-posted)+' more chips.','Count only the additional chips you owe.',table);
    }
    if(skill==='best'||skill==='winner'){
      const ranks='23456789TJQKA';
      const high=ranks[9+variant], low=ranks[8+variant];
      const deal={you:[high+'♥','6♦'],opp:[low+'♣',low+'♦'],board:[high+'♠','7♣','7♦','4♥','2♣']};
      if(seed%2)[deal.you,deal.opp]=[deal.opp,deal.you];
      const view={kind:'cards',deal};
      if(skill==='best')return {title:name,body:'Select your strongest five cards from this deal.',visual:{...view,select:true},pick:true,explain:'Both pairs and the highest available kicker form your best five.'};
      return question('Who wins at showdown on this paired board?', ['You','Mira','Split the pot'],seed%2?'Mira':'You','Both players have two pair. The higher top pair wins.','Compare the rank of the higher pair first.',view);
    }
    if(skill==='outs')return {...draw,title:name};
    if(skill==='unseen'){
      const exposed=seed%2===0, total=exposed?44:46;
      // In the hidden-hand version we ask only about making a flush.
      return question(exposed?'With both hands shown and a face-down burn, how many possible river identities are unknown to you?':'Mira keeps her cards face down. Four board cards and your two cards are visible. After an unseen burn, how many possible river identities remain?',numeric(total,[total-1,total+1]),total,exposed?'52 − 2 − 2 − 4 = 44. The burn reveals no identity.':'52 − 2 − 4 = 46. Hidden opponents and burn cards are still unknown.','Subtract only card identities you know.',{...visual,hiddenOpponent:!exposed});
    }
    const wager=3+variant, starting=(Math.floor(seed/4)%2===0?2:7)*wager;
    const quote=Poker.callPrice(starting,wager,wins/44);
    if(skill==='pot')return question('Mira puts in '+wager+' after a starting pot of '+starting+'. If you match her all-in, what is the final pot?',numeric(quote.finalPot,[starting,starting+wager]),quote.finalPot,starting+' + '+wager+' + '+wager+' = '+quote.finalPot+'.','Include both players’ new contributions.');
    if(skill==='price')return question('You win '+wins+' of 44 rivers. Mira bets '+wager+' all-in into '+starting+'. Which action earns more on average?',['Call','Fold'],quote.ev>0?'Call':'Fold','Your win chance is '+Course.pct(wins/44)+'. The price needs '+Course.pct(quote.breakEven)+'.','Divide your call by the final pot.');
    const trials=44*(variant+2), expected=wins*trials/44;
    if(skill==='count')return question('With '+wins+' winning rivers out of 44, how many wins would you expect across '+trials+' independent trials?',numeric(expected,[expected+wins,expected-2]),expected,trials+' × '+wins+'/44 = '+expected+' expected wins.','Multiply sample size by the chance per trial.');
    const streak=variant+2;
    return question('Suppose the last '+streak+' independent trials all missed. We restore the whole turn before the next deal. What is the chance to win?', [wins+'/44',wins+'/'+(44-streak),'A win is certain'],wins+'/44','The reset restores the same '+wins+' winners among 44 cards.','Ask whether the last cards remain out of the next trial.');
  }
  function batchProbability(n,k,p) {
    let ways=1;
    for(let i=1;i<=Math.min(k,n-k);i++) ways=ways*(n-i+1)/i;
    return ways*p**k*(1-p)**(n-k);
  }
  return {skills,skillAt,build,batchProbability};
})();
