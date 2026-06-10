(function () {
  "use strict";

  const config = window.StarfallConfig;
  const state = window.StarfallState;
  const levels = window.StarfallLevels;
  const utils = window.StarfallUtils;
  const layout = window.StarfallLayout;
  const spawns = window.StarfallSpawns;
  const audio = window.StarfallAudio;

  function shoot(now) {
    const game = state.game;
    const player = game.player;
    if (!game.running) return;
    if (game.cooldownLocked || game.cooldownCharge <= 0) {
      game.cooldownFlashUntil = now + 260;
      audio.play("weaponEmpty");
      return;
    }

    // Cooldown is a pool: each trigger pull spends a chunk, and overdraw locks it until full.
    game.cooldownCharge -= config.SHOT_COOLDOWN_COST;
    if (game.cooldownCharge <= 0) {
      game.cooldownCharge = 0;
      game.cooldownLocked = true;
    }

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

    audio.play("playerShot");
  }

  function activateSpeed(now) {
    const game = state.game;
    if (!game.running || game.speedStacks <= 0) return;

    game.speedStacks -= 1;
    game.speedBoostUntil = now + config.SPEED_BOOST_DURATION;
    audio.play("powerSpeed");
  }

  function update(dt, now) {
    updateStars(dt);
    updatePlanets(dt);

    if (state.game.running) {
      updateLevelTimer(dt);
      updateCooldown(dt);
      updateTouchFire(now);
      updatePlayer(dt, now);
      updateSpawnTimers(dt);
    } else {
      state.timers.gameOverTimer += dt * 1000;
    }

    updateProjectiles(dt);
    updateEnemies(dt);
    updatePowerups(dt);
    updateComboEffects(dt);
    updateExplosions(dt);
    checkCollisions(now);
    audio.syncBossAmbience(state.game.running && !!spawns.activeBoss());
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
    const touch = state.touch;
    let xAxis = 0;
    let yAxis = 0;

    if (keys.has("ArrowLeft") || keys.has("KeyA")) xAxis -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) xAxis += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) yAxis -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) yAxis += 1;

    const boost = now < game.speedBoostUntil ? 2 : 1;
    player.x += xAxis * player.speed * boost * dt;
    player.y += yAxis * player.speed * 0.58 * boost * dt;

    if (touch.moveTarget) {
      const dx = touch.moveTarget.x - player.x;
      const dy = touch.moveTarget.y - player.y;
      const distance = Math.hypot(dx, dy);
      const maxStep = player.speed * boost * dt;
      if (distance <= maxStep) {
        player.x = touch.moveTarget.x;
        player.y = touch.moveTarget.y;
      } else if (distance > 1) {
        player.x += dx / distance * maxStep;
        player.y += dy / distance * maxStep;
      }
    }

    player.x = utils.clamp(player.x, play.x + player.w / 2, play.x + play.w - player.w / 2);

    const vertical = layout.playerVerticalBounds();
    player.y = utils.clamp(player.y, vertical.min, vertical.max);
  }

  function updateTouchFire(now) {
    const touch = state.touch;
    if (!touch.fireHeld || now < touch.nextFireAt) return;

    shoot(now);
    touch.nextFireAt = now + 120;
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
    const target = projectile.target && state.enemies.includes(projectile.target)
      ? projectile.target
      : nearestSeekerTarget(projectile);
    if (!target) return;
    projectile.target = target;

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

    audio.play("bossShot");
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

  function updateComboEffects(dt) {
    for (let i = state.comboEffects.length - 1; i >= 0; i -= 1) {
      const effect = state.comboEffects[i];
      effect.age += dt * 1000;

      if (effect.type === "bomb" && !effect.appearSoundPlayed && effect.age >= 0) {
        effect.appearSoundPlayed = true;
        audio.play("comboBombAppear");
      }

      if (effect.age < 0) continue;

      if (effect.type === "bomb") updateBombEffect(effect, dt);
      else if (effect.type === "wingman") updateWingmanEffect(effect, dt);
      else if (effect.type === "shockwave") updateShockwaveEffect(effect);
      else if (effect.type === "laser") updateLaserEffect(effect, dt);

      if (effect.age > effect.life) {
        if (effect.type === "wingman" && effect.pass < config.COMBO_WINGMAN_PASSES - 1) spawnWingmanPass(effect.pass + 1);
        if (effect.type === "laser") audio.stopLoop("comboLaser");
        state.comboEffects.splice(i, 1);
      }
    }
  }

  function updateBombEffect(effect, dt) {
    effect.tickTimer -= dt * 1000;
    while (effect.tickTimer <= 0) {
      damageEnemiesInRadius(effect.x, effect.y, effect.radius, 1, "#ffb84d");
      effect.tickTimer += config.COMBO_BOMB_TICK;
    }
  }

  function updateLaserEffect(effect, dt) {
    const play = state.view.play;
    const sweep = Math.sin((effect.age / effect.life) * Math.PI * 2);
    effect.x = effect.centerX + sweep * effect.sweepRange;
    effect.x = utils.clamp(effect.x, play.x + effect.width / 2, play.x + play.w - effect.width / 2);

    effect.tickTimer -= dt * 1000;
    while (effect.tickTimer <= 0) {
      damageEnemiesInBeam(effect.x, effect.width, 1, "#9dfffa");
      effect.tickTimer += config.COMBO_LASER_TICK;
    }
  }

  function updateWingmanEffect(effect, dt) {
    const t = Math.max(0, Math.min(1, effect.age / effect.life));
    effect.x = effect.start.x + (effect.end.x - effect.start.x) * t;
    effect.y = effect.start.y + (effect.end.y - effect.start.y) * t;

    if (effect.crash) {
      updateWingmanCrash(effect);
      return;
    }

    effect.shotTimer -= dt * 1000;
    if (effect.shotTimer > 0) return;

    const targetInfo = nearestEnemyInRadius(effect.x, effect.y, Math.max(95, state.view.play.w * 0.22));
    if (!targetInfo) return;

    effect.shotTimer = 170;
    audio.play("playerShot");
    state.comboEffects.push({
      type: "tracer",
      x1: effect.x,
      y1: effect.y,
      x2: targetInfo.enemy.x,
      y2: targetInfo.enemy.y,
      age: 0,
      life: 140
    });
    damageEnemyByAmount(targetInfo.enemy, targetInfo.index, 1, "#a8f7ff");
  }

  function updateWingmanCrash(effect) {
    const distance = Math.hypot(effect.end.x - effect.x, effect.end.y - effect.y);
    if (distance > 22) return;

    effect.x = effect.end.x;
    effect.y = effect.end.y;
    addExplosion(effect.x, effect.y, 42, "#a8f7ff");
    spawnShockwave(effect.x, effect.y);
    effect.age = effect.life + 1;
  }

  function updateShockwaveEffect(effect) {
    const progress = Math.max(0, Math.min(1, effect.age / effect.life));
    effect.radius = effect.maxRadius * progress;

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (effect.hitEnemies.includes(enemy)) continue;
      const distance = Math.hypot(enemy.x - effect.x, enemy.y - effect.y);
      if (distance > effect.radius + enemy.w * 0.45) continue;

      effect.hitEnemies.push(enemy);
      damageEnemyByAmount(enemy, i, 2, "#a8f7ff");
    }
  }

  function damageEnemiesInRadius(x, y, radius, amount, color) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      const reach = radius + enemy.w * 0.45;
      if (Math.hypot(enemy.x - x, enemy.y - y) > reach) continue;
      damageEnemyByAmount(enemy, i, amount, color);
    }
  }

  function damageEnemiesInBeam(x, width, amount, color) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (Math.abs(enemy.x - x) > width / 2 + enemy.w / 2) continue;
      damageEnemyByAmount(enemy, i, amount, color);
    }
  }

  function nearestEnemyInRadius(x, y, radius) {
    let match = null;
    let matchDistance = Infinity;

    for (let i = 0; i < state.enemies.length; i += 1) {
      const enemy = state.enemies[i];
      const distance = Math.hypot(enemy.x - x, enemy.y - y);
      if (distance > radius || distance >= matchDistance) continue;
      match = { enemy, index: i };
      matchDistance = distance;
    }

    return match;
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

        if (utils.rectsOverlap(utils.projectileRect(projectile), utils.entityRect(enemy))) {
          state.projectiles.splice(p, 1);
          if (projectile.seeker) damageEnemyByAmount(enemy, e, projectile.damage || 1, "#ffe45c");
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
    if (absorbPlayerHit(projectile.x, projectile.y, projectile.w * 2.2)) {
      audio.play("impact");
      return;
    }

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
    damageEnemyByAmount(enemy, index, 1, "#eaffff");
  }

  function damageEnemyByAmount(enemy, index, amount, color = "#eaffff") {
    enemy.health -= amount;
    if (enemy.health > 0) {
      addExplosion(enemy.x, enemy.y, enemy.w * 0.42, color);
      audio.play("impact");
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
    if (killedType === "saucer") audio.play("bossDeath");
    else audio.play("enemyDeath", { volume: 0.42 + Math.random() * 0.12 });
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
    triggerComboReward(state.game.combo);
  }

  function resetCombo() {
    state.game.combo = 0;
  }

  function triggerComboReward(combo) {
    if (combo % config.COMBO_REWARD_STEP !== 0) return;

    const tier = combo / config.COMBO_REWARD_STEP;
    if (tier === 1) spawnComboMissiles(5, 1);
    else if (tier === 2) spawnComboBombs();
    else if (tier === 3) spawnWingmanPass(0);
    else if (tier === 4) spawnComboLaser();
    else if (tier >= 5) spawnComboFinale();
  }

  function spawnComboMissiles(count, damage) {
    const play = state.view.play;
    const player = state.game.player;
    const centerOffset = (count - 1) / 2;
    const targets = distinctEnemyTargets(count);
    audio.play("comboMissile");

    // Combo missiles reserve different targets where possible so they spread their value.
    for (let i = 0; i < count; i += 1) {
      const x = utils.clamp(
        player.x + (i - centerOffset) * player.w * 1.25,
        play.x + 24,
        play.x + play.w - 24
      );
      state.projectiles.push({
        seeker: true,
        comboEligible: false,
        x,
        y: play.y + play.h + 22,
        w: 10,
        h: 20,
        vx: (i - centerOffset) * 22,
        vy: -430,
        damage,
        target: targets[i] || null,
        life: 3600
      });
    }
  }

  function distinctEnemyTargets(count) {
    return [...state.enemies]
      .sort((a, b) => a.y - b.y)
      .slice(0, count);
  }

  function spawnComboBombs() {
    const play = state.view.play;
    const radius = Math.max(48, Math.min(82, play.w * 0.14));

    for (let i = 0; i < config.COMBO_BOMB_COUNT; i += 1) {
      state.comboEffects.push({
        type: "bomb",
        x: play.x + radius + Math.random() * Math.max(1, play.w - radius * 2),
        y: play.y + play.h * 0.18 + Math.random() * play.h * 0.58,
        radius,
        age: -i * 520,
        life: config.COMBO_BOMB_LIFE,
        tickTimer: 0,
        appearSoundPlayed: false
      });
    }
  }

  function spawnWingmanPass(pass) {
    const play = state.view.play;
    const crash = pass === config.COMBO_WINGMAN_PASSES - 1;
    const path = crash ? wingmanCrashPath() : randomWingmanPath();
    audio.play("comboFlyby");
    state.comboEffects.push({
      type: "wingman",
      pass,
      crash,
      start: path.start,
      end: path.end,
      x: path.start.x,
      y: path.start.y,
      age: 0,
      life: pass === config.COMBO_WINGMAN_PASSES - 1 ? 1050 : 900,
      shotTimer: 90
    });
  }

  function randomWingmanPath() {
    const play = state.view.play;
    const margin = 42;
    const horizontal = Math.random() > 0.5;
    const reverse = Math.random() > 0.5;

    if (horizontal) {
      const y = play.y + play.h * (0.16 + Math.random() * 0.68);
      return {
        start: { x: reverse ? play.x + play.w + margin : play.x - margin, y },
        end: { x: reverse ? play.x - margin : play.x + play.w + margin, y: y + (Math.random() - 0.5) * play.h * 0.22 }
      };
    }

    const x = play.x + play.w * (0.16 + Math.random() * 0.68);
    return {
      start: { x, y: reverse ? play.y + play.h + margin : play.y - margin },
      end: { x: x + (Math.random() - 0.5) * play.w * 0.24, y: reverse ? play.y - margin : play.y + play.h + margin }
    };
  }

  function wingmanCrashPath() {
    const play = state.view.play;
    const margin = 52;
    const center = { x: play.x + play.w / 2, y: play.y + play.h / 2 };
    const fromLeft = Math.random() > 0.5;

    return {
      start: {
        x: fromLeft ? play.x - margin : play.x + play.w + margin,
        y: center.y - play.h * 0.18
      },
      end: center
    };
  }

  function spawnShockwave(x, y) {
    const play = state.view.play;
    audio.play("comboShockwave");
    const corners = [
      Math.hypot(x - play.x, y - play.y),
      Math.hypot(x - (play.x + play.w), y - play.y),
      Math.hypot(x - play.x, y - (play.y + play.h)),
      Math.hypot(x - (play.x + play.w), y - (play.y + play.h))
    ];

    state.comboEffects.push({
      type: "shockwave",
      x,
      y,
      radius: 0,
      maxRadius: Math.max(...corners) + 28,
      age: 0,
      life: 1150,
      hitEnemies: []
    });
  }

  function spawnComboLaser() {
    const play = state.view.play;
    audio.startLoop("comboLaser");
    state.comboEffects.push({
      type: "laser",
      x: play.x + play.w / 2,
      centerX: play.x + play.w / 2,
      sweepRange: Math.max(24, play.w * 0.26),
      width: Math.max(44, play.w * 0.14),
      age: 0,
      life: config.COMBO_LASER_LIFE,
      tickTimer: 0
    });
  }

  function spawnComboFinale() {
    spawnComboMissiles(10, 3);
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
      audio.play("powerCooldown");
    } else if (power.type === "speed") {
      state.game.speedStacks = Math.min(config.SPEED_STACK_MAX, state.game.speedStacks + 1);
      audio.play("powerSpeed");
    } else if (power.type === "invulnerable") {
      state.game.shieldLayers = Math.min(config.SHIELD_STACK_MAX, state.game.shieldLayers + 1);
      audio.play("powerShield");
    } else if (power.type === "spread") {
      if (state.game.spreadLevel >= config.MAX_SPREAD_LEVEL) return;
      state.game.spreadLevel += 1;
      audio.play("powerMultishot");
    } else if (power.type === "projectileSpeed") {
      state.game.projectileSpeedMultiplier *= 1.025;
      audio.play("powerProjectileSpeed");
    }
  }

  function endGame() {
    const game = state.game;
    if (!game.running) return;
    game.running = false;
    game.screen = "gameover";
    game.player.alive = false;
    game.player.exploding = true;
    game.speedBoostUntil = 0;
    audio.stopAmbience();
    audio.syncBossAmbience(false);
    audio.stopLoop("comboLaser");
    audio.play("gameOver");
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
