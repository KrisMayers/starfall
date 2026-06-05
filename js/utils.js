(function () {
  "use strict";

  const state = window.StarfallState;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function projectileRect(projectile) {
    return {
      x: projectile.x - projectile.w / 2,
      y: projectile.y - projectile.h / 2,
      w: projectile.w,
      h: projectile.h
    };
  }

  function entityRect(entity) {
    return {
      x: entity.x - entity.w / 2,
      y: entity.y - entity.h / 2,
      w: entity.w,
      h: entity.h
    };
  }

  function playerRect() {
    const player = state.game.player;
    return {
      x: player.x - player.w / 2,
      y: player.y - player.h / 2,
      w: player.w,
      h: player.h
    };
  }

  function playerProtectionRect() {
    const player = state.game.player;
    if (state.game.shieldLayers <= 0) return playerRect();

    const radius = player.w * (0.72 + (state.game.shieldLayers - 1) * 0.18);
    return {
      x: player.x - radius,
      y: player.y - radius,
      w: radius * 2,
      h: radius * 2
    };
  }

  window.StarfallUtils = {
    clamp,
    rectsOverlap,
    projectileRect,
    entityRect,
    playerRect,
    playerProtectionRect
  };
}());
