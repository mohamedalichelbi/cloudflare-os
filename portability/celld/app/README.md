# Cloudflare OS on celld

This profile builds and deploys the real Cloudflare OS frontend, router, and
validated workshop backend. It deliberately keeps celld-specific binding
declarations outside the upstream Wrangler configurations.

The backend is deployed first as a named service. The router is deployed last
as the fleet's primary application, and celld discovers the backend through
the router's `WORKSHOP_BACKEND` service binding.

Run an offline bundle check:

```sh
mise run celld-app-check
```

Deploy and serve:

```sh
mise run celld-app-deploy
mise run celld-app-serve
```

`celld-app-serve` runs the sibling `../celld` checkout so local runtime
compatibility fixes are exercised before they are available in a released
celld binary. Build that repository independently with `mise run build`.

This is intentionally a live compatibility target. Bindings that celld does
not implement yet are not silently mocked; the first real failure defines the
next portability change.

The first such replacements are `BLUEPRINTS` and `BLUEPRINT_CONTENT`: the KV
metadata and R2-like blob operations used by the application are backed by one
`PortabilityStorage` Durable Object. The original backend still sees the narrow
KV/R2 interfaces it uses, while celld persists the values through its ordinary
Durable Object storage. This is an MVP adapter; large blob storage can move to
a dedicated S3-compatible service after the application path is proven.
