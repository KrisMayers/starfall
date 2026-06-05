# Starfall Prototype

Open `index.html` in a browser to play.

## Controls

- Move: `A/D`, `W/S`, or arrow keys
- Start: `Enter`
- Shoot: `Space`
- Use stored speed boost: `E`
- Restart after game over: `R`

## File Map

- `game.js` - tiny startup file: resize, reset, input binding, and game loop.
- `js/config.js` - constants, enemy colours, enemy stats, boss base stats.
- `js/state.js` - shared game state: player, arrays of enemies/projectiles/power-ups, timers, canvas references.
- `js/levels.js` - timed level duration helpers, spawn cadence, and enemy speed curves.
- `js/layout.js` - responsive portrait playfield, star rebuilds, reset logic, player movement bounds.
- `js/spawns.js` - enemy, boss, planet, and power-up creation.
- `js/update.js` - gameplay logic: movement, collisions, scoring, combos, shields, boss shots, power-up collection.
- `js/draw.js` - all canvas drawing, including the current pixel-art sprites and UI.
- `js/input.js` - keyboard controls.
- `styles.css` - page-level canvas sizing and background outside the playfield.

## Assets

There are no external image assets yet, and the sprites are not CSS.

All prototype art is drawn directly on the HTML canvas in `js/draw.js` using canvas commands like `fillRect`, `arc`, `ellipse`, and simple path shapes. The pixel-style player, enemies, boss, projectiles, power-up icons, explosions, stars, and planets are code-drawn placeholders.

When real assets are ready, the usual path is:

1. Put images in an `assets/` folder.
2. Load them in a new asset helper file or near the top of `js/draw.js`.
3. Replace functions like `drawPixelShip`, `drawSaucer`, and `drawPowerIcon` with `ctx.drawImage(...)`.

Good first tuning spots:

- Enemy odds: `pickEnemyKind()` in `js/spawns.js`
- Enemy stats: `enemyKinds` in `js/config.js`
- Boss health/speed: `saucerKind` in `js/config.js` and `spawnBoss()` in `js/spawns.js`
- Level timing: `levelDuration()` in `js/levels.js`
- Level intensity: `spawnCadence()` and `enemySpeed()` in `js/levels.js`
- Enemy death power-up odds: `maybeDropEnemyReward()` in `js/update.js`
- Shield layers and combo rules: `js/update.js`
- Shield rings and combo display: `js/draw.js`
