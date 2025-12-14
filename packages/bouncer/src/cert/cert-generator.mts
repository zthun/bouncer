import { createGuid, firstDefined } from "@zthun/helpful-fn";
import type { IZLogger } from "@zthun/lumberjacky-log";
import { ZLogEntryBuilder, ZLoggerContext } from "@zthun/lumberjacky-log";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { IZBouncerCertSecurity } from "./cert-security.mjs";
import { ZBouncerCertBuilder, type IZBouncerCert } from "./cert.mjs";

export interface IZBouncerCertGenerator {
  generate(security: IZBouncerCertSecurity): Promise<IZBouncerCert>;
  destroy(): Promise<void>;
}

export class ZBouncerCertGeneratorOpenSsl implements IZBouncerCertGenerator {
  private _certDir: string | null = null;
  private _logger: IZLogger;

  public constructor(logger: IZLogger) {
    this._logger = new ZLoggerContext("ZBouncerCertGeneratorOpenSsl", logger);
  }

  public async generate({
    country,
    state,
    city,
    organization,
    domain,
  }: IZBouncerCertSecurity): Promise<IZBouncerCert> {
    this._certDir = resolve(tmpdir(), "zthunworks/bouncer/cert", createGuid());

    let msg = `Creating a temporary certificate at ${this._certDir}`;
    this._logger.log(new ZLogEntryBuilder().info().message(msg).build());
    await mkdir(this._certDir);
    const keyPath = join(this._certDir, "key.pem");
    const certPath = join(this._certDir, "cert.pem");
    const subject = `/C=${country}/ST=${state}/L=${city}/O=${organization}/CN=${domain}`;

    const args = [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "1",
      "-subj",
      subject,
    ];

    const { status, stderr, error } = spawnSync("openssl", args);

    if (status !== 0) {
      const fallback = new Error(stderr.toString());
      const _error = firstDefined(fallback, error);
      msg = `Failed to create certificates: ${_error.message}`;
      this._logger.log(new ZLogEntryBuilder().error().message(msg).build());
      throw _error;
    }

    return new ZBouncerCertBuilder()
      .key(await readFile(keyPath))
      .cert(await readFile(certPath))
      .build();
  }

  public async destroy() {
    if (this._certDir) {
      await rm(this._certDir, { recursive: true, force: true });
    }

    this._certDir = null;
  }
}
