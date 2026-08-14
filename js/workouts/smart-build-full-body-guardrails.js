// Legacy 2–3 day guardrail entry point retained for cache/backward compatibility.
// All Smart Build generation and validation now runs through one authoritative engine.
// Superset region policy registers first so saved plans are sanitized after the engine's synchronous save.
import "./smart-build-superset-regions.js?v=smart-build-superset-regions-1";
import "./smart-build-unified-engine.js?v=smart-build-unified-1";
import "./smart-build-target-sync.js?v=smart-build-target-sync-1";
