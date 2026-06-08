(function () {
  "use strict";

  const config = window.StarfallConfig;
  const state = window.StarfallState;
  const levels = window.StarfallLevels;
  const utils = window.StarfallUtils;
  const layout = window.StarfallLayout;
  const spawns = window.StarfallSpawns;

  function shoot(now) {
    const game = state.game;
    const player = game.player;
    if (!game.running || game.cooldownLocked || game.cooldownCharge <= 0) return;

    // Cooldown is a pool: each trigger pull spends a chunk, and overdraw locks it until full.
    game.cooldownCharge -= config.SHOT_COOLDOWN_COST;
    if (game.cooldownCharge <= 0) game.cooldownLocked = true;

    // Multishot adds symmetric side shots; only the centre shot is allowed to affect combo.
    const projectileCount = 1 + game.spreadLevel * 2;
    const centerIndex = (projectileCount - 1) / 2;
    const projectileSpeed = 620 * game.projectileSpeedMultiplier;

    for (let i = 0; i < projectileCount; i += 1) {
      const offset = i - centerIndex;
      const angle = offset * 0.13;
      state.projectiles.push({
        x: player.x + offset * 4,
        y: player.y - player.h / 2,
        w: 7,
        h: 18,
        vx: Math.sin(angle) * projectileSpeed,
        vy: -Math.cos(angle) * projectileSpeed,
        comboEligible: offset === 0
      });
    }
  }

  function activateSpeed(now) {
    const game = state.game;
    if (!game.running || game.speedStacks <= 0) return;

    game.speedStacks -= 1;
    game.speedBoostUntil = now + config.SPEED_BOOST_DURATION;
  }

  function update(dt, now) {
    updateStars(dt);
    updatePlanets(dt);

    if (state.game.running) {
      updateLevelTimer(dt);
      updateCooldown(dt);
      updatePlayer(dt, now);
      updateSpawnTimers(dt);
    } else {
      state.timers.gameOverTimer += dt * 1000;
    }

    updateProjectiles(dt);
    updateEnemies(dt);
    updatePowerups(dt);
    updateExplosions(dt);
    checkCollisions(now);
  }

  function updateCooldown(dt) {
    const game = state.game;
    game.cooldownCharge = Math.min(game.cooldownCapacity, game.cooldownCharge + dt * 1000);
    if (game.cooldownLocked && game.cooldownCharge >= game.cooldownCapacity) {
      game.cooldownLocked = false;
    }
  }

  function updateLevelTimer(dt) {
    const timers = state.timers;
    timers.runTime += dt * 1000;

    if (spawns.activeBoss()) return;

    timers.levelTime += dt * 1000;
    const duration = levels.levelDuration(state.game.level);
    if (timers.levelTime >= duration) {
      timers.levelTime -= duration;
      state.game.level += 1;
      spawns.spawnBoss(state.game.level + 1);
    }
  }

  function updateSpawnTimers(dt) {
    const timers = state.timers;
    const game = state.game;

    timers.spawnTimer -= dt * 1000;
    timers.planetTimer -= dt * 1000;

    if (timers.spawnTimer <= 0) {
      // Multishot makes screen clears easier, so each stack also grows enemy wave size.
      const waveSize = 1 + game.spreadLevel;
      for (let i = 0; i < waveSize; i += 1) spawns.spawnEnemy();
      timers.spawnTimer += levels.spawnCadence(game.level) * (0.72 + Math.random() * 0.56);
    }

    if (timers.planetTimer <= 0) {
      spawns.spawnPlanet();
      timers.planetTimer = 13000 + Math.random() * 19000;
    }
  }

  function updateStars(dt) {
    const play = state.view.play;
    for (const star of state.stars) {
      star.y += star.speed * dt;
      if (star.y > play.y + play.h) {
        star.y = play.y - 4;
        star.x = play.x + Math.random() * play.w;
      }
    }
  }

  function updatePlanets(dt) {
    const play = state.view.play;
    for (let i = state.planets.length - 1; i >= 0; i -= 1) {
      const planet = state.planets[i];
      planet.y += planet.vy * dt;
      if (planet.y - planet.r > play.y + play.h) state.planets.splice(i, 1);
    }
  }

  function updatePlayer(dt, now) {
    const keys = state.keys;
    const play = state.view.play;
    const game = state.game;
    const player = game.player;
    let xAxis = 0;
    let yAxis = 0;

    if (keys.has("ArrowLeft") || keys.has("KeyA")) xAxis -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) xAxis += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) yAxis -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) yAxis += 1;

    const boost = now < game.speedBoostUntil ? 2 : 1;
    player.x += xAxis * player.speed * boost * dt;
    player.y += yAxis * player.speed * 0.58 * boost * dt;
    player.x = utils.clamp(player.x, play.x + player.w / 2, play.x + play.w - player.w / 2);

    const vertical = layout.playerVerticalBounds();
    player.y = utils.clamp(player.y, vertical.min, vertical.max);
  }

  function updateProjectiles(dt) {
    const play = state.view.play;
    for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = state.projectiles[i];
      if (projectile.life !== undefined) projectile.life -= dt * 1000;
      if (projectile.seeker) updateSeekerProjectile(projectile, dt);

      projectile.x += (projectile.vx || 0) * dt;
      projectile.y += projectile.vy * dt;

      const outsideTop = projectile.y + projectile.h < play.y;
      const outsideBottom = projectile.y - projectile.h > play.y + play.h;
      // Combo seekers enter from the side, so they get off-field room before cleanup.
      const sideMargin = projectile.seeker ? Math.max(90, play.w * 0.22) : 0;
      const outsideSides = projectile.x + projectile.w < play.x - sideMargin ||
        projectile.x - projectile.w > play.x + play.w + sideMargin;

      if (projectile.life <= 0 || (projectile.hostile ? outsideBottom : outsideTop) || outsideSides) {
        if (!projectile.hostile && outsideTop && projectile.comboEligible) resetCombo();
        state.projectiles.splice(i, 1);
      }
    }
  }

  function updateSeekerProjectile(projectile, dt) {
    const target = nearestSeekerTarget(projectile);
    if (!target) return;

    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const turnForce = 1100;
    const maxSpeed = 560;

    projectile.vx += (dx / distance) * turnForce * dt;
    projectile.vy += (dy / distance) * turnForce * dt;

    const speed = Math.max(1, Math.hypot(projectile.vx, projectile.vy));
    if (speed > maxSpeed) {
      projectile.vx = projectile.vx / speed * maxSpeed;
      projectile.vy = projectile.vy / speed * maxSpeed;
    }
  }

  function nearestSeekerTarget(projectile) {
    let nearest = null;
    let nearestDistance = Infinity;

    for (const enemy of state.enemies) {
      if (enemy.type === "saucer") continue;
      const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);
      if (distance >= nearestDistance) continue;
      nearest = enemy;
      nearestDistance = distance;
    }

    return nearest;
  }

  function updateEnemies(dt) {
    const play = state.view.play;
    const game = state.game;

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.wobble += dt * 3;

      if (enemy.type === "saucer" && game.running) updateBoss(enemy, dt);

      enemy.x += (enemy.vx + Math.sin(enemy.wobble) * (enemy.type === "saucer" ? 8 : 22)) * dt;
      enemy.y += enemy.vy * dt;

      if (enemy.x < play.x + enemy.w / 2 || enemy.x > play.x + play.w - enemy.w / 2) {
        enemy.vx *= -1;
        enemy.x = utils.clamp(enemy.x, play.x + enemy.w / 2, play.x + play.w - enemy.w / 2);
      }

      if (enemy.y - enemy.h > play.y + play.h + 80) state.enemies.splice(i, 1);
    }
  }

  function updateBoss(enemy, dt) {
    if (!enemy.parked && enemy.y >= enemy.targetY) {
      enemy.parked = true;
      enemy.y = enemy.targetY;
      enemy.vy = 0;
      enemy.vx = Math.random() > 0.5 ? 72 : -72;
    }

    if (enemy.parked) {
      enemy.vy = 0;
      enemy.vx += Math.sin(enemy.wobble * 0.65) * 11 * dt;
      enemy.vx = utils.clamp(enemy.vx, -95, 95);
      enemy.fireTimer -= dt * 1000;
      if (enemy.fireTimer <= 0) {
        shootBossProjectiles(enemy);
        enemy.fireTimer = Math.max(520, 1600 - enemy.bossLevel * 95);
      }
      return;
    }

    const dx = state.game.player.x - enemy.x;
    const distance = Math.max(1, Math.abs(dx));
    const pull = 20 + state.game.level * 2;
    enemy.vx += (dx / distance) * pull * dt;
    enemy.vx *= 0.992;
    enemy.vy = utils.clamp(enemy.vy, 24, levels.enemySpeed(state.game.level) * 0.46);
  }

  function shootBossProjectiles(enemy) {
    const projectileCount = Math.min(9, 1 + Math.floor(enemy.bossLevel / 2) * 2);
    const centerIndex = (projectileCount - 1) / 2;
    const speed = 230 + enemy.bossLevel * 10;

    for (let i = 0; i < projectileCount; i += 1) {
      const offset = i - centerIndex;
      const angle = offset * 0.11;
      state.projectiles.push({
        hostile: true,
        x: enemy.x + offset * 7,
        y: enemy.y + enemy.h * 0.38,
        w: 8,
        h: 16,
        vx: Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed
      });
    }
  }

  function updatePowerups(dt) {
    const play = state.view.play;
    for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
      const power = state.powerups[i];
      power.phase += dt * (4.2 + Math.abs(power.turn));
      adjustPowerupMagnetism(power, dt);

      power.vx += Math.sin(power.phase) * power.turn * 26 * dt;
      power.vx = utils.clamp(power.vx, -125, 125);
      power.vy = power.behavior === "attract"
        ? utils.clamp(power.vy, -130, 175)
        : utils.clamp(power.vy, 35, 145);
      power.x += (power.vx + Math.cos(power.phase * 1.3) * 58) * dt;
      power.y += power.vy * dt;

      if (power.x < play.x + power.w / 2 || power.x > play.x + play.w - power.w / 2) {
        power.vx *= -0.7;
        power.x = utils.clamp(power.x, play.x + power.w / 2, play.x + play.w - power.w / 2);
      }

      if (power.y - power.h > play.y + play.h + 40) state.powerups.splice(i, 1);
    }
  }

  function adjustPowerupMagnetism(power, dt) {
    if (!state.game.running) return;

    const attracting = power.behavior === "attract";
    const player = state.game.player;
    const dx = attracting ? player.x - power.x : power.x - player.x;
    const dy = attracting ? player.y - power.y : power.y - player.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const repelRadius = Math.max(130, state.view.play.w * 0.32);

    if (attracting) {
      const force = 185;
      power.vx += (dx / distance) * force * dt;
      power.vy += (dy / distance) * force * dt;
    } else if (distance < repelRadius) {
      const force = (1 - distance / repelRadius) * 82;
      power.vx += (dx / distance) * force * dt;
      if (dy > 0) power.vy += (dy / distance) * force * 0.12 * dt;
    }
  }

  function updateExplosions(dt) {
    for (let i = state.explosions.length - 1; i >= 0; i -= 1) {
      const explosion = state.explosions[i];
      explosion.age += dt * 1000;
      if (explosion.age > explosion.life) state.explosions.splice(i, 1);
    }
  }

  function checkCollisions(now) {
    checkProjectileCollisions(now);
    if (!state.game.running) return;

    checkPowerupCollisions(now);
    checkEnemyPlayerCollisions(now);
  }

  function checkProjectileCollisions(now) {
    for (let p = state.projectiles.length - 1; p >= 0; p -= 1) {
      const projectile = state.projectiles[p];

      if (projectile.hostile) {
        handleHostileProjectile(projectile, p, now);
        continue;
      }

      for (let e = state.enemies.length - 1; e >= 0; e -= 1) {
        const enemy = state.enemies[e];
        if (projectile.seeker && enemy.type === "saucer") continue;

        if (utils.rectsOverlap(utils.projectileRect(projectile), utils.entityRect(enemy))) {
          state.projectiles.splice(p, 1);
          if (projectile.seeker) destroyEnemy(enemy, e);
          else {
            if (projectile.comboEligible) incrementCombo();
            damageEnemy(enemy, e);
          }
          break;
        }
      }
    }
  }

  function handleHostileProjectile(projectile, index, now) {
    if (!state.game.running || !utils.rectsOverlap(utils.projectileRect(projectile), utils.playerProtectionRect())) return;

    state.projectiles.splice(index, 1);
    if (absorbPlayerHit(projectile.x, projectile.y, projectile.w * 2.2)) return;

    endGame();
  }

  function checkPowerupCollisions(now) {
    for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
      const power = state.powerups[i];
      if (utils.rectsOverlap(utils.entityRect(power), utils.playerRect())) {
        collectPowerup(power, now);
        state.powerups.splice(i, 1);
      }
    }
  }

  function checkEnemyPlayerCollisions(now) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (!utils.rectsOverlap(utils.entityRect(enemy), utils.playerProtectionRect())) continue;

      if (state.game.shieldLayers > 0) {
        killEnemyByShield(enemy, i);
      } else {
        endGame();
        break;
      }
    }
  }

  function killEnemyByShield(enemy, index) {
    state.game.shieldLayers = Math.max(0, state.game.shieldLayers - 1);
    destroyEnemy(enemy, index, false);
  }

  function damageEnemy(enemy, index) {
    enemy.health -= 1;
    if (enemy.health > 0) {
      addExplosion(enemy.x, enemy.y, enemy.w * 0.42, "#eaffff");
      return;
    }

    destroyEnemy(enemy, index, true);
  }

  function destroyEnemy(enemy, index, useEnemyColor = true) {
    const killedType = enemy.type;
    const dropX = enemy.x;
    const dropY = enemy.y;
    const color = useEnemyColor ? enemy.kind.body : "#79ffe1";
    addExplosion(enemy.x, enemy.y, enemy.w * (enemy.type === "saucer" ? 1.7 : 1.2), color);
    state.enemies.splice(index, 1);
    incrementScore(enemy.points);
    maybeDropEnemyReward(killedType, dropX, dropY);
  }

  function maybeDropEnemyReward(type, x, y) {
    if (type === "red") {
      maybeDropOneReward(x, y, [
        ["cooldown", 0.075],
        ["spread", 0.035],
        ["projectileSpeed", 0.05]
      ]);
    } else if (type === "purple") {
      maybeDropOneReward(x, y, [
        ["cooldown", 0.05],
        ["spread", 0.025],
        ["projectileSpeed", 0.03]
      ]);
    } else if (type === "green") {
      maybeDropOneReward(x, y, [
        ["invulnerable", 0.01],
        ["speed", 0.01]
      ]);
    } else if (type === "saucer") {
      maybeDropOneReward(x, y, [
        ["cooldown", 0.25],
        ["spread", 0.2],
        ["projectileSpeed", 0.2]
      ], "attract");
    }
  }

  function maybeDropOneReward(x, y, rewardChances, behavior = "repel") {
    // Drop chances are direct percentages now. Maxed upgrades are removed before rolling.
    const availableChances = rewardChances.filter(([type]) => canSpawnReward(type));
    const totalChance = availableChances.reduce((total, [, chance]) => total + chance, 0);
    const roll = Math.random();
    let threshold = 0;
    for (const [type, chance] of availableChances) {
      threshold += chance;
      if (roll >= threshold) continue;

      spawns.spawnPowerup({
        type,
        x,
        y,
        vy: behavior === "attract" ? 18 : 54 + Math.random() * 24,
        behavior
      });
      break;
    }
  }

  function canSpawnReward(type) {
    if (type === "spread") return state.game.spreadLevel < config.MAX_SPREAD_LEVEL;
    if (type === "cooldown") return cooldownUpgradeCount() < config.MAX_COOLDOWN_UPGRADES;
    return true;
  }

  function incrementScore(amount) {
    state.game.score += amount;
  }

  function incrementCombo() {
    state.game.combo += 1;
    if (state.game.combo % config.COMBO_MISSILE_STEP === 0) spawnComboMissiles();
  }

  function resetCombo() {
    state.game.combo = 0;
  }

  function spawnComboMissiles() {
    const play = state.view.play;
    const player = state.game.player;
    const centerOffset = (config.COMBO_MISSILE_COUNT - 1) / 2;

    // These are combo rewards, not player shots: they seek normal enemies and ignore bosses.
    for (let i = 0; i < config.COMBO_MISSILE_COUNT; i += 1) {
      const fromLeft = i % 2 === 0;
      const y = utils.clamp(player.y + (i - centerOffset) * player.h * 0.8, play.y + 24, play.y + play.h - 24);
      state.projectiles.push({
        seeker: true,
        comboEligible: false,
        x: fromLeft ? play.x - 16 : play.x + play.w + 16,
        y,
        w: 10,
        h: 20,
        vx: fromLeft ? 360 : -360,
        vy: -80 + i * 40,
        life: 3600
      });
    }
  }

  function cooldownUpgradeCount() {
    return Math.max(0, Math.round((state.game.cooldownCapacity - config.BASE_COOLDOWN_CAPACITY) / 500));
  }

  function absorbPlayerHit(x, y, size) {
    if (state.game.shieldLayers <= 0) return false;

    state.game.shieldLayers -= 1;
    addExplosion(x, y, size, "#79cfff");
    return true;
  }

  function collectPowerup(power, now) {
    addExplosion(power.x, power.y, power.w * 1.1, window.StarfallDraw.powerColor(power.type));

    if (power.type === "cooldown") {
      if (cooldownUpgradeCount() >= config.MAX_COOLDOWN_UPGRADES) return;
      state.game.cooldownCapacity += 500;
      state.game.cooldownCharge = Math.min(state.game.cooldownCapacity, state.game.cooldownCharge + 500);
      if (state.game.cooldownLocked && state.game.cooldownCharge >= state.game.cooldownCapacity) state.game.cooldownLocked = false;
    } else if (power.type === "speed") {
      state.game.speedStacks = Math.min(config.SPEED_STACK_MAX, state.game.speedStacks + 1);
    } else if (power.type === "invulnerable") {
      state.game.shieldLayers = Math.min(config.SHIELD_STACK_MAX, state.game.shieldLayers + 1);
    } else if (power.type === "spread") {
      if (state.game.spreadLevel >= config.MAX_SPREAD_LEVEL) return;
      state.game.spreadLevel += 1;
    } else if (power.type === "projectileSpeed") {
      state.game.projectileSpeedMultiplier *= 1.025;
    }
  }

  function endGame() {
    const game = state.game;
    game.running = false;
    game.screen = "gameover";
    game.player.alive = false;
    game.player.exploding = true;
    game.speedBoostUntil = 0;
    addExplosion(game.player.x, game.player.y, game.player.w * 2.2, "#5af3ff");
  }

  function addExplosion(x, y, size, color) {
    const particles = [];
    for (let i = 0; i < 18; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 48 + Math.random() * 150;
      particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.max(2, size * (0.06 + Math.random() * 0.08))
      });
    }
    state.explosions.push({ x, y, size, color, age: 0, life: 520, particles });
  }

  window.StarfallUpdate = {
    shoot,
    activateSpeed,
    update
  };
}());
