const ACTIVE_WORKOUT_STORAGE_KEY = 'level_up_active_workout';

function readActiveWorkout() {
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

function showExercise(logger, container, requestedIndex) {
  const cards = [...container.querySelectorAll('.session-exercise-card')];
  if (!cards.length) return;

  const currentIndex = Number(logger.dataset.carouselExerciseIndex) || 0;
  const index = Math.max(0, Math.min(Number(requestedIndex) || 0, cards.length - 1));
  if (index === currentIndex && cards[index]?.classList.contains('active-exercise-card')) return;

  logger.dataset.carouselExerciseIndex = String(index);

  cards.forEach((card, cardIndex) => {
    card.hidden = cardIndex !== index;
    card.classList.toggle('active-exercise-card', cardIndex === index);
    card.dataset.swipeDirection = cardIndex === index
      ? (index > currentIndex ? 'next' : 'previous')
      : '';
  });

  const position = container.querySelector('.exercise-carousel-position');
  if (position) {
    position.innerHTML = `<strong>Exercise ${index + 1} of ${cards.length}</strong><small>Swipe to change exercise</small>`;
  }

  if (!logger.dataset.editingSessionId) {
    const active = readActiveWorkout();
    if (active) {
      active.currentExerciseIndex = Number(cards[index].dataset.exerciseIndex) || index;
      saveActiveWorkout(active);
    }
  }
}

function bindSwipeNavigation(logger) {
  const container = logger.querySelector('#session-exercises');
  if (!container || container.dataset.swipeNavigationBound === 'true') return;

  container.dataset.swipeNavigationBound = 'true';

  const controls = container.querySelector('.exercise-carousel-controls');
  if (controls) {
    controls.classList.add('swipe-only-carousel-controls');
    const position = controls.querySelector('.exercise-carousel-position');
    const cards = [...container.querySelectorAll('.session-exercise-card')];
    const index = Math.max(0, Math.min(Number(logger.dataset.carouselExerciseIndex) || 0, Math.max(0, cards.length - 1)));
    if (position && cards.length) {
      position.innerHTML = `<strong>Exercise ${index + 1} of ${cards.length}</strong><small>Swipe to change exercise</small>`;
    }
  }

  let start = null;

  container.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    if (event.target.closest('button, input, select, textarea, label, a')) return;
    start = { x: event.clientX, y: event.clientY };
  }, true);

  container.addEventListener('pointerup', event => {
    if (!start || event.pointerType !== 'touch') return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    start = null;

    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const current = Number(logger.dataset.carouselExerciseIndex) || 0;
    showExercise(logger, container, deltaX < 0 ? current + 1 : current - 1);
  }, true);

  container.addEventListener('pointercancel', () => {
    start = null;
  }, true);
}

function scan() {
  const logger = document.getElementById('workout-session-logger');
  if (logger) bindSwipeNavigation(logger);
}

const observer = new MutationObserver(mutations => {
  const relevant = mutations.some(mutation =>
    [...mutation.addedNodes].some(node =>
      node.nodeType === 1 && (
        node.id === 'workout-session-logger' ||
        node.querySelector?.('#workout-session-logger')
      )
    )
  );
  if (relevant) requestAnimationFrame(scan);
});

observer.observe(document.body, { childList: true, subtree: true });
scan();
