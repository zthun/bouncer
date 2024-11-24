export interface IZBouncerBind {
  host?: string;
  port?: number;
}

export class ZBouncerBindBuilder {
  private _bind: IZBouncerBind;

  public constructor() {
    this._bind = {};
  }

  public host(val: string) {
    this._bind.host = val;
    return this;
  }

  public all = this.host.bind(this, "0.0.0.0");

  public port(val: number) {
    this._bind.port = val;

    return this;
  }

  public http = this.port.bind(this, 80);
  public https = this.port.bind(this, 443);

  public build(): IZBouncerBind {
    return structuredClone(this._bind);
  }
}
