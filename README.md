# Arrow Escape

Arrow Escape is an offline-first directional puzzle game for Android, iPhone/iPad, and the web.

## How to play

Tap an arrow only when every cell in front of it is clear through the board edge. Some arrows are locked behind other arrows, and some can be rotated once to reveal their escape direction.

- You have three hearts. Wrong taps remove a heart.
- Use Undo to restore the previous board state.
- Hints cost 15 coins.
- Complete levels to earn coins, stars, and unlock the next level. Levels continue beyond 200 in batches of 200; only the current 200-level set is shown at once.
- Daily Puzzle rewards 50 coins and grows your local streak.
- Progress and settings are saved locally with AsyncStorage.

## Run locally

```bash
pnpm install
pnpm start
```

For a Replit Expo preview, use the workspace workflow command:

```bash
pnpm run dev
```

The project requires Node.js and Expo-compatible Android/iOS tooling for native builds. The web target runs directly from Expo.