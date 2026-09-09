import { cp, mkdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "www");
const files = ["index.html", "manifest.webmanifest", "service-worker.js"];
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

console.log(`Prepared Capacitor web assets in ${path.relative(root, output)}/`);
