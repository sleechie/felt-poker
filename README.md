# Felt Poker

A dead-simple, single-player no-limit Texas Hold’em game for iPhone. No account, ads, store, virtual currency, network dependency, or microtransactions.

## What is playable

- Four-handed tournament: you versus Luna, Miles, and Rook
- Complete pre-flop, flop, turn, river, showdown, all-in, and side-pot flow
- Dealer and blind rotation, player elimination, and automatic match restart
- One-tap fold, check/call, and a smart two-thirds-pot bet/raise
- Optional live equity panel with made-hand description, pot odds, and immediate outs
- Three distinct Monte Carlo-driven NPC styles that adapt to how often you fold, call, and raise
- Animated dealing, haptics, original card/chip/fold/win sounds, dark-mode-only presentation
- Automatic local game and settings resume

## Run it on an iPhone

This repo uses Expo SDK 57, so a Mac is not required for development.

1. Install **Expo Go** from the iOS App Store.
2. Run `npm install` and then `npx expo start --tunnel` in this folder.
3. Scan the QR code with the iPhone camera.

For an App Store build, install the EAS CLI, sign into an Expo account, and run:

```bash
npx eas-cli@latest build --platform ios --profile production
```

EAS compiles iOS on Expo’s macOS builders. App Store distribution still requires an Apple Developer membership and an App Store Connect app; EAS can create and manage the signing credentials once those accounts exist.

## Verify

```bash
npm run verify
npm run doctor
```

The pure TypeScript poker engine is isolated under `src/game`, including explicit side-pot settlement coverage and seeded simulations that play 24 complete randomized matches while asserting chip conservation after every action.

## Product rules

- Starting stack: 600 chips per seat
- Blinds: 5 / 10
- Fixed table-size for v1: one human and three NPCs
- Raise shortcut: legal minimum or approximately two-thirds pot, capped by the stack
- Equity is Monte Carlo pot share against unknown random holdings. It is a learning estimate, not certainty and not an Elo rating.

See [docs/NPC_MODEL.md](docs/NPC_MODEL.md) for the opponent model and its intentional limits.
