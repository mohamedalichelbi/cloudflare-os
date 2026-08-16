# celld router spike

This is the first incremental Cloudflare OS portability check. It runs the
existing router source on celld and proves two boundaries without changing the
application:

1. `/api/probe` travels through the router's `WORKSHOP_BACKEND` service binding
   to a diagnostic backend Worker.
2. `/` is served through the router's `ASSETS` binding.

The backend must be deployed first. The router is deployed last so it becomes
the fleet's primary application; celld discovers and co-hosts the named backend
through the service binding.

Use a dedicated bucket prefix so this deployment does not replace another
celld application:

```sh
cp .env.example .env
# Edit .env, then:
mise install
mise run celld-build
mise run celld-router-spike-deploy
mise run celld-router-spike-serve
```

In a second terminal:

```sh
mise run celld-router-spike-smoke
```
