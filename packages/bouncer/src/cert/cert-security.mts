export interface IZBouncerCertSecurity {
  organization: string;
  country: string;
  state: string;
  city: string;
  email: string;
  domain: string;
}

export class ZBouncerCertSecurityBuilder {
  private _security: IZBouncerCertSecurity;

  public constructor() {
    this._security = {
      organization: "Developer Proxy Org",
      country: "US",
      state: "California",
      city: "Irvine",
      email: "admin@dev-proxy.org",
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

  public email(val: string) {
    this._security.email = val;

    return this;
  }

  public build() {
    return structuredClone(this._security);
  }
}
