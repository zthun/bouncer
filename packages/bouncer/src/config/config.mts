import { merge } from "lodash-es";
import type { IZBouncerConfigDomain } from "./config-domain.mjs";
import type { IZBouncerConfigSecurity } from "./config-security.mjs";
import { ZBouncerConfigSecurityBuilder } from "./config-security.mjs";

export interface IZBouncerConfig {
  security: IZBouncerConfigSecurity;
  domains: IZBouncerConfigDomain[];
}

export class ZBouncerConfigBuilder {
  private _config: IZBouncerConfig;

  public constructor() {
    this._config = {
      domains: [],
      security: new ZBouncerConfigSecurityBuilder().build(),
    };
  }

  public domains(domains: IZBouncerConfigDomain[]) {
    this._config.domains = domains;

    return this;
  }

  public domain(domain: IZBouncerConfigDomain) {
    return this.domains(this._config.domains.concat(domain));
  }

  public assign(config: Partial<IZBouncerConfig>) {
    this._config = merge(this._config, config);
    return this;
  }

  public build() {
    return structuredClone(this._config);
  }
}
