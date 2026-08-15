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

            const opened =
                await clients.openWindow("./");
            opened?.postMessage?.({
                type: "levelup:open-active-workout"
            });
            return opened;
        })
    );
});