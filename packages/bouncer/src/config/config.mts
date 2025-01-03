import { merge } from "lodash-es";
import { IZBouncerDomain } from "./config-domain.mjs";
import {
  IZBouncerSecurity,
  ZBouncerSecurityBuilder,
} from "./config-security.mjs";

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

  public domains(domains: IZBouncerDomain[]) {
    this._config.domains = domains;

    return this;
  }

  public domain(domain: IZBouncerDomain) {
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
