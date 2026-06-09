(function () {
  "use strict";

  const config = window.StarfallConfig;
  const canvas = document.getElementById("game");

  window.StarfallState = {
    canvas,
    ctx: canvas.getContext("2d"),
    keys: new Set(),
    touch: {
      movePointerId: null,
      moveTarget: null,
      firePointerId: null,
      fireHeld: false,
      nextFireAt: 0
    },
    stars: [],
    enemies: [],
    projectiles: [],
    explosions: [],
    powerups: [],
    planets: [],

    view: {
      width: 0,
      height: 0,
      dpr: 1,
      play: { x: 0, y: 0, w: 0, h: 0 },
      compactUi: false
    },

    timers: {
      lastTime: performance.now(),
      spawnTimer: 0,
      planetTimer: 0,
      gameOverTimer: 0,
      runTime: 0,
      levelTime: 0
    },

    game: {
      screen: "start",
      running: true,
      score: 0,
      level: 0,
      cooldownCapacity: config.BASE_COOLDOWN_CAPACITY,
      cooldownCharge: config.BASE_COOLDOWN_CAPACITY,
      cooldownLocked: false,
      speedStacks: 0,
      shieldLayers: 0,
      spreadLevel: 0,
      projectileSpeedMultiplier: 1,
      combo: 0,
      speedBoostUntil: 0,
      player: {
        x: 0,
        y: 0,
        w: 34,
        h: 34,
        speed: 325,
        alive: true,
        exploding: false
      }
    }
  };
}());
