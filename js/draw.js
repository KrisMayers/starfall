(function () {
  "use strict";

  const config = window.StarfallConfig;
  const state = window.StarfallState;
  const levels = window.StarfallLevels;
  const spawns = window.StarfallSpawns;

  function draw(now) {
    const ctx = state.ctx;
    const view = state.view;
    ctx.clearRect(0, 0, view.width, view.height);

    drawOuter();
    drawPlayfield(now);
    drawPlanets();
    drawStars();
    drawPowerups(now);
    drawProjectiles();
    drawEnemies(now);
    if (state.game.player.alive) drawPlayer(now);
    drawExplosions();
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
    ctx.save();
    ctx.beginPath();
    ctx.rect(play.x, play.y, play.w, play.h);
    ctx.clip();

    for (const star of state.stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#ecfbff";
      ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
    }
    ctx.restore();
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
    ctx.shadowBlur = 12;
    for (const projectile of state.projectiles) {
      ctx.shadowColor = projectile.hostile ? "#ffb84d" : "#8efbff";
      const angle = Math.atan2(projectile.vx || 0, -projectile.vy || 1);
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(angle);
      ctx.fillStyle = projectile.hostile ? "#fff0a8" : "#eaffff";
      ctx.fillRect(-projectile.w / 2, -projectile.h / 2, projectile.w, projectile.h);
      ctx.fillStyle = projectile.hostile ? "#ff8e3c" : "#63e7ff";
      ctx.fillRect(-2, -projectile.h / 2, 4, projectile.h);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawEnemies(now) {
    const ctx = state.ctx;
    for (const enemy of state.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Math.sin(now * 0.001 + enemy.wobble) * 0.08 + enemy.spin * 0.04);
      if (enemy.type === "saucer") drawSaucer(enemy.w, enemy.kind.body, enemy.kind.wing, enemy.kind.glow, now);
      else drawPixelShip(enemy.w, enemy.kind.body, enemy.kind.wing, enemy.kind.glow, false);
      ctx.restore();
    }
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
    ctx.save();
    ctx.translate(game.player.x, game.player.y);
    drawShieldLayers(game.player.w, game.shieldLayers, now);
    drawPixelShip(game.player.w, "#5af3ff", "#1f6fd1", "#ffef7a", true);
    ctx.restore();
  }

  function drawShieldLayers(playerSize, layers, now) {
    if (layers <= 0) return;

    const ctx = state.ctx;
    ctx.save();
    ctx.strokeStyle = "#79cfff";
    ctx.shadowColor = "#4ad7ff";
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.72 + Math.sin(now * 0.006) * 0.12;
    for (let i = 0; i < layers; i += 1) {
      ctx.lineWidth = Math.max(2, playerSize * 0.045);
      ctx.beginPath();
      ctx.arc(0, 0, playerSize * (0.72 + i * 0.18), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
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
      ctx.shadowBlur = size * 0.45;
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
    else if (type === "spread") drawSpreadIcon(size);
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

  function drawSpreadIcon(size) {
    const ctx = state.ctx;
    ctx.fillRect(-size * 0.06, -size * 0.36, size * 0.12, size * 0.5);
    ctx.fillRect(-size * 0.32, -size * 0.2, size * 0.12, size * 0.46);
    ctx.fillRect(size * 0.2, -size * 0.2, size * 0.12, size * 0.46);
    ctx.beginPath();
    ctx.moveTo(-size * 0.38, -size * 0.31);
    ctx.lineTo(-size * 0.14, -size * 0.16);
    ctx.lineTo(-size * 0.38, -size * 0.02);
    ctx.moveTo(0, -size * 0.47);
    ctx.lineTo(size * 0.16, -size * 0.26);
    ctx.lineTo(-size * 0.16, -size * 0.26);
    ctx.moveTo(size * 0.38, -size * 0.31);
    ctx.lineTo(size * 0.14, -size * 0.16);
    ctx.lineTo(size * 0.38, -size * 0.02);
    ctx.fill();
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

  function drawPlayfieldFrame() {
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
  }

  function drawScore() {
    const play = state.view.play;
    const x = state.view.compactUi ? play.x : Math.max(12, play.x - 84);
    const y = state.view.compactUi ? Math.max(28, play.y - 30) : Math.max(28, play.y + 22);
    drawUiText(`${state.game.score}`, x, y, "left");
  }

  function drawLevel() {
    const ctx = state.ctx;
    const play = state.view.play;
    const compact = state.view.compactUi;
    const x = compact ? play.x + play.w : Math.min(state.view.width - 12, play.x + play.w + 84);
    const y = compact ? Math.max(28, play.y - 30) : Math.max(28, play.y + 22);
    drawUiText(`LV ${state.game.level + 1}`, x, y, "right");

    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = `${uiFontSize(12)}px "Trebuchet MS", Arial, sans-serif`;
    const nextText = spawns.activeBoss()
      ? "BOSS"
      : `NEXT ${levels.formatTime(levels.levelDuration(state.game.level) - state.timers.levelTime)}`;
    ctx.fillStyle = "rgba(231, 252, 255, 0.58)";
    ctx.fillText(nextText, x, y + uiFontSize(compact ? 14 : 18));
    ctx.restore();

    drawCombo(x, y + uiFontSize(compact ? 31 : 38), compact);
  }

  function drawCombo(x, y, compact) {
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
    ctx.fillStyle = combo > 0 ? "#ffe45c" : "rgba(231, 252, 255, 0.32)";
    ctx.shadowColor = combo > 5 ? "#ff7ab6" : "#ffe45c";
    ctx.shadowBlur = combo > 5 ? 10 + tier * 0.8 + chaos * 0.18 : 6;
    ctx.fillText(`COMBO x${combo}`, 0, 0);
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
    const barH = Math.max(58, Math.min(96, state.view.height * 0.12));
    const x = state.view.compactUi ? play.x : Math.max(15, play.x - 64);
    const y = state.view.compactUi
      ? Math.min(state.view.height - barH - 14, play.y + play.h + 14)
      : Math.min(state.view.height - barH - 18, play.y + play.h - barH);
    const ready = Math.max(0, Math.min(1, (now - state.game.lastShotAt) / state.game.cooldown));

    ctx.save();
    ctx.strokeStyle = "rgba(230, 255, 250, 0.62)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = "rgba(51, 245, 202, 0.16)";
    ctx.fillRect(x + 3, y + 3, barW - 6, barH - 6);
    ctx.fillStyle = "#33f5ca";
    ctx.globalAlpha = ready >= 1 ? 1 : 0.82;
    const fillH = (barH - 6) * ready;
    ctx.fillRect(x + 3, y + barH - 3 - fillH, barW - 6, fillH);
    ctx.restore();
  }

  function drawStoredPowerups(now) {
    const ctx = state.ctx;
    const play = state.view.play;
    const size = Math.max(22, Math.min(34, state.view.width * 0.04));
    const gap = Math.max(7, size * 0.25);
    const totalH = config.SPEED_STACK_MAX * size + (config.SPEED_STACK_MAX - 1) * gap;
    const startX = state.view.compactUi
      ? Math.min(play.x + play.w - size, state.view.width - size - 48)
      : Math.min(state.view.width - size - 48, play.x + play.w + 20);
    const startY = state.view.compactUi
      ? Math.min(state.view.height - totalH - 14, play.y + play.h + 14)
      : Math.min(state.view.height - totalH - 18, play.y + play.h - totalH);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${uiFontSize(12)}px "Trebuchet MS", Arial, sans-serif`;
    ctx.fillStyle = "rgba(231, 252, 255, 0.82)";
    ctx.shadowColor = "#ffe45c";
    ctx.shadowBlur = 10;
    ctx.fillText("E", startX + size / 2, startY - Math.max(12, size * 0.45));
    ctx.restore();

    for (let i = 0; i < config.SPEED_STACK_MAX; i += 1) {
      ctx.save();
      ctx.translate(startX + size / 2, startY + i * (size + gap) + size / 2);
      ctx.globalAlpha = i < state.game.speedStacks ? 1 : 0.22;
      drawPowerIcon("speed", size, i < state.game.speedStacks);
      ctx.restore();
    }

    if (now < state.game.speedBoostUntil) {
      const remaining = Math.ceil((state.game.speedBoostUntil - now) / 1000);
      drawUiText(`${remaining}`, startX + size + 8, startY + totalH / 2, "left");
    }
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
    ctx.shadowBlur = 18;
    ctx.font = `700 ${Math.max(18, Math.min(34, play.w * 0.078))}px "Trebuchet MS", Arial, sans-serif`;
    const pulse = 0.72 + (Math.sin(now * 0.004) + 1) * 0.14;
    ctx.globalAlpha = pulse;
    ctx.fillText("PRESS ENTER TO PLAY", play.x + play.w / 2, play.y + play.h * 0.46);

    ctx.globalAlpha = 0.78;
    ctx.shadowBlur = 0;
    ctx.font = `700 ${Math.max(12, Math.min(16, play.w * 0.038))}px "Trebuchet MS", Arial, sans-serif`;
    ctx.fillStyle = "rgba(125, 245, 255, 0.78)";
    ctx.fillText("SPACE TO FIRE  |  E FOR BOOST", play.x + play.w / 2, play.y + play.h * 0.54);
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
    ctx.shadowBlur = 20;
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
      ctx.fillText("R TO RESTART", play.x + play.w / 2, play.y + play.h * 0.62);
    }
    ctx.restore();
  }

  function drawUiText(text, x, y, align) {
    const ctx = state.ctx;
    ctx.save();
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.font = `700 ${uiFontSize(16)}px "Trebuchet MS", Arial, sans-serif`;
    ctx.fillStyle = "#e7fcff";
    ctx.shadowColor = "#2de6ff";
    ctx.shadowBlur = 12;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function uiFontSize(base) {
    return Math.max(base - 2, Math.min(base + 4, Math.round(state.view.width * 0.018)));
  }

  function powerColor(type) {
    if (type === "cooldown") return "#33f5ca";
    if (type === "speed") return "#ffe45c";
    if (type === "spread") return "#ff7ab6";
    return "#9d7dff";
  }

  window.StarfallDraw = {
    draw,
    powerColor
  };
}());
