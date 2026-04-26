import { firstDefined, type ZDeepPartial } from "@zthun/helpful-fn";
import { castArray } from "lodash-es";

import {
  type IZBouncerConfigServer,
  ZBouncerConfigServerBuilder,
} from "./config-server.mjs";

/**
 * Represents the configuration for the bounder service.
 */
export interface IZBouncerConfig {
  /**
   * The collection of servers to run.
   *
   * Servers are built by type.  If you have two servers with an identical
   * protocol, then those configs are merged in a last one wins priority.
   */
  servers: IZBouncerConfigServer[];
}

/**
 * A builder for a bouncer config object.
 */
export class ZBouncerConfigBuilder {
  private _http: IZBouncerConfigServer | undefined = undefined;
  private _https: IZBouncerConfigServer | undefined = undefined;

  private _assignServer(
    fallback: IZBouncerConfigServer,
    current: IZBouncerConfigServer | undefined,
    next: IZBouncerConfigServer,
  ) {
    return new ZBouncerConfigServerBuilder()
      .copy(firstDefined(fallback, current))
      .assign(next)
      .build();
  }

  private http(server: IZBouncerConfigServer) {
    this._http = this._assignServer(
      new ZBouncerConfigServerBuilder().http().build(),
      this._http,
      server,
    );
  }

  private https(server: IZBouncerConfigServer) {
    this._https = this._assignServer(
      new ZBouncerConfigServerBuilder().https().build(),
      this._https,
      server,
    );
  }

  /**
   * Merges the server configs into the existing config.
   *
   * @param server -
   *        A list of servers or a single server to merge
   *        into the config.
   */
  public server(server: IZBouncerConfigServer | IZBouncerConfigServer[]) {
    // Servers are merged via their types.
    const assignments = castArray(server);

    assignments.forEach((server) => {
      this[server.type](server);
    });

    return this;
  }

  /**
   * Assigns the configuration values from a deeply optional config.
   *
   * @param config -
   *        The contents of the bouncer config file.
   *
   * @returns
   *        This object.
   */
  public assign(config: ZDeepPartial<IZBouncerConfig>) {
    const { servers = [] } = config;

    const definitions = servers
      .filter((s) => !!s)
      .map((s) => new ZBouncerConfigServerBuilder().assign(s).build());

    return this.server(definitions);
  }

  /**
   * Gets the built configuration.
   *
   * @return
   *        A deep copy of the built configuration.
   */
  public build(): IZBouncerConfig {
    const servers = [this._http, this._https].filter((s) => !!s);

    return structuredClone({ servers });
  }
}
