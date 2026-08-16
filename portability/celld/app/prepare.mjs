import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(appDir, "../../..");
const source = join(repositoryRoot, "packages/workshop-frontend/dist");
const destination = join(appDir, "router/.generated/frontend");

await rm(destination, { recursive: true, force: true });
await mkdir(dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true });
