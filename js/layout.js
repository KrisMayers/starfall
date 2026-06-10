(function () {
  "use strict";

  const config = window.StarfallConfig;
  const state = window.StarfallState;
  const utils = window.StarfallUtils;

  function resize() {
    const view = state.view;
    const game = state.game;
    const player = game.player;
    const canvas = state.canvas;
    const ctx = state.ctx;

    view.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    view.width = Math.floor(window.innerWidth);
    view.height = Math.floor(window.innerHeight);
    canvas.width = Math.floor(view.width * view.dpr);
    canvas.height = Math.floor(view.height * view.dpr);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

    view.compactUi = view.width < 620;

    if (view.compactUi) {
      view.play = { x: 0, y: 0, w: view.width, h: view.height };
    } else {
      const minSideUi = 92;
      const topBottomUi = 24;
      const bottomUi = 24;
      const maxW = Math.max(220, view.width - minSideUi * 2);
      const maxH = Math.max(320, view.height - topBottomUi - bottomUi);
      let playW = Math.min(maxW, maxH * 9 / 16);
      let playH = playW * 16 / 9;

      if (playH > maxH) {
        playH = maxH;
        playW = playH * 9 / 16;
      }

      view.play = {
        x: Math.round((view.width - playW) / 2),
        y: Math.round((view.height - playH) / 2),
        w: Math.round(playW),
        h: Math.round(playH)
      };
    }

    player.w = Math.max(28, Math.min(44, view.play.w * 0.08));
    player.h = player.w;
    player.y = playerHomeY();
    player.x = utils.clamp(player.x || view.play.x + view.play.w / 2, view.play.x + player.w / 2, view.play.x + view.play.w - player.w / 2);

    const vertical = playerVerticalBounds();
    player.y = utils.clamp(player.y, vertical.min, vertical.max);

    rebuildStars();
  }

  function rebuildStars() {
    const play = state.view.play;
    state.stars.length = 0;

    const layers = [
      { count: 80, speed: 18, size: 1, alpha: 0.45 },
      { count: 46, speed: 38, size: 1.5, alpha: 0.72 },
      { count: 22, speed: 76, size: 2.2, alpha: 0.95 }
    ];

    for (const layer of layers) {
      for (let i = 0; i < layer.count; i += 1) {
        state.stars.push({
          x: play.x + Math.random() * play.w,
          y: play.y + Math.random() * play.h,
          speed: layer.speed,
          size: layer.size,
          alpha: layer.alpha
        });
      }
    }
  }

  function resetGame(options = {}) {
    const game = state.game;
    const timers = state.timers;
    const player = game.player;
    const play = state.view.play;

    state.enemies.length = 0;
    state.projectiles.length = 0;
    state.explosions.length = 0;
    state.powerups.length = 0;
    state.planets.length = 0;
    state.comboEffects.length = 0;
    state.touch.movePointerId = null;
    state.touch.moveTarget = null;
    state.touch.firePointerId = null;
    state.touch.fireHeld = false;
    state.touch.nextFireAt = 0;
    timers.spawnTimer = 550;
    timers.planetTimer = 7000;
    timers.gameOverTimer = 0;
    timers.runTime = 0;
    timers.levelTime = 0;

    game.screen = options.start === false ? "start" : "playing";
    game.running = game.screen === "playing";
    game.score = 0;
    game.level = 0;
    game.cooldownCapacity = config.BASE_COOLDOWN_CAPACITY;
    game.cooldownCharge = config.BASE_COOLDOWN_CAPACITY;
    game.cooldownLocked = false;
    game.cooldownFlashUntil = 0;
    game.speedStacks = 0;
    game.shieldLayers = 0;
    game.spreadLevel = 0;
    game.projectileSpeedMultiplier = 1;
    game.combo = 0;
    game.speedBoostUntil = 0;
    player.alive = true;
    player.exploding = false;
    player.x = play.x + play.w / 2;
    player.y = playerHomeY();

    window.StarfallAudio.syncForScreen();
  }

  function playerVerticalBounds() {
    const play = state.view.play;
    const player = state.game.player;
    const homeY = playerHomeY();

    return {
      min: Math.max(play.y + player.h / 2, homeY - play.h * 0.16),
      max: Math.min(play.y + play.h - player.h / 2, homeY + play.h * 0.035)
    };
  }

  function playerHomeY() {
    const play = state.view.play;
    const player = state.game.player;
    const playerH = player.h || player.w || 34;
    if (!state.view.compactUi) return play.y + play.h - playerH - Math.max(18, play.h * 0.035);

    const controls = mobileControls();
    return controls
      ? controls.fire.y - controls.radius - playerH - 28
      : play.y + play.h - playerH - 96;
  }

  function mobileControls() {
    const view = state.view;
    if (!view.compactUi) return null;

    const play = view.play;
    const radius = Math.max(28, Math.min(38, view.width * 0.085));
    const y = Math.min(view.height - radius - 12, play.y + play.h + radius + 18);

    return {
      radius,
      boost: {
        x: Math.max(radius + 16, play.x + radius + 10),
        y
      },
      fire: {
        x: Math.min(view.width - radius - 16, play.x + play.w - radius - 10),
        y
      }
    };
  }

  window.StarfallLayout = {
    resize,
    resetGame,
    playerVerticalBounds,
    playerHomeY,
    mobileControls
  };
}());
