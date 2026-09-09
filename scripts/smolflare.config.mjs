const DEFAULT_R2_BACKEND = "filesystem";
const DEFAULT_R2_RETAIN_DELETED = true;
const DEFAULT_SMOLFLARE_PACKAGE = "smolflare";
const DEFAULT_SQLITE_BACKEND = "local-disk";
const KV_BLOB_PREFIX = "kv";

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Set ${name} in .env.`);
  return value;
}

function remoteOptions(env) {
  const retainDeleted = env.SMOLFLARE_R2_RETAIN_DELETED?.trim();
  return {
    prefix: env.SMOLFLARE_R2_PREFIX?.trim() || undefined,
    retainDeleted:
      retainDeleted === undefined
        ? DEFAULT_R2_RETAIN_DELETED
        : retainDeleted !== "false",
  };
}

function sqliteOptions(env, RemoteLtxSqliteStorage) {
  switch (env.SMOLFLARE_SQLITE_BACKEND?.trim() || DEFAULT_SQLITE_BACKEND) {
    case "local-disk":
      return undefined;
    case "remote-ltx": {
      const pageCacheBytes = env.SMOLFLARE_SQLITE_PAGE_CACHE_BYTES?.trim();
      if (pageCacheBytes && !/^\d+$/.test(pageCacheBytes)) {
        throw new Error("SMOLFLARE_SQLITE_PAGE_CACHE_BYTES must be a whole number.");
      }
      return new RemoteLtxSqliteStorage({
        extensionPath: required(env, "SMOLFLARE_SQLITE_EXTENSION_PATH"),
        replicaUrl: required(env, "SMOLFLARE_SQLITE_REPLICA_URL"),
        vfsName: env.SMOLFLARE_SQLITE_VFS_NAME?.trim() || undefined,
        syncInterval: env.SMOLFLARE_SQLITE_SYNC_INTERVAL?.trim() || undefined,
        pageCacheBytes: pageCacheBytes ? Number(pageCacheBytes) : undefined,
        cacheDirectory: env.SMOLFLARE_SQLITE_CACHE_DIRECTORY?.trim() || undefined,
      });
    }
    default:
      throw new Error(
        "SMOLFLARE_SQLITE_BACKEND must be local-disk or remote-ltx."
      );
  }
}

function blobOptions(env, implementations, plugin) {
  const { R2BucketAzureBlobStorage, R2BucketGCS, R2BucketS3, R2FileSystem } =
    implementations;
  const options = remoteOptions(env);
  if (plugin === "kv") {
    options.prefix = [options.prefix, KV_BLOB_PREFIX].filter(Boolean).join("/");
  }
  switch (env.SMOLFLARE_R2_BACKEND?.trim() || DEFAULT_R2_BACKEND) {
    case "filesystem":
      return plugin === "kv" ? undefined : new R2FileSystem(env.SMOLFLARE_R2_PATH);
    case "gcs":
      return new R2BucketGCS({
        bucket: required(env, "SMOLFLARE_R2_GCS_BUCKET"),
        projectId: env.SMOLFLARE_R2_GCS_PROJECT_ID?.trim() || undefined,
        keyFilename: env.SMOLFLARE_R2_GCS_KEY_FILE?.trim() || undefined,
        ...options,
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
        ...options,
      });
    case "azure":
      return new R2BucketAzureBlobStorage({
        container: required(env, "SMOLFLARE_R2_AZURE_CONTAINER"),
        connectionString: required(
          env,
          "SMOLFLARE_R2_AZURE_CONNECTION_STRING"
        ),
        ...options,
      });
    default:
      throw new Error(
        "SMOLFLARE_R2_BACKEND must be filesystem, gcs, s3, or azure."
      );
  }
}

/** Selects portable blob and SQLite storage for local Wrangler. */
export default async function smolflareConfig({ env }) {
  const packageName =
    env.SMOLFLARE_PACKAGE?.trim() || DEFAULT_SMOLFLARE_PACKAGE;
  const implementations = await import(packageName);
  return {
    r2BlobStorage: blobOptions(env, implementations, "r2"),
    kvBlobStorage: blobOptions(env, implementations, "kv"),
    sqliteStorage: sqliteOptions(env, implementations.RemoteLtxSqliteStorage),
  };
}
