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
