# Table Study

[Course library](https://koloios.github.io/table-study/) · [Play Hold’em Foundations](https://koloios.github.io/table-study/#holdem) · [Practice Table](https://koloios.github.io/table-study/#table) · [Bridge course preview](https://koloios.github.io/table-study/#bridge)

A self-paced browser course for someone sitting down to Texas Hold’em for the first time. The first release teaches four-handed, play-chip Hold’em through a rotating table, showdowns, one-card draws, and decisions with a fixed all-in price. Basic arithmetic is introduced where a player needs it.

## Hold’em Foundations

| Lesson | Guided task | Variation and independent checkpoint |
| --- | --- | --- |
| 1. Take your seat | Locate the button and blinds. Follow the first player before and after the flop. Practise shuffling, cutting, burning and dealing with a physical deck. | Follow a four-hand orbit. Find the first player on a fresh hand, skip a folded seat, and calculate the cost of calling from a blind. |
| 2. Read a showdown | Build the best five cards from seven and use kickers to settle equal pairs. | Change the board so both players share the best hand. Award a fresh pot and select a valid best five. |
| 3. Count the rivers | Count all unseen cards and the rivers that beat an exposed opponent. Inspect every candidate river. | Reveal a heart in the opposing hand, then solve a fresh one-card draw. Explain the effect of an unseen burn. |
| 4. Price a call | Compare two all-in prices on the same board. Work from chips owed to final pot, break-even frequency, and average chip gain. | Compute the final pot and choose an action for a new price and pot without the worked solution. |
| 5. Test a prediction | Predict a count and draw independent batches from the same turn. Compare observed frequency against exact enumeration. | Explain a short losing streak and distinguish a fresh trial from drawing twice from one deck. |
| 6. Play the review hand | Sit in the big blind and play a complete coached hand. Replay the river decision at another price. | Choose call or fold in two different pots, build the final pot, and explain why the bigger call can earn more. Revisit missed skills on a later day. |

Each unit has a worked example before the independent task. Wrong answers explain the specific misconception. Checkpoints allow retries, so completion records practice, not demonstrated mastery on a first attempt. Statistics concern the specified deal and assumptions: exposed holdings, a fair shuffle, no fees, and no further betting on an all-in. Browser progress stays on the device. Missed skills appear on the Hold’em course map with focused practice hands. A correct first attempt on a fresh practice hand clears the skill.

## Practice Table

- **Coached table.** Play heads-up against Mira for 100 play chips per seat. Blinds are 1 and 2. Mira uses a local equity and pot-odds heuristic. The optional coach samples 400 deals before the river and counts all 990 possible opposing hands on the river. Both calculations assume a uniformly random opponent hand. After the hand, review any decision with just the information available when it was made.
- **River bluff lab.** A single river bet offers a precisely solvable decision. Compare an equilibrium opponent with one that bluffs more or less often. The explanation derives the bluff frequency and shows the chip value of calling under each assumption.
- **Play Slumbot.** Load Eric Jackson’s independently hosted heads-up table on request. Slumbot handles its own deals and decisions. The local coach and replay belong to Mira’s table. [Slumbot](https://slumbot.com/)

## Later courses

[Intermediate Hold’em course preview](https://koloios.github.io/table-study/#intermediate) covers the planned topics of preflop ranges by position and stack depth, two-card draws, dirty outs, weighted opponent ranges, board texture, bet sizing and multi-street plans. Its assessment will use unseen deals with hidden opponents and ask the learner to justify a line before the outcome. **Bridge** is a planned separate course, beginning with following suit, taking tricks and partnership play.

## Running the site

Open `index.html` directly or serve the repository root with a static web server. The lessons and local table run without a build step or account. Slumbot needs an internet connection and loads only when the learner opens its table. GitHub Pages can serve the root of the main branch. The original guided hand remains accessible at `turn-study/index.html`.

## Roadmap

| Release | What the learner can do | How to check it |
| --- | --- | --- |
| Foundations assessment and usability | Apply the rules to unfamiliar hands, return to a saved lesson and finish with a keyboard. | Test distinct hand families, record first attempts separately from assisted completions, verify reload and simultaneous tabs, and observe new players finishing without prompting. |
| Intermediate Hold’em I | Infer how the betting changes likely holdings, remove blocked combinations and compare a weighted range with the price of a call. | Use unseen hands where the same cards and price lead to different decisions after changing the range. Check the math by enumeration. |
| Intermediate Hold’em II | Choose a size using position, stack depth and board texture, then plan a later street. | Collect the action and reasoning before revealing the runout. Accept defensible alternatives and show the assumptions behind each comparison. |
| Bridge Foundations pilot | Follow suit, play as declarer with dummy and count winners in a short no-trump deal. | Have a beginner finish a fresh deal and explain the lead and winner of each trick. |

Jev and Laya are possible future opponents. Evaluate a candidate on the same deals as the local opponent, swap seats, and measure decision quality, response time, memory or API cost, and what learners gain before adding another engine.

## Design references

The deals, explanations and exercises are original. Topic coverage was informed by [PokerStars Learn](https://www.pokerstars.com/poker/learn/course/the-basics/), [MIT Poker Theory and Analytics](https://ocw.mit.edu/courses/15-s50-poker-theory-and-analytics-january-iap-2015/resources/lecture-notes/), and [Seeing Theory](https://seeing-theory.brown.edu/basic-probability/index.html). The live-deck exercise follows [PokerStars’ home-game dealing guide](https://www.pokerstars.com/poker/learn/news/how-to-deal-a-poker-hand/).
