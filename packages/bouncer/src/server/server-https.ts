import { firstDefined } from "@zthun/helpful-fn";
import {
  IZLogger,
  ZLogEntryBuilder,
  ZLoggerContext,
} from "@zthun/lumberjacky-log";
import { ZUrlBuilder } from "@zthun/webigail-url";
import { findIndex } from "lodash-es";
import { createServer, Server, ServerOptions } from "node:https";
import { createSecureContext, SecureContext } from "node:tls";
import { IZBouncerCertGenerate } from "../cert/cert-generate";
import { ZBouncerDomainBuilder } from "../config/config-domain.mjs";
import { IZBouncerConfig } from "../config/config.mjs";
import { IZBouncerServer } from "./server";

export class ZBouncerServerHttps implements IZBouncerServer {
  private static readonly MessageStart = "Starting https server";
  private static readonly MessageStartSuccess = "Started https server";
  private static readonly MessageStartFail = "Failed starting https server: ";
  private static readonly MessageStop = "Stopping https server";
  private static readonly MessageStopSuccess = "Stopped https server";

  private static readonly Context = "ZBouncerServiceHttps";

  private _logger: IZLogger;
  private _server: Server | null = null;

  public constructor(
    logger: IZLogger,
    private _cert: IZBouncerCertGenerate,
    private _config: IZBouncerConfig,
  ) {
    this._logger = new ZLoggerContext(ZBouncerServerHttps.Context, logger);
  }

  public running(): Promise<boolean> {
    return Promise.resolve(this._server != null);
  }

  public start(): Promise<void> {
    if (this._server != null) {
      return Promise.resolve();
    }

    this._logger.log(
      new ZLogEntryBuilder()
        .info()
        .message(ZBouncerServerHttps.MessageStart)
        .build(),
    );

    return new Promise((resolve, reject) => {
      const server = this._createServer();

      const onError = (err: Error) => {
        server.off("listening", onListening);
        this._logger.log(
          new ZLogEntryBuilder()
            .error()
            .message(`${ZBouncerServerHttps.MessageStartFail} ${err.message}`)
            .build(),
        );
        this._destroyServer();
        reject(err);
      };

      const onListening = () => {
        server.off("error", onError);
        this._logger.log(
          new ZLogEntryBuilder()
            .info()
            .message(ZBouncerServerHttps.MessageStartSuccess)
            .build(),
        );
        resolve();
      };

      server.once("error", onError);
      server.once("listening", onListening);

      const { host, port = 443 } = this._config.https;

      server.listen(port, host);
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this._server == null) {
        resolve();
      } else {
        this._logger.log(
          new ZLogEntryBuilder()
            .info()
            .message(ZBouncerServerHttps.MessageStop)
            .build(),
        );
        this._server.close(() => {
          this._destroyServer();
          this._logger.log(
            new ZLogEntryBuilder()
              .info()
              .message(ZBouncerServerHttps.MessageStopSuccess)
              .build(),
          );
          resolve();
        });
      }
    });
  }

  private _destroyServer() {
    this._server = null;
  }

  private _createServer() {
    const certs = {};

    const SNICallback = (
      serverName: string,
      cb: (err: Error | null, ctx?: SecureContext) => void,
    ) => {
      if (certs[serverName]) {
        cb(null, certs[serverName]);
      }

      const domain = new ZBouncerDomainBuilder().host(serverName).build();
      const { security } = this._config;

      this._cert.create(domain, security).then((x509) => {
        certs[serverName] = x509.cert;
        const ctx = createSecureContext({ cert: x509.cert });
        cb(null, ctx);
      });
    };

    const options: ServerOptions = {
      SNICallback,
    };

    this._server = createServer(options, (req, res) => {
      const { host } = req.headers;

      const hostIndex = findIndex(
        this._config.domains,
        (domain) => domain.host.toLowerCase() === host?.toLowerCase(),
      );

      if (hostIndex < 0) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            message: `Could not find mapping for host, ${host}`,
          }),
        );
        return;
      }

      const domain = this._config.domains[hostIndex];

      // TODO: This needs to be pre-processed to sort in the correct order.
      // Paths match by the longest match wins.
      const { path } = new ZUrlBuilder()
        .parse(firstDefined("", req.url))
        .info();

      const { paths } = domain;
      const sorted = Object.keys(paths);
      sorted.sort((a, b) => a.localeCompare(b) * -1);

      res.writeHead(404, { "content-type": "application/json" });
      res.end(
        JSON.stringify({ message: `Could not find mapping for path, ${path}` }),
      );
    });

    return this._server;
  }
}
