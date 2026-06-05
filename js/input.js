(function () {
  "use strict";

  const config = window.StarfallConfig;
  const state = window.StarfallState;
  const layout = window.StarfallLayout;
  const update = window.StarfallUpdate;

  function bindInput() {
    window.addEventListener("keydown", (event) => {
      state.keys.add(event.code);

      if (event.code === "Space") {
        event.preventDefault();
        update.shoot(performance.now());
      } else if (event.code === config.SPEED_KEY) {
        event.preventDefault();
        update.activateSpeed(performance.now());
      } else if (event.code === "Enter" && state.game.screen === "start") {
        event.preventDefault();
        layout.resetGame();
      } else if (event.code === config.RESTART_KEY && state.game.screen === "gameover") {
        layout.resetGame();
      }
    });

    window.addEventListener("keyup", (event) => {
      state.keys.delete(event.code);
    });
  }

  window.StarfallInput = { bindInput };
}());
