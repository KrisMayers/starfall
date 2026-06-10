(function () {
  "use strict";

  const state = window.StarfallState;
  const SOUND_PATHS = {
    ambience: "sounds/background-ambience.wav",
    bossAmbience: "sounds/boss-ambience.wav",
    bossDeath: "sounds/boss-death.wav",
    bossShot: "sounds/boss-single-shot.wav",
    comboBombAppear: "sounds/combo-bomb-1.wav",
    comboFlyby: "sounds/combo-flyby.wav",
    comboShockwave: "sounds/combo-flyby-shockwave.wav",
    comboLaser: "sounds/combo-laser.mp3",
    comboMissile: "sounds/combo-missile-firing.wav",
    gameOver: "sounds/game-over.wav",
    enemyDeath: "sounds/player-enemy-death.wav",
    playerShot: "sounds/player-projectile-single-shot.wav",
    powerCooldown: "sounds/powerup-cooldown.wav",
    powerMultishot: "sounds/powerup-multishot.wav",
    powerProjectileSpeed: "sounds/powerup-projectile-speed.wav",
    powerShield: "sounds/powerup-shield.wav",
    powerSpeed: "sounds/powerup-speed.wav",
    weaponEmpty: "sounds/weapon-empty.wav",
    impact: "sounds/projectile-impact.wav"
  };

  const SOUND_SETTINGS = {
    ambience: { volume: 0.24, cooldown: 0 },
    bossAmbience: { volume: 0.44, cooldown: 0 },
    bossDeath: { volume: 0.82, cooldown: 250 },
    bossShot: { volume: 0.42, cooldown: 90 },
    comboBombAppear: { volume: 0.58, cooldown: 80 },
    comboFlyby: { volume: 0.5, cooldown: 140 },
    comboShockwave: { volume: 0.68, cooldown: 280 },
    comboLaser: { volume: 0.62, cooldown: 300 },
    comboMissile: { volume: 0.62, cooldown: 180 },
    gameOver: { volume: 0.78, cooldown: 900 },
    enemyDeath: { volume: 0.48, cooldown: 45 },
    playerShot: { volume: 0.28, cooldown: 45 },
    powerCooldown: { volume: 0.5, cooldown: 120 },
    powerMultishot: { volume: 0.5, cooldown: 120 },
    powerProjectileSpeed: { volume: 0.5, cooldown: 120 },
    powerShield: { volume: 0.5, cooldown: 120 },
    powerSpeed: { volume: 0.5, cooldown: 120 },
    weaponEmpty: { volume: 0.42, cooldown: 120 },
    impact: { volume: 0.28, cooldown: 35 }
  };

  const LOOPING_SOUNDS = new Set(["ambience", "bossAmbience", "comboLaser"]);
  const sounds = {};
  const lastPlayed = {};
  const loopPlaying = {};
  let unlocked = false;

  for (const [name, path] of Object.entries(SOUND_PATHS)) {
    const audio = new Audio(path);
    audio.preload = "auto";
    if (LOOPING_SOUNDS.has(name)) audio.loop = true;
    sounds[name] = audio;
  }

  function unlock() {
    unlocked = true;
    if (state.game.running) startAmbience();
  }

  function play(name, options = {}) {
    if (!unlocked) return;

    const base = sounds[name];
    if (!base) return;

    const settings = SOUND_SETTINGS[name] || {};
    const now = performance.now();
    const cooldown = options.cooldown ?? settings.cooldown ?? 0;
    if (cooldown > 0 && now - (lastPlayed[name] || 0) < cooldown) return;
    lastPlayed[name] = now;

    const audio = name === "ambience" ? base : base.cloneNode();
    audio.volume = options.volume ?? settings.volume ?? 1;
    audio.play().catch(() => {});
  }

  function startLoop(name, options = {}) {
    if (!unlocked || loopPlaying[name]) return;

    const audio = sounds[name];
    if (!audio) return;

    const settings = SOUND_SETTINGS[name] || {};
    audio.loop = true;
    audio.volume = options.volume ?? settings.volume ?? 1;
    loopPlaying[name] = true;
    audio.play().catch(() => {
      loopPlaying[name] = false;
    });
  }

  function stopLoop(name) {
    const audio = sounds[name];
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    loopPlaying[name] = false;
  }

  function startAmbience() {
    startLoop("ambience");
  }

  function stopAmbience() {
    stopLoop("ambience");
  }

  function syncBossAmbience(active) {
    if (active) startLoop("bossAmbience");
    else stopLoop("bossAmbience");
  }

  function syncForScreen() {
    if (state.game.running) startAmbience();
    else {
      stopAmbience();
      stopLoop("bossAmbience");
      stopLoop("comboLaser");
    }
  }

  window.StarfallAudio = {
    unlock,
    play,
    startLoop,
    stopLoop,
    startAmbience,
    stopAmbience,
    syncBossAmbience,
    syncForScreen
  };
}());
