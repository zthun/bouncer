import {
  IZLogger,
  ZLogEntryBuilder,
  ZLoggerContext,
} from "@zthun/lumberjacky-log";
import {
  HttpReverseProxy,
  HttpReverseProxyOptions,
  HttpsServerOptions,
  LetsEncryptSelfSignedOptions,
  LetsEncryptUsingSelfSigned,
  RouteRegistrationOptions,
} from "http-reverse-proxy-ts";
import { join } from "node:path";
import { cwd } from "node:process";
import { IZBouncerConfig } from "../config/config.mjs";

export interface IZBouncerServer {
  running(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class ZBouncerServer implements IZBouncerServer {
  private _log: IZLogger;
  private _proxy: HttpReverseProxy | null = null;

  public constructor(
    public config: IZBouncerConfig,
    log: IZLogger,
  ) {
    this._log = new ZLoggerContext("ZBouncerServer", log);
  }

  public async running(): Promise<boolean> {
    return this._proxy != null;
  }

  public async start(): Promise<void> {
    this._log.log(
      new ZLogEntryBuilder()
        .info()
        .message(`Current working directory: ${cwd()}`)
        .build(),
    );

    const letsEncryptOptions: LetsEncryptSelfSignedOptions = {
      country: this.config.security.country,
      locality: this.config.security.city,
      organizationName: this.config.security.organization,
      state: this.config.security.state,
    };

    const httpsOptions: HttpsServerOptions = {
      certificates: {
        certificateStoreRoot: "./.certificates",
      },
    };

    const options: HttpReverseProxyOptions = {
      letsEncryptOptions,
      httpsOptions,
    };

    const registrationOptions: RouteRegistrationOptions = {
      https: {
        redirectToHttps: true,
        letsEncrypt: {
          email: this.config.security.email,
          production: false,
        },
      },
    };

    this._proxy = new HttpReverseProxy(options, LetsEncryptUsingSelfSigned);

    this.config.domains.forEach((d) => {
      Object.keys(d.paths).forEach((p) => {
        const endpoint = join(d.host, p);
        const forward = d.paths[p];
        this._log.log(
          new ZLogEntryBuilder()
            .info()
            .message(`Adding route, ${endpoint}, to ${forward}`)
            .build(),
        );
        this._proxy?.addRoute(endpoint, forward, registrationOptions);
      });
    });

    this._log.log(
      new ZLogEntryBuilder().info().message("Proxy server started").build(),
    );
  }

  stop(): Promise<void> {
    this._proxy?.close();
    this._proxy = null;
    return Promise.resolve();
  }
}
