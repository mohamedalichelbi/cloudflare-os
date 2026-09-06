import assert from "node:assert/strict";
import { test } from "node:test";
import smolflareConfig from "./smolflare.config.mjs";

const fakePackage = `data:text/javascript,${encodeURIComponent(`
  export class R2FileSystem {
    constructor(path) { this.path = path; }
  }
  export class R2BucketAzureBlobStorage {}
  export class R2BucketGCS {}
  export class R2BucketS3 {}
`)}`;

test("Smolflare storage uses local SQLite by default", async () => {
  const config = await smolflareConfig({
    env: { SMOLFLARE_PACKAGE: fakePackage },
  });

  assert.deepEqual(config.sqliteStorage, { type: "local-disk" });
});

test("Smolflare storage configures remote LTX SQLite", async () => {
  const config = await smolflareConfig({
    env: {
      SMOLFLARE_PACKAGE: fakePackage,
      SMOLFLARE_SQLITE_BACKEND: "remote-ltx",
      SMOLFLARE_SQLITE_EXTENSION_PATH: "/opt/smolflare/litestream-vfs.so",
      SMOLFLARE_SQLITE_REPLICA_URL: "s3://sqlite/smolflare",
      SMOLFLARE_SQLITE_SYNC_INTERVAL: "2s",
      SMOLFLARE_SQLITE_PAGE_CACHE_BYTES: "4096",
      SMOLFLARE_SQLITE_CACHE_DIRECTORY: "/var/cache/smolflare/sqlite",
    },
  });

  assert.deepEqual(config.sqliteStorage, {
    type: "remote-ltx",
    extensionPath: "/opt/smolflare/litestream-vfs.so",
    replicaUrl: "s3://sqlite/smolflare",
    vfsName: undefined,
    syncInterval: "2s",
    pageCacheBytes: 4096,
    cacheDirectory: "/var/cache/smolflare/sqlite",
  });
});

test("Smolflare storage rejects an invalid page cache size", async () => {
  await assert.rejects(
    smolflareConfig({
      env: {
        SMOLFLARE_PACKAGE: fakePackage,
        SMOLFLARE_SQLITE_BACKEND: "remote-ltx",
        SMOLFLARE_SQLITE_PAGE_CACHE_BYTES: "4 MiB",
      },
    }),
    /SMOLFLARE_SQLITE_PAGE_CACHE_BYTES must be a whole number/
  );
});
