const INSTALL_KEY = "__levelUpWeightTrendCanvasSmoothingV1";

function isWeightViewport(context) {
    return context?.canvas?.dataset?.analyticsViewportChart === "weight";
}

function isTrendStroke(context, points) {
    return isWeightViewport(context)
        && Array.isArray(points)
        && points.length >= 3
        && Number(context.lineWidth) >= 2.8
        && context.lineCap === "round"
        && context.lineJoin === "round"
        && Number(context.shadowBlur) >= 6;
}

function install() {
    if (typeof CanvasRenderingContext2D === "undefined" || globalThis[INSTALL_KEY]) return;
    globalThis[INSTALL_KEY] = true;

    const prototype = CanvasRenderingContext2D.prototype;
    const originalBeginPath = prototype.beginPath;
    const originalMoveTo = prototype.moveTo;
    const originalLineTo = prototype.lineTo;
    const originalQuadraticCurveTo = prototype.quadraticCurveTo;
    const originalStroke = prototype.stroke;
    const paths = new WeakMap();

    prototype.beginPath = function beginPath(...args) {
        if (isWeightViewport(this)) paths.set(this, []);
        return originalBeginPath.apply(this, args);
    };

    prototype.moveTo = function moveTo(x, y) {
        if (isWeightViewport(this)) {
            const points = paths.get(this) || [];
            points.push({ x: Number(x), y: Number(y) });
            paths.set(this, points);
        }
        return originalMoveTo.call(this, x, y);
    };

    prototype.lineTo = function lineTo(x, y) {
        if (isWeightViewport(this)) {
            const points = paths.get(this) || [];
            points.push({ x: Number(x), y: Number(y) });
            paths.set(this, points);
        }
        return originalLineTo.call(this, x, y);
    };

    prototype.stroke = function stroke(...args) {
        const points = paths.get(this) || [];
        if (isTrendStroke(this, points)) {
            originalBeginPath.call(this);
            originalMoveTo.call(this, points[0].x, points[0].y);
            for (let index = 1; index < points.length - 1; index += 1) {
                const current = points[index];
                const next = points[index + 1];
                originalQuadraticCurveTo.call(
                    this,
                    current.x,
                    current.y,
                    (current.x + next.x) / 2,
                    (current.y + next.y) / 2
                );
            }
            const last = points.at(-1);
            originalLineTo.call(this, last.x, last.y);
        }
        return originalStroke.apply(this, args);
    };
}

install();
