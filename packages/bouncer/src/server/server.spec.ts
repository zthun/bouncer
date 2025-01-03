import { firstDefined } from "@zthun/helpful-fn";
import { ZLoggerSilent } from "@zthun/lumberjacky-log";
import {
  IZHttpResult,
  ZHttpCodeServer,
  ZHttpCodeSuccess,
  ZHttpRequestBuilder,
  ZHttpResultBuilder,
  ZHttpService,
} from "@zthun/webigail-http";
import { ZMimeTypeText, ZUrlBuilder } from "@zthun/webigail-url";
import {
  createServer,
  IncomingMessage,
  Server,
  ServerResponse,
} from "node:http";
import { Agent, request, RequestOptions } from "node:https";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZBouncerDomainBuilder } from "../config/config-domain.mjs";
import { ZBouncerConfigBuilder } from "../config/config.mjs";
import { IZBouncerServer, ZBouncerServer } from "./server.mjs";

describe("Server", () => {
  let _server8080: Server;
  let _server8081: Server;
  let _proxy: IZBouncerServer;

  beforeAll(async () => {
    const localhost = new ZBouncerDomainBuilder()
      .host("localhost")
      .path("/eighty-eighty", "http://localhost:8080")
      .path("/eighty-eighty-one", "http://localhost:8081")
      .build();
    const config = new ZBouncerConfigBuilder().domain(localhost).build();
    _proxy = new ZBouncerServer(config, new ZLoggerSilent());

    await _proxy.start();

    _server8080 = createServer();
    _server8081 = createServer();

    const writeBackPort = (
      port: number,
      _: IncomingMessage,
      res: ServerResponse,
    ) => {
      res.writeHead(200, { "content-type": ZMimeTypeText.Plain });
      res.end(String(port));
    };

    _server8080.on("request", writeBackPort.bind(null, 8080));
    _server8081.on("request", writeBackPort.bind(null, 8081));

    _server8080.listen(8080);
    _server8081.listen(8081);
  });

  afterAll(async () => {
    _server8080.close();
    _server8081.close();

    await _proxy.stop();
  });

  function invokeEndpoint(which: "eighty-eighty" | "eighty-eighty-one") {
    return new Promise<IZHttpResult>((res, rej) => {
      const url = new ZUrlBuilder()
        .protocol("https")
        .hostname("localhost")
        .path(which)
        .build();

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

  it("should mark the server started", async () => {
    expect(await _proxy.running()).toBeTruthy();
  });

  describe.sequential("Missing config entry", () => {
    it("should return a 404 error if no such mapping can be found", async () => {
      // Arrange.

      // Act.
      const url = new ZUrlBuilder().hostname("local.zthunworks.com").build();
      const request = new ZHttpRequestBuilder().get().url(url).build();
      const actual = new ZHttpService().request(request);

      // Assert.
      await expect(actual).rejects.toEqual(
        expect.objectContaining({ status: 404 }),
      );
    });

    it("should return a 404 error if the host is discovered but the path cannot be found", async () => {
      // Arrange.
      const url = new ZUrlBuilder().hostname("localhost").append("api").build();

      // Act.
      const request = new ZHttpRequestBuilder().url(url).get().build();
      const actual = new ZHttpService().request(request);

      // Assert.
      await expect(actual).rejects.toEqual(
        expect.objectContaining({ status: 404 }),
      );
    });
  });

  describe.sequential("Found config entry", () => {
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
