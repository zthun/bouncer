export interface IZBouncerCert {
  key?: Buffer;
  cert?: Buffer;
}

export class ZBouncerCertBuilder {
  private readonly _cert: IZBouncerCert = {};

  public key(val: Buffer) {
    this._cert.key = val;

    return this;
  }

  public cert(val: Buffer) {
    this._cert.cert = val;

    return this;
  }

  public build() {
    return { ...this._cert };
  }
}
