import { firstDefined } from "@zthun/helpful-fn";
import { ZLoggerSilent } from "@zthun/lumberjacky-log";
import type { IZHttpResult } from "@zthun/webigail-http";
import {
  ZHttpCodeServer,
  ZHttpCodeSuccess,
  ZHttpResultBuilder,
  ZHttpService,
} from "@zthun/webigail-http";
import { ZMimeTypeText, ZUrlBuilder } from "@zthun/webigail-url";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import type { RequestOptions } from "node:https";
import { Agent, request } from "node:https";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZBouncerCertGeneratorSelfSigned } from "../cert/cert-generator-self-signed.mjs";
import { ZBouncerDomainBuilder } from "../config/config-domain.mjs";
import { ZBouncerConfigBuilder } from "../config/config.mjs";
import { ZBouncerRequestHandlerForward } from "../request/request-handler-forward.mjs";
import { ZBouncerServerFactoryHttps } from "./node-server-factory-https.mjs";
import { ZBouncerServer, type IZBouncerServer } from "./server.mjs";

describe("Server", () => {
  const logger = new ZLoggerSilent();
  const localhost = new ZBouncerDomainBuilder()
    .host("localhost")
    .path("/eighty-eighty", "http://localhost:8080")
    .path("/eighty-eighty-one", "http://localhost:8081")
    .build();
  const config = new ZBouncerConfigBuilder().domain(localhost).build();
  const http = new ZHttpService();
  const handler = new ZBouncerRequestHandlerForward(config, http);

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
    return new Promise<IZHttpResult>((res, rej) => {
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
          const result = new ZHttpResultBuilder(chunks)
            .status(firstDefined(ZHttpCodeSuccess.OK, msg.statusCode))
            .headers(msg.headers)
            .build();
          res(result);
        });
      });

      client.on("error", (err) => {
        const result = new ZHttpResultBuilder(err.message)
          .status(ZHttpCodeServer.InternalServerError)
          .build();
        rej(result);
      });

      client.end();
    });
  }

  function invokeEndpoint(which: "eighty-eighty" | "eighty-eighty-one") {
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
    });
  });
});
