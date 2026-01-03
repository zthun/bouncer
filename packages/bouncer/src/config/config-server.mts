import { firstDefined, type ZDeepPartial } from "@zthun/helpful-fn";
import { isUndefined, merge, omitBy } from "lodash-es";
import {
  ZBouncerConfigSecurityBuilder,
  type IZBouncerConfigSecurity,
} from "./config-security.mjs";

/**
 * The type of server that will be running.
 */
export enum ZBouncerConfigServerType {
  /**
   * Http server.
   *
   * Mostly used for redirection.
   */
  Http = "http",
  /**
   * Https server.
   */
  Https = "https",
}

/**
 * A domain mapping of domains to paths to internal resource.
 */
export type ZBouncerDomainMap = Record<
  string,
  Record<string, string | null | undefined>
>;

/**
 * Represents a configuration for a running server.
 */
export interface IZBouncerConfigServer {
  /**
   * The type of server.
   *
   * The default value is {@link ZBouncerConfigServerType.Http}
   */
  type: ZBouncerConfigServerType;

  /**
   * Port number.
   *
   * If this is falsy, the the default port is determined by the server
   * protocol.
   */
  port?: number;

  /**
   * The security for the server.  This is only valid for https servers.
   */
  security?: IZBouncerConfigSecurity;

  /**
   * The domain mappings.
   */
  domains: ZBouncerDomainMap;
}

/**
 * A builder for a server configuration.
 */
export class ZBouncerConfigServerBuilder {
  private _config: IZBouncerConfigServer = {
    type: ZBouncerConfigServerType.Http,
    domains: {},
  };

  /**
   * Sets the server type.
   *
   * It's recommended to be explicit and use {@link http} or {@link https} instead.
   *
   * @param type -
   *        The server type.
   *
   * @returns
   *        This object.
   */
  public type(type: ZBouncerConfigServerType) {
    this._config.type = type;

    return this;
  }

  /**
   * Sets the type to {@link ZBouncerConfigServerType.Http}.
   *
   * @returns
   *        This object.
   */
  public http = this.type.bind(this, ZBouncerConfigServerType.Http);

  /**
   * Sets the type to {@link ZBouncerConfigServerType.Https}.
   *
   * @returns
   *        This object.
   */
  public https = this.type.bind(this, ZBouncerConfigServerType.Https);

  /**
   * Sets or removes the port.
   *
   * @param port -
   *        The port to set.
   *
   * @returns
   *        This object.
   */
  public port(port: number | undefined) {
    this._config.port = port;

    return this;
  }

  /**
   * Merges the security object with the existing security or sets the existing security.
   *
   * @param security -
   *        The security to merge.
   *
   * @returns
   *        This object.
   */
  public security(security: Partial<IZBouncerConfigSecurity> | undefined) {
    if (security == null) {
      return this;
    }

    const fallback = new ZBouncerConfigSecurityBuilder().build();
    const start = firstDefined(fallback, this._config.security);

    this._config.security = new ZBouncerConfigSecurityBuilder()
      .copy(start)
      .assign(security)
      .build();

    return this;
  }

  /**
   * Sets a host domain path.
   *
   * @param host -
   *        The domain host.
   *
   * @param from -
   *        The requested path.
   *
   * @param to -
   *        The mapping path.  If this is null, then an invocation to the domain on that
   *        path will be rejected with a 404.
   */
  public path(host: string, from: string, to: string | null) {
    this._config.domains[host] = firstDefined({}, this._config.domains[host]);
    this._config.domains[host][from] = to;

    return this;
  }

  /**
   * Merges a domain map into the existing domain map.
   *
   * @param domains -
   *        The domains to merge.
   *
   * @returns
   *        This object.
   */
  public domains(domains: ZBouncerDomainMap | undefined) {
    this._config.domains = merge(this._config.domains, domains);

    return this;
  }

  public copy(other: IZBouncerConfigServer) {
    this._config = structuredClone(other);

    return this;
  }

  public assign(other: ZDeepPartial<IZBouncerConfigServer>) {
    return this.type(firstDefined(this._config.type, other.type))
      .port(firstDefined(this._config.port, other.port))
      .security(other.security)
      .domains(other.domains as ZBouncerDomainMap);
  }

  public build(): IZBouncerConfigServer {
    const clone = structuredClone(this._config);

    return omitBy(clone, isUndefined) as IZBouncerConfigServer;
  }
}
