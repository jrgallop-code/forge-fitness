export function renderHealthWorkouts() {
    return `<section class="home-widget-page">
        <button class="nutrition-planner-back" type="button" data-health-back>← More</button>
        <h2>Garmin &amp; Apple Health</h2>
        <p>View workouts shared with Apple Health on this iPhone, including activities recorded on your Garmin Forerunner.</p>
        <ol>
            <li>In Garmin Connect, go to <b>More → Settings → Connect Apps → Apple Health</b> and allow Garmin Connect to share <b>Workouts</b>.</li>
            <li>Keep Garmin Connect open while you sync your watch.</li>
            <li>Tap <b>Allow Workout Access</b> below and allow Level Up to read workouts.</li>
        </ol>
        <p>Recent workouts are shown here with their source. Level Up reads them on this device and keeps them separate from your training log.</p>
        <button class="primary-btn" type="button" data-health-access>Allow Workout Access</button>
        <button class="nutrition-planner-back" type="button" data-health-refresh>Refresh Workouts</button>
        <h3>Recent workouts</h3>
        <p data-health-status role="status"></p>
        <ul data-health-workouts></ul>
    </section>`;
}

export function initializeHealthWorkouts({ onBack }) {
    document.querySelector("[data-health-back]").addEventListener("click", onBack);
    const access = document.querySelector("[data-health-access]");
    const refresh = document.querySelector("[data-health-refresh]");
    const status = document.querySelector("[data-health-status]");
    const list = document.querySelector("[data-health-workouts]");
    const health = window.Capacitor?.Plugins?.LevelUpHealth;
    if (!health?.recentWorkouts) {
        access.hidden = refresh.hidden = true;
        status.textContent = "Apple Health workout access requires an updated Level Up iPhone build.";
        return;
    }

    const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
    async function loadWorkouts(requestAccess = false) {
        access.disabled = refresh.disabled = true;
        list.replaceChildren();
        status.textContent = "Checking Apple Health…";
        try {
            if (requestAccess) await health.requestAccess();
            const { workouts } = await health.recentWorkouts();
            for (const workout of workouts) {
                const row = document.createElement("li");
                const minutes = Math.round(workout.durationSeconds / 60);
                row.textContent = `${workout.activity} · ${dateFormat.format(workout.startedAt)} · ${minutes} min · ${workout.source}`;
                list.appendChild(row);
            }
            status.textContent = workouts.length
                ? `Showing ${workouts.length} from the past 14 days.`
                : "No recent workouts are available. Check workout permissions for Connect and Level Up in Apple Health, then sync your watch and refresh.";
        } catch (error) {
            status.textContent = error?.message || "Apple Health is unavailable right now. Try again in a moment.";
        } finally {
            access.disabled = refresh.disabled = false;
        }
    }

    access.addEventListener("click", () => loadWorkouts(true));
    refresh.addEventListener("click", () => loadWorkouts());
    loadWorkouts();
}
