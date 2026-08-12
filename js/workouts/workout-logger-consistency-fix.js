const TIMER_SETTINGS_KEY = 'level_up_exercise_rest_settings';

function readSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(TIMER_SETTINGS_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  localStorage.setItem(TIMER_SETTINGS_KEY, JSON.stringify(settings));
}

function ensureHiddenRestSelect(logger) {
  let select = logger.querySelector('#rest-duration-select');
  if (!select) {
    select = document.createElement('select');
    select.id = 'rest-duration-select';
    select.hidden = true;
    select.innerHTML = '<option value="0">Off</option><option value="60">60</option><option value="90">90</option><option value="120">120</option><option value="180">180</option>';
    logger.appendChild(select);
  } else if (!select.querySelector('option[value="0"]')) {
    const option = document.createElement('option');
    option.value = '0';
    option.textContent = 'Off';
    select.prepend(option);
  }
  return select;
}

function applyTimerSetting(logger, exerciseId) {
  const setting = readSettings()[exerciseId] || { enabled: false, seconds: 120 };
  const select = ensureHiddenRestSelect(logger);
  select.value = setting.enabled ? String(setting.seconds || 120) : '0';
}

function ensureMenuShell(card, logger) {
  const heading = card.querySelector('h4');
  if (!heading) return null;

  let header = heading.closest('.compact-exercise-header');
  if (!header) {
    header = document.createElement('div');
    header.className = 'compact-exercise-header';
    heading.parentNode.insertBefore(header, heading);
    header.appendChild(heading);
  }

  let button = header.querySelector('.exercise-more-btn');
  let menu = header.querySelector('.exercise-options-popover');

  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'exercise-more-btn';
    button.setAttribute('aria-label', 'Exercise options and rest timer');
    button.textContent = '•••';
    header.appendChild(button);
  }

  if (!menu) {
    menu = document.createElement('div');
    menu.className = 'exercise-options-popover';
    menu.hidden = true;
    header.appendChild(menu);
  }

  if (button.dataset.menuToggleBound !== 'true') {
    button.dataset.menuToggleBound = 'true';
    button.addEventListener('click', event => {
      event.stopPropagation();
      logger.querySelectorAll('.exercise-options-popover').forEach(other => {
        if (other !== menu) other.hidden = true;
      });
      menu.hidden = !menu.hidden;
    });
  }

  return { button, menu };
}

function addTimerMenu(card, logger) {
  const exerciseIndex = Number(card.dataset.exerciseIndex);
  const exerciseId = card.dataset.exerciseId || `exercise-${exerciseIndex}`;
  const shell = ensureMenuShell(card, logger);
  if (!shell) return;

  const { menu } = shell;
  const current = readSettings()[exerciseId] || { enabled: false, seconds: 120 };

  if (!menu.querySelector('.exercise-option-row')) {
    menu.insertAdjacentHTML('afterbegin', `
      <div class="exercise-option-row">
        <span>Rest timer</span>
        <label class="compact-switch">
          <input type="checkbox" class="exercise-timer-enabled" ${current.enabled ? 'checked' : ''}>
          <span></span>
        </label>
      </div>
      <label class="exercise-duration-row">
        <span>Rest period</span>
        <select class="exercise-rest-duration" aria-label="Suggested rest period">
          <option value="60" ${current.seconds === 60 ? 'selected' : ''}>1:00</option>
          <option value="90" ${current.seconds === 90 ? 'selected' : ''}>1:30</option>
          <option value="120" ${current.seconds === 120 ? 'selected' : ''}>2:00</option>
          <option value="180" ${current.seconds === 180 ? 'selected' : ''}>3:00 (optimal for hypertrophy)</option>
        </select>
      </label>
    `);
  }

  const toggle = menu.querySelector('.exercise-timer-enabled');
  const duration = menu.querySelector('.exercise-rest-duration');
  const persist = () => {
    const settings = readSettings();
    settings[exerciseId] = {
      enabled: Boolean(toggle?.checked),
      seconds: Number(duration?.value) || 120
    };
    saveSettings(settings);
  };

  if (toggle && toggle.dataset.timerPersistBound !== 'true') {
    toggle.dataset.timerPersistBound = 'true';
    toggle.addEventListener('change', persist);
  }
  if (duration && duration.dataset.timerPersistBound !== 'true') {
    duration.dataset.timerPersistBound = 'true';
    duration.addEventListener('change', persist);
  }

  card.querySelectorAll('.complete-set-btn').forEach(complete => {
    if (complete.dataset.timerConsistencyBound === 'true') return;
    complete.dataset.timerConsistencyBound = 'true';
    complete.addEventListener('pointerdown', () => applyTimerSetting(logger, exerciseId), true);
  });
}

function enhanceAvailableCards() {
  const logger = document.getElementById('workout-session-logger');
  if (!logger) return;
  ensureHiddenRestSelect(logger);
  logger.querySelectorAll('.session-exercise-card[data-tracking-type="reps"]').forEach(card => addTimerMenu(card, logger));

  if (logger.dataset.timerConsistencyCloseBound !== 'true') {
    logger.dataset.timerConsistencyCloseBound = 'true';
    logger.addEventListener('click', event => {
      if (!event.target.closest('.exercise-more-btn, .exercise-options-popover')) {
        logger.querySelectorAll('.exercise-options-popover').forEach(menu => { menu.hidden = true; });
      }
    });
  }
}

const observer = new MutationObserver(mutations => {
  if (mutations.some(mutation => [...mutation.addedNodes].some(node =>
    node.nodeType === 1 && (
      node.id === 'workout-session-logger' ||
      node.matches?.('.session-exercise-card, .exercise-options-popover') ||
      node.querySelector?.('#workout-session-logger, .session-exercise-card, .exercise-options-popover')
    )
  ))) {
    setTimeout(enhanceAvailableCards, 0);
  }
});

observer.observe(document.body, { childList: true, subtree: true });
enhanceAvailableCards();
