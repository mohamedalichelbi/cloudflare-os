// Celld portability seam for the validated Cloudflare OS backend. The upstream
// implementation continues to consume KV/R2-shaped bindings; this module
// supplies their minimal open implementation using one Durable Object.
import { DurableObject } from "cloudflare:workers";
import backend, {
  AdminSettings as CloudflareAdminSettings,
  OverseerDurableObject as CloudflareOverseerDurableObject,
  UserDurableObject as CloudflareUserDurableObject,
} from "../../../../packages/workshop-backend/.wrangler/validate/src/server.ts";

export {
  AgentSelfLoopback,
  AgentSpawnerGatekeeper,
  CodeModeTailLoopback,
  ExternalMessageGateway,
  GadgetTailLoopback,
  GatekeeperConnectCallbackImpl,
  GatekeeperHookLoopback,
  GatekeeperLoopback,
  LanguageModelGatekeeper,
  LoginConnectCallbackImpl,
  PendingLogin,
  TransientStubLoopback,
} from "../../../../packages/workshop-backend/.wrangler/validate/src/server.ts";

type StoredBlob = {
  bytes: Uint8Array;
  customMetadata?: Record<string, string>;
  httpMetadata?: R2HTTPMetadata;
};

export class PortabilityStorage extends DurableObject {
  getValue(key: string): Promise<unknown> {
    return this.ctx.storage.get(key).then((value) => value ?? null);
  }

  putValue(key: string, value: unknown): Promise<void> {
    return this.ctx.storage.put(key, value);
  }

  deleteValue(key: string): Promise<boolean> {
    return this.ctx.storage.delete(key);
  }
}

type StorageStub = DurableObjectStub<PortabilityStorage>;

function portableKv(storage: StorageStub, prefix: string): KVNamespace {
  return {
    async get(key: string, typeOrOptions?: string | object) {
      const value = await storage.getValue(`${prefix}${key}`);
      if (value === null) return null;

      const type = typeof typeOrOptions === "string" ? typeOrOptions : typeOrOptions?.type;
      if (!type || type === "text") {
        return typeof value === "string" ? value : new TextDecoder().decode(value as Uint8Array);
      }
      if (type === "arrayBuffer") {
        const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value as Uint8Array;
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      }
      if (type === "json") {
        const text = typeof value === "string" ? value : new TextDecoder().decode(value as Uint8Array);
        return JSON.parse(text);
      }
      throw new Error(`Unsupported portable KV read type: ${type}`);
    },
    put(key: string, value: string | ArrayBuffer | ArrayBufferView) {
      let stored: string | Uint8Array = value as string;
      if (value instanceof ArrayBuffer) stored = new Uint8Array(value);
      else if (ArrayBuffer.isView(value)) {
        stored = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      }
      return storage.putValue(`${prefix}${key}`, stored);
    },
    delete(key: string) {
      return storage.deleteValue(`${prefix}${key}`).then(() => undefined);
    },
  } as KVNamespace;
}

async function bodyBytes(value: unknown): Promise<Uint8Array> {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array(await new Response(value as BodyInit).arrayBuffer());
}

function portableR2(storage: StorageStub): R2Bucket {
  return {
    async get(key: string) {
      const record = await storage.getValue(`r2:${key}`) as StoredBlob | null;
      if (!record) return null;
      const bytes = record.bytes;
      return {
        key,
        size: bytes.byteLength,
        etag: "portable",
        httpEtag: '"portable"',
        uploaded: new Date(0),
        checksums: {},
        customMetadata: record.customMetadata,
        httpMetadata: record.httpMetadata,
        range: undefined,
        storageClass: "Standard",
        body: new Response(bytes).body!,
        bodyUsed: false,
        arrayBuffer: async () => bytes.buffer.slice(
          bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        text: async () => new TextDecoder().decode(bytes),
        json: async () => JSON.parse(new TextDecoder().decode(bytes)),
        blob: async () => new Blob([bytes]),
        writeHttpMetadata(headers: Headers) {
          const metadata = record.httpMetadata;
          if (metadata?.contentType) headers.set("content-type", metadata.contentType);
          if (metadata?.contentLanguage) headers.set("content-language", metadata.contentLanguage);
          if (metadata?.contentDisposition) {
            headers.set("content-disposition", metadata.contentDisposition);
          }
          if (metadata?.contentEncoding) headers.set("content-encoding", metadata.contentEncoding);
          if (metadata?.cacheControl) headers.set("cache-control", metadata.cacheControl);
        },
      };
    },
    async put(key: string, value: unknown, options?: R2PutOptions) {
      const bytes = await bodyBytes(value);
      const record: StoredBlob = {
        bytes,
        customMetadata: options?.customMetadata,
        httpMetadata: options?.httpMetadata,
      };
      await storage.putValue(`r2:${key}`, record);
      return {
        key,
        size: bytes.byteLength,
        etag: "portable",
        httpEtag: '"portable"',
        uploaded: new Date(0),
        checksums: {},
        customMetadata: record.customMetadata,
        httpMetadata: record.httpMetadata,
        storageClass: "Standard",
      };
    },
    async delete(keys: string | string[]) {
      await Promise.all((Array.isArray(keys) ? keys : [keys])
        .map((key) => storage.deleteValue(`r2:${key}`)));
    },
    async head(key: string) {
      const record = await storage.getValue(`r2:${key}`) as StoredBlob | null;
      if (!record) return null;
      return {
        key,
        size: record.bytes.byteLength,
        etag: "portable",
        httpEtag: '"portable"',
        uploaded: new Date(0),
        checksums: {},
        customMetadata: record.customMetadata,
        httpMetadata: record.httpMetadata,
        storageClass: "Standard",
        writeHttpMetadata() {},
      };
    },
  } as R2Bucket;
}

type PortableEnv = Cloudflare.Env & {
  PORTABILITY_STORAGE: DurableObjectNamespace<PortabilityStorage>;
};

function withPortableStorage(env: PortableEnv): Cloudflare.Env {
  const storage = env.PORTABILITY_STORAGE.getByName("default");
  return {
    ...env,
    BLUEPRINTS: portableKv(storage, "blueprints:"),
    BLUEPRINT_CONTENT: portableR2(storage),
  };
}

// Durable Objects get their environment directly from the runtime, so wrap the
// three stateful kernel classes that consume KV/R2 as well as the top-level
// fetch handler.
export class AdminSettings extends CloudflareAdminSettings {
  constructor(ctx: DurableObjectState, env: PortableEnv) {
    super(ctx, withPortableStorage(env));
  }
}

export class UserDurableObject extends CloudflareUserDurableObject {
  constructor(ctx: DurableObjectState, env: PortableEnv) {
    super(ctx, withPortableStorage(env));
  }
}

export class OverseerDurableObject extends CloudflareOverseerDurableObject {
  constructor(ctx: DurableObjectState, env: PortableEnv) {
    super(ctx, withPortableStorage(env));
  }
}

export default {
  fetch(request: Request, env: PortableEnv, ctx: ExecutionContext) {
    return backend.fetch(request, withPortableStorage(env), ctx);
  },
};
