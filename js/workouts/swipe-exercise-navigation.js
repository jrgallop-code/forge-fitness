const ACTIVE_WORKOUT_STORAGE_KEY = 'level_up_active_workout';

function getActiveWorkout() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveActiveWorkout(active) {
  if (!active) return;
  active.updatedAt = new Date().toISOString();
  localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(active));
}

function setupSwipeNavigation(logger) {
  const container = logger?.querySelector('#session-exercises');
  if (!container || container.dataset.swipeOnlyNavigationBound === 'true') return;
  container.dataset.swipeOnlyNavigationBound = 'true';

  const showExercise = requestedIndex => {
    const cards = [...container.querySelectorAll('.session-exercise-card')];
    if (!cards.length) return;

    const current = Number(logger.dataset.carouselExerciseIndex) || 0;
    const index = Math.max(0, Math.min(Number(requestedIndex) || 0, cards.length - 1));
    if (index === current && cards[index]?.classList.contains('active-exercise-card')) return;

    logger.dataset.carouselExerciseIndex = String(index);
    cards.forEach((card, cardIndex) => {
      card.hidden = cardIndex !== index;
      card.classList.toggle('active-exercise-card', cardIndex === index);
    });

    const position = container.querySelector('.exercise-carousel-position');
    if (position) {
      position.innerHTML = `<strong>Exercise ${index + 1} of ${cards.length}</strong><small>Swipe to change exercise</small>`;
    }

    if (!logger.dataset.editingSessionId) {
      const active = getActiveWorkout();
      if (active) {
        active.currentExerciseIndex = Number(cards[index].dataset.exerciseIndex) || index;
        saveActiveWorkout(active);
      }
    }
  };

  let swipeStart = null;

  container.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    if (event.target.closest('button, input, select, textarea, label, a')) return;
    swipeStart = { x: event.clientX, y: event.clientY };
  }, true);

  container.addEventListener('pointerup', event => {
    if (!swipeStart || event.pointerType !== 'touch') return;

    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    swipeStart = null;

    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    event.stopImmediatePropagation();
    const current = Number(logger.dataset.carouselExerciseIndex) || 0;

    // Standard mobile convention: swipe left advances, swipe right goes back.
    showExercise(deltaX < 0 ? current + 1 : current - 1);
  }, true);

  container.addEventListener('pointercancel', () => {
    swipeStart = null;
  }, true);

  const current = Number(logger.dataset.carouselExerciseIndex) || 0;
  showExercise(current);
}

function scan() {
  const logger = document.getElementById('workout-session-logger');
  if (logger) setupSwipeNavigation(logger);
}

const observer = new MutationObserver(mutations => {
  if (mutations.some(mutation => [...mutation.addedNodes].some(node =>
    node.nodeType === 1 && (
      node.id === 'workout-session-logger' ||
      node.querySelector?.('#workout-session-logger')
    )
  ))) {
    requestAnimationFrame(scan);
  }
});

observer.observe(document.body, { childList: true, subtree: true });
scan();
