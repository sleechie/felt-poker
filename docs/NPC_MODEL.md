# NPC model

Felt’s opponents do not read the player’s cards and do not use scripted hand outcomes.

For every decision, an NPC:

1. Samples 240 pre-flop or 320 post-flop legal deals from the unseen deck.
2. Evaluates its estimated equity against every player still in the hand.
3. Compares that equity with the immediate pot price and stack pressure.
4. Applies a stable personality, a small bounded noise term, and street-aware bluffing.
5. Chooses only from actions and raise bounds supplied by the rules engine.

The personalities deliberately create readable differences:

- **Luna** applies selective pressure and balanced river bluffs.
- **Miles** protects chips and needs better prices for marginal calls.
- **Rook** raises wider, bluffs more, and accepts more variance.

The table also tracks the human’s fold-to-bet and raise frequencies with conservative priors. NPCs bluff tighter players more often and respect unusually selective human aggression. These tendencies persist with the locally resumed match, but never leave the device.

This is an explainable, lightweight game opponent—not a poker solver. It optimizes for believable decisions, distinct table personalities, and fast offline play. A later difficulty system can replace the random-hand opponent range with action-conditioned ranges without changing the rules engine or UI.
