/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import { createHash, randomBytes } from "node:crypto";
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  Server,
  ServerResponse,
} from "node:http";
import { createServer } from "node:http";
import type { RequestOptions } from "node:https";
import { Agent, request } from "node:https";
import type { Duplex } from "node:stream";
import { connect as tlsConnect, type ConnectionOptions } from "node:tls";

import { createError, firstDefined } from "@zthun/helpful-fn";
import { ZLoggerSilent } from "@zthun/lumberjacky-log";
import { ZMimeTypeText, ZUrlBuilder } from "@zthun/webigail-url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ZBouncerCertGeneratorSelfSigned } from "../cert/cert-generator-self-signed.mjs";
import { ZBouncerConfigServerBuilder } from "../config/config-server.mjs";
import { ZBouncerRequestHandlerForward } from "../request/request-handler-forward.mjs";
import { ZBouncerNodeServerFactoryHttps } from "../server/node-server-factory-https.mjs";
import { type IZBouncerServer, ZBouncerServer } from "../server/server.mjs";

describe("Handler Forward", () => {
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
      "/abort": "http://localhost:9004",
      "/websocket": "http://localhost:9104",
      "/websocket-bad-gateway": "http://localhost:9105",
    },
  };

  const config = new ZBouncerConfigServerBuilder().domains(domains).build();
  const handler = new ZBouncerRequestHandlerForward(domains, logger);
  const cert = new ZBouncerCertGeneratorSelfSigned(config.security, logger);
  const factory = new ZBouncerNodeServerFactoryHttps(config, cert, handler);

  let _proxy: IZBouncerServer;
  let _server8080: Server;
  let _server8081: Server;
  let _serverNoBody: Server;
  let _serverEcho: Server;
  let _serverError: Server;
  let _serverAbort: Server;
  let _serverWebsocket: Server;

  beforeAll(async () => {
    _proxy = new ZBouncerServer(factory, logger);

    await _proxy.start();
    await _proxy.start();

    _server8080 = createServer();
    _server8081 = createServer();
    _serverEcho = createServer();
    _serverNoBody = createServer();
    _serverError = createServer();
    _serverAbort = createServer();
    _serverWebsocket = createServer();

    _server8080.on("request", writeBackPort.bind(null, 8080));
    _server8081.on("request", writeBackPort.bind(null, 8081));
    _serverEcho.on("request", echoBody);
    _serverNoBody.on("request", returnNoBody);
    _serverError.on("request", writeChunkThenError);
    _serverAbort.on("request", waitForAbort);
    _serverWebsocket.on("upgrade", acceptWebsocket);

    _server8080.listen(8080);
    _server8081.listen(8081);
    _serverEcho.listen(9001);
    _serverNoBody.listen(9002);
    _serverError.listen(9003);
    _serverAbort.listen(9004);
    _serverWebsocket.listen(9104);
  });

  afterAll(async () => {
    await _proxy.stop();
    await _proxy.stop();

    _server8080.close();
    _server8081.close();
    _serverEcho.close();
    _serverNoBody.close();
    _serverError.close();
    _serverAbort.close();
    _serverWebsocket.close();
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

  let _abortResolve: (() => void) | null = null;

  function waitForAbort(req: IncomingMessage, res: ServerResponse) {
    req.on("close", () => {
      _abortResolve?.();
      _abortResolve = null;
    });

    res.writeHead(200, { "content-type": ZMimeTypeText.Plain });
    res.write("holding");
  }

  function websocketAcceptKey(key: string | string[] | undefined) {
    const unwrapped = Array.isArray(key) ? key[0] : key;
    const seed = firstDefined("", unwrapped);
    return createHash("sha1")
      .update(seed + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
      .digest("base64");
  }

  function acceptWebsocket(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const accept = websocketAcceptKey(req.headers["sec-websocket-key"]);
    const headers = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "\r\n",
    ].join("\r\n");

    socket.write(headers);

    if (head?.length) {
      socket.write(head);
    }

    socket.on("data", (chunk) => {
      socket.write(chunk);
    });
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

  function invokeAndAbort(which: keyof typeof domains.localhost) {
    return new Promise<void>((resolve, reject) => {
      const url = new ZUrlBuilder()
        .protocol("https")
        .hostname("localhost")
        .path(which)
        .build();

      const client = request(
        url,
        {
          method: "GET",
          agent: new Agent({ rejectUnauthorized: false }),
          rejectUnauthorized: false,
        },
        () => {
          // Intentionally ignore the response, we are going to abort.
        },
      );

      client.once("error", reject);
      client.end();

      setTimeout(() => {
        client.destroy();
        resolve();
      }, 50);
    });
  }

  function invokeAndCloseAfterHeaders(which: keyof typeof domains.localhost) {
    return new Promise<void>((resolve, reject) => {
      const url = new ZUrlBuilder()
        .protocol("https")
        .hostname("localhost")
        .path(which)
        .build();

      const client = request(
        url,
        {
          method: "GET",
          agent: new Agent({ rejectUnauthorized: false }),
          rejectUnauthorized: false,
        },
        () => {
          client.destroy();
          resolve();
        },
      );

      client.once("error", reject);
      client.end();
    });
  }

  function waitWithTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Timed out waiting for abort.")),
        timeoutMs,
      );

      promise
        .then((value) => {
          clearTimeout(timeout);
          resolve(value);
        })
        .catch((error) => {
          const _error = createError(error);
          clearTimeout(timeout);
          reject(_error);
        });
    });
  }

  async function openWebsocket(path: string) {
    return new Promise<{
      socket: ReturnType<typeof tlsConnect>;
      header: string;
      remainder: Buffer;
    }>((resolve, reject) => {
      const options: ConnectionOptions = {
        host: "localhost",
        port: 443,
        rejectUnauthorized: false,
        ALPNProtocols: ["http/1.1"],
      };

      const socket = tlsConnect(options, () => {
        const key = randomBytes(16).toString("base64");
        const upgrade = [
          `GET ${path} HTTP/1.1`,
          "Host: localhost",
          "Upgrade: websocket",
          "Connection: Upgrade",
          "Sec-WebSocket-Version: 13",
          `Sec-WebSocket-Key: ${key}`,
          "\r\n",
        ].join("\r\n");

        socket.write(upgrade);
      });

      let buffer = Buffer.alloc(0);

      socket.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
        const boundary = buffer.indexOf("\r\n\r\n");

        if (boundary >= 0) {
          const header = buffer.subarray(0, boundary + 4).toString("utf-8");
          const remainder = buffer.subarray(boundary + 4);
          socket.removeAllListeners("data");
          resolve({ socket, header, remainder });
        }
      });

      socket.once("error", reject);
    });
  }

  function waitForData(socket: ReturnType<typeof tlsConnect>, seed?: Buffer) {
    return new Promise<string>((resolve, reject) => {
      const collected = seed?.length ? [seed] : [];
      const timeout = setTimeout(
        () => reject(new Error("Timed out waiting for data.")),
        2000,
      );

      socket.on("data", (chunk) => {
        collected.push(Buffer.from(chunk));
        const text = Buffer.concat(collected).toString("utf-8");

        if (text.length) {
          clearTimeout(timeout);
          resolve(text);
        }
      });

      socket.once("error", reject);
    });
  }

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
      expect(status).toEqual(502);
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

  describe("Query String", () => {
    it("should ignore (but preserve) the query string when trying to find the routes", async () => {
      // Arrange.
      const query = "foo=bar&alpha=beta&orange=3";
      const url = `https://localhost/eighty-eighty?${query}`;
      const expected = `/eighty-eighty?${query}--8080`;

      // Act.
      const actual = await invokeUrl(url);

      // Assert.
      expect(actual.status).toEqual(200);
      expect(actual.data).toEqual(expected);
    });
  });

  describe("Body", () => {
    it("should send the body", async () => {
      // Arrange.
      const expected = JSON.stringify({ foo: "bar" });

      // Act.
      const actual = await invokeEndpoint("/echo", "POST", expected);

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

  describe("Cleanup", () => {
    it("should close the upstream request when the client disconnects", async () => {
      // Arrange.
      const closed = new Promise<void>((resolve) => {
        _abortResolve = resolve;
      });

      // Act.
      await invokeAndAbort("/abort");

      // Assert.
      await expect(waitWithTimeout(closed, 1500)).resolves.toBeUndefined();
    });

    it("should close the upstream request when the client closes after headers", async () => {
      // Arrange.
      const closed = new Promise<void>((resolve) => {
        _abortResolve = resolve;
      });

      // Act.
      await invokeAndCloseAfterHeaders("/abort");

      // Assert.
      await expect(waitWithTimeout(closed, 1500)).resolves.toBeUndefined();
    });
  });

  describe("Upgrade to Websocket", () => {
    it("should respond with switching protocols if successful", async () => {
      // Arrange.
      const { socket, header } = await openWebsocket("/websocket");

      // Act
      const actual = header.includes("101 Switching Protocols");
      socket.end();

      // Assert.
      expect(actual).toBeTruthy();
    });

    it("should upgrade the connection and proxy traffic", async () => {
      // Arrange.
      const { socket, remainder } = await openWebsocket("/websocket");

      // Act
      socket.write("ping-websocket");
      const echoed = await waitForData(socket, remainder);
      socket.end();

      // Assert.
      expect(echoed).toContain("ping-websocket");
    });

    it("should return 404 for unmapped websocket routes", async () => {
      // Arrange.

      // Act.
      const { socket, header } = await openWebsocket("/no-websocket-here");
      socket.end();

      // Assert.
      expect(header).toContain("404 Not Found");
    });

    it("should return 502 if the upstream websocket cannot be reached", async () => {
      // Arrange.

      // Act.
      const { socket, header } = await openWebsocket("/websocket-bad-gateway");
      socket.end();

      // Assert.
      expect(header).toContain("502 Bad Gateway");
    });

    it("should return the last result if the upstream does not accept the web socket", async () => {
      // Arrange.

      // Act.
      const { socket, header } = await openWebsocket("/eighty-eighty");
      const actual = header.includes("200 OK");
      socket.end();

      // Assert.
      expect(actual).toBeTruthy();
    });
  });
});
