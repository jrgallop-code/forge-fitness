import { cp, mkdir, rm, stat, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "www");
const files = ["index.html", "privacy.html", "manifest.webmanifest", "service-worker.js"];
const directories = ["assets", "css", "js"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const relativePath of [...files, ...directories]) {
    const source = path.join(root, relativePath);
    const sourceStat = await stat(source).catch(() => null);
    if (!sourceStat) throw new Error(`Native build source is missing: ${relativePath}`);
    await cp(source, path.join(output, relativePath), {
        recursive: sourceStat.isDirectory()
    });
}

// Validate the files actually copied into the native bundle, not just the source.
const { EXERCISE_THUMBNAILS } = await import('../js/workouts/exercise-thumbnail-manifest.js');
for (const file of new Set(Object.values(EXERCISE_THUMBNAILS).flatMap(Object.values))) {
    const bundled = await readFile(path.join(output, file));
    if (bundled.toString('ascii', 0, 4) !== 'RIFF' || bundled.toString('ascii', 8, 12) !== 'WEBP') {
        throw new Error(`Invalid packaged exercise thumbnail: ${file}`);
    }
}
console.log(`Prepared Capacitor web assets in ${path.relative(root, output)}/; verified ${Object.keys(EXERCISE_THUMBNAILS).length} exercise thumbnail mappings`);
