import { ZLoggerSilent } from "@zthun/lumberjacky-log";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ZBouncerConfigServerBuilder } from "../config/config-server.mjs";
import { ZBouncerRequestHandlerForward } from "../request/request-handler-forward.mjs";
import { ZBouncerNodeServerFactoryHttp } from "./node-server-factory-http.mjs";
import { type IZBouncerServer, ZBouncerServer } from "./server.mjs";

describe("Http", () => {
  const logger = new ZLoggerSilent();
  const domains = {};

  const config = new ZBouncerConfigServerBuilder().domains(domains).build();
  const handler = new ZBouncerRequestHandlerForward(domains, logger);
  const factory = new ZBouncerNodeServerFactoryHttp(config, handler);

  let _proxy: IZBouncerServer;

  beforeEach(async () => {
    _proxy = new ZBouncerServer(factory, logger);

    await _proxy.start();
    await _proxy.start();
  });

  afterEach(async () => {
    await _proxy.stop();
    await _proxy.stop();
  });

  it("should mark the server started", async () => {
    expect(await _proxy.running()).toBeTruthy();
  });

  it("should stop the server", async () => {
    // Arrange.
    await _proxy.stop();

    // Act.
    const actual = await _proxy.running();

    // Assert.
    expect(actual).toBeFalsy();
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
