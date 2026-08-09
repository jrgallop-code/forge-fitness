// Disabled.
// The Goals & Calories page already persists its authoritative values through
// nutrition-storage.js and nutrition-plan-ui-v4.js. This former compatibility
// shim could restore stale maintenance/rate values during the same click that
// saved a new value, causing the form to jump back to older settings.
export {};
