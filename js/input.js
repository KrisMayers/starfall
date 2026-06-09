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

    state.canvas.addEventListener("pointerdown", handlePointerDown);
    state.canvas.addEventListener("pointermove", handlePointerMove);
    state.canvas.addEventListener("pointerup", handlePointerEnd);
    state.canvas.addEventListener("pointercancel", handlePointerEnd);
  }

  function handlePointerDown(event) {
    if (!state.view.compactUi) return;

    event.preventDefault();
    const point = pointerPoint(event);

    if (state.game.screen === "start") {
      layout.resetGame();
      return;
    }

    if (state.game.screen === "gameover") {
      layout.resetGame();
      return;
    }

    if (!state.game.running) return;

    const controls = layout.mobileControls();
    if (controls && hitCircle(point, controls.fire, controls.radius)) {
      state.touch.firePointerId = event.pointerId;
      state.touch.fireHeld = true;
      state.touch.nextFireAt = performance.now() + 120;
      update.shoot(performance.now());
      capturePointer(event);
      return;
    }

    if (controls && hitCircle(point, controls.boost, controls.radius)) {
      update.activateSpeed(performance.now());
      capturePointer(event);
      return;
    }

    if (inPlayfield(point)) {
      state.touch.movePointerId = event.pointerId;
      state.touch.moveTarget = clampMoveTarget(point);
      capturePointer(event);
    }
  }

  function handlePointerMove(event) {
    if (!state.view.compactUi || event.pointerId !== state.touch.movePointerId) return;

    event.preventDefault();
    state.touch.moveTarget = clampMoveTarget(pointerPoint(event));
  }

  function handlePointerEnd(event) {
    if (event.pointerId === state.touch.movePointerId) {
      state.touch.movePointerId = null;
      state.touch.moveTarget = null;
    }

    if (event.pointerId === state.touch.firePointerId) {
      state.touch.firePointerId = null;
      state.touch.fireHeld = false;
    }

    releasePointer(event);
  }

  function pointerPoint(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function inPlayfield(point) {
    const play = state.view.play;
    return point.x >= play.x && point.x <= play.x + play.w &&
      point.y >= play.y && point.y <= play.y + play.h;
  }

  function clampMoveTarget(point) {
    const play = state.view.play;
    const player = state.game.player;
    const vertical = layout.playerVerticalBounds();
    const targetX = Math.max(play.x + player.w / 2, Math.min(play.x + play.w - player.w / 2, point.x));
    const targetY = state.view.compactUi
      ? player.y
      : Math.max(vertical.min, Math.min(vertical.max, point.y));

    return {
      x: targetX,
      y: targetY
    };
  }

  function hitCircle(point, control, radius) {
    return Math.hypot(point.x - control.x, point.y - control.y) <= radius;
  }

  function capturePointer(event) {
    if (state.canvas.setPointerCapture) state.canvas.setPointerCapture(event.pointerId);
  }

  function releasePointer(event) {
    if (state.canvas.releasePointerCapture && state.canvas.hasPointerCapture(event.pointerId)) {
      state.canvas.releasePointerCapture(event.pointerId);
    }
  }

  window.StarfallInput = { bindInput };
}());
