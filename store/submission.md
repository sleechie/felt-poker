# App Store submission

## App record

- Name: `Felt Poker`
- Subtitle: `Hold’em. Nothing else.`
- Bundle ID: `com.bradensanders.felt`
- SKU: `felt-poker-ios`
- Primary category: Games
- Subcategory: Card
- Secondary subcategory: Strategy
- Price: decide before submission; the product contains no in-app purchases either way
- Copyright: `2026 Braden Sanders`

## Review notes

Felt Poker is a completely offline, single-player Texas Hold’em game. It requires no account or setup. Tap Odds in the top-right to inspect the learning panel. Tap the info button for the in-app privacy disclosure. There are no ads, purchases, external links, or hidden features.

## Age rating

- Simulated Gambling: **Frequent**
- Gambling: **None** — there is no real money, purchasable currency, prize, cash-out, or exchangeable value
- Expected Apple rating: 18+ on iOS 26-era ratings and 17+ on earlier systems
- Consider excluding the Republic of Korea from the initial release unless the required GRAC classification is obtained

## Privacy answers

- Data collection: **No, we do not collect data from this app**
- Tracking: **No**
- Privacy policy URL: publish `store/privacy-policy.html` at a stable public URL before submission
- User privacy choices URL: not applicable

The app stores the current game and two preferences locally with AsyncStorage. Nothing is transmitted off-device, so Apple does not define it as collected data.

## Export compliance

The app does not implement custom encryption. Confirm Apple’s standard exempt-encryption question from the final signed binary’s dependency report during submission.

## Screenshots

Upload the three PNGs in `store/screenshots/en-US` in filename order. Each is 1290 × 2796 pixels, an accepted portrait size for Apple’s current 6.9-inch screenshot slot.
