const STYLE_ID = "level-up-analytics-chart-zoom-styles";
const MAX_ZOOM = 30;
const MIN_ZOOM = 1;
const instances = new WeakMap();
let attachQueued = false;

const RANGE_DAYS = {
    "1w": 7,
    "7d": 7,
    "1m": 30,
    "4w": 28,
    "3m": 90,
    "12w": 84,
    "6m": 180,
    "1y": 365,
    "365d": 365
};

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .analytics-zoom-host{position:relative;min-width:0}
        .analytics-zoom-stage{position:relative;overflow:hidden;border-radius:inherit;touch-action:pan-y}
        .analytics-zoom-stage>canvas{display:block;width:100%}
        .analytics-zoom-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
        .analytics-zoom-controls{display:flex;align-items:center;gap:6px;margin:8px 0 2px;padding:5px 6px;border:1px solid var(--line,rgba(255,255,255,.10));border-radius:12px;background:var(--surface-raised,rgba(255,255,255,.035));color:var(--text,#f4f4f6)}
        .analytics-zoom-controls button{display:grid;place-items:center;min-width:34px;height:32px;margin:0;padding:0 9px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:9px;background:var(--surface,rgba(255,255,255,.04));color:var(--text,#f4f4f6);font:inherit;font-size:16px;font-weight:800;line-height:1;touch-action:manipulation}
        .analytics-zoom-controls button:disabled{opacity:.35}
        .analytics-zoom-status{min-width:0;flex:1;display:grid;gap:1px;text-align:center}
        .analytics-zoom-status strong{overflow:hidden;color:var(--text,#f4f4f6);font-size:10px;font-weight:850;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}
        .analytics-zoom-status small{color:var(--muted,#8f8f98);font-size:9px;line-height:1.2}
        .analytics-zoom-reset{font-size:10px!important;min-width:48px!important}
        .analytics-zoom-hint{margin:5px 2px 0;color:var(--muted,#8f8f98);font-size:9px;line-height:1.35;text-align:center}
        .analytics-zoom-stage.is-zoomed{cursor:grab}
        .analytics-zoom-stage.is-dragging{cursor:grabbing}
        @media(max-width:390px){.analytics-zoom-controls{gap:4px}.analytics-zoom-controls button{min-width:31px;height:30px}.analytics-zoom-reset{min-width:44px!important}}
    `;
    document.head.appendChild(style);
}

function localDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return localDateString(date);
}

function daysBetween(start, end) {
    const a = new Date(`${start}T12:00:00`).getTime();
    const b = new Date(`${end}T12:00:00`).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function formatDate(value, includeYear = false) {
    if (!value) return "";
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(includeYear ? { year: "numeric" } : {})
    });
}

function phaseStartDate() {
    try {
        const phases = JSON.parse(localStorage.getItem("level_up_nutrition_phases") || "[]");
        const active = Array.isArray(phases) ? [...phases].reverse().find(phase => phase?.startDate && !phase?.endDate) : null;
        return active?.startDate || null;
    } catch {
        return null;
    }
}

function earliestWeightDate() {
    try {
        const entries = JSON.parse(localStorage.getItem("forge_weight_entries") || "[]");
        const dates = (Array.isArray(entries) ? entries : []).map(entry => String(entry?.date || "")).filter(Boolean).sort();
        return dates[0] || null;
    } catch {
        return null;
    }
}

function selectedRange(canvas) {
    const root = canvas.closest(".weight-chart-card, .calorie-stats-page, .expenditure-chart-card, .tdee-expenditure-card") || canvas.parentElement?.parentElement || document;
    const selectors = canvas.id === "weight-trend-chart"
        ? ["[data-weight-chart-range][aria-pressed='true']"]
        : ["[data-tdee-chart-range][aria-pressed='true']", "[data-calorie-stats-range][aria-pressed='true']"];
    for (const selector of selectors) {
        const button = root?.querySelector?.(selector) || document.querySelector(selector);
        if (button) return String(button.dataset.weightChartRange || button.dataset.tdeeChartRange || button.dataset.calorieStatsRange || "").toLowerCase();
    }
    return canvas.id === "weight-trend-chart" ? String(localStorage.getItem("level_up_weight_chart_range") || "3m").toLowerCase() : "1m";
}

function domainForCanvas(canvas) {
    const range = selectedRange(canvas);
    const today = localDateString();
    if (range === "phase") {
        const start = phaseStartDate();
        if (start) return { start, end: today };
    }
    if (range === "all" && canvas.id === "weight-trend-chart") {
        const start = earliestWeightDate();
        if (start) return { start, end: today };
    }
    const days = RANGE_DAYS[range] || 30;
    return { start: shiftDate(today, -(days - 1)), end: today };
}

function chartInsets(canvas) {
    if (canvas.id === "weight-trend-chart") return { left: 50, right: 18 };
    if (canvas.matches("[data-expenditure-chart]")) return { left: 8, right: 46 };
    return { left: 42, right: 18 };
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function visibleRange(instance) {
    const domain = domainForCanvas(instance.canvas);
    const totalDays = daysBetween(domain.start, domain.end);
    const visibleDays = Math.max(1, Math.min(totalDays, Math.ceil(totalDays / instance.zoom)));
    const maxStartOffset = Math.max(0, totalDays - visibleDays);
    const startOffset = Math.round(maxStartOffset * instance.position);
    const start = shiftDate(domain.start, startOffset);
    const end = shiftDate(start, visibleDays - 1);
    return { start, end, totalDays, visibleDays };
}

function updateStatus(instance) {
    const range = visibleRange(instance);
    const sameYear = range.start.slice(0, 4) === range.end.slice(0, 4);
    instance.statusStrong.textContent = instance.zoom <= 1.001
        ? "Full range"
        : `${formatDate(range.start, !sameYear)} – ${formatDate(range.end, true)}`;
    instance.statusSmall.textContent = instance.zoom <= 1.001
        ? "Pinch or use + to inspect a smaller window"
        : `${instance.zoom.toFixed(instance.zoom < 10 ? 1 : 0)}× · ${range.visibleDays} ${range.visibleDays === 1 ? "day" : "days"}`;
    instance.minus.disabled = instance.zoom <= MIN_ZOOM + .001;
    instance.reset.disabled = instance.zoom <= MIN_ZOOM + .001;
}

function renderOverlay(instance) {
    const { canvas, overlay } = instance;
    if (!canvas.isConnected) return;
    if (instance.zoom <= 1.001) {
        overlay.hidden = true;
        canvas.style.opacity = "";
        instance.stage.classList.remove("is-zoomed");
        updateStatus(instance);
        return;
    }

    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (!cssWidth || !cssHeight || !canvas.width || !canvas.height) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    overlay.width = Math.round(cssWidth * dpr);
    overlay.height = Math.round(cssHeight * dpr);
    overlay.style.width = `${cssWidth}px`;
    overlay.style.height = `${cssHeight}px`;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const sourceScaleX = canvas.width / cssWidth;
    const sourceScaleY = canvas.height / cssHeight;
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, cssWidth, cssHeight);

    const inset = chartInsets(canvas);
    const plotWidth = Math.max(1, cssWidth - inset.left - inset.right);
    const cropWidth = plotWidth / instance.zoom;
    const travel = Math.max(0, plotWidth - cropWidth);
    const cropX = inset.left + travel * instance.position;
    ctx.drawImage(
        canvas,
        cropX * sourceScaleX,
        0,
        cropWidth * sourceScaleX,
        cssHeight * sourceScaleY,
        inset.left,
        0,
        plotWidth,
        cssHeight
    );

    overlay.hidden = false;
    canvas.style.opacity = "0";
    instance.stage.classList.add("is-zoomed");
    updateStatus(instance);
}

function setZoom(instance, nextZoom, anchor = .5) {
    const previous = instance.zoom;
    const next = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(next - previous) < .001) return;
    if (previous > 1 && next > 1) {
        const previousVisible = 1 / previous;
        const nextVisible = 1 / next;
        const previousStart = (1 - previousVisible) * instance.position;
        const anchorPoint = previousStart + previousVisible * anchor;
        const nextStart = anchorPoint - nextVisible * anchor;
        instance.position = clamp(nextStart / Math.max(.0001, 1 - nextVisible), 0, 1);
    }
    instance.zoom = next;
    if (next <= 1.001) instance.position = .5;
    renderOverlay(instance);
}

function reset(instance) {
    instance.zoom = 1;
    instance.position = .5;
    renderOverlay(instance);
}

function bindGestures(instance) {
    const pointers = new Map();
    let dragStart = null;
    let pinchStart = null;
    let lastTap = 0;

    instance.stage.addEventListener("pointerdown", event => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 2) {
            const values = [...pointers.values()];
            pinchStart = {
                distance: Math.max(1, Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y)),
                zoom: instance.zoom,
                position: instance.position
            };
            event.preventDefault();
            return;
        }
        if (instance.zoom > 1.001) {
            dragStart = { x: event.clientX, position: instance.position };
            instance.stage.classList.add("is-dragging");
            instance.stage.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        }
    }, { passive: false });

    instance.stage.addEventListener("pointermove", event => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size >= 2 && pinchStart) {
            const values = [...pointers.values()].slice(0, 2);
            const distance = Math.max(1, Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y));
            const midpoint = (values[0].x + values[1].x) / 2;
            const rect = instance.stage.getBoundingClientRect();
            const anchor = clamp((midpoint - rect.left) / Math.max(1, rect.width), 0, 1);
            instance.position = pinchStart.position;
            setZoom(instance, pinchStart.zoom * (distance / pinchStart.distance), anchor);
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (instance.zoom > 1.001 && dragStart && pointers.size === 1) {
            const rect = instance.stage.getBoundingClientRect();
            const delta = (event.clientX - dragStart.x) / Math.max(1, rect.width);
            instance.position = clamp(dragStart.position - delta / Math.max(.2, 1 - 1 / instance.zoom), 0, 1);
            renderOverlay(instance);
            event.preventDefault();
            event.stopPropagation();
        }
    }, { passive: false });

    const release = event => {
        pointers.delete(event.pointerId);
        if (pointers.size < 2) pinchStart = null;
        if (!pointers.size) {
            dragStart = null;
            instance.stage.classList.remove("is-dragging");
            const now = Date.now();
            if (now - lastTap < 320 && instance.zoom > 1.001) reset(instance);
            lastTap = now;
        }
    };
    instance.stage.addEventListener("pointerup", release);
    instance.stage.addEventListener("pointercancel", release);
}

function createInstance(canvas) {
    if (!canvas || instances.has(canvas) || canvas.dataset.analyticsZoomReady === "1") return;
    ensureStyles();

    const parent = canvas.parentElement;
    if (!parent) return;
    let stage = canvas.closest(".analytics-zoom-stage");
    if (!stage) {
        stage = document.createElement("div");
        stage.className = "analytics-zoom-stage";
        parent.insertBefore(stage, canvas);
        stage.appendChild(canvas);
    }
    stage.parentElement?.classList.add("analytics-zoom-host");

    const overlay = document.createElement("canvas");
    overlay.className = "analytics-zoom-overlay";
    overlay.hidden = true;
    stage.appendChild(overlay);

    const controls = document.createElement("div");
    controls.className = "analytics-zoom-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Chart zoom controls");
    controls.innerHTML = `
        <button type="button" data-chart-zoom-out aria-label="Zoom out">−</button>
        <span class="analytics-zoom-status"><strong>Full range</strong><small>Pinch or use + to inspect a smaller window</small></span>
        <button type="button" data-chart-zoom-in aria-label="Zoom in">+</button>
        <button type="button" class="analytics-zoom-reset" data-chart-zoom-reset>Reset</button>
    `;
    stage.insertAdjacentElement("afterend", controls);
    const hint = document.createElement("p");
    hint.className = "analytics-zoom-hint";
    hint.textContent = "Zoom keeps your 1W / 1M / 3M range selected. Drag horizontally to inspect dates; double-tap resets.";
    controls.insertAdjacentElement("afterend", hint);

    const instance = {
        canvas,
        overlay,
        stage,
        controls,
        hint,
        zoom: 1,
        position: .5,
        minus: controls.querySelector("[data-chart-zoom-out]"),
        plus: controls.querySelector("[data-chart-zoom-in]"),
        reset: controls.querySelector("[data-chart-zoom-reset]"),
        statusStrong: controls.querySelector(".analytics-zoom-status strong"),
        statusSmall: controls.querySelector(".analytics-zoom-status small")
    };
    instances.set(canvas, instance);
    canvas.dataset.analyticsZoomReady = "1";
    instance.minus.addEventListener("click", () => setZoom(instance, instance.zoom / 1.5));
    instance.plus.addEventListener("click", () => setZoom(instance, instance.zoom * 1.5));
    instance.reset.addEventListener("click", () => reset(instance));
    bindGestures(instance);
    updateStatus(instance);

    const resize = new ResizeObserver(() => window.requestAnimationFrame(() => renderOverlay(instance)));
    resize.observe(canvas);
}

function attachZoom() {
    attachQueued = false;
    document.querySelectorAll("#weight-trend-chart, [data-expenditure-chart]").forEach(createInstance);
}

function scheduleAttach() {
    if (attachQueued) return;
    attachQueued = true;
    window.requestAnimationFrame(attachZoom);
}

function resetForRangeButton(target) {
    const button = target?.closest?.("[data-weight-chart-range], [data-tdee-chart-range], [data-calorie-stats-range]");
    if (!button) return;
    window.setTimeout(() => {
        document.querySelectorAll("#weight-trend-chart, [data-expenditure-chart]").forEach(canvas => {
            const instance = instances.get(canvas);
            if (instance) reset(instance);
        });
        scheduleAttach();
    }, 30);
}

document.addEventListener("click", event => resetForRangeButton(event.target), true);
window.addEventListener("resize", scheduleAttach);
window.addEventListener("levelup:theme-changed", scheduleAttach);
window.addEventListener("levelup:nutrition-updated", scheduleAttach);
window.addEventListener("levelup:weight-updated", scheduleAttach);
new MutationObserver(scheduleAttach).observe(document.documentElement, { childList: true, subtree: true });
scheduleAttach();
