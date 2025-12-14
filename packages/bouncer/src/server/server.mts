import type { IZLogger } from "@zthun/lumberjacky-log";
import { ZLogEntryBuilder, ZLoggerContext } from "@zthun/lumberjacky-log";
import type {
  IncomingMessage,
  RequestOptions,
  Server,
  ServerResponse,
} from "node:http";
import {
  createServer as createHttpServer,
  request as httpRequest,
} from "node:http";
import {
  createServer as createHttpsServer,
  request as httpsRequest,
} from "node:https";
import { join } from "node:path";
import { cwd, env } from "node:process";
import { URL } from "node:url";
import type { IZBouncerCertGenerator } from "../cert/cert-generator.mjs";
import type { IZBouncerConfig } from "../config/config.mjs";

export interface IZBouncerServer {
  running(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class ZBouncerServer implements IZBouncerServer {
  private _log: IZLogger;
  private _http: Server | null = null;
  private _https: Server | null = null;
  private _routes: Array<{ host: string; path: string; forward: string }> = [];

  public constructor(
    public readonly config: IZBouncerConfig,
    private readonly _generator: IZBouncerCertGenerator,
    log: IZLogger,
  ) {
    this._log = new ZLoggerContext("ZBouncerServer", log);
  }

  public async running(): Promise<boolean> {
    return this._http != null || this._https != null;
  }

  public async start(): Promise<void> {
    if (await this.running()) {
      return;
    }

    let msg = `Current working directory: ${cwd()}`;
    this._log.log(new ZLogEntryBuilder().info().message(msg).build());

    this._routes = [];

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

    this._http = createHttpServer(requestHandler);
    this._https = createHttpsServer({ key, cert }, requestHandler);

    await Promise.all([
      this._listen(this._http, +(env.HTTP_PORT || 80)),
      this._listen(this._https, +(env.HTTPS_PORT || 443)),
    ]);

    msg = "Proxy server started";
    this._log.log(new ZLogEntryBuilder().info().message(msg).build());
  }

  public async stop(): Promise<void> {
    await Promise.all([this._close(this._http), this._close(this._https)]);
    this._http = null;
    this._https = null;
    this._routes = [];
  }

  private _listen(server: Server | null, port: number) {
    return new Promise<void>((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }

      server.once("error", reject);
      server.listen(port, () => {
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

    const proxy = (
      targetUrl.protocol === "https:" ? httpsRequest : httpRequest
    )(options, (forwarded) => {
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
