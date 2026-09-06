function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Set ${name} in .env.`);
  return value;
}

function remoteOptions(env) {
  return {
    prefix: env.SMOLFLARE_R2_PREFIX?.trim() || undefined,
    retainDeleted: env.SMOLFLARE_R2_RETAIN_DELETED !== "false",
  };
}

function sqliteOptions(env) {
  switch (env.SMOLFLARE_SQLITE_BACKEND?.trim() || "local-disk") {
    case "local-disk":
      return { type: "local-disk" };
    case "remote-ltx": {
      const pageCacheBytes = env.SMOLFLARE_SQLITE_PAGE_CACHE_BYTES?.trim();
      if (pageCacheBytes && !/^\d+$/.test(pageCacheBytes)) {
        throw new Error("SMOLFLARE_SQLITE_PAGE_CACHE_BYTES must be a whole number.");
      }
      return {
        type: "remote-ltx",
        extensionPath: required(env, "SMOLFLARE_SQLITE_EXTENSION_PATH"),
        replicaUrl: required(env, "SMOLFLARE_SQLITE_REPLICA_URL"),
        vfsName: env.SMOLFLARE_SQLITE_VFS_NAME?.trim() || undefined,
        syncInterval: env.SMOLFLARE_SQLITE_SYNC_INTERVAL?.trim() || undefined,
        pageCacheBytes: pageCacheBytes ? Number(pageCacheBytes) : undefined,
        cacheDirectory: env.SMOLFLARE_SQLITE_CACHE_DIRECTORY?.trim() || undefined,
      };
    }
    default:
      throw new Error(
        "SMOLFLARE_SQLITE_BACKEND must be local-disk or remote-ltx."
      );
  }
}

async function r2Options(env) {
  const packageName = env.SMOLFLARE_PACKAGE?.trim() || "smolflare";
  const { R2BucketAzureBlobStorage, R2BucketGCS, R2BucketS3, R2FileSystem } =
    await import(packageName);

  switch (env.SMOLFLARE_R2_BACKEND?.trim() || "filesystem") {
    case "filesystem":
      return new R2FileSystem(env.SMOLFLARE_R2_PATH);
    case "gcs":
      return new R2BucketGCS({
        bucket: required(env, "SMOLFLARE_R2_GCS_BUCKET"),
        projectId: env.SMOLFLARE_R2_GCS_PROJECT_ID?.trim() || undefined,
        keyFilename: env.SMOLFLARE_R2_GCS_KEY_FILE?.trim() || undefined,
        ...remoteOptions(env),
      });
    case "s3":
      return new R2BucketS3({
        bucket: required(env, "SMOLFLARE_R2_S3_BUCKET"),
        endpoint: env.SMOLFLARE_R2_S3_ENDPOINT?.trim() || undefined,
        region: env.SMOLFLARE_R2_S3_REGION?.trim() || undefined,
        forcePathStyle: env.SMOLFLARE_R2_S3_FORCE_PATH_STYLE === "true",
        accessKeyId: env.SMOLFLARE_R2_S3_ACCESS_KEY_ID?.trim() || undefined,
        secretAccessKey:
          env.SMOLFLARE_R2_S3_SECRET_ACCESS_KEY?.trim() || undefined,
        ...remoteOptions(env),
      });
    case "azure":
      return new R2BucketAzureBlobStorage({
        container: required(env, "SMOLFLARE_R2_AZURE_CONTAINER"),
        connectionString: required(
          env,
          "SMOLFLARE_R2_AZURE_CONNECTION_STRING"
        ),
        ...remoteOptions(env),
      });
    default:
      throw new Error(
        "SMOLFLARE_R2_BACKEND must be filesystem, gcs, s3, or azure."
      );
  }
}

/** Selects portable R2 and SQLite storage for local Wrangler. */
export default async function smolflareConfig({ env }) {
  return {
    r2BlobStorage: await r2Options(env),
    sqliteStorage: sqliteOptions(env),
  };
}
