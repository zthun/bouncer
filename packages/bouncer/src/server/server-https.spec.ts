import { firstDefined } from "@zthun/helpful-fn";
import { ZLoggerSilent } from "@zthun/lumberjacky-log";
import { ZHttpRequestBuilder, ZHttpService } from "@zthun/webigail-http";
import { IncomingMessage } from "http";
import { Agent, request } from "https";
import { afterEach, describe, expect, it } from "vitest";
import { ZBouncerCertGenerateSelfSigned } from "../cert/cert-generate-self-signed";
import { ZBouncerBindBuilder } from "../config/config-bind.mjs";
import { ZBouncerDomainBuilder } from "../config/config-domain.mjs";
import { IZBouncerConfig, ZBouncerConfigBuilder } from "../config/config.mjs";
import { IZBouncerServer } from "./server";
import { ZBouncerServerHttps } from "./server-https";

/*
  domains: [
    {
      name: `database.local.zthunworks.com`,
      paths: {
        "/": "bouncer-mongo-admin:8081",
      },
    },
    {
      name: `email.local.zthunworks.com`,
      paths: {
        "/": "bouncer-email",
      },
    },
  ],
*/

describe.sequential("ZBouncerServerHttps", () => {
  let _target: IZBouncerServer | undefined;

  afterEach(async () => {
    await _target?.stop();
  });

  const createTestTarget = (config?: Partial<IZBouncerConfig>) => {
    const _config = new ZBouncerConfigBuilder()
      .assign(firstDefined({}, config))
      .build();

    _target = new ZBouncerServerHttps(
      new ZLoggerSilent(),
      new ZBouncerCertGenerateSelfSigned(),
      _config,
    );
    return _target;
  };

  describe.sequential("Start", () => {
    it("should start the server", async () => {
      // Arrange.
      const target = createTestTarget();

      // Act.
      await target.start();
      const actual = await target.running();

      // Assert.
      expect(actual).toBeTruthy();
    });

    it("should stay started if start is called more than once", async () => {
      // Arrange.
      const target = createTestTarget();
      await target.start();

      // Act.
      await target.start();
      const actual = await target.running();

      // Assert.
      expect(actual).toBeTruthy();
    });

    it("should reject if another server has already been started on the same host and port", async () => {
      // Arrange.
      const target = createTestTarget();
      await target.start();
      const other = new ZBouncerServerHttps(
        new ZLoggerSilent(),
        new ZHttpService(),
        new ZBouncerCertGenerateSelfSigned(),
        new ZBouncerConfigBuilder().build(),
      );

      // Act.
      const actual = other.start();

      // Assert.
      await expect(actual).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining("EADDRINUSE"),
        }),
      );
      await expect(other.running()).resolves.toEqual(false);
    });
  });

  describe.sequential("Stop", () => {
    it("should stop the server", async () => {
      // Arrange.
      const target = createTestTarget();
      await target.start();

      // Act.
      await target.stop();
      const actual = await target.running();

      // Assert.
      expect(actual).toBeFalsy();
    });

    it("should ignore stop events if the server is already stopped", async () => {
      // Arrange.
      const target = createTestTarget();
      await target.stop();
      await target.start();

      // Act.
      await target.stop();
      await target.stop();
      const actual = await target.running();

      // Assert.
      expect(actual).toEqual(false);
    });
  });

  describe.sequential("Missing config entry", () => {
    it("should return a 404 error if no such mapping can be found", async () => {
      // Arrange.
      const target = createTestTarget();
      await target.start();

      // Act.
      const result = await new Promise<IncomingMessage>((res) => {
        const options = {
          hostname: "localhost",
          port: 443,
          method: "GET",
          agent: new Agent({
            rejectUnauthorized: false,
          }),
        };

        const cr = request(options, (result) => {
          res(result);
        });

        cr.end();
      });
      const actual = result.statusCode;

      // Assert.
      expect(actual).toEqual(404);
    });

    it("should return a 404 error if the host is discovered but the path cannot be found", async () => {
      // Arrange.
      const http = new ZBouncerBindBuilder().all().http().build();
      const https = new ZBouncerBindBuilder().all().https().build();
      const localhost = new ZBouncerDomainBuilder()
        .host("localhost")
        .path("/config", "localhost:8080")
        .path("/config/api", "localhost:8081")
        .build();
      const config = new ZBouncerConfigBuilder()
        .https(https)
        .http(http)
        .domain(localhost)
        .build();
      const target = createTestTarget(config);
      await target.start();

      // Act.
      const agent = new Agent({
        rejectUnauthorized: false,
      });
      const request = new ZHttpRequestBuilder().url(url).get().build();
      const actual = new ZHttpService().request(request);

      // Assert.
      await expect(actual).rejects.toEqual(
        expect.objectContaining({ status: 404 }),
      );
    });
  });
});
