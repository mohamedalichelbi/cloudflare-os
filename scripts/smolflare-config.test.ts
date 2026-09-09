import assert from "node:assert/strict";
import { test } from "node:test";
import smolflareConfig from "./smolflare.config.mjs";

const fakePackage = `data:text/javascript,${encodeURIComponent(`
  export class R2FileSystem {
    constructor(path) { this.path = path; }
  }
  export class R2BucketAzureBlobStorage {}
  export class R2BucketGCS {
    constructor(options) { this.options = options; }
  }
  export class R2BucketS3 {}
  export class RemoteLtxSqliteStorage {
    constructor(options) { this.options = options; this.type = "custom"; }
    getStorage() {}
  }
`)}`;

test("Smolflare storage uses local SQLite by default", async () => {
  const config = await smolflareConfig({
    env: { SMOLFLARE_PACKAGE: fakePackage },
  });

  assert.equal(config.sqliteStorage, undefined);
  assert.equal(config.kvBlobStorage, undefined);
});

test("remote KV bodies share bucket credentials but use a separate prefix", async () => {
  const config = await smolflareConfig({
    env: {
      SMOLFLARE_PACKAGE: fakePackage,
      SMOLFLARE_R2_BACKEND: "gcs",
      SMOLFLARE_R2_GCS_BUCKET: "test-bucket",
      SMOLFLARE_R2_PREFIX: "bodies",
    },
  });
  assert.equal(config.r2BlobStorage.options.bucket, "test-bucket");
  assert.equal(config.kvBlobStorage.options.bucket, "test-bucket");
  assert.equal(config.r2BlobStorage.options.prefix, "bodies");
  assert.equal(config.kvBlobStorage.options.prefix, "bodies/kv");
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

  assert.deepEqual(config.sqliteStorage.options, {
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
