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
import { ZBouncerConfigServerBuilder } from "../config/config-server.mjs";
import {
  HttpErrorBadGateway,
  ZBouncerRequestHandlerForward,
} from "../request/request-handler-forward.mjs";
import { ZBouncerServerFactoryHttps } from "./node-server-factory-https.mjs";
import { ZBouncerServer, type IZBouncerServer } from "./server.mjs";

describe("Server", () => {
  const logger = new ZLoggerSilent();
  const domains = {
    localhost: {
      "/eighty-eighty": "http://localhost:8080",
      "/eighty-eighty/api": "http://localhost:8081",
      "/eighty-eighty-one": "http://localhost:8081",
      "/bad-gateway": "http://localhost:8082",
      "/shut-it-down": null,
      "/echo": "http://localhost:9001",
      "/no-body": "http://localhost:9002",
      "/stream-error": "http://localhost:9003",
    },
  };

  let _server8080: Server;
  let _server8081: Server;
  let _serverNoBody: Server;
  let _serverEcho: Server;
  let _serverError: Server;

  beforeAll(async () => {
    _server8080 = createServer();
    _server8081 = createServer();
    _serverEcho = createServer();
    _serverNoBody = createServer();
    _serverError = createServer();

    _server8080.on("request", writeBackPort.bind(null, 8080));
    _server8081.on("request", writeBackPort.bind(null, 8081));
    _serverEcho.on("request", echoBody);
    _serverNoBody.on("request", returnNoBody);
    _serverError.on("request", writeChunkThenError);

    _server8080.listen(8080);
    _server8081.listen(8081);
    _serverEcho.listen(9001);
    _serverNoBody.listen(9002);
    _serverError.listen(9003);
  });

  afterAll(async () => {
    _server8080.close();
    _server8081.close();
    _serverEcho.close();
    _serverNoBody.close();
    _serverError.close();
  });

  function writeBackPort(
    port: number,
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    const { url } = req;
    res
      .writeHead(200, { "content-type": ZMimeTypeText.Plain })
      .end(`${url}--${port}`);
  }

  function echoBody(req: IncomingMessage, res: ServerResponse) {
    let body = "";

    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" }).end(body);
    });

    req.on("error", () => {
      res.writeHead(500).end();
    });
  }

  function returnNoBody(_: IncomingMessage, res: ServerResponse) {
    res.writeHead(204).end();
  }

  function writeChunkThenError(_: IncomingMessage, res: ServerResponse) {
    res.writeHead(200, { "content-type": ZMimeTypeText.Plain });
    res.write("partial");
    res.destroy(new Error("stream error"));
  }

  function invokeUrl(url: string, method: string = "GET", body?: string) {
    return new Promise<{
      status: number;
      data: string;
      headers: IncomingHttpHeaders;
    }>((res, rej) => {
      const options: RequestOptions = {
        method,
        agent: new Agent({
          rejectUnauthorized: false,
        }),
        rejectUnauthorized: false,
        headers: body
          ? {
              "content-type": "application/json",
              "content-length": Buffer.byteLength(body),
            }
          : undefined,
      };

      const client = request(url, options, (msg) => {
        let chunks = "";
        let ended = false;

        msg.on("data", (chunk) => {
          chunks += chunk;
        });

        msg.on("aborted", () => {
          rej({
            status: 500,
            data: "aborted",
            headers: msg.headers,
          });
        });

        msg.on("error", (err) => {
          rej({
            status: 500,
            data: err.message,
            headers: msg.headers,
          });
        });

        msg.on("end", () => {
          ended = true;
          const result = {
            status: firstDefined(200, msg.statusCode),
            data: chunks,
            headers: msg.headers,
          };
          res(result);
        });

        msg.on("close", () => {
          if (!ended) {
            rej({
              status: 500,
              data: "closed",
              headers: msg.headers,
            });
          }
        });
      });

      if (body) {
        client.write(body);
      }

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
    which: keyof typeof domains.localhost,
    method?: string,
    body?: string,
  ) {
    return invokeUrl(
      new ZUrlBuilder()
        .protocol("https")
        .hostname("localhost")
        .path(which)
        .build(),
      method,
      body,
    );
  }

  describe("Https", () => {
    const config = new ZBouncerConfigServerBuilder().domains(domains).build();
    const handler = new ZBouncerRequestHandlerForward(config.domains, logger);
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
          .hostname("127.0.0.1")
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
        const expected = "/eighty-eighty--8080";

        // Act.
        const response = await invokeEndpoint("/eighty-eighty");
        const { data: actual } = response;

        // Assert.
        expect(actual).toEqual(expected);
      });

      it("should forward the request to the correct path", async () => {
        // Arrange.
        const expected = "/eighty-eighty-one--8081";

        // Act.
        const response = await invokeEndpoint("/eighty-eighty-one");
        const { data: actual } = response;

        // Assert.
        expect(actual).toEqual(expected);
      });

      it("should include the entire path once matched", async () => {
        // Arrange.
        const path = `/eighty-eighty/some/more/routing`;
        const expected = `${path}--8080`;

        // Act.
        const response = await invokeUrl(
          new ZUrlBuilder()
            .protocol("https")
            .hostname("localhost")
            .path(path)
            .build(),
        );
        const { data: actual } = response;

        // Assert.
        expect(actual).toEqual(expected);
      });

      it("should only match path segments, not partial paths", async () => {
        // Arrange.
        const path = `/eighty-eighty/api-x`;
        // Note: the / path is matched on 8080, so the 8080 path should be hit.
        const expected = "/eighty-eighty/api-x--8080";

        // Act.
        const response = await invokeUrl(
          new ZUrlBuilder()
            .protocol("https")
            .hostname("localhost")
            .path(path)
            .build(),
        );
        const { data: actual } = response;

        // Assert.
        expect(actual).toEqual(expected);
      });

      it("should normalize the paths", async () => {
        // Arrange.
        const url = "https://localhost//////eighty-eighty-one/////";
        const expected = "/eighty-eighty-one--8081";

        // Act.
        const response = await invokeUrl(url);
        const { data: actual } = response;

        // Assert.
        expect(actual).toEqual(expected);
      });

      it("should return a bad gateway error if the target server exists but cannot connect on the given port", async () => {
        // Arrange.

        // Act.
        const response = await invokeEndpoint("/bad-gateway");
        const { status } = response;

        // Assert.
        expect(status).toEqual(HttpErrorBadGateway);
      });

      it("should return a 404 if the api path is shut down (to points to falsy)", async () => {
        // Arrange.

        // Act.
        const response = await invokeEndpoint("/shut-it-down");
        const { status } = response;

        // Assert.
        expect(status).toEqual(404);
      });
    });

    describe("Body", () => {
      it("should send the body", async () => {
        // Arrange.
        const expected = JSON.stringify({ foo: "bar" });

        // Act.
        const response = await invokeEndpoint("/echo", "POST", expected);
        const actual = response;

        // Assert.
        expect(actual.status).toEqual(200);
        expect(actual.data).toEqual(expected);
      });

      it("should at least send back the status code of 204 if no body is provided", async () => {
        // Arrange.

        // Act.
        const { status: actual } = await invokeEndpoint("/no-body");

        // Assert.
        expect(actual).toEqual(204);
      });
    });

    describe("Error", () => {
      it("should return a 502 (bad gateway) error if there is a failure when writing back the stream", async () => {
        // Arrange.

        // Act.
        const actual = await invokeEndpoint("/stream-error");

        // Assert.
        expect(actual).toMatchObject({ status: 502 });
      });
    });
  });
});
