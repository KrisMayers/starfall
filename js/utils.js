(function () {
  "use strict";

  const config = window.StarfallConfig;
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
    const width = player.w * config.PLAYER_HITBOX_SCALE;
    const height = player.h * config.PLAYER_HITBOX_SCALE;
    return {
      x: player.x - width / 2,
      y: player.y - height / 2,
      w: width,
      h: height
    };
  }

  function playerProtectionRect() {
    if (state.game.shieldLayers <= 0) return playerRect();

    const player = state.game.player;
    const width = player.w * config.PLAYER_SPRITE_SCALE;
    const height = player.h * config.PLAYER_SPRITE_SCALE;
    return {
      x: player.x - width / 2,
      y: player.y - height / 2,
      w: width,
      h: height
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
