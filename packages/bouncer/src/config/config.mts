export interface IZBouncerDomain {
  name: string;
  paths: Record<string, string>;
}

export interface IZBouncerSecurity {
  organization: string;
  country: string;
  state: string;
  city: string;
  email: string;
}

export interface IZBouncerConfigTemplate {
  security?: Partial<IZBouncerSecurity>;
  domains?: IZBouncerDomain[];
}

export interface IZBouncerConfig {
  security: IZBouncerSecurity;
  domains: IZBouncerDomain[];
}

export class ZBouncerConfigBuilder {
  private _config: IZBouncerConfig;

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

  public assign(config: IZBouncerConfigTemplate) {
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
