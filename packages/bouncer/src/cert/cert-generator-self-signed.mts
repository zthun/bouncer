import { ZStreamFolder } from "@zthun/crumbtrail-fs";
import { createGuid, firstDefined } from "@zthun/helpful-fn";
import {
  ZLogEntryBuilder,
  ZLoggerContext,
  type IZLogger,
} from "@zthun/lumberjacky-log";
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { IZBouncerCertGenerator } from "./cert-generator.mjs";
import type { IZBouncerCertSecurity } from "./cert-security.mjs";
import { ZBouncerCertBuilder, type IZBouncerCert } from "./cert.mjs";

export class ZBouncerCertGeneratorSelfSigned implements IZBouncerCertGenerator {
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
    const dir = resolve(tmpdir(), "zthunworks/bouncer/cert", createGuid());
    const stream = new ZStreamFolder();

    let msg = `Creating a temporary certificate at ${dir}`;
    this._logger.log(new ZLogEntryBuilder().info().message(msg).build());
    await stream.write(dir);

    const keyPath = join(dir, "key.pem");
    const certPath = join(dir, "cert.pem");
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

    const key = await readFile(keyPath);
    const cert = await readFile(certPath);

    await rm(dir, { recursive: true, force: true });

    return new ZBouncerCertBuilder().key(key).cert(cert).build();
  }
}
