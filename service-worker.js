self.addEventListener("notificationclick", event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then(async windows => {
            const existing =
                windows.find(client =>
                    "focus" in client
                );

            if (existing) {
                await existing.focus();
                existing.postMessage({
                    type: "levelup:open-active-workout"
                });
                return existing;
            }

            return clients.openWindow("./?resumeWorkout=1");
        })
    );
});