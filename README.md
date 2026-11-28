# Table Study

[Course library](https://koloios.github.io/table-study/) · [Play Hold’em Foundations](https://koloios.github.io/table-study/#holdem) · [Practice Table](https://koloios.github.io/table-study/#table) · [Bridge Foundations pilot](https://koloios.github.io/table-study/#bridge)

A self-paced browser course for someone sitting down to Texas Hold’em for the first time. Learn four-handed, play-chip Hold’em through a rotating table, showdowns and decisions about the price of seeing another card. Basic arithmetic is introduced where a player needs it.

## Hold’em Foundations

Start with [Take your seat](https://koloios.github.io/table-study/#seats) and follow the seven lessons below in order. In the first lesson, focus on who acts next and what it costs to stay in the hand. Probability starts in lesson 3, once you can tell which hand wins. At the end of a lesson, try the fresh hand before opening a hint. If a step is confusing, read the feedback and try again.

| Lesson | Guided task | Variation and independent checkpoint |
| --- | --- | --- |
| 1. Take your seat | Locate the button and blinds. Follow the first player before and after the flop. Practise shuffling, cutting, burning and dealing with a physical deck. | Follow a four-hand orbit. Find the first player on a fresh hand, skip a folded seat, and calculate the cost of calling from a blind. |
| 2. Read a showdown | Build the best five cards from seven and use kickers to settle equal pairs. | Change the board so both players share the best hand. Award a fresh pot and select a valid best five. |
| 3. Count the rivers | Swap an exposed ace, count the remaining hearts, and inspect the 44 possible rivers. | Solve a fresh draw and explain an unseen burn. Then [play the turn hand](https://koloios.github.io/table-study/#rivers/play), call or fold, and compare your winning rivers with the price. |
| 4. [One card or two?](https://koloios.github.io/table-study/#flop-odds) | Play the same flush draw against a flop bet with chips behind and a flop all-in. Count the chance to make the flush over the cards each call guarantees. | Update the count after a missed turn, compare a flush with a full house, and choose the right calculation for a fresh board. |
| 5. Price a call | Compare two all-in prices on the same board. Work from chips owed to final pot, break-even frequency, and average chip gain. | Compute the final pot and choose an action for a new price and pot without the worked solution. |
| 6. Test a prediction | Predict a count and draw independent batches from the same turn. Compare observed frequency against exact enumeration. | Explain a short losing streak and distinguish a fresh trial from drawing twice from one deck. |
| 7. Play the review hand | Sit in the big blind and play a complete coached hand. Replay the river decision at another price. | Choose call or fold in two different pots, build the final pot, and explain why the bigger call can earn more. Revisit missed skills on a later day. |

Each unit has a worked example before the independent task. Wrong answers explain the specific misconception. Checkpoints allow retries, and the course map separately records first-try answers and checkpoints completed after a retry. Existing completion records are preserved. Each deal states which cards are exposed. Calculations assume a fair shuffle and no fees. When a lesson uses an opponent model, it gives the possible holdings and their weights. Browser progress stays on the device. Missed skills appear on the Hold’em course map with focused practice hands. A correct first attempt on a fresh practice hand clears the skill.

After lesson 7, play two four-handed capstones in order. [Play from the button](https://koloios.github.io/table-study/#capstone) starts with a suited ace in late position. Then [defend the big blind](https://koloios.github.io/table-study/#capstone/big-blind). Count what you still owe after posting, act first on the flop, and decide whether your pair can catch a river bluff at the offered price. Each hand saves separately. The result shows which knowledge checks you answered correctly, missed, or never reached. A fold ends the hand normally. You can try one fresh question for a missed or unseen skill. Review any decision with the cards and reads available when you made it. For open-ended heads-up play, visit the coached Practice Table. The [preflop strategy lesson](https://koloios.github.io/table-study/#preflop) revisits the opening round with a four-handed opponent model. For the transition to Intermediate, play [From one hand to a range](https://koloios.github.io/table-study/#hidden-hand), followed by **Read a weighted range** and **Size a bet and plan the turn**.

## Practice Table

- **Coached table.** Play heads-up against Mira for 100 play chips per seat. Blinds are 1 and 2. Mira uses a local equity and pot-odds heuristic. The optional coach samples 400 deals before the river and counts all 990 possible opposing hands on the river. Both calculations assume a uniformly random opponent hand. After the hand, review any decision with just the information available when it was made. A decision facing a bet offers a fresh call-price drill. A turn decision also offers a winning-rivers drill. Return to the selected decision afterward. A completed hand and its review can resume after a reload in the same browser tab.
- **River bluff lab.** A single river bet offers a precisely solvable decision. Compare an equilibrium opponent with one that bluffs more or less often. The explanation derives the bluff frequency and shows the chip value of calling under each assumption.
- **Play Slumbot.** Load Eric Jackson’s independently hosted heads-up table on request. Slumbot handles its own deals and decisions. The local coach and replay belong to Mira’s table. [Slumbot](https://slumbot.com/)

## Intermediate Hold’em and Bridge

[Read a weighted range](https://koloios.github.io/table-study/#intermediate/ranges) compares two betting histories on the same turn. Remove a blocked combination, count rivers for each remaining hand, weight the results, then choose call or fold. Identify the visible card that rules out a holding before revealing the betting history. The second hand changes both cards and price.

[Size a bet and plan the turn](https://koloios.github.io/table-study/#intermediate/streets) puts the learner on the button. Commit to a flop size, a reason, and plans for two possible turns. Compare the resulting pots, stacks, and showdown equity. Replay the same flop against an opponent who folds a weaker holding to the larger bet. Predict which holdings call, then compare the pot on a fold with the pot and remaining range on a call.

[Bridge Foundations](https://koloios.github.io/table-study/#bridge/play) begins with South declaring one no-trump. Identify the opening leader, play a three-trick ending from South and dummy, then solve a fresh ending with the winners in different seats. The pilot assumes the auction has finished.

## Running the site

Open `index.html` directly or serve the repository root with a static web server. The lessons and local table run without a build step or account. Slumbot needs an internet connection and loads only when the learner opens its table. GitHub Pages can serve the root of the main branch. The original guided hand remains accessible at `turn-study/index.html`.

## Roadmap

| Milestone | Available in the course |
| --- | --- |
| Draws across two streets | [One card or two?](https://koloios.github.io/table-study/#flop-odds) compares one guaranteed card with two and counts the ordered runouts. |
| Four-handed capstones | [Play from the button](https://koloios.github.io/table-study/#capstone), then [defend the big blind](https://koloios.github.io/table-study/#capstone/big-blind). Replay the big-blind hand to face a different river price under the same betting assumptions. |
| Foundations to Intermediate | [From one hand to a range](https://koloios.github.io/table-study/#hidden-hand) keeps the board and price fixed while changing what is known about Mira’s hand. A fresh checkpoint leads into the weighted-range unit. |
| Preflop strategy | [Choose a preflop line](https://koloios.github.io/table-study/#preflop) compares the same suited connectors in the cutoff, on the button and facing a raise. Decisions use four seats, 100-big-blind stacks and explicit opponent assumptions. |
| Hand review to targeted practice | [Coached table](https://koloios.github.io/table-study/#table) reviews offer drills based on the street and cost of the selected decision. The exercise uses a separate exposed deal. |

**Release checks for one maintainer.** GitHub Actions runs `node --test tests/*.cjs` on pull requests and pushes to main. The tests enumerate legal rivers, exercise lesson navigation and reloads, and check that practice reviews only show information available at the selected decision. Play the changed path with a keyboard before releasing. The core site runs on static GitHub Pages.

**Later options.** Expand Bridge from short endings to a guided no-trump deal. Evaluate Jev or Laya as a separate experiment using identical deals and swapped seats. Compare decision quality, response time, memory and hosting cost against the current opponent before committing to an integration.

## Design references

The deals, explanations and exercises are original. Topic coverage was informed by [PokerStars Learn](https://www.pokerstars.com/poker/learn/course/the-basics/), [MIT Poker Theory and Analytics](https://ocw.mit.edu/courses/15-s50-poker-theory-and-analytics-january-iap-2015/resources/lecture-notes/), and [Seeing Theory](https://seeing-theory.brown.edu/basic-probability/index.html). The live-deck exercise follows [PokerStars’ home-game dealing guide](https://www.pokerstars.com/poker/learn/news/how-to-deal-a-poker-hand/).
