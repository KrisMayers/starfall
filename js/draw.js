(function () {
  "use strict";

  const config = window.StarfallConfig;
  const state = window.StarfallState;
  const levels = window.StarfallLevels;
  const layout = window.StarfallLayout;
  const spawns = window.StarfallSpawns;
  const playerSprite = new Image();
  playerSprite.src = "assets/player.png";
  const enemySprites = {};

  for (const kind of config.enemyKinds) {
    if (!kind.sprite) continue;
    enemySprites[kind.type] = new Image();
    enemySprites[kind.type].src = kind.sprite;
  }

  function draw(now) {
    const ctx = state.ctx;
    const view = state.view;
    ctx.clearRect(0, 0, view.width, view.height);

    if (!view.compactUi) drawOuter();
    drawPlayfield(now);
    if (!view.compactUi) drawPlanets();
    drawStars();
    drawGameplayObjects(now);
    drawPlayfieldFrame();
    if (state.game.running) drawUi(now);
    else if (state.game.screen === "start") drawStartScreen(now);
    else drawGameOver();
  }

  function drawOuter() {
    const ctx = state.ctx;
    const { width, height } = state.view;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#050711");
    gradient.addColorStop(0.55, "#080916");
    gradient.addColorStop(1, "#151019");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawPlayfield(now) {
    const ctx = state.ctx;
    const play = state.view.play;
    if (state.view.compactUi) {
      ctx.fillStyle = "#070a18";
      ctx.fillRect(play.x, play.y, play.w, play.h);
      return;
    }

    const gradient = ctx.createLinearGradient(play.x, play.y, play.x, play.y + play.h);
    gradient.addColorStop(0, "#05091d");
    gradient.addColorStop(0.5, "#090a18");
    gradient.addColorStop(1, "#120b1f");
    ctx.fillStyle = gradient;
    ctx.fillRect(play.x, play.y, play.w, play.h);

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#3e78aa";
    const band = ((now * 0.012) % 70) - 70;
    for (let y = play.y + band; y < play.y + play.h; y += 70) ctx.fillRect(play.x, y, play.w, 1);
    ctx.restore();
  }

  function drawStars() {
    const ctx = state.ctx;
    const play = state.view.play;
    if (!state.view.compactUi) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(play.x, play.y, play.w, play.h);
      ctx.clip();
    }

    for (const star of state.stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#ecfbff";
      ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
    }
    if (!state.view.compactUi) ctx.restore();
  }

  function drawPlanets() {
    const ctx = state.ctx;
    const play = state.view.play;
    ctx.save();
    ctx.beginPath();
    ctx.rect(play.x, play.y, play.w, play.h);
    ctx.clip();

    for (const planet of state.planets) {
      ctx.save();
      ctx.globalAlpha = 0.78;
      const grad = ctx.createRadialGradient(planet.x - planet.r * 0.3, planet.y - planet.r * 0.35, 2, planet.x, planet.y, planet.r);
      grad.addColorStop(0, `hsl(${planet.hue}, 90%, 72%)`);
      grad.addColorStop(0.6, `hsl(${planet.hue - 24}, 70%, 42%)`);
      grad.addColorStop(1, "#101224");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ffffff";
      for (let i = -2; i <= 2; i += 1) {
        ctx.fillRect(planet.x - planet.r * 0.55, planet.y + i * planet.r * 0.18, planet.r * 1.1, 2);
      }

      if (planet.ring) {
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = "#d7fff8";
        ctx.lineWidth = Math.max(2, planet.r * 0.06);
        ctx.beginPath();
        ctx.ellipse(planet.x, planet.y, planet.r * 1.45, planet.r * 0.35, -0.24, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawProjectiles() {
    const ctx = state.ctx;
    ctx.save();
    ctx.shadowBlur = mobileBlur(12);
    for (const projectile of state.projectiles) {
      const body = projectile.color || (projectile.seeker ? "#fff5a8" : projectile.hostile ? "#fff0a8" : "#eaffff");
      const core = projectile.accent || (projectile.seeker ? "#ff4b5d" : projectile.hostile ? "#ff8e3c" : "#63e7ff");
      ctx.shadowColor = projectile.glow || core;
      const angle = Math.atan2(projectile.vx || 0, -projectile.vy || 1);
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(angle);
      ctx.fillStyle = body;
      ctx.fillRect(-projectile.w / 2, -projectile.h / 2, projectile.w, projectile.h);
      ctx.fillStyle = core;
      ctx.fillRect(-Math.max(2, projectile.w * 0.22), -projectile.h / 2, Math.max(4, projectile.w * 0.44), projectile.h);
      if (projectile.seeker) {
        ctx.fillStyle = "#ffe45c";
        ctx.fillRect(-projectile.w / 2 - 4, projectile.h * 0.18, 4, 3);
        ctx.fillRect(projectile.w / 2, projectile.h * 0.18, 4, 3);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGameplayObjects(now) {
    const ctx = state.ctx;
    const play = state.view.play;
    if (!state.view.compactUi) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(play.x, play.y, play.w, play.h);
      ctx.clip();
    }
    drawPowerups(now);
    if (state.game.player.alive) drawWeaponGuideLaser();
    drawProjectiles();
    drawEnemies(now);
    if (state.game.player.alive) {
      drawPlayer(now);
      drawWeaponOrb();
      drawWeaponTurrets(now);
    }
    drawComboEffects();
    drawExplosions();
    if (!state.view.compactUi) ctx.restore();
  }

  function drawEnemies(now) {
    const ctx = state.ctx;
    for (const enemy of state.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.type === "saucer"
        ? Math.sin(now * 0.001 + enemy.wobble) * 0.08 + enemy.spin * 0.04
        : enemy.rotation || 0);
      if (enemy.type === "saucer") drawSaucer(enemy.w, enemy.kind.body, enemy.kind.wing, enemy.kind.glow, now);
      else drawEnemySprite(enemy);
      ctx.restore();
    }
  }

  function drawEnemySprite(enemy) {
    const sprite = enemySprites[enemy.type];
    if (!sprite || !sprite.complete || sprite.naturalWidth <= 0) {
      drawEnemyOrb(enemy.w, enemy.kind.body, enemy.kind.wing, enemy.kind.glow);
      return;
    }

    const ctx = state.ctx;
    const frame = enemy.kind.spriteFrame || { x: 0, y: 0, w: sprite.naturalWidth, h: sprite.naturalHeight };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, frame.x, frame.y, frame.w, frame.h, -enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h);
    ctx.restore();
  }

  function drawEnemyOrb(size, body, shade, glow) {
    const ctx = state.ctx;
    const unit = size / 10;

    ctx.fillStyle = shade;
    pixelRect(-3, -4, 6, 1, unit);
    pixelRect(-4, -3, 8, 2, unit);
    pixelRect(-5, -1, 10, 3, unit);
    pixelRect(-4, 2, 8, 2, unit);
    pixelRect(-3, 4, 6, 1, unit);

    ctx.fillStyle = body;
    pixelRect(-2, -3, 5, 1, unit);
    pixelRect(-3, -2, 6, 3, unit);
    pixelRect(-2, 1, 5, 2, unit);

    ctx.fillStyle = "#f8ffff";
    pixelRect(-1, -2, 2, 1, unit);

    ctx.fillStyle = glow;
    pixelRect(-3, 3, 1, 1, unit);
    pixelRect(2, 3, 1, 1, unit);
  }

  function drawSaucer(size, body, wing, glow, now) {
    const ctx = state.ctx;
    const unit = size / 10;
    ctx.fillStyle = wing;
    pixelRect(-5, -1, 10, 2, unit);
    pixelRect(-4, 1, 8, 1, unit);
    ctx.fillStyle = body;
    pixelRect(-3, -3, 6, 2, unit);
    pixelRect(-2, -4, 4, 1, unit);
    ctx.fillStyle = "#fff5cb";
    pixelRect(-1, -3, 2, 1, unit);
    ctx.fillStyle = glow;
    const blink = Math.sin(now * 0.012) > 0 ? 1 : 0;
    pixelRect(-4, 2, 1, 1 + blink, unit);
    pixelRect(0, 2, 1, 1 + blink, unit);
    pixelRect(3, 2, 1, 1 + blink, unit);
  }

  function drawPlayer(now) {
    const ctx = state.ctx;
    const game = state.game;
    const width = game.player.w * config.PLAYER_SPRITE_SCALE;
    const height = game.player.h * config.PLAYER_SPRITE_SCALE;
    ctx.save();
    ctx.translate(game.player.x, game.player.y);
    if (playerSprite.complete && playerSprite.naturalWidth > 0) {
      drawPlayerSprite(width, height);
      drawPlayerShieldOverlay(width, height, game.shieldLayers);
    } else {
      drawPixelShip(game.player.w, "#5af3ff", "#1f6fd1", "#ffef7a", true);
      drawFallbackShieldOverlay(game.player.w, game.shieldLayers);
    }
    ctx.restore();
  }

  function drawPlayerSprite(width, height) {
    const ctx = state.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(playerSprite, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawWeaponGuideLaser() {
    const game = state.game;
    if (game.spreadLevel < 2) return;

    const ctx = state.ctx;
    const play = state.view.play;
    const player = game.player;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "#ff4b5d";
    ctx.lineWidth = Math.max(1, player.w * 0.035);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.h / 2);
    ctx.lineTo(player.x, play.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawWeaponOrb() {
    const game = state.game;
    if (game.spreadLevel < 4) return;

    const ctx = state.ctx;
    const player = game.player;
    const orbit = player.w * 1.55;
    const size = Math.max(14, player.w * 0.56);
    const x = player.x + Math.cos(game.weaponOrbAngle) * orbit;
    const y = player.y + Math.sin(game.weaponOrbAngle) * orbit;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = "#72fff1";
    ctx.shadowBlur = mobileBlur(14);
    ctx.fillStyle = "#dffcff";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#31e7cf";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWeaponTurrets(now) {
    const game = state.game;
    if (game.spreadLevel < 7) return;

    const turretCount = Math.min(2, game.spreadLevel - 6);
    for (let i = 0; i < turretCount; i += 1) {
      const pos = weaponTurretDrawPosition(i, now);
      drawMiniTurret(pos.x, pos.y, i === 0 ? -1 : 1);
    }
  }

  function weaponTurretDrawPosition(index, now) {
    const player = state.game.player;
    const side = index === 0 ? -1 : 1;
    return {
      x: player.x + side * player.w * 1.25,
      y: player.y + Math.sin(now * 0.006 + index * Math.PI) * 3
    };
  }

  function drawMiniTurret(x, y, side) {
    const ctx = state.ctx;
    const size = Math.max(10, state.game.player.w * 0.34);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#29344d";
    ctx.strokeStyle = "#8efbff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-size * 0.45, -size * 0.35, size * 0.9, size * 0.7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#eaffff";
    ctx.fillRect(side < 0 ? -size * 0.76 : size * 0.2, -size * 0.1, size * 0.56, size * 0.2);
    ctx.fillStyle = "#5af3ff";
    ctx.fillRect(-size * 0.18, -size * 0.15, size * 0.36, size * 0.3);
    ctx.restore();
  }

  function drawPlayerShieldOverlay(width, height, layers) {
    if (layers <= 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(width));
    canvas.height = Math.max(1, Math.ceil(height));
    const buffer = canvas.getContext("2d");
    buffer.imageSmoothingEnabled = false;
    buffer.drawImage(playerSprite, 0, 0, canvas.width, canvas.height);
    buffer.globalCompositeOperation = "source-in";
    buffer.fillStyle = shieldOverlayColor(layers);
    buffer.fillRect(0, 0, canvas.width, canvas.height);

    const ctx = state.ctx;
    ctx.save();
    ctx.shadowColor = "#4ad7ff";
    ctx.shadowBlur = mobileBlur(7 + layers * 3);
    ctx.drawImage(canvas, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawFallbackShieldOverlay(size, layers) {
    if (layers <= 0) return;

    const ctx = state.ctx;
    ctx.save();
    ctx.globalAlpha = 0.2 + layers * 0.1;
    drawPixelShip(size, "#79dfff", "#348dff", "#e8fbff", true);
    ctx.restore();
  }

  function shieldOverlayColor(layers) {
    const alpha = [0, 0.22, 0.38, 0.54][Math.max(0, Math.min(config.SHIELD_STACK_MAX, layers))];
    return `rgba(83, 210, 255, ${alpha})`;
  }

  function drawPixelShip(size, body, wing, glow, upright) {
    const ctx = state.ctx;
    const unit = size / 8;
    const dir = upright ? -1 : 1;

    ctx.fillStyle = wing;
    pixelRect(-4, -1 * dir, 2, 3 * dir, unit);
    pixelRect(2, -1 * dir, 2, 3 * dir, unit);
    pixelRect(-3, 1 * dir, 6, 2 * dir, unit);

    ctx.fillStyle = body;
    pixelRect(-1, -4 * dir, 2, 1 * dir, unit);
    pixelRect(-2, -3 * dir, 4, 2 * dir, unit);
    pixelRect(-3, -1 * dir, 6, 3 * dir, unit);

    ctx.fillStyle = "#f8ffff";
    pixelRect(-1, -2 * dir, 2, 1 * dir, unit);

    ctx.fillStyle = glow;
    pixelRect(-2, 3 * dir, 1, 1 * dir, unit);
    pixelRect(1, 3 * dir, 1, 1 * dir, unit);
  }

  function pixelRect(x, y, w, h, unit) {
    state.ctx.fillRect(x * unit, y * unit, w * unit, h * unit);
  }

  function drawPowerups(now) {
    const ctx = state.ctx;
    for (const power of state.powerups) {
      ctx.save();
      ctx.translate(power.x, power.y);
      ctx.rotate(Math.sin(now * 0.004 + power.phase) * 0.45);
      drawPowerIcon(power.type, power.w, true);
      ctx.restore();
    }
  }

  function drawPowerIcon(type, size, glow) {
    const ctx = state.ctx;
    const color = powerColor(type);
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = mobileBlur(size * 0.45);
    }

    ctx.fillStyle = "#0b1224";
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.beginPath();
    ctx.rect(-size / 2, -size / 2, size, size);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    if (type === "cooldown") drawCooldownIcon(size);
    else if (type === "speed") drawSpeedIcon(size);
    else if (type === "spread") drawWeaponUpgradeIcon(size);
    else if (type === "projectileSpeed") drawProjectileSpeedIcon(size);
    else if (type === "curse") drawCurseIcon(size);
    else drawShieldIcon(size);
  }

  function drawCooldownIcon(size) {
    const ctx = state.ctx;
    ctx.fillRect(-size * 0.22, -size * 0.28, size * 0.44, size * 0.56);
    ctx.clearRect(-size * 0.14, -size * 0.18, size * 0.28, size * 0.36);
    ctx.fillRect(-size * 0.1, size * 0.08, size * 0.2, size * 0.2);
  }

  function drawSpeedIcon(size) {
    const ctx = state.ctx;
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, -size * 0.32);
    ctx.lineTo(size * 0.22, 0);
    ctx.lineTo(-size * 0.04, size * 0.04);
    ctx.lineTo(size * 0.28, size * 0.32);
    ctx.lineTo(-size * 0.24, size * 0.02);
    ctx.lineTo(size * 0.02, -size * 0.04);
    ctx.closePath();
    ctx.fill();
  }

  function drawWeaponUpgradeIcon(size) {
    const ctx = state.ctx;
    ctx.fillRect(-size * 0.36, -size * 0.1, size * 0.56, size * 0.2);
    ctx.fillRect(size * 0.12, -size * 0.18, size * 0.24, size * 0.1);
    ctx.fillRect(-size * 0.22, size * 0.08, size * 0.18, size * 0.28);
    ctx.fillRect(-size * 0.02, size * 0.08, size * 0.08, size * 0.16);
    ctx.beginPath();
    ctx.moveTo(size * 0.36, -size * 0.13);
    ctx.lineTo(size * 0.52, -size * 0.03);
    ctx.lineTo(size * 0.36, size * 0.08);
    ctx.closePath();
    ctx.fill();
  }

  function drawProjectileSpeedIcon(size) {
    const ctx = state.ctx;
    ctx.fillRect(size * 0.02, -size * 0.34, size * 0.12, size * 0.44);
    ctx.beginPath();
    ctx.moveTo(size * 0.08, -size * 0.48);
    ctx.lineTo(size * 0.26, -size * 0.26);
    ctx.lineTo(-size * 0.1, -size * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-size * 0.3, -size * 0.16, size * 0.24, size * 0.06);
    ctx.fillRect(-size * 0.36, size * 0.02, size * 0.3, size * 0.06);
    ctx.fillRect(-size * 0.24, size * 0.2, size * 0.18, size * 0.06);
  }

  function drawShieldIcon(size) {
    const ctx = state.ctx;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.34);
    ctx.lineTo(size * 0.28, -size * 0.16);
    ctx.lineTo(size * 0.22, size * 0.22);
    ctx.lineTo(0, size * 0.36);
    ctx.lineTo(-size * 0.22, size * 0.22);
    ctx.lineTo(-size * 0.28, -size * 0.16);
    ctx.closePath();
    ctx.fill();
  }

  function drawCurseIcon(size) {
    const ctx = state.ctx;
    ctx.beginPath();
    ctx.arc(0, -size * 0.08, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-size * 0.18, size * 0.14, size * 0.36, size * 0.2);
    ctx.fillStyle = "#0b1224";
    ctx.fillRect(-size * 0.17, -size * 0.14, size * 0.11, size * 0.12);
    ctx.fillRect(size * 0.06, -size * 0.14, size * 0.11, size * 0.12);
    ctx.fillRect(-size * 0.04, size * 0.02, size * 0.08, size * 0.12);
    ctx.fillStyle = powerColor("curse");
    ctx.fillRect(-size * 0.18, size * 0.34, size * 0.08, size * 0.12);
    ctx.fillRect(-size * 0.04, size * 0.34, size * 0.08, size * 0.12);
    ctx.fillRect(size * 0.1, size * 0.34, size * 0.08, size * 0.12);
  }

  function drawCurseReliefIcon(size) {
    const ctx = state.ctx;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b1224";
    ctx.fillRect(-size * 0.07, -size * 0.19, size * 0.14, size * 0.38);
    ctx.fillRect(-size * 0.19, -size * 0.07, size * 0.38, size * 0.14);
    ctx.fillStyle = powerColor("curseRelief");
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.42, -Math.PI * 0.1, Math.PI * 1.35);
    ctx.strokeStyle = powerColor("curseRelief");
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.stroke();
  }

  function drawExplosions() {
    const ctx = state.ctx;
    for (const explosion of state.explosions) {
      const t = explosion.age / explosion.life;
      ctx.save();
      ctx.translate(explosion.x, explosion.y);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = explosion.color;
      for (const particle of explosion.particles) {
        const x = particle.x + particle.vx * t * 0.55;
        const y = particle.y + particle.vy * t * 0.55;
        ctx.fillRect(x - particle.size / 2, y - particle.size / 2, particle.size, particle.size);
      }
      ctx.globalAlpha = Math.max(0, 0.65 - t);
      ctx.strokeStyle = "#fff3a3";
      ctx.lineWidth = Math.max(2, explosion.size * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, explosion.size * t, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawComboEffects() {
    for (const effect of state.comboEffects) {
      if (effect.age < 0) continue;
      if (effect.type === "bomb") drawBombEffect(effect);
      else if (effect.type === "wingman") drawWingmanEffect(effect);
      else if (effect.type === "shockwave") drawShockwaveEffect(effect);
      else if (effect.type === "laser") drawLaserEffect(effect);
      else if (effect.type === "guideLaser") drawGuideLaserEffect(effect);
      else if (effect.type === "turretFlash") drawTurretFlashEffect(effect);
      else if (effect.type === "tracer") drawTracerEffect(effect);
    }
  }

  function drawBombEffect(effect) {
    const ctx = state.ctx;
    const t = Math.max(0, Math.min(1, effect.age / effect.life));
    ctx.save();
    ctx.globalAlpha = 0.28 + Math.sin(effect.age * 0.018) * 0.08;
    ctx.fillStyle = "rgba(255, 184, 77, 0.18)";
    ctx.strokeStyle = "#ffb84d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.55 * (1 - t);
    ctx.strokeStyle = "#fff5a8";
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius * (0.25 + t * 0.75), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawWingmanEffect(effect) {
    const ctx = state.ctx;
    const angle = Math.atan2(effect.end.y - effect.start.y, effect.end.x - effect.start.x) + Math.PI / 2;
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.rotate(angle);
    ctx.shadowColor = effect.crash ? "#ffb84d" : "#a8f7ff";
    ctx.shadowBlur = mobileBlur(12);
    drawPixelShip(28, effect.crash ? "#ffb84d" : "#a8f7ff", "#1f6fd1", "#fff5a8", true);
    ctx.restore();
  }

  function drawShockwaveEffect(effect) {
    const ctx = state.ctx;
    const t = Math.max(0, Math.min(1, effect.age / effect.life));
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.8 - t * 0.6);
    ctx.strokeStyle = "#a8f7ff";
    ctx.shadowColor = "#a8f7ff";
    ctx.shadowBlur = mobileBlur(16);
    ctx.lineWidth = Math.max(3, 8 - t * 5);
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, 0.22 - t * 0.14);
    ctx.fillStyle = "#a8f7ff";
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLaserEffect(effect) {
    const ctx = state.ctx;
    const play = state.view.play;
    const pulse = 0.65 + Math.sin(effect.age * 0.018) * 0.18;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "rgba(157, 255, 250, 0.18)";
    ctx.fillRect(effect.x - effect.width / 2, play.y, effect.width, play.h);
    ctx.fillStyle = "rgba(245, 255, 255, 0.72)";
    ctx.fillRect(effect.x - effect.width * 0.16, play.y, effect.width * 0.32, play.h);
    ctx.restore();
  }

  function drawGuideLaserEffect(effect) {
    const ctx = state.ctx;
    const alpha = Math.max(0, 1 - effect.age / effect.life);
    ctx.save();
    ctx.globalAlpha = alpha * 0.18;
    ctx.strokeStyle = "#ff4b5d";
    ctx.lineWidth = Math.max(1, state.game.player.w * 0.035);
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y2);
    ctx.lineTo(effect.x, effect.y1);
    ctx.stroke();
    ctx.restore();
  }

  function drawTurretFlashEffect(effect) {
    const ctx = state.ctx;
    const alpha = Math.max(0, 1 - effect.age / effect.life);
    const angle = Math.atan2(effect.y2 - effect.y1, effect.x2 - effect.x1);
    ctx.save();
    ctx.globalAlpha = alpha * 0.46;
    ctx.strokeStyle = "#5af3ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(effect.x1, effect.y1);
    ctx.lineTo(effect.x2, effect.y2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(effect.x1, effect.y1);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffe45c";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(13, -4);
    ctx.lineTo(18, 0);
    ctx.lineTo(13, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = "#fff4a3";
    ctx.fillRect(effect.x2 - 2, effect.y2 - 2, 4, 4);
    ctx.restore();
  }

  function drawTracerEffect(effect) {
    const ctx = state.ctx;
    const alpha = Math.max(0, 1 - effect.age / effect.life);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#a8f7ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(effect.x1, effect.y1);
    ctx.lineTo(effect.x2, effect.y2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayfieldFrame() {
    if (state.view.compactUi) return;

    const ctx = state.ctx;
    const play = state.view.play;
    ctx.save();
    ctx.strokeStyle = "rgba(126, 236, 255, 0.44)";
    ctx.lineWidth = 2;
    ctx.strokeRect(play.x - 1, play.y - 1, play.w + 2, play.h + 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeRect(play.x + 3, play.y + 3, play.w - 6, play.h - 6);
    ctx.restore();
  }

  function drawUi(now) {
    drawScore();
    drawLevel();
    drawBossHealth();
    drawCooldown(now);
    drawStoredPowerups(now);
    drawMobileControls();
  }

  function drawScore() {
    const play = state.view.play;
    const x = state.view.compactUi ? 14 : Math.max(12, play.x - 84);
    const y = state.view.compactUi ? 24 : Math.max(28, play.y + 22);
    drawUiText(`${state.game.score}`, x, y, "left");
  }

  function drawLevel() {
    const ctx = state.ctx;
    const play = state.view.play;
    const compact = state.view.compactUi;
    const x = compact ? state.view.width - 14 : Math.min(state.view.width - 12, play.x + play.w + 84);
    const y = compact ? 24 : Math.max(28, play.y + 22);
    drawUiText(`LV ${state.game.level + 1}`, x, y, "right");

    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = `${uiFontSize(12)}px "Trebuchet MS", Arial, sans-serif`;
    const nextText = spawns.activeBoss()
      ? "BOSS"
      : `NEXT ${levels.formatTime(levels.levelDuration(state.game.level) - state.timers.levelTime)}`;
    if (compact) drawTextBackplate(x, y + uiFontSize(14), ctx.measureText(nextText).width + 12, uiFontSize(16), "right");
    ctx.fillStyle = "rgba(231, 252, 255, 0.76)";
    ctx.fillText(nextText, x, y + uiFontSize(compact ? 14 : 18));
    ctx.restore();

    const comboY = y + uiFontSize(compact ? 31 : 38);
    drawCombo(x, comboY);
    drawUpgradeStats(x, comboY + uiFontSize(compact ? 18 : 22), compact);
  }

  function drawCombo(x, y) {
    const ctx = state.ctx;
    const combo = state.game.combo;
    const tier = combo > 5 ? Math.floor(combo / 5) : 0;
    const chaos = Math.max(0, combo - 75);
    const shake = tier > 0 ? Math.min(24, tier * 0.35 + chaos * 0.22) : 0;
    const fontSize = uiFontSize(12) + Math.min(16, tier * 0.45 + chaos * 0.09);
    const jitterX = Math.sin(performance.now() * 0.041) * shake;
    const jitterY = Math.cos(performance.now() * 0.053) * shake * 0.55;
    const tilt = Math.sin(performance.now() * 0.035) * Math.min(0.16, tier * 0.004 + chaos * 0.0016);

    ctx.save();
    ctx.translate(x + jitterX, y + jitterY);
    ctx.rotate(tilt);
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = `700 ${fontSize}px "Trebuchet MS", Arial, sans-serif`;
    if (state.view.compactUi) drawTextBackplate(0, 0, ctx.measureText(`x${combo}`).width + 12, fontSize + 6, "right");
    ctx.fillStyle = combo > 0 ? "#ffe45c" : "rgba(231, 252, 255, 0.32)";
    ctx.shadowColor = combo > 5 ? "#ff7ab6" : "#ffe45c";
    ctx.shadowBlur = mobileBlur(combo > 5 ? 10 + tier * 0.8 + chaos * 0.18 : 6);
    ctx.fillText(`x${combo}`, 0, 0);
    ctx.restore();
  }

  function drawUpgradeStats(x, y, compact) {
    const game = state.game;
    const stats = [];
    if (game.spreadLevel > 0) {
      stats.push({ text: `WPN ${game.spreadLevel}/${config.MAX_SPREAD_LEVEL}`, color: "#5cff9f" });
    }
    if (game.curseStacks > 0) stats.push({ text: `+${game.curseStacks * 10}%`, color: "#ff4b5d", icon: "curse" });
    if (game.projectileSpeedMultiplier > 1) stats.push({ text: `SPD x${game.projectileSpeedMultiplier.toFixed(2)}`, color: "#ff9f43" });
    if (stats.length === 0) return;

    const ctx = state.ctx;
    const lineH = uiFontSize(compact ? 13 : 14);
    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = `700 ${uiFontSize(11)}px "Trebuchet MS", Arial, sans-serif`;
    ctx.shadowBlur = mobileBlur(7);
    for (let i = 0; i < stats.length; i += 1) {
      const stat = stats[i];
      const textWidth = ctx.measureText(stat.text).width;
      const iconSize = stat.icon ? uiFontSize(10) : 0;
      const backplateWidth = textWidth + (stat.icon ? iconSize + 5 : 0) + 12;
      const lineY = y + i * lineH;
      if (compact) drawTextBackplate(x, lineY, backplateWidth, lineH + 4, "right");
      if (stat.icon === "curse") {
        ctx.save();
        ctx.translate(x - textWidth - iconSize * 0.7, lineY + uiFontSize(6));
        ctx.fillStyle = stat.color;
        ctx.shadowColor = stat.color;
        drawCurseIcon(iconSize);
        ctx.restore();
      }
      ctx.fillStyle = stat.color;
      ctx.shadowColor = stat.color;
      ctx.fillText(stat.text, x, lineY);
    }
    ctx.restore();
  }

  function drawBossHealth() {
    const ctx = state.ctx;
    const play = state.view.play;
    const boss = spawns.activeBoss();
    if (!boss) return;

    const barW = Math.min(play.w * 0.56, 270);
    const barH = Math.max(8, Math.min(12, play.h * 0.018));
    const x = play.x + (play.w - barW) / 2;
    const y = play.y + 10;
    const ratio = Math.max(0, Math.min(1, boss.health / boss.maxHealth));

    ctx.save();
    ctx.fillStyle = "rgba(7, 10, 25, 0.82)";
    ctx.fillRect(x, y, barW, barH);
    ctx.strokeStyle = "rgba(255, 222, 142, 0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = "#ffb84d";
    ctx.fillRect(x + 2, y + 2, (barW - 4) * ratio, barH - 4);
    ctx.restore();
  }

  function drawCooldown(now) {
    const ctx = state.ctx;
    const play = state.view.play;
    const barW = Math.max(14, Math.min(22, state.view.width * 0.026));
    const baseBarH = Math.max(58, Math.min(96, state.view.height * 0.12));
    const capacitySteps = Math.max(0, (state.game.cooldownCapacity - config.BASE_COOLDOWN_CAPACITY) / 500);
    const maxBarH = state.view.compactUi
      ? Math.max(96, state.view.height * 0.18)
      : Math.max(130, state.view.height * 0.24);
    const barH = Math.min(maxBarH, baseBarH + capacitySteps * 14);
    const x = state.view.compactUi ? play.x + 10 : Math.max(15, play.x - 64);
    const y = state.view.compactUi
      ? play.y + play.h - barH - 12
      : Math.min(state.view.height - barH - 18, play.y + play.h - barH);
    const ready = Math.max(0, Math.min(1, state.game.cooldownCharge / state.game.cooldownCapacity));
    const overheated = state.game.cooldownLocked || state.game.cooldownCharge <= 0;
    const flash = overheated && now < state.game.cooldownFlashUntil;
    const flashPulse = flash ? 0.5 + Math.sin(now * 0.075) * 0.5 : 0;
    const accent = overheated ? "#ff4b5d" : "#33f5ca";

    ctx.save();
    ctx.shadowColor = "#ff4b5d";
    ctx.shadowBlur = flash ? mobileBlur(8 + flashPulse * 12) : 0;
    ctx.strokeStyle = overheated
      ? `rgba(255, ${Math.round(75 + flashPulse * 80)}, ${Math.round(93 + flashPulse * 70)}, ${0.9 + flashPulse * 0.1})`
      : "rgba(230, 255, 250, 0.62)";
    ctx.lineWidth = flash ? 2 + flashPulse * 2 : 2;
    ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = overheated ? `rgba(255, 75, 93, ${0.18 + flashPulse * 0.22})` : "rgba(51, 245, 202, 0.16)";
    ctx.fillRect(x + 3, y + 3, barW - 6, barH - 6);
    ctx.fillStyle = accent;
    ctx.globalAlpha = ready >= 1 ? 1 : 0.82;
    const fillH = (barH - 6) * ready;
    ctx.fillRect(x + 3, y + barH - 3 - fillH, barW - 6, fillH);
    ctx.restore();
  }

  function drawStoredPowerups(now) {
    const ctx = state.ctx;
    const play = state.view.play;
    const size = Math.max(14, Math.min(18, state.view.width * 0.024));
    const gap = Math.max(5, size * 0.24);
    const columnGap = Math.max(5, size * 0.34);
    const totalH = config.SPEED_STACK_MAX * size + (config.SPEED_STACK_MAX - 1) * gap;
    const totalW = size * 2 + columnGap;
    const startX = state.view.compactUi
      ? play.x + play.w - totalW - 10
      : Math.min(state.view.width - totalW - 38, play.x + play.w + 16);
    const startY = state.view.compactUi
      ? play.y + play.h - totalH - 12
      : Math.min(state.view.height - totalH - 18, play.y + play.h - totalH);
    const speedX = startX;
    const shieldX = startX + size + columnGap;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${uiFontSize(10)}px "Trebuchet MS", Arial, sans-serif`;
    ctx.fillStyle = "rgba(231, 252, 255, 0.82)";
    ctx.shadowColor = "#ffe45c";
    ctx.shadowBlur = mobileBlur(10);
    if (!state.view.compactUi) ctx.fillText("E", speedX + size / 2, startY - Math.max(10, size * 0.55));
    ctx.restore();

    for (let i = 0; i < config.SPEED_STACK_MAX; i += 1) {
      const y = startY + i * (size + gap) + size / 2;
      ctx.save();
      ctx.translate(speedX + size / 2, y);
      ctx.globalAlpha = i < state.game.speedStacks ? 1 : 0.22;
      drawPowerIcon("speed", size, i < state.game.speedStacks);
      ctx.restore();

      ctx.save();
      ctx.translate(shieldX + size / 2, y);
      ctx.globalAlpha = i < state.game.shieldLayers ? 1 : 0.22;
      drawPowerIcon("invulnerable", size, i < state.game.shieldLayers);
      ctx.restore();
    }

    if (now < state.game.speedBoostUntil) {
      const remaining = Math.ceil((state.game.speedBoostUntil - now) / 1000);
      drawUiText(`${remaining}`, startX + totalW + 8, startY + totalH / 2, "left");
    }
  }

  function drawMobileControls() {
    if (state.view.compactUi) return;

    const controls = layout.mobileControls();
    if (!controls) return;

    drawTouchButton(controls.boost, controls.radius, "#ffe45c", state.game.speedStacks > 0, drawTouchBoostIcon);
    drawTouchButton(controls.fire, controls.radius, "#33f5ca", !state.game.cooldownLocked, drawTouchFireIcon);
  }

  function drawTouchButton(control, radius, color, active, iconDraw) {
    const ctx = state.ctx;
    ctx.save();
    ctx.globalAlpha = active ? 0.82 : 0.32;
    ctx.shadowColor = color;
    ctx.shadowBlur = active ? mobileBlur(12) : 0;
    ctx.fillStyle = "rgba(8, 15, 31, 0.72)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(control.x, control.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.translate(control.x, control.y);
    ctx.fillStyle = color;
    iconDraw(radius);
    ctx.restore();
  }

  function drawTouchFireIcon(radius) {
    const ctx = state.ctx;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.52);
    ctx.lineTo(radius * 0.22, radius * 0.12);
    ctx.lineTo(radius * 0.08, radius * 0.12);
    ctx.lineTo(radius * 0.08, radius * 0.48);
    ctx.lineTo(-radius * 0.08, radius * 0.48);
    ctx.lineTo(-radius * 0.08, radius * 0.12);
    ctx.lineTo(-radius * 0.22, radius * 0.12);
    ctx.closePath();
    ctx.fill();
  }

  function drawTouchBoostIcon(radius) {
    const ctx = state.ctx;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.08, -radius * 0.52);
    ctx.lineTo(radius * 0.3, -radius * 0.08);
    ctx.lineTo(radius * 0.08, -radius * 0.04);
    ctx.lineTo(radius * 0.26, radius * 0.5);
    ctx.lineTo(-radius * 0.32, -radius * 0.02);
    ctx.lineTo(-radius * 0.08, -radius * 0.08);
    ctx.closePath();
    ctx.fill();
  }

  function drawStartScreen(now) {
    const ctx = state.ctx;
    const play = state.view.play;
    ctx.save();
    ctx.fillStyle = "rgba(2, 3, 9, 0.34)";
    ctx.fillRect(play.x, play.y, play.w, play.h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f5feff";
    ctx.shadowColor = "#52edff";
    ctx.shadowBlur = mobileBlur(18);
    ctx.font = `700 ${Math.max(18, Math.min(34, play.w * 0.078))}px "Trebuchet MS", Arial, sans-serif`;
    const pulse = 0.72 + (Math.sin(now * 0.004) + 1) * 0.14;
    ctx.globalAlpha = pulse;
    ctx.fillText(state.view.compactUi ? "TAP TO PLAY" : "PRESS ENTER TO PLAY", play.x + play.w / 2, play.y + play.h * 0.46);

    ctx.globalAlpha = 0.78;
    ctx.shadowBlur = 0;
    ctx.font = `700 ${Math.max(12, Math.min(16, play.w * 0.038))}px "Trebuchet MS", Arial, sans-serif`;
    ctx.fillStyle = "rgba(125, 245, 255, 0.78)";
    const controlsText = state.view.compactUi ? "DRAG LEFT / RIGHT" : "SPACE TO FIRE  |  E FOR BOOST";
    ctx.fillText(controlsText, play.x + play.w / 2, play.y + play.h * 0.54);
    ctx.restore();
  }

  function drawGameOver() {
    const ctx = state.ctx;
    const play = state.view.play;
    ctx.save();
    ctx.fillStyle = "rgba(2, 3, 9, 0.48)";
    ctx.fillRect(play.x, play.y, play.w, play.h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f5feff";
    ctx.shadowColor = "#52edff";
    ctx.shadowBlur = mobileBlur(20);
    ctx.font = `700 ${Math.max(38, Math.min(78, play.w * 0.17))}px "Trebuchet MS", Arial, sans-serif`;
    ctx.fillText(`${state.game.score}`, play.x + play.w / 2, play.y + play.h * 0.44);

    ctx.shadowBlur = 0;
    ctx.font = `700 ${Math.max(16, Math.min(28, play.w * 0.065))}px "Trebuchet MS", Arial, sans-serif`;
    ctx.fillStyle = "rgba(245, 254, 255, 0.86)";
    ctx.fillText("FINAL SCORE", play.x + play.w / 2, play.y + play.h * 0.35);

    ctx.font = `700 ${Math.max(13, Math.min(18, play.w * 0.044))}px "Trebuchet MS", Arial, sans-serif`;
    ctx.fillStyle = "rgba(231, 252, 255, 0.82)";
    ctx.fillText(`TIME ${levels.formatTime(state.timers.runTime)}  |  LEVEL ${state.game.level + 1}`, play.x + play.w / 2, play.y + play.h * 0.54);

    if (state.timers.gameOverTimer > 650) {
      ctx.font = `700 ${Math.max(13, Math.min(18, play.w * 0.045))}px "Trebuchet MS", Arial, sans-serif`;
      ctx.fillStyle = "rgba(125, 245, 255, 0.78)";
      ctx.fillText(state.view.compactUi ? "TAP TO RESTART" : "R TO RESTART", play.x + play.w / 2, play.y + play.h * 0.62);
    }
    ctx.restore();
  }

  function drawUiText(text, x, y, align) {
    const ctx = state.ctx;
    ctx.save();
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.font = `700 ${uiFontSize(16)}px "Trebuchet MS", Arial, sans-serif`;
    if (state.view.compactUi) drawTextBackplate(x, y, ctx.measureText(text).width + 14, uiFontSize(20), align, "middle");
    ctx.fillStyle = "#e7fcff";
    ctx.shadowColor = "#2de6ff";
    ctx.shadowBlur = mobileBlur(12);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawTextBackplate(x, y, width, height, align, baseline = "top") {
    const ctx = state.ctx;
    let left = x;
    if (align === "right") left = x - width;
    else if (align === "center") left = x - width / 2;

    let top = y;
    if (baseline === "middle") top = y - height / 2;

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(3, 6, 14, 0.48)";
    ctx.fillRect(left - 4, top - 2, width + 8, height + 4);
    ctx.restore();
  }

  function uiFontSize(base) {
    return Math.max(base - 2, Math.min(base + 4, Math.round(state.view.width * 0.018)));
  }

  function mobileBlur(value) {
    return state.view.compactUi ? Math.min(3, value * 0.25) : value;
  }

  function powerColor(type) {
    if (type === "cooldown") return "#33f5ca";
    if (type === "speed") return "#ffe45c";
    if (type === "spread") return "#5cff9f";
    if (type === "curse") return "#ff4b5d";
    if (type === "curseRelief") return "#79ffe1";
    if (type === "projectileSpeed") return "#ff9f43";
    return "#9d7dff";
  }

  window.StarfallDraw = {
    draw,
    powerColor
  };
}());
