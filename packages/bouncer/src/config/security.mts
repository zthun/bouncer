export interface IZBouncerSecurity {
  organization: string;
  country: string;
  state: string;
  city: string;
  email: string;
}

export class ZBouncerSecurityBuilder {
  private _security: IZBouncerSecurity;

  public constructor() {
    this._security = {
      organization: "Developer Proxy Org",
      country: "United States",
      state: "California",
      city: "Irvine",
      email: "admin@dev-proxy.org",
    };
  }

  public organization(val: string) {
    this._security.organization = val;

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
