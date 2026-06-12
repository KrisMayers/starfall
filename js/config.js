(function () {
  "use strict";

  window.StarfallConfig = {
    // Weapon cooldown is a refillable pool measured in milliseconds.
    BASE_COOLDOWN_CAPACITY: 1500,
    SHOT_COOLDOWN_COST: 750,
    MAX_COOLDOWN_UPGRADES: 5,

    SPEED_BOOST_DURATION: 20000,
    SPEED_STACK_MAX: 3,
    SHIELD_STACK_MAX: 3,

    PLAYER_SPRITE_SCALE: 1.7,
    PLAYER_HITBOX_SCALE: 1.25,

    // Weapon upgrades use the old spreadLevel field for save-state simplicity.
    MAX_SPREAD_LEVEL: 8,
    WEAPON_MISSILE_LEVEL: 5,
    WEAPON_TURRET_RANGE: 150,
    WEAPON_TURRET_INTERVAL: 800,
    WEAPON_MISSILE_INTERVAL: 5000,
    CURSE_SPAWN_BONUS: 0.1,
    CURSE_SPEED_BONUS: 0.05,

    // Combo reward tiers trigger on centre-shot combo milestones.
    COMBO_REWARD_STEP: 10,
    COMBO_MISSILE_COUNT: 5,
    COMBO_BOMB_COUNT: 6,
    COMBO_BOMB_LIFE: 3000,
    COMBO_BOMB_TICK: 500,
    COMBO_WINGMAN_PASSES: 6,
    COMBO_LASER_LIFE: 8000,
    COMBO_LASER_TICK: 500,
    RESTART_KEY: "KeyR",
    SPEED_KEY: "KeyE",

    enemyKinds: [
      { type: "green", body: "#21c082", wing: "#0c4f46", glow: "#ffe66d", sprite: "assets/enemy-1.png", spriteFrame: { x: 4, y: 3, w: 18, h: 17 }, sizeScale: 1, health: 1, points: 1, speed: 1.08 },
      { type: "purple", body: "#7f5af0", wing: "#2a1d66", glow: "#62f2ff", sprite: "assets/enemy-2.png", spriteFrame: { x: 4, y: 3, w: 18, h: 17 }, sizeScale: 1.2, health: 2, points: 2, speed: 0.95 },
      { type: "red", body: "#d84b60", wing: "#6a1630", glow: "#ffd166", sprite: "assets/enemy-3.png", spriteFrame: { x: 4, y: 3, w: 18, h: 17 }, sizeScale: 1.44, health: 3, points: 3, speed: 0.78 }
    ],

    saucerKind: {
      type: "saucer",
      body: "#ffb84d",
      wing: "#6b3f16",
      glow: "#9dfffa",
      size: 87,
      speed: 0.28
    }
  };
}());
