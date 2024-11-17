export interface IZProxyDomain {
  name: string;
  paths: Record<string, string>;
}

export interface IZProxySecurity {
  organization: string;
  country: string;
  state: string;
  city: string;
  email: string;
}

export interface IZProxyConfigTemplate {
  security?: Partial<IZProxySecurity>;
  domains?: IZProxyDomain[];
}

export interface IZProxyConfig {
  security: IZProxySecurity;
  domains: IZProxyDomain[];
}

export class ZProxyConfigBuilder {
  private _config: IZProxyConfig;

  public constructor() {
    this._config = {
      domains: [],
      security: {
        organization: "Developer Proxy Org",
        country: "United States",
        state: "California",
        city: "Irvine",
        email: "admin@dev-proxy.org",
      },
    };
  }

  public assign(config: IZProxyConfigTemplate) {
    this._config = structuredClone(this._config);
    this._config.domains =
      config.domains?.slice() ?? this._config.domains.slice();
    this._config.security = {
      ...{},
      ...this._config.security,
      ...config.security,
    };
    return this;
  }

  public build() {
    return structuredClone(this._config);
  }
}
