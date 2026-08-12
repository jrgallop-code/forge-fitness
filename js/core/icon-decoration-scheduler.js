let scheduled = false;

export function scheduleIconDecoration(callback) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
        try {
            callback();
        } finally {
            setTimeout(() => {
                scheduled = false;
            }, 0);
        }
    });
}
