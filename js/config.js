(function () {
  "use strict";

  window.StarfallConfig = {
    BASE_COOLDOWN: 1000,
    MIN_COOLDOWN: 200,
    SPEED_BOOST_DURATION: 20000,
    SPEED_STACK_MAX: 3,
    SHIELD_STACK_MAX: 3,
    RESTART_KEY: "KeyR",
    SPEED_KEY: "KeyE",

    enemyKinds: [
      { type: "green", body: "#21c082", wing: "#0c4f46", glow: "#ffe66d", size: 28, health: 1, points: 1, speed: 1.08 },
      { type: "purple", body: "#7f5af0", wing: "#2a1d66", glow: "#62f2ff", size: 35, health: 2, points: 2, speed: 0.95 },
      { type: "red", body: "#d84b60", wing: "#6a1630", glow: "#ffd166", size: 43, health: 3, points: 3, speed: 0.78 }
    ],

    saucerKind: {
      type: "saucer",
      body: "#ffb84d",
      wing: "#6b3f16",
      glow: "#9dfffa",
      size: 58,
      speed: 0.28
    }
  };
}());
