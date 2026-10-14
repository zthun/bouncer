# Bouncer

Bouncer is a configurable reverse proxy built with Node.js and TypeScript. It
supports HTTP and HTTPS servers, routing by host and path, WebSocket upgrades,
and redirects from HTTP to HTTPS.

## Packages

- [`@zthun/bouncer`](packages/bouncer): The library provides configuration
  builders, request handlers, server factories, and certificate generation.
- [`@zthun/bouncer-cli`](packages/bouncer-cli): The command-line application
  loads configuration and starts the proxy servers.

## Getting started

Install the CLI:

```sh
npm install --global @zthun/bouncer-cli
```

Create a `.config/bouncerrc.mjs` file in your project:

```js
export default {
  servers: [
    {
      type: "http",
      port: 8080,
      domains: {
        "localhost:8080": {
          "/": "http://localhost:3000",
          "/api": "http://localhost:4000",
          "/private": null,
        },
      },
    },
  ],
};
```

Start your upstream services on ports 3000 and 4000, then run the CLI from your
project directory:

```sh
bouncer-cli
```

Requests to `http://localhost:8080/` are forwarded to port 3000. Requests to
`http://localhost:8080/api/users` are forwarded to
`http://localhost:4000/api/users`. Requests to `/private` and its subpaths
receive a 404 response.

## Configuration

The CLI uses cosmiconfig to discover configuration under the name `bouncer`. The
repository's [configuration](.config/bouncerrc.mjs) is an example with an HTTP
redirect server and an HTTPS proxy server. If no configuration is found, the CLI
starts no servers.

Each entry in `servers` accepts these settings:

| Setting    | Behavior                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------- |
| `type`     | `"http"` (the default) or `"https"`.                                                        |
| `port`     | The listening port; defaults to 80 for HTTP and 443 for HTTPS.                              |
| `handle`   | `"forward"` (the default behavior) or `"redirect"`.                                         |
| `domains`  | Maps host names to path mappings and upstream URLs. Defaults to an empty object.            |
| `security` | HTTPS certificate subject fields: `organization`, `country`, `state`, `city`, and `domain`. |

Server entries with the same `type` are merged into a single configuration.
Later entries override earlier settings and merge their domain mappings, so the
CLI starts at most one HTTP server and one HTTPS server.

### Routing

Domain keys must match the incoming `Host` header exactly, including the port
when present. The proxy checks the requested path, then each parent path, down
to `/`, and uses the first mapping it finds. A `null` mapping blocks that path
and its subpaths unless a more specific mapping exists. Unmapped hosts and paths
receive a 404 response.

The full normalized request path and query string are appended to the upstream
URL. Matching a route such as `/api` does not remove that prefix from the
forwarded path. WebSocket upgrades use the same routing rules.

### HTTPS and redirects

The CLI generates a new self-signed certificate for each HTTPS server startup
using the `openssl` executable, which must be available on your `PATH`.
Certificates are valid for one day, and `security.domain` defaults to
`localhost`. Clients must explicitly trust or accept the self-signed
certificate.

Set `handle` to `"redirect"` to return a 308 redirect to HTTPS. The redirect
preserves the incoming host, port, path, and query string; it does not replace
an HTTP port with a custom HTTPS port. Upgrade requests are redirected to WSS.
