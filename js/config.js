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

    // Each multishot stack adds one projectile to each side of the centre shot.
    MAX_SPREAD_LEVEL: 3,

    // Combo reward tiers trigger on centre-shot combo milestones.
    COMBO_REWARD_STEP: 10,
    COMBO_MISSILE_COUNT: 5,
    COMBO_BOMB_COUNT: 6,
    COMBO_BOMB_LIFE: 3000,
    COMBO_BOMB_TICK: 500,
    COMBO_WINGMAN_PASSES: 6,
    COMBO_LASER_LIFE: 6000,
    COMBO_LASER_TICK: 500,
    RESTART_KEY: "KeyR",
    SPEED_KEY: "KeyE",

    enemyKinds: [
      { type: "green", body: "#21c082", wing: "#0c4f46", glow: "#ffe66d", sizeScale: 1, health: 1, points: 1, speed: 1.08 },
      { type: "purple", body: "#7f5af0", wing: "#2a1d66", glow: "#62f2ff", sizeScale: 1.2, health: 2, points: 2, speed: 0.95 },
      { type: "red", body: "#d84b60", wing: "#6a1630", glow: "#ffd166", sizeScale: 1.44, health: 3, points: 3, speed: 0.78 }
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
