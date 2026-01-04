export interface IZBouncerConfigSecurity {
  organization: string;
  country: string;
  state: string;
  city: string;
  domain: string;
}

export class ZBouncerConfigSecurityBuilder {
  private _security: IZBouncerConfigSecurity;

  public constructor() {
    this._security = {
      organization: "Developer Proxy Org",
      country: "US",
      state: "California",
      city: "Irvine",
      domain: "localhost",
    };
  }

  public organization(val: string) {
    this._security.organization = val;

    return this;
  }

  public country(val: string) {
    this._security.country = val;

    return this;
  }

  public copy(other: IZBouncerConfigSecurity) {
    this._security = structuredClone(other);

    return this;
  }

  public assign(other: Partial<IZBouncerConfigSecurity>) {
    this._security = { ...this._security, ...other };

    return this;
  }

  public build() {
    return structuredClone(this._security);
  }
}
