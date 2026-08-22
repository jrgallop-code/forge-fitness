import {
    getBackupProviders
}
from "./backup-providers.js?v=backup-provider-1";

const MAX_BACKUP_SIZE = 100 * 1024 * 1024;
const INVALID_STORAGE_KEYS = new Set([
    "setItem",
    "level_up_cloud_session"
]);
const BACKUP_FORMAT_VERSION = 5;
const LEVEL_UP_INDEXED_DB_PREFIX = "level_up_";

export function initializeBackupManager() {
    cleanupInvalidStorageKeys();

    const exportButton = document.getElementById("export-backup-btn");
    const importButton = document.getElementById("import-backup-btn");
    const fileInput = document.getElementById("backup-file-input");

    exportButton?.addEventListener("click", exportBackup);
    importButton?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", event => importBackup(event.target.files?.[0], fileInput));

    renderBackupSummary();
}

function cleanupInvalidStorageKeys() {
    const straySetItem = localStorage.getItem("setItem");
    if (typeof straySetItem === "string" && straySetItem.includes("function")) {
        localStorage.removeItem("setItem");
    }
}

function getBackupKeys() {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && !INVALID_STORAGE_KEYS.has(key)) keys.push(key);
    }
    return keys.sort();
}

function setBackupMessage(message, type = "") {
    const element = document.getElementById("backup-message");
    if (!element) return;
    element.textContent = message;
    element.dataset.status = type;
}

function readStorageValue(key) {
    const stored = localStorage.getItem(key);
    if (stored === null) return null;
    try {
        return JSON.parse(stored);
    }
    catch {
        return stored;
    }
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function getBackupSummary(data) {
    const nutritionPlan = data.level_up_nutrition_plan || {};
    const calorieSnapshot = data.level_up_active_calorie_target_snapshot || {};
    const phases = asArray(data.level_up_nutrition_phases);
    const activePhase = [...phases].reverse().find(phase => !phase?.endDate) || null;

    const calculatedCalories = Number(nutritionPlan.calculatedCalories);
    const snapshotCalories = Number(calorieSnapshot.calories);
    const calories = Number.isFinite(calculatedCalories) && calculatedCalories > 0
        ? calculatedCalories
        : Number.isFinite(snapshotCalories) && snapshotCalories > 0
            ? snapshotCalories
            : null;

    return {
        savedSections: Object.keys(data).length,
        workoutPlans: asArray(data.forge_workout_plans).length,
        completedWorkouts: asArray(data.forge_workout_sessions).length,
        weightEntries: asArray(data.forge_weight_entries).length,
        measurementEntries: asArray(data.level_up_body_measurements).length,
        sleepEntries: asArray(data.level_up_sleep_entries).length,
        calorieTarget: calories,
        maintenanceCalories: Number(data.level_up_manual_maintenance_calories) || null,
        weeklyRate: Number.isFinite(Number(data.level_up_custom_weekly_rate))
            ? Number(data.level_up_custom_weekly_rate)
            : null,
        goalWeight: Number(data.level_up_goal_weight) || null,
        nutritionGoal: data.level_up_nutrition_goal?.goalId || null,
        activeNutritionPhase: activePhase?.type || null,
        nutritionPhaseCount: phases.length
    };
}

function formatSummary(summary) {
    const calorieText = Number.isFinite(summary.calorieTarget)
        ? `${summary.calorieTarget} kcal target`
        : "no calorie target";

    return `${summary.completedWorkouts} workouts · ${summary.weightEntries} weigh-ins · ${summary.measurementEntries} measurements · ${calorieText} · ${summary.nutritionPhaseCount} nutrition phase${summary.nutritionPhaseCount === 1 ? "" : "s"} · ${summary.savedSections || 0} saved sections`;
}

function renderBackupSummary() {
    const element = document.getElementById("backup-summary");
    if (!element) return;

    const data = {};
    getBackupKeys().forEach(key => {
        data[key] = readStorageValue(key);
    });

    const summary = getBackupSummary(data);
    element.textContent = `${formatSummary(summary)} · complete registered app storage is included automatically`;
}

function countProviderItems(value) {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    return value === null || value === undefined ? 0 : 1;
}

async function auditIndexedDbCoverage() {
    const registeredNames = new Set(
        getBackupProviders()
            .flatMap(provider => Array.isArray(provider.indexedDbNames) ? provider.indexedDbNames : [])
            .filter(Boolean)
    );

    if (typeof indexedDB === "undefined" || typeof indexedDB.databases !== "function") {
        return {
            supported: false,
            registered: [...registeredNames].sort(),
            discovered: []
        };
    }

    try {
        const databases = await indexedDB.databases();
        const discovered = databases
            .map(database => database?.name)
            .filter(name => typeof name === "string" && name.startsWith(LEVEL_UP_INDEXED_DB_PREFIX))
            .sort();
        const unregistered = discovered.filter(name => !registeredNames.has(name));

        if (unregistered.length) {
            throw new Error(
                `Complete backup stopped because new Level Up storage is not registered: ${unregistered.join(", ")}.`
            );
        }

        return {
            supported: true,
            registered: [...registeredNames].sort(),
            discovered
        };
    }
    catch (error) {
        if (String(error?.message || "").startsWith("Complete backup stopped because")) throw error;
        console.warn("IndexedDB backup coverage audit was unavailable:", error);
        return {
            supported: false,
            registered: [...registeredNames].sort(),
            discovered: []
        };
    }
}

async function exportProviderData() {
    const externalData = {};
    const coverage = [];

    for (const provider of getBackupProviders()) {
        try {
            const value = await provider.exportData();
            externalData[provider.id] = value;
            coverage.push({
                id: provider.id,
                label: provider.label,
                storage: provider.storage,
                included: true,
                itemCount: countProviderItems(value)
            });
        }
        catch (error) {
            console.error(`Backup provider ${provider.id} failed:`, error);
            throw new Error(`Complete backup stopped because ${provider.label} could not be exported.`);
        }
    }

    return { externalData, coverage };
}

export async function createBackupSnapshot() {
    const keys = getBackupKeys();
    const data = {};
    keys.forEach(key => {
        data[key] = readStorageValue(key);
    });

    const indexedDbAudit = await auditIndexedDbCoverage();
    const providerExport = await exportProviderData();

    return {
        app: "level-up",
        formatVersion: BACKUP_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        storageMode: "complete-local-storage-plus-providers",
        storageKeyCount: keys.length,
        coverage: {
            localStorage: {
                mode: "all-current-keys",
                keyCount: keys.length,
                keys
            },
            providers: providerExport.coverage,
            indexedDbAudit
        },
        summary: getBackupSummary(data),
        data,
        externalData: providerExport.externalData
    };
}

export function verifyBackupSnapshot(backup) {
    if (backup?.app !== "level-up" || !backup?.data || typeof backup.data !== "object" || Array.isArray(backup.data)) {
        throw new Error("Backup verification failed.");
    }

    const dataKeys = Object.keys(backup.data).filter(key => !INVALID_STORAGE_KEYS.has(key)).sort();
    const localCoverage = backup.coverage?.localStorage;
    const coveredKeys = Array.isArray(localCoverage?.keys) ? [...localCoverage.keys].sort() : [];
    if (
        localCoverage?.mode !== "all-current-keys" ||
        localCoverage?.keyCount !== dataKeys.length ||
        backup.storageKeyCount !== dataKeys.length ||
        JSON.stringify(coveredKeys) !== JSON.stringify(dataKeys)
    ) {
        throw new Error("Backup verification failed: local app data coverage is incomplete.");
    }

    const externalData = backup.externalData || {};
    const providerCoverage = Array.isArray(backup.coverage?.providers) ? backup.coverage.providers : [];
    getBackupProviders().forEach(provider => {
        const coverage = providerCoverage.find(item => item?.id === provider.id);
        if (!coverage?.included || !Object.prototype.hasOwnProperty.call(externalData, provider.id)) {
            throw new Error(`Backup verification failed: ${provider.label} is missing.`);
        }
    });
}

async function exportBackup() {
    try {
        setBackupMessage("Preparing and verifying complete backup…");
        const backup = await createBackupSnapshot();
        verifyBackupSnapshot(backup);

        const json = JSON.stringify(backup, null, 2);
        JSON.parse(json);

        const blob = new Blob([json], { type: "application/json" });
        const filename = `level-up-backup-${getLocalDateValue()}.json`;
        const file = typeof File === "function"
            ? new File([blob], filename, { type: "application/json" })
            : null;

        if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: "Level Up Backup" });
                setBackupMessage(`Complete backup verified: ${formatSummary(backup.summary)}.`, "success");
                renderBackupSummary();
                return;
            }
            catch (error) {
                if (error?.name === "AbortError") {
                    setBackupMessage("Backup prepared and verified. Export cancelled before saving.");
                    return;
                }
            }
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setBackupMessage(`Complete backup verified and exported: ${formatSummary(backup.summary)}.`, "success");
        renderBackupSummary();
    }
    catch (error) {
        console.error("Backup export failed:", error);
        setBackupMessage(error?.message || "The backup could not be exported.", "error");
    }
}

function getProviderPayload(backup, provider) {
    if (
        backup?.externalData &&
        typeof backup.externalData === "object" &&
        Object.prototype.hasOwnProperty.call(backup.externalData, provider.id)
    ) {
        return { found: true, value: backup.externalData[provider.id] };
    }

    if (
        provider.legacyRootKey &&
        Object.prototype.hasOwnProperty.call(backup || {}, provider.legacyRootKey)
    ) {
        return { found: true, value: backup[provider.legacyRootKey] };
    }

    return { found: false, value: undefined };
}

function hasAnyProviderPayload(backup) {
    return getBackupProviders().some(provider => getProviderPayload(backup, provider).found);
}

async function importProviderData(backup) {
    for (const provider of getBackupProviders()) {
        const payload = getProviderPayload(backup, provider);
        if (!payload.found) continue;

        try {
            await provider.importData(payload.value);
        }
        catch (error) {
            console.error(`Backup provider ${provider.id} restore failed:`, error);
            throw new Error(`${provider.label} could not be restored from this backup.`);
        }
    }
}

export async function restoreBackupSnapshot(backup, { removeNullValues = false } = {}) {
    if (backup?.app !== "level-up" || !backup?.data || typeof backup.data !== "object" || Array.isArray(backup.data)) {
        throw new Error("This is not a valid Level Up backup.");
    }

    Object.keys(backup.data)
        .filter(key => !INVALID_STORAGE_KEYS.has(key))
        .forEach(key => {
            const value = backup.data[key];
            if (value === null || value === undefined) {
                if (removeNullValues) localStorage.removeItem(key);
                return;
            }
            localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
        });

    cleanupInvalidStorageKeys();
    await importProviderData(backup);
}

async function importBackup(file, fileInput) {
    try {
        if (!file) return;
        if (file.size > MAX_BACKUP_SIZE) throw new Error("Backup file is too large.");

        setBackupMessage("Checking backup…");
        const backup = JSON.parse(await file.text());
        if (backup?.app !== "level-up" || !backup?.data || typeof backup.data !== "object" || Array.isArray(backup.data)) {
            throw new Error("This is not a valid Level Up backup.");
        }
        if (Number(backup.formatVersion) >= BACKUP_FORMAT_VERSION) verifyBackupSnapshot(backup);

        const incomingKeys = Object.keys(backup.data).filter(key => !INVALID_STORAGE_KEYS.has(key));
        if (!incomingKeys.length && !hasAnyProviderPayload(backup)) {
            throw new Error("This backup does not contain Level Up data.");
        }

        const incomingSummary = backup.summary || getBackupSummary(backup.data);
        const confirmed = window.confirm(
            `Import this Level Up backup?\n\n${formatSummary(incomingSummary)}\n\nExisting local data for included sections will be replaced.`
        );
        if (!confirmed) {
            setBackupMessage("Restore cancelled.");
            return;
        }

        await restoreBackupSnapshot(backup, { removeNullValues: true });

        window.alert("Backup imported successfully. Level Up will reload now.");
        window.location.reload();
    }
    catch (error) {
        console.error("Backup import failed:", error);
        setBackupMessage(error?.message || "The backup could not be imported.", "error");
        window.alert(error?.message || "The backup could not be imported.");
    }
    finally {
        if (fileInput) fileInput.value = "";
    }
}

function getLocalDateValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
