(function installPwaStartupSafeguard() {
    const splash = document.getElementById("pwa-splash");
    const content = document.getElementById("content");
    if (!splash) return;

    let dismissed = false;

    function dismissSplash() {
        if (dismissed) return;
        dismissed = true;
        splash.style.opacity = "0";
        splash.style.visibility = "hidden";
        splash.style.pointerEvents = "none";
        splash.setAttribute("hidden", "");
        document.documentElement.classList.remove("level-up-installed-pwa");
    }

    function appHasRendered() {
        return Boolean(
            content?.children?.length ||
            document.querySelector("#level-up-login-gate, .levelup-onboarding, .bottom-nav")
        );
    }

    function recoveryMarkup() {
        return `<section class="pwa-startup-recovery" role="alert">
            <div class="pwa-startup-recovery-mark" aria-hidden="true">L</div>
            <span>LEVEL UP</span>
            <h1>Level Up did not finish loading</h1>
            <p>Your saved workouts and nutrition data will not be deleted. Try reloading first. If the screen returns, refresh the app’s cached files.</p>
            <button type="button" class="primary-btn" data-pwa-reload>Reload App</button>
            <button type="button" data-pwa-refresh-cache>Refresh Cached App Files</button>
            <small data-pwa-recovery-status aria-live="polite"></small>
        </section>`;
    }

    function showRecovery() {
        dismissSplash();
        if (!content || appHasRendered() || content.querySelector?.("[data-pwa-reload]")) return;
        content.innerHTML = recoveryMarkup();
    }

    async function refreshCachedFiles() {
        const status = document.querySelector("[data-pwa-recovery-status]");
        if (status) status.textContent = "Refreshing cached app files…";
        try {
            if (window.caches?.keys) {
                const cacheNames = await window.caches.keys();
                await Promise.all(cacheNames.filter(name => name.startsWith("level-up-")).map(name => window.caches.delete(name)));
            }
            if (navigator.serviceWorker?.getRegistrations) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(registration => registration.unregister()));
            }
        }
        finally {
            window.location.reload();
        }
    }

    splash.addEventListener("animationend", event => {
        if (event.target === splash) dismissSplash();
    });

    document.addEventListener("click", event => {
        if (event.target.closest?.("[data-pwa-reload]")) window.location.reload();
        if (event.target.closest?.("[data-pwa-refresh-cache]")) void refreshCachedFiles();
    });

    window.setTimeout(dismissSplash, 3200);
    window.setTimeout(showRecovery, 7000);
})();
