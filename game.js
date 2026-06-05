(function () {
  "use strict";

  const state = window.StarfallState;
  const layout = window.StarfallLayout;
  const update = window.StarfallUpdate;
  const draw = window.StarfallDraw;
  const input = window.StarfallInput;

  function loop(now) {
    const dt = Math.min(0.034, (now - state.timers.lastTime) / 1000 || 0);
    state.timers.lastTime = now;
    update.update(dt, now);
    draw.draw(now);
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", layout.resize);
  input.bindInput();
  layout.resize();
  layout.resetGame({ start: false });
  requestAnimationFrame(loop);
}());
