(function installPwaStartupSafeguard() {
    const splash = document.getElementById("pwa-splash");
    const content = document.getElementById("content");
    if (!splash) return;

    let dismissed = false;

    installCloudBackupRecovery();
    installSystemRecoveryNotice();
    installBodyComposition();
    installBodyFatApprovedVisual();
    installBodyCompositionHealthRecords();
    installProteinMinimumConsistency();
    installNutritionPhaseTargetStability();
    installNutritionAuthoritySync();
    installNutritionModeUI();
    installNutritionModeControls();
    installWeeklyCheckInStatus();
    installMuscleMapColors();
    installMuscleMapRenderingFix();
    installInteractiveWorkoutTutorial();
    installWorkoutTutorialPrompt();
    installInteractiveTutorialVisualFix();

    function installCloudBackupRecovery() {
        if (!document.querySelector('script[data-cloud-backup-history-ui]')) {
            const script = document.createElement("script");
            script.type = "module";
            script.src = "js/account/cloud-backup-history-ui.js?v=backup-history-ui-1";
            script.dataset.cloudBackupHistoryUi = "1";
            document.head.appendChild(script);
        }
        const syncRestoreButton = () => {
            const button = document.getElementById("account-cloud-download");
            if (!button || button.dataset.backupHistoryLabel === "1") return;
            button.textContent = "↶ Restore Backup";
            button.dataset.backupHistoryLabel = "1";
            button.setAttribute("aria-label", "View saved cloud backups and restore a version");
        };
        syncRestoreButton();
        const observer = new MutationObserver(syncRestoreButton);
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    function installSystemRecoveryNotice() {
        if (document.querySelector('script[data-system-recovery-notice]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/core/system-recovery-notice.js?v=system-recovery-notice-1";
        script.dataset.systemRecoveryNotice = "1";
        document.head.appendChild(script);
    }

    function installBodyComposition() {
        if (document.querySelector('script[data-body-composition-ui]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/progress/body-composition-ui.js?v=body-composition-ui-1";
        script.dataset.bodyCompositionUi = "1";
        document.head.appendChild(script);
    }

    function installBodyFatApprovedVisual() {
        if (document.querySelector('script[data-body-fat-approved-visual]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/progress/body-fat-visual-replacement.js?v=approved-body-fat-1";
        script.dataset.bodyFatApprovedVisual = "1";
        document.head.appendChild(script);
    }

    function installBodyCompositionHealthRecords() {
        if (document.querySelector('script[data-body-composition-health-records]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/more/body-composition-health-records.js?v=body-comp-health-records-2";
        script.dataset.bodyCompositionHealthRecords = "1";
        document.head.appendChild(script);
    }

    function installProteinMinimumConsistency() {
        if (document.querySelector('script[data-protein-minimum-consistency]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/nutrition/protein-minimum-consistency.js?v=protein-minimum-2";
        script.dataset.proteinMinimumConsistency = "1";
        document.head.appendChild(script);
    }

    function installNutritionPhaseTargetStability() {
        if (document.querySelector('script[data-nutrition-phase-target-stability]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/nutrition/nutrition-phase-target-stability.js?v=phase-target-stability-3";
        script.dataset.nutritionPhaseTargetStability = "1";
        document.head.appendChild(script);
    }

    function installNutritionAuthoritySync() {
        if (document.querySelector('script[data-nutrition-authority-sync]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/nutrition/nutrition-authority-sync.js?v=nutrition-authority-sync-2";
        script.dataset.nutritionAuthoritySync = "1";
        document.head.appendChild(script);
    }

    function installNutritionModeUI() {
        if (document.querySelector('script[data-nutrition-mode-ui]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/nutrition/nutrition-mode-ui.js?v=nutrition-mode-ui-1";
        script.dataset.nutritionModeUi = "1";
        document.head.appendChild(script);
    }

    function installNutritionModeControls() {
        if (document.querySelector('script[data-nutrition-mode-controls]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/nutrition/nutrition-mode-controls.js?v=nutrition-mode-controls-1";
        script.dataset.nutritionModeControls = "1";
        document.head.appendChild(script);
    }

    function installWeeklyCheckInStatus() {
        if (document.querySelector('script[data-weekly-checkin-status]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/nutrition/weekly-check-in-status.js?v=weekly-checkin-status-1";
        script.dataset.weeklyCheckinStatus = "1";
        document.head.appendChild(script);
    }

    function installMuscleMapColors() {
        if (document.querySelector('script[data-muscle-map-colors]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/core/muscle-map-colors.js?v=muscle-map-colors-3";
        script.dataset.muscleMapColors = "1";
        document.head.appendChild(script);
    }

    function installMuscleMapRenderingFix() {
        if (document.querySelector('script[data-muscle-map-rendering-fix]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/core/muscle-map-rendering-fix.js?v=muscle-map-rendering-fix-3";
        script.dataset.muscleMapRenderingFix = "1";
        document.head.appendChild(script);
    }

    function installInteractiveWorkoutTutorial() {
        if (document.querySelector('script[data-interactive-workout-tutorial]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/more/interactive-workout-tutorial-v5.js?v=interactive-workout-v5-1";
        script.dataset.interactiveWorkoutTutorial = "1";
        document.head.appendChild(script);
    }

    function installWorkoutTutorialPrompt() {
        if (document.querySelector('script[data-workout-tutorial-prompt]')) return;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "js/dashboard/workout-tutorial-prompt.js?v=workout-tutorial-prompt-2";
        script.dataset.workoutTutorialPrompt = "1";
        document.head.appendChild(script);
    }

    function installInteractiveTutorialVisualFix() {
        if (document.getElementById("interactive-workout-tutorial-visual-fix")) return;
        const style = document.createElement("style");
        style.id = "interactive-workout-tutorial-visual-fix";
        style.textContent = `
            .interactive-workout-tutorial-section svg,
            #interactive-workout-tutorial-card svg{display:none!important}
            .interactive-workout-tutorial-section::before,
            .interactive-workout-tutorial-section::after,
            #interactive-workout-tutorial-card::before,
            #interactive-workout-tutorial-card::after,
            #interactive-workout-tutorial-card>*::before,
            #interactive-workout-tutorial-card>*::after{content:none!important;display:none!important;background:none!important;background-image:none!important;mask:none!important;-webkit-mask:none!important}
            .interactive-tutorial-focus{
                box-shadow:0 4px 14px rgba(0,0,0,.24)!important;
            }
            /* The Nutrition Goals lesson used a concentric target/bullseye icon.
               Remove it entirely so the Tutorials page and tutorial handoff never
               show that bullseye, even for a single frame. */
            .learn-lesson-row[data-lesson-id="nutrition-goals"] .learn-lesson-icon{
                display:none!important;
            }
            .learn-lesson-row[data-lesson-id="nutrition-goals"]{
                grid-template-columns:minmax(0,1fr) auto!important;
            }
        `;
        document.head.appendChild(style);
    }

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
                await Promise.all(cacheNames.filter(name => name.startsWith("level-up-")).map(name => caches.delete(name)));
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