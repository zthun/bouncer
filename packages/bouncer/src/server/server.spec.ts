import { firstDefined } from "@zthun/helpful-fn";
import { ZLoggerSilent } from "@zthun/lumberjacky-log";
import { ZMimeTypeText, ZUrlBuilder } from "@zthun/webigail-url";
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  Server,
  ServerResponse,
} from "node:http";
import { createServer } from "node:http";
import type { RequestOptions } from "node:https";
import { Agent, request } from "node:https";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZBouncerCertGeneratorSelfSigned } from "../cert/cert-generator-self-signed.mjs";
import { ZBouncerDomainBuilder } from "../config/config-domain.mjs";
import { ZBouncerConfigBuilder } from "../config/config.mjs";
import {
  HttpErrorBadGateway,
  ZBouncerRequestHandlerForward,
} from "../request/request-handler-forward.mjs";
import { ZBouncerServerFactoryHttps } from "./node-server-factory-https.mjs";
import { ZBouncerServer, type IZBouncerServer } from "./server.mjs";

describe("Server", () => {
  const logger = new ZLoggerSilent();
  const localhost = new ZBouncerDomainBuilder()
    .host("localhost")
    .path("/eighty-eighty", "http://localhost:8080")
    .path("/eighty-eighty-one", "http://localhost:8081")
    .path("/bad-gateway", "http://localhost:8082")
    .build();
  const config = new ZBouncerConfigBuilder().domain(localhost).build();
  const handler = new ZBouncerRequestHandlerForward(config.domains, logger);

  let _server8080: Server;
  let _server8081: Server;

  beforeAll(async () => {
    _server8080 = createServer();
    _server8081 = createServer();

    const writeBackPort = (
      port: number,
      _: IncomingMessage,
      res: ServerResponse,
    ) => {
      res
        .writeHead(200, { "content-type": ZMimeTypeText.Plain })
        .end(String(port));
    };

    _server8080.on("request", writeBackPort.bind(null, 8080));
    _server8081.on("request", writeBackPort.bind(null, 8081));

    _server8080.listen(8080);
    _server8081.listen(8081);
  });

  afterAll(async () => {
    _server8080.close();
    _server8081.close();
  });

  function invokeUrl(url: string) {
    return new Promise<{
      status: number;
      data: string;
      headers: IncomingHttpHeaders;
    }>((res, rej) => {
      const options: RequestOptions = {
        agent: new Agent({
          rejectUnauthorized: false,
        }),
        rejectUnauthorized: false,
      };

      const client = request(url, options, (msg) => {
        let chunks = "";

        msg.on("data", (chunk) => {
          chunks += chunk;
        });

        msg.on("end", () => {
          const result = {
            status: firstDefined(200, msg.statusCode),
            data: chunks,
            headers: msg.headers,
          };
          res(result);
        });
      });

      client.on("error", (err) => {
        rej({
          status: 500,
          data: err.message,
          headers: {},
        });
      });

      client.end();
    });
  }

  function invokeEndpoint(
    which: "eighty-eighty" | "eighty-eighty-one" | "bad-gateway",
  ) {
    return invokeUrl(
      new ZUrlBuilder()
        .protocol("https")
        .hostname("localhost")
        .path(which)
        .build(),
    );
  }

  describe("Https", () => {
    const cert = new ZBouncerCertGeneratorSelfSigned(config.security, logger);
    const factory = new ZBouncerServerFactoryHttps(cert, handler);

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

    describe("Missing config entry", () => {
      it("should return a 404 error if no such mapping can be found", async () => {
        // Arrange.
        const url = new ZUrlBuilder()
          .protocol("https")
          .hostname("local.zthunworks.com")
          .build();

        // Act.
        const actual = invokeUrl(url);

        // Assert.
        await expect(actual).resolves.toEqual(
          expect.objectContaining({ status: 404 }),
        );
      });

      it("should return a 404 error if the host is discovered but the path cannot be found", async () => {
        // Arrange.
        const url = "https://localhost/api";

        // Act.
        const actual = invokeUrl(url);

        // Assert.
        await expect(actual).resolves.toEqual(
          expect.objectContaining({ status: 404 }),
        );
      });
    });

    describe("Found config entry", () => {
      it("should forward the request", async () => {
        // Arrange.
        const expected = "8080";

        // Act.
        const response = await invokeEndpoint("eighty-eighty");
        const { data: actual } = response;

        // Assert.
        expect(actual).toEqual(expected);
      });

      it("should forward the request to the correct path", async () => {
        // Arrange.
        const expected = "8081";

        // Act.
        const response = await invokeEndpoint("eighty-eighty-one");
        const { data: actual } = response;

        // Assert.
        expect(actual).toEqual(expected);
      });

      it("should return a bad gateway error if the target server exists but cannot connect on the given port", async () => {
        // Arrange.

        // Act.
        const response = await invokeEndpoint("bad-gateway");
        const { status } = response;

        // Assert.
        expect(status).toEqual(HttpErrorBadGateway);
      });
    });
  });
});
