export * from "./fatsecret-live-cache.js?v=fatsecret-runtime-1";

const FOOD_SEARCH_ENDPOINT = "/v1/foods/search";
const DIAGNOSTIC_PREFIX = "FatSecret:";
const SHEET_ATTRIBUTION_STYLE_ID = "level-up-fatsecret-sheet-attribution-style";

function installRuntimeDiagnostics() {
    if (typeof window === "undefined" || typeof window.fetch !== "function" || window.__levelUpFatSecretRuntimeDiagnostics) return;
    const originalFetch = window.fetch.bind(window);
    window.__levelUpFatSecretRuntimeDiagnostics = true;
    hideFoodSheetAttribution();

    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        try {
            const input = args[0];
            const requestUrl = typeof input === "string" ? input : String(input?.url || "");
            if (requestUrl.includes(FOOD_SEARCH_ENDPOINT)) {
                response.clone().json().then(payload => {
                    window.__levelUpFatSecretLastStatus = safeStatus(payload?.fatSecret);
                    window.setTimeout(() => renderRuntimeStatus(payload?.fatSecret), 120);
                }).catch(() => {});
            }
        }
        catch {}
        return response;
    };
}

function hideFoodSheetAttribution() {
    if (typeof document === "undefined" || document.getElementById(SHEET_ATTRIBUTION_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = SHEET_ATTRIBUTION_STYLE_ID;
    style.textContent = ".food-sheet-card [data-fatsecret-attribution]{display:none!important}";
    (document.head || document.documentElement)?.appendChild(style);
}

function renderRuntimeStatus(status) {
    if (typeof document === "undefined") return;
    const target = document.querySelector("[data-food-search-status]");
    if (!target) return;

    const current = String(target.textContent || "")
        .replace(/\s*·\s*FatSecret:\s*.*$/i, "")
        .trim();
    target.textContent = `${current || "Search complete"} · ${formatStatus(status)}`;
    target.dataset.fatSecretRuntimeStatus = JSON.stringify(safeStatus(status));
}

export function formatStatus(status) {
    if (!status || typeof status !== "object") return `${DIAGNOSTIC_PREFIX} no runtime diagnostic`;
    if (!status.configured || status.error === "credentials_missing") {
        return `${DIAGNOSTIC_PREFIX} not connected — Cloudflare credentials missing`;
    }

    if (status.error) {
        const labels = {
            invalid_ip: "blocked by FatSecret IP restriction",
            missing_scope: "connected, but required API scope is missing",
            invalid_token: "OAuth token rejected",
            token_request_failed: "OAuth token request failed",
            timeout: "request timed out",
            request_failed: "API request failed",
            diagnostic_missing: "configured, but integration status was not returned"
        };
        return `${DIAGNOSTIC_PREFIX} ${labels[status.error] || "API request failed"}`;
    }

    const country = String(status.effectiveCountry || status.requestedCountry || "US").toUpperCase();
    const candidates = Math.max(0, Number(status.candidates) || 0);
    const usable = Math.max(0, Number(status.usableResults) || 0);
    const scopeLabel = Array.isArray(status.grantedScopes) && status.grantedScopes.length
        ? ` · scopes ${status.grantedScopes.join(", ")}`
        : "";
    const localizationLabel = status.canLocalize ? "localized" : "US/basic fallback";
    return `${DIAGNOSTIC_PREFIX} connected · ${country} ${localizationLabel} · ${candidates} candidates · ${usable} usable${scopeLabel}`;
}

export function safeStatus(status) {
    if (!status || typeof status !== "object") return null;
    return {
        configured: Boolean(status.configured),
        available: Boolean(status.available),
        error: status.error || null,
        scopeMode: status.scopeMode || null,
        grantedScopes: Array.isArray(status.grantedScopes) ? [...status.grantedScopes] : [],
        premier: Boolean(status.premier),
        localization: Boolean(status.localization),
        canLocalize: Boolean(status.canLocalize),
        canBarcode: Boolean(status.canBarcode),
        requestedCountry: status.requestedCountry || null,
        effectiveCountry: status.effectiveCountry || null,
        contributed: Boolean(status.contributed),
        candidates: Math.max(0, Number(status.candidates) || 0),
        usableResults: Math.max(0, Number(status.usableResults) || 0),
        directResults: Math.max(0, Number(status.directResults) || 0),
        enrichedResults: Math.max(0, Number(status.enrichedResults) || 0)
    };
}

if (typeof window !== "undefined") installRuntimeDiagnostics();
