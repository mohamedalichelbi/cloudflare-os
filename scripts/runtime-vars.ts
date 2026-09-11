/** Backend variables supplied by the host at startup. */
export const BACKEND_RUNTIME_VARS = [
  "DISABLE_PASSWORD_AUTH", "AUTH_GATEKEEPERS", "ENABLE_CLOUDFLARE_LIMITS", "PUBLIC_BASE_URL",
  "DAILY_LLM_CALL_LIMIT", "MINIMUM_CLOUDFLARE_BALANCE",
  "CF_AI_GATEWAY", "CF_AI_GATEWAY_PROVIDERS", "CF_AI_GATEWAY_ACCOUNT_ID",
  "CF_AI_GATEWAY_API_TOKEN", "CF_AI_GATEWAY_USE_BINDING",
];

/** Shared OAuth credentials for each gatekeeper. */
export const SHARED_GATEKEEPER_CREDS: Record<string, { id: string; secret: string }> = {
  "gatekeeper-github": { id: "GITHUB_CLIENT_ID", secret: "GITHUB_CLIENT_SECRET" },
  "gatekeeper-google": { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
  "gatekeeper-cloudflare": { id: "CLOUDFLARE_OAUTH_CLIENT_ID", secret: "CLOUDFLARE_OAUTH_CLIENT_SECRET" },
  "gatekeeper-supabase": { id: "SUPABASE_CLIENT_ID", secret: "SUPABASE_CLIENT_SECRET" },
  "gatekeeper-notion": { id: "NOTION_CLIENT_ID", secret: "NOTION_CLIENT_SECRET" },
  "gatekeeper-zoominfo": { id: "ZOOMINFO_CLIENT_ID", secret: "ZOOMINFO_CLIENT_SECRET" },
  "gatekeeper-confluence": { id: "CONFLUENCE_CLIENT_ID", secret: "CONFLUENCE_CLIENT_SECRET" },
  "gatekeeper-slack": { id: "SLACK_CLIENT_ID", secret: "SLACK_CLIENT_SECRET" },
  "gatekeeper-linear": { id: "LINEAR_CLIENT_ID", secret: "LINEAR_CLIENT_SECRET" },
  "gatekeeper-spotify": { id: "SPOTIFY_CLIENT_ID", secret: "SPOTIFY_CLIENT_SECRET" },
};

/** Gatekeeper variables supplied by the host at startup. */
export const PASSTHROUGH_GATEKEEPER_VARS: Record<string, string[]> = {
  "gatekeeper-mcp-portal": [
    "MCP_PORTAL_URL", "MCP_PORTAL_NAME", "MCP_PORTAL_AUTH", "MCP_PORTAL_TOKEN",
    "MCP_PORTAL_TRUST_ANNOTATIONS", "MCP_PORTAL_HIDDEN_SERVER_IDS", "MCP_ALLOW_INSECURE",
  ],
  "gatekeeper-mcp": ["MCP_ALLOW_INSECURE"],
};
