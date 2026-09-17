const OVERPASS_ENDPOINT =
    "https://overpass-api.de/api/interpreter";

let cachedGyms = [];
let cachedAt = 0;


export async function findNearbyGyms() {
    if (
        cachedGyms.length &&
        Date.now() - cachedAt < 15 * 60 * 1000
    ) {
        return cachedGyms;
    }

    const position = await getPosition();
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const query = `
        [out:json][timeout:20];
        (
          nwr(around:15000,${latitude},${longitude})["leisure"="fitness_centre"];
          nwr(around:15000,${latitude},${longitude})["sport"="fitness"];
        );
        out center tags;
    `;
    const response = await fetch(
        `${OVERPASS_ENDPOINT}?data=${encodeURIComponent(query)}`,
        {
            headers: {
                Accept: "application/json"
            }
        }
    );

    if (!response.ok) {
        throw new Error("Nearby gyms could not be loaded right now.");
    }

    const payload = await response.json();
    const unique = new Map();

    (payload?.elements || []).forEach(element => {
        const tags = element?.tags || {};
        const name = String(tags.name || tags.brand || "").trim();
        if (!name) return;
        const gymLatitude = Number(element.lat ?? element.center?.lat);
        const gymLongitude = Number(element.lon ?? element.center?.lon);
        const address = formatAddress(tags);
        const distanceKm =
            Number.isFinite(gymLatitude) && Number.isFinite(gymLongitude)
                ? distance(latitude, longitude, gymLatitude, gymLongitude)
                : null;
        const key = `${name}|${address}`.toLowerCase();
        unique.set(key, {
            name,
            address,
            distanceKm,
            source: "nearby"
        });
    });

    cachedGyms = [...unique.values()]
        .sort((a, b) =>
            (a.distanceKm ?? Infinity) -
            (b.distanceKm ?? Infinity)
        )
        .slice(0, 40);
    cachedAt = Date.now();
    return cachedGyms;
}


function getPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Location is not available on this device."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            resolve,
            error => {
                if (error?.code === 1) {
                    reject(new Error("Location access was not allowed. You can still type the gym manually."));
                    return;
                }
                reject(new Error("Your location could not be found. You can still type the gym manually."));
            },
            {
                enableHighAccuracy: false,
                timeout: 12000,
                maximumAge: 10 * 60 * 1000
            }
        );
    });
}


function formatAddress(tags) {
    return [
        [tags["addr:housenumber"], tags["addr:street"]]
            .filter(Boolean)
            .join(" "),
        tags["addr:city"] || tags["addr:town"] || tags["addr:village"]
    ]
        .filter(Boolean)
        .join(", ");
}


function distance(lat1, lon1, lat2, lon2) {
    const radians = value => value * Math.PI / 180;
    const earthRadiusKm = 6371;
    const deltaLatitude = radians(lat2 - lat1);
    const deltaLongitude = radians(lon2 - lon1);
    const a =
        Math.sin(deltaLatitude / 2) ** 2 +
        Math.cos(radians(lat1)) *
        Math.cos(radians(lat2)) *
        Math.sin(deltaLongitude / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
