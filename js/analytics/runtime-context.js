let cachedContext = null;
let contextPromise = null;

export function analyticsPlatform() {
    try {
        if (window.Capacitor?.getPlatform?.() === "ios" || window.Capacitor?.isNativePlatform?.()) return "ios";
    }
    catch {}
    return "pwa";
}

export async function analyticsRuntimeContext() {
    if (cachedContext) return { ...cachedContext };
    if (contextPromise) return contextPromise;
    contextPromise = resolveRuntimeContext();
    cachedContext = await contextPromise;
    return { ...cachedContext };
}

async function resolveRuntimeContext() {
    const context = { platform: analyticsPlatform() };
    if (context.platform !== "ios") return context;
    try {
        const info = await window.Capacitor?.Plugins?.App?.getInfo?.();
        if (info?.version) context.appVersion = String(info.version).slice(0, 32);
        if (info?.build) context.appBuild = String(info.build).slice(0, 32);
    }
    catch {}
    return context;
}
