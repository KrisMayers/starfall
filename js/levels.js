(function () {
  "use strict";

  function spawnCadence(level) {
    return Math.max(95, 860 - level * 105);
  }

  function enemySpeed(level) {
    return 96 + level * 28;
  }

  function levelDuration(level) {
    const displayLevel = level + 1;
    if (displayLevel <= 10) return 60000;
    if (displayLevel <= 20) return 75000;
    if (displayLevel <= 30) return 90000;
    if (displayLevel <= 40) return 105000;
    if (displayLevel <= 50) return 120000;
    return 150000;
  }

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  window.StarfallLevels = {
    spawnCadence,
    enemySpeed,
    levelDuration,
    formatTime
  };
}());
