import type { IZLogger } from "@zthun/lumberjacky-log";
import { ZLogEntryBuilder, ZLoggerContext } from "@zthun/lumberjacky-log";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createServer,
  request,
  type RequestOptions,
  type Server,
} from "node:https";
import { join } from "node:path";
import type { IZBouncerCertGenerator, IZBouncerConfig } from "../index.mjs";
import type { IZBouncerServer } from "./server.mjs";

export class ZBouncerServerHttps implements IZBouncerServer {
  private _log: IZLogger;
  private _https: Server | null = null;
  private _routes: Array<{ host: string; path: string; forward: string }> = [];

  public constructor(
    public readonly config: IZBouncerConfig,
    private readonly _generator: IZBouncerCertGenerator,
    log: IZLogger,
  ) {
    this._log = new ZLoggerContext("ZBouncerServerHttps", log);
  }

  public async running(): Promise<boolean> {
    return this._https != null;
  }

  public async start(): Promise<void> {
    if (await this.running()) {
      return;
    }

    this._routes = [];
    let msg = "";

    this.config.domains.forEach((d) => {
      Object.keys(d.paths).forEach((p) => {
        const endpoint = join(d.host, p).replace(/\\/g, "/");
        const forward = d.paths[p];
        const normalizedPath = p.startsWith("/") ? p : `/${p}`;
        msg = `Adding route, ${endpoint}, to ${forward}`;
        this._log.log(new ZLogEntryBuilder().info().message(msg).build());
        this._routes.push({
          host: d.host.toLowerCase(),
          path: normalizedPath,
          forward,
        });
      });
    });

    this._routes.sort((a, b) => b.path.length - a.path.length);

    const { key, cert } = await this._generator.generate(this.config.security);
    const requestHandler = this._handleRequest.bind(this);

    this._https = createServer({ key, cert }, requestHandler);

    await this._listen(this._https);

    msg = "Proxy server started";
    this._log.log(new ZLogEntryBuilder().info().message(msg).build());
  }

  public async stop(): Promise<void> {
    await this._close(this._https);
    this._https = null;
    this._routes = [];
  }

  private _listen(server: Server) {
    return new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(443, () => {
        server.removeListener("error", reject);
        resolve();
      });
    });
  }

  private _close(server: Server | null) {
    return new Promise<void>((resolve) => {
      if (!server) {
        resolve();
        return;
      }

      server.close(() => resolve());
    });
  }

  private _mergePaths(base: string, append: string) {
    const first = base.endsWith("/") ? base.slice(0, -1) : base;
    const second = append.startsWith("/") ? append : `/${append}`;
    const merged = `${first}${second}`;
    return merged || "/";
  }

  private _stripPrefix(path: string, prefix: string) {
    if (!path.startsWith(prefix)) {
      return path;
    }

    const remainder = path.slice(prefix.length);
    return remainder.startsWith("/") ? remainder : `/${remainder}`;
  }

  private _findRoute(host: string | undefined, path: string) {
    if (!host) {
      return null;
    }

    const targetHost = host.split(":")[0].toLowerCase();
    return this._routes.find(
      (route) =>
        route.host === targetHost &&
        (path === route.path || path.startsWith(`${route.path}/`)),
    );
  }

  private _handleRequest(req: IncomingMessage, res: ServerResponse) {
    const requestUrl = new URL(
      req.url || "/",
      `http://${req.headers.host ?? ""}`,
    );
    const route = this._findRoute(req.headers.host, requestUrl.pathname);

    if (!route) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const targetUrl = new URL(route.forward);
    const unmatchedPath = this._stripPrefix(requestUrl.pathname, route.path);
    const targetPath = this._mergePaths(
      targetUrl.pathname || "/",
      unmatchedPath || "/",
    );

    const options: RequestOptions = {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      method: req.method,
      path: `${targetPath}${requestUrl.search}`,
      headers: {
        ...req.headers,
        host: targetUrl.host,
      },
    };

    const proxy = request(options, (forwarded) => {
      res.writeHead(
        forwarded.statusCode ?? 502,
        forwarded.statusMessage,
        forwarded.headers,
      );
      forwarded.pipe(res, { end: true });
    });

    proxy.on("error", (err) => {
      const errorMsg = `Proxy error for ${requestUrl.href}: ${err.message}`;
      this._log.log(new ZLogEntryBuilder().error().message(errorMsg).build());

      if (!res.headersSent) {
        res.writeHead(502);
      }

      res.end("Bad Gateway");
    });

    req.pipe(proxy, { end: true });
  }
}
