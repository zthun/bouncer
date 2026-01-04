import { ZLoggerSilent } from "@zthun/lumberjacky-log";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZBouncerCertGeneratorSelfSigned } from "../cert/cert-generator-self-signed.mjs";
import { ZBouncerConfigServerBuilder } from "../config/config-server.mjs";
import { ZBouncerRequestHandlerForward } from "../request/request-handler-forward.mjs";
import { ZBouncerNodeServerFactoryHttps } from "./node-server-factory-https.mjs";
import { ZBouncerServer, type IZBouncerServer } from "./server.mjs";

describe("Https", () => {
  const logger = new ZLoggerSilent();

  const config = new ZBouncerConfigServerBuilder().domains({}).build();
  const handler = new ZBouncerRequestHandlerForward(config.domains, logger);
  const cert = new ZBouncerCertGeneratorSelfSigned(config.security, logger);
  const factory = new ZBouncerNodeServerFactoryHttps(config, cert, handler);

  let _proxy: IZBouncerServer;

  beforeAll(async () => {
    _proxy = new ZBouncerServer(factory, logger);

    await _proxy.start();
    await _proxy.start();
  });

  afterAll(async () => {
    await _proxy.stop();
    await _proxy.stop();
  });

  it("should mark the server started", async () => {
    expect(await _proxy.running()).toBeTruthy();
  });

  it("should fail to create a server if the server is already running", async () => {
    // Arrange.
    const target = new ZBouncerServer(factory, logger);

    // Act.
    await target.start();
    const actual = await target.running();
    await target.stop();

    // Assert.
    expect(actual).toBeFalsy();
  });
});
