export const EQUIPMENT_PROFILE_STORAGE_KEY =
    "forge_equipment_profiles";

export const DEFAULT_EQUIPMENT_PROFILE = {
    id: "default",
    name: "Default machine"
};


export function supportsEquipmentProfiles(exercise) {

    const equipment =
        String(exercise?.equipment || "")
            .toLowerCase();

    return equipment.includes("cable") ||
        equipment.includes("machine");

}


export function getEquipmentProfiles(exerciseId) {

    const stored = readProfiles();
    const profiles =
        Array.isArray(stored[exerciseId]?.profiles)
            ? stored[exerciseId].profiles
            : [];

    return [
        DEFAULT_EQUIPMENT_PROFILE,
        ...profiles.filter(profile =>
            profile?.id &&
            profile.id !== DEFAULT_EQUIPMENT_PROFILE.id &&
            profile?.name
        )
    ];

}


export function getLastEquipmentProfile(exerciseId) {

    const stored = readProfiles();
    const profileId =
        stored[exerciseId]?.lastUsedId ||
        DEFAULT_EQUIPMENT_PROFILE.id;
    const profile =
        getEquipmentProfiles(exerciseId)
            .find(item => item.id === profileId);

    return profile || DEFAULT_EQUIPMENT_PROFILE;

}


export function rememberEquipmentProfile(exerciseId, profileId) {

    const stored = readProfiles();
    const profiles = getEquipmentProfiles(exerciseId);
    const profile =
        profiles.find(item => item.id === profileId) ||
        DEFAULT_EQUIPMENT_PROFILE;

    stored[exerciseId] = {
        profiles:
            profiles.filter(item =>
                item.id !== DEFAULT_EQUIPMENT_PROFILE.id
            ),
        lastUsedId:
            profile.id
    };

    writeProfiles(stored);
    return profile;

}


export function addEquipmentProfile(exerciseId, name) {

    const cleanName =
        String(name || "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 60);

    if (!cleanName) {
        return null;
    }

    const stored = readProfiles();
    const profiles = getEquipmentProfiles(exerciseId);
    const existing =
        profiles.find(profile =>
            profile.name.toLowerCase() ===
            cleanName.toLowerCase()
        );

    if (existing) {
        rememberEquipmentProfile(exerciseId, existing.id);
        return existing;
    }

    const profile = {
        id:
            `machine-${Date.now().toString(36)}-${Math.random()
                .toString(36)
                .slice(2, 7)}`,
        name:
            cleanName
    };

    stored[exerciseId] = {
        profiles: [
            ...profiles.filter(item =>
                item.id !== DEFAULT_EQUIPMENT_PROFILE.id
            ),
            profile
        ],
        lastUsedId:
            profile.id
    };

    writeProfiles(stored);
    return profile;

}


export function saveEquipmentProfile(exerciseId, details = {}) {

    const stored = readProfiles();
    const profiles = getEquipmentProfiles(exerciseId);
    const clean = sanitizeDetails(details);
    const existing =
        clean.id && clean.id !== DEFAULT_EQUIPMENT_PROFILE.id
            ? profiles.find(profile => profile.id === clean.id)
            : null;
    const profile = {
        ...(existing || {}),
        ...clean,
        id:
            existing?.id ||
            `machine-${Date.now().toString(36)}-${Math.random()
                .toString(36)
                .slice(2, 7)}`
    };

    profile.name = buildEquipmentProfileName(profile);

    const customProfiles =
        profiles
            .filter(item => item.id !== DEFAULT_EQUIPMENT_PROFILE.id)
            .filter(item => item.id !== profile.id);

    stored[exerciseId] = {
        profiles: [...customProfiles, profile],
        lastUsedId: profile.id
    };

    writeProfiles(stored);
    return profile;

}


export function getEquipmentProfile(exerciseId, profileId) {
    return getEquipmentProfiles(exerciseId)
        .find(profile => profile.id === profileId) ||
        DEFAULT_EQUIPMENT_PROFILE;
}


export function deleteEquipmentProfile(exerciseId, profileId) {
    if (!profileId || profileId === DEFAULT_EQUIPMENT_PROFILE.id) return false;
    const stored = readProfiles();
    const remaining = getEquipmentProfiles(exerciseId)
        .filter(profile => profile.id !== DEFAULT_EQUIPMENT_PROFILE.id && profile.id !== profileId);
    stored[exerciseId] = {
        profiles: remaining,
        lastUsedId: DEFAULT_EQUIPMENT_PROFILE.id
    };
    writeProfiles(stored);
    return true;
}


export function getSavedGymSuggestions() {
    const stored = readProfiles();
    const gyms = new Map();
    Object.values(stored).forEach(entry =>
        (entry?.profiles || []).forEach(profile => {
            const gymName = String(profile?.gymName || "").trim();
            if (!gymName) return;
            const key = `${gymName}|${profile?.gymAddress || ""}`.toLowerCase();
            gyms.set(key, {
                name: gymName,
                address: String(profile?.gymAddress || "").trim(),
                source: "saved"
            });
        })
    );
    return [...gyms.values()];
}


export function buildEquipmentProfileName(profile = {}) {
    const explicit = cleanText(profile.label, 50);
    if (explicit) return explicit;
    const gym = cleanText(profile.gymName, 50);
    const detail = cleanText(profile.brand, 40) ||
        cleanText(profile.area, 50) ||
        cleanText(profile.identifier, 50) ||
        "Machine";
    return gym ? `${gym} · ${detail}` : detail;
}


export function getExerciseEquipmentProfile(exercise) {

    return {
        id:
            exercise?.equipmentProfileId ||
            DEFAULT_EQUIPMENT_PROFILE.id,
        name:
            exercise?.equipmentProfileName ||
            DEFAULT_EQUIPMENT_PROFILE.name
    };

}


function readProfiles() {

    try {
        const parsed =
            JSON.parse(
                localStorage.getItem(
                    EQUIPMENT_PROFILE_STORAGE_KEY
                ) ||
                "{}"
            );

        return parsed && typeof parsed === "object"
            ? parsed
            : {};
    }
    catch {
        return {};
    }

}


function writeProfiles(profiles) {

    localStorage.setItem(
        EQUIPMENT_PROFILE_STORAGE_KEY,
        JSON.stringify(profiles)
    );

}


function sanitizeDetails(details) {
    return {
        id: cleanText(details.id, 90),
        label: cleanText(details.label, 50),
        gymName: cleanText(details.gymName, 80),
        gymAddress: cleanText(details.gymAddress, 120),
        brand: cleanText(details.brand, 50),
        model: cleanText(details.model, 60),
        area: cleanText(details.area, 80),
        landmark: cleanText(details.landmark, 100),
        identifier: cleanText(details.identifier, 100),
        setupNotes: cleanText(details.setupNotes, 240)
    };
}


function cleanText(value, maximumLength) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, maximumLength);
}
