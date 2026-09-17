import { getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";
import {
    DEFAULT_EQUIPMENT_PROFILE,
    deleteEquipmentProfile,
    getEquipmentProfile,
    getEquipmentProfiles,
    getSavedGymSuggestions,
    rememberEquipmentProfile,
    saveEquipmentProfile,
    supportsEquipmentProfiles
} from "./equipment-profiles.js?v=machine-profile-sheet-1";
import { findNearbyGyms } from "./nearby-gym-service.js?v=machine-profile-sheet-1";

let activeSheet = null;


function scan(root = document) {
    const logger =
        root.id === "workout-session-logger"
            ? root
            : root.querySelector?.("#workout-session-logger") ||
                document.getElementById("workout-session-logger");
    if (!logger) return;

    logger
        .querySelectorAll('.session-exercise-card[data-tracking-type="reps"]')
        .forEach(card => addMachineButton(logger, card));
}


function addMachineButton(logger, card) {
    const exerciseId = card.dataset.exerciseId;
    const exercise = getExerciseById(exerciseId);
    if (!supportsEquipmentProfiles(exercise)) return;

    let button = card.querySelector(".logger-machine-profile-btn");
    if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "logger-form-guide-btn logger-machine-profile-btn";
        button.textContent = "Machine";
        button.addEventListener("click", () => openMachineSheet(logger, card));
    }

    const profile = getEquipmentProfile(
        exerciseId,
        card.dataset.equipmentProfileId || "default"
    );
    button.classList.toggle("has-machine-profile", profile.id !== "default");
    button.setAttribute(
        "aria-label",
        profile.id === "default"
            ? `Identify the machine used for ${exercise?.name || "this exercise"}`
            : `Machine: ${profile.name}. Tap to change.`
    );
    button.title = profile.name;

    const formButton = card.querySelector(".logger-form-guide-btn:not(.logger-machine-profile-btn)");
    const actions = card.querySelector(".compact-exercise-actions");
    if (formButton?.parentElement) {
        formButton.insertAdjacentElement("afterend", button);
    }
    else if (actions) {
        actions.prepend(button);
    }
}


function openMachineSheet(logger, card) {
    activeSheet?.remove();
    const exerciseId = card.dataset.exerciseId;
    const exerciseIndex = Number(card.dataset.exerciseIndex);
    const exercise = getExerciseById(exerciseId);
    const profiles = getEquipmentProfiles(exerciseId);
    const selectedId = card.dataset.equipmentProfileId || "default";
    let editingId = selectedId === "default" ? "" : selectedId;
    let gymCandidates = getSavedGymSuggestions();

    const sheet = document.createElement("section");
    sheet.className = "machine-profile-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "machine-profile-title");
    sheet.innerHTML = `
        <button class="machine-profile-backdrop" type="button" aria-label="Close machine profile"></button>
        <div class="machine-profile-panel">
            <div class="machine-profile-handle"></div>
            <header>
                <div>
                    <span class="eyebrow">EQUIPMENT PROFILE</span>
                    <h2 id="machine-profile-title">Which machine is this?</h2>
                    <p>${escapeHtml(exercise?.name || "Exercise")}</p>
                </div>
                <button class="machine-profile-close" type="button" aria-label="Close">×</button>
            </header>

            <div class="machine-profile-explanation">
                <strong>Why Level Up asks</strong>
                <p>Two machines can show the same weight but feel different because of pulley ratios, cable routing, friction and lever arms. Identifying the machine keeps your previous sets, estimated 1RM, PRs and progression suggestions comparable.</p>
            </div>

            ${profiles.length > 1 ? `
                <section class="machine-profile-saved">
                    <div class="machine-profile-section-heading"><strong>Saved for this exercise</strong><button data-new-machine type="button">+ New</button></div>
                    <div class="machine-profile-chips">
                        ${profiles.filter(profile => profile.id !== "default").map(profile => `
                            <button type="button" data-saved-profile="${escapeHtml(profile.id)}" aria-pressed="${profile.id === selectedId}">${escapeHtml(profile.name)}</button>
                        `).join("")}
                    </div>
                </section>
            ` : ""}

            <form class="machine-profile-form">
                <label class="machine-profile-field machine-profile-location-field">
                    <span>Which gym or location is it at? <small>Optional</small></span>
                    <div class="machine-profile-location-input">
                        <input name="gymName" type="text" maxlength="80" autocomplete="off" placeholder="Start typing, e.g. GoodLife">
                        <button data-nearby-gyms type="button">Use location</button>
                    </div>
                    <input name="gymAddress" type="text" maxlength="120" placeholder="Address (optional)">
                    <div class="machine-profile-gym-results" hidden></div>
                    <small class="machine-profile-location-status">Location is requested only if you tap “Use location.” Exact coordinates are not saved.</small>
                </label>

                <div class="machine-profile-two-column">
                    <label class="machine-profile-field">
                        <span>Who made it? <small>Optional</small></span>
                        <input name="brand" type="text" maxlength="50" list="machine-brand-options" placeholder="Life Fitness, Matrix…">
                    </label>
                    <label class="machine-profile-field">
                        <span>Model or product line? <small>Optional</small></span>
                        <input name="model" type="text" maxlength="60" placeholder="Insignia, Axiom…">
                    </label>
                </div>

                <label class="machine-profile-field">
                    <span>Where in the gym is it? <small>Optional</small></span>
                    <input name="area" type="text" maxlength="80" placeholder="Upstairs cable area, back wall…">
                </label>

                <label class="machine-profile-field">
                    <span>What is it near? <small>Optional</small></span>
                    <input name="landmark" type="text" maxlength="100" placeholder="Next to the squat racks">
                </label>

                <label class="machine-profile-field">
                    <span>How can you recognize this specific machine? <small>Optional</small></span>
                    <input name="identifier" type="text" maxlength="100" placeholder="Left cable tower, black handles, #2…">
                </label>

                <label class="machine-profile-field">
                    <span>Any setup details to remember? <small>Optional</small></span>
                    <textarea name="setupNotes" maxlength="240" placeholder="Seat 4, pulley at shoulder height, attachment used…"></textarea>
                </label>

                <label class="machine-profile-field">
                    <span>Short label <small>Optional</small></span>
                    <input name="label" type="text" maxlength="50" placeholder="Automatically created if blank">
                </label>

                <datalist id="machine-brand-options">
                    <option value="Life Fitness"><option value="Matrix"><option value="Technogym"><option value="Precor"><option value="Hammer Strength"><option value="Nautilus"><option value="Cybex"><option value="Inspire"><option value="Hoist">
                </datalist>

                <p class="machine-profile-message" aria-live="polite"></p>
                <div class="machine-profile-actions">
                    <button class="secondary-btn" data-default-machine type="button">Use default</button>
                    <button class="primary-btn" type="submit">Save machine</button>
                </div>
                <button class="machine-profile-delete" data-delete-machine type="button" ${editingId ? "" : "hidden"}>Delete this machine profile</button>
            </form>
        </div>`;

    document.body.appendChild(sheet);
    activeSheet = sheet;
    document.body.classList.add("machine-profile-open");

    const form = sheet.querySelector(".machine-profile-form");
    const results = sheet.querySelector(".machine-profile-gym-results");
    const gymInput = form.elements.gymName;
    const addressInput = form.elements.gymAddress;
    const status = sheet.querySelector(".machine-profile-location-status");

    const close = () => {
        sheet.remove();
        if (activeSheet === sheet) activeSheet = null;
        document.body.classList.remove("machine-profile-open");
    };

    const fillProfile = profile => {
        editingId = profile?.id === "default" ? "" : profile?.id || "";
        ["gymName", "gymAddress", "brand", "model", "area", "landmark", "identifier", "setupNotes", "label"].forEach(name => {
            form.elements[name].value = profile?.[name] || "";
        });
        sheet.querySelector("[data-delete-machine]").hidden = !editingId;
        sheet.querySelectorAll("[data-saved-profile]").forEach(button =>
            button.setAttribute("aria-pressed", String(button.dataset.savedProfile === editingId))
        );
    };

    const selectProfile = profile => {
        rememberEquipmentProfile(exerciseId, profile.id);
        logger.dispatchEvent(new CustomEvent("levelup:equipment-profile-selected", {
            detail: { exerciseIndex, profile }
        }));
        close();
    };

    const renderGymResults = () => {
        const query = gymInput.value.trim().toLowerCase();
        const matches = gymCandidates
            .filter(gym => !query || `${gym.name} ${gym.address}`.toLowerCase().includes(query))
            .slice(0, 8);
        results.hidden = !matches.length || query.length < 2;
        results.innerHTML = matches.map((gym, index) => `
            <button type="button" data-gym-index="${index}">
                <span><strong>${escapeHtml(gym.name)}</strong><small>${escapeHtml(gym.address || (gym.source === "saved" ? "Previously saved" : "Nearby gym"))}</small></span>
                ${Number.isFinite(gym.distanceKm) ? `<b>${gym.distanceKm.toFixed(1)} km</b>` : ""}
            </button>
        `).join("");
        results.querySelectorAll("[data-gym-index]").forEach(button => {
            button.addEventListener("click", () => {
                const gym = matches[Number(button.dataset.gymIndex)];
                gymInput.value = gym.name;
                addressInput.value = gym.address || "";
                results.hidden = true;
            });
        });
    };

    fillProfile(getEquipmentProfile(exerciseId, selectedId));
    gymInput.addEventListener("input", renderGymResults);
    sheet.querySelector("[data-nearby-gyms]").addEventListener("click", async event => {
        const button = event.currentTarget;
        button.disabled = true;
        status.textContent = "Finding gyms near you…";
        try {
            const nearby = await findNearbyGyms();
            const combined = new Map();
            [...getSavedGymSuggestions(), ...nearby].forEach(gym =>
                combined.set(`${gym.name}|${gym.address}`.toLowerCase(), gym)
            );
            gymCandidates = [...combined.values()];
            status.textContent = nearby.length
                ? `${nearby.length} nearby gyms found. Start typing a name to narrow the list.`
                : "No named gyms were found nearby. You can enter the location manually.";
            if (!gymInput.value) gymInput.value = " ";
            gymInput.value = gymInput.value.trim();
            renderGymResults();
            gymInput.focus();
        }
        catch (error) {
            status.textContent = error?.message || "Nearby gyms could not be loaded. You can enter the location manually.";
        }
        finally {
            button.disabled = false;
        }
    });

    sheet.querySelectorAll("[data-saved-profile]").forEach(button => {
        button.addEventListener("click", () =>
            fillProfile(getEquipmentProfile(exerciseId, button.dataset.savedProfile))
        );
    });
    sheet.querySelector("[data-new-machine]")?.addEventListener("click", () => fillProfile(null));
    sheet.querySelector("[data-default-machine]").addEventListener("click", () =>
        selectProfile(rememberEquipmentProfile(exerciseId, DEFAULT_EQUIPMENT_PROFILE.id))
    );
    sheet.querySelector("[data-delete-machine]").addEventListener("click", () => {
        if (!editingId) return;
        if (!window.confirm("Delete this saved machine profile? Logged workouts will keep their existing machine label.")) return;
        deleteEquipmentProfile(exerciseId, editingId);
        selectProfile(DEFAULT_EQUIPMENT_PROFILE);
    });
    form.addEventListener("submit", event => {
        event.preventDefault();
        const profile = saveEquipmentProfile(exerciseId, {
            id: editingId,
            gymName: form.elements.gymName.value,
            gymAddress: form.elements.gymAddress.value,
            brand: form.elements.brand.value,
            model: form.elements.model.value,
            area: form.elements.area.value,
            landmark: form.elements.landmark.value,
            identifier: form.elements.identifier.value,
            setupNotes: form.elements.setupNotes.value,
            label: form.elements.label.value
        });
        selectProfile(profile);
    });
    sheet.querySelector(".machine-profile-backdrop").addEventListener("click", close);
    sheet.querySelector(".machine-profile-close").addEventListener("click", close);
    window.setTimeout(() => gymInput.focus(), 60);
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => mutation.addedNodes.length)) {
        window.requestAnimationFrame(() => scan());
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

scan();
