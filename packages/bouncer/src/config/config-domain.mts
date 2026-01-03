export interface IZBouncerConfigDomain {
  host: string;
  paths: Record<string, string>;
}

export class ZBouncerConfigDomainBuilder {
  private _domain: IZBouncerConfigDomain;

  public constructor() {
    this._domain = {
      host: "localhost",
      paths: {},
    };
  }

  public host(val: string) {
    this._domain.host = val;

    return this;
  }

  public path(path: string, redirect: string) {
    this._domain.paths[path] = redirect;

    return this;
  }

  public build() {
    return structuredClone(this._domain);
  }
}
