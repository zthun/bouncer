import { merge } from "lodash-es";
import { IZBouncerBind, ZBouncerBindBuilder } from "./config-bind.mjs";
import { IZBouncerDomain } from "./config-domain.mjs";
import {
  IZBouncerSecurity,
  ZBouncerSecurityBuilder,
} from "./config-security.mjs";

export interface IZBouncerConfig {
  http: IZBouncerBind;
  https: IZBouncerBind;
  security: IZBouncerSecurity;
  domains: IZBouncerDomain[];
}

export class ZBouncerConfigBuilder {
  private _config: IZBouncerConfig;

  public constructor() {
    this._config = {
      http: new ZBouncerBindBuilder().build(),
      https: new ZBouncerBindBuilder().build(),
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

  public http(bind: IZBouncerBind) {
    this._config.http = bind;
    return this;
  }

  public https(bind: IZBouncerBind) {
    this._config.https = bind;
    return this;
  }

  public assign(config: Partial<IZBouncerConfig>) {
    this._config = merge(this._config, config);
    return this;
  }

  public build() {
    return structuredClone(this._config);
  }
}
