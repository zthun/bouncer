import { IZBouncerDomain } from "./domain.mjs";
import { IZBouncerSecurity, ZBouncerSecurityBuilder } from "./security.mjs";

export interface IZBouncerConfig {
  security: IZBouncerSecurity;
  domains: IZBouncerDomain[];
}

export class ZBouncerConfigBuilder {
  private _config: IZBouncerConfig;

  public constructor() {
    this._config = {
      domains: [],
      security: new ZBouncerSecurityBuilder().build(),
    };
  }

  public assign(config: Partial<IZBouncerConfig>) {
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
