(function () {
  "use strict";

  const config = window.StarfallConfig;
  const state = window.StarfallState;
  const levels = window.StarfallLevels;

  function pickEnemyKind() {
    const roll = Math.random();
    if (roll < 0.75) return config.enemyKinds[0];
    if (roll < 0.93) return config.enemyKinds[1];
    return config.enemyKinds[2];
  }

  function spawnEnemy() {
    const play = state.view.play;
    const kind = pickEnemyKind();
    const size = kind.size * (0.85 + Math.random() * 0.35);
    const drift = (Math.random() - 0.5) * (55 + state.game.level * 5);

    state.enemies.push({
      type: kind.type,
      x: play.x + size + Math.random() * (play.w - size * 2),
      y: play.y + size / 2,
      w: size,
      h: size,
      vx: drift,
      vy: levels.enemySpeed(state.game.level) * kind.speed * (0.85 + Math.random() * 0.45),
      wobble: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.8,
      health: kind.health,
      maxHealth: kind.health,
      points: kind.points,
      kind
    });
  }

  function spawnBoss(level) {
    const play = state.view.play;
    const kind = config.saucerKind;
    const size = kind.size * Math.min(1.8, 1 + level * 0.055);
    const health = Math.round(6 + level * 2.8 + Math.pow(level, 1.22) * 1.35);

    state.enemies.push({
      type: "saucer",
      x: play.x + play.w / 2,
      y: play.y + size * 0.55,
      w: size,
      h: size * 0.72,
      vx: Math.random() > 0.5 ? 45 : -45,
      vy: levels.enemySpeed(state.game.level) * kind.speed,
      wobble: Math.random() * Math.PI * 2,
      spin: 0,
      health,
      maxHealth: health,
      points: Math.max(6, level * 4),
      bossLevel: level,
      targetY: play.y + play.h * 0.48,
      parked: false,
      fireTimer: 900,
      kind
    });
  }

  function spawnPowerup(options = {}) {
    const play = state.view.play;
    const type = options.type;
    if (!type) return;

    const size = Math.max(24, play.w * 0.056);
    state.powerups.push({
      type,
      x: options.x ?? play.x + size + Math.random() * (play.w - size * 2),
      y: options.y ?? play.y + size / 2,
      w: size,
      h: size,
      vx: (Math.random() - 0.5) * 120,
      vy: options.vy ?? 78 + Math.random() * 38,
      phase: Math.random() * Math.PI * 2,
      turn: (Math.random() - 0.5) * 3,
      behavior: options.behavior || "repel"
    });
  }

  function spawnPlanet() {
    const play = state.view.play;
    const radius = Math.max(34, play.w * (0.09 + Math.random() * 0.08));

    state.planets.push({
      x: play.x + radius + Math.random() * (play.w - radius * 2),
      y: play.y - radius * 2,
      r: radius,
      vy: 12 + Math.random() * 14,
      hue: Math.floor(180 + Math.random() * 130),
      ring: Math.random() > 0.55
    });
  }

  function activeBoss() {
    return state.enemies.find((enemy) => enemy.type === "saucer") || null;
  }

  window.StarfallSpawns = {
    spawnEnemy,
    spawnBoss,
    spawnPowerup,
    spawnPlanet,
    activeBoss
  };
}());
