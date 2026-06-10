(function () {
  "use strict";

  const config = window.StarfallConfig;
  const state = window.StarfallState;
  const layout = window.StarfallLayout;
  const update = window.StarfallUpdate;
  const audio = window.StarfallAudio;

  function bindInput() {
    window.addEventListener("keydown", (event) => {
      audio.unlock();
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
    bindMobileButtons();
  }

  function handlePointerDown(event) {
    audio.unlock();
    if (!state.view.compactUi) return;

    event.preventDefault();

    if (state.game.screen === "start") {
      layout.resetGame();
      return;
    }

    if (state.game.screen === "gameover") {
      layout.resetGame();
      return;
    }

    if (!state.game.running) return;
  }

  function bindMobileButtons() {
    const buttons = document.querySelectorAll("[data-control]");
    for (const button of buttons) {
      button.addEventListener("pointerdown", handleControlDown);
      button.addEventListener("pointerup", handleControlEnd);
      button.addEventListener("pointercancel", handleControlEnd);
      button.addEventListener("lostpointercapture", handleControlEnd);
    }
  }

  function handleControlDown(event) {
    if (!state.view.compactUi) return;

    event.preventDefault();
    audio.unlock();
    const control = event.currentTarget.dataset.control;
    event.currentTarget.classList.add("is-held");
    captureElementPointer(event.currentTarget, event);

    if (state.game.screen === "start") {
      layout.resetGame();
      return;
    }

    if (state.game.screen === "gameover") {
      layout.resetGame();
      return;
    }

    if (!state.game.running) return;

    if (control === "fire") {
      state.touch.firePointerId = event.pointerId;
      state.touch.fireHeld = true;
      state.touch.nextFireAt = performance.now() + 120;
      update.shoot(performance.now());
    } else if (control === "boost") {
      update.activateSpeed(performance.now());
    } else {
      const key = controlKey(control);
      if (key) state.keys.add(key);
    }
  }

  function handleControlEnd(event) {
    const control = event.currentTarget.dataset.control;
    event.currentTarget.classList.remove("is-held");

    if (control === "fire" && event.pointerId === state.touch.firePointerId) {
      state.touch.firePointerId = null;
      state.touch.fireHeld = false;
    } else {
      const key = controlKey(control);
      if (key) state.keys.delete(key);
    }

    releaseElementPointer(event.currentTarget, event);
  }

  function controlKey(control) {
    if (control === "up") return "ArrowUp";
    if (control === "down") return "ArrowDown";
    if (control === "left") return "ArrowLeft";
    if (control === "right") return "ArrowRight";
    return null;
  }

  function captureElementPointer(element, event) {
    if (element.setPointerCapture) element.setPointerCapture(event.pointerId);
  }

  function releaseElementPointer(element, event) {
    if (element.releasePointerCapture && element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
  }

  window.StarfallInput = { bindInput };
}());
