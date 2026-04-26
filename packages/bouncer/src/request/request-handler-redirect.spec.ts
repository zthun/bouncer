import { request } from "node:http";
import { connect } from "node:net";

import { ZLoggerSilent } from "@zthun/lumberjacky-log";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ZBouncerConfigServerBuilder } from "../config/config-server.mjs";
import { ZBouncerNodeServerFactoryHttp } from "../server/node-server-factory-http.mjs";
import { type IZBouncerServer, ZBouncerServer } from "../server/server.mjs";
import { ZBouncerRequestHandlerRedirect } from "./request-handler-redirect.mjs";

describe("Handler Redirect", () => {
  const logger = new ZLoggerSilent();

  const port = 8086;
  const config = new ZBouncerConfigServerBuilder().port(port).build();
  const handler = new ZBouncerRequestHandlerRedirect(logger);
  const factory = new ZBouncerNodeServerFactoryHttp(config, handler);

  let _proxy: IZBouncerServer;

  beforeAll(async () => {
    _proxy = new ZBouncerServer(factory, logger);

    await _proxy.start();
  });

  afterAll(async () => {
    await _proxy.stop();
  });

  it("should redirect all traffic to https", async () => {
    // Arrange.
    const path = "/some/path";
    const url = `http://localhost:${port}${path}`;
    const host = `localhost:${port}`;

    // Act.
    const actual = await new Promise<{
      status: number | undefined;
      headers: Record<string, string | string[] | undefined>;
    }>((resolve, reject) => {
      const req = request(url, { headers: { host } }, (res) => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
        });
      });

      req.on("error", reject);
      req.end();
    });

    // Assert.
    expect(actual.status).toEqual(308);
    expect(actual.headers.location).toEqual(`https://${host}${path}`);
  });

  it("should redirect websocket upgrades to wss", async () => {
    // Arrange.
    const path = "/socket";
    const host = `localhost:${port}`;
    const requestText = [
      `GET ${path} HTTP/1.1`,
      `Host: ${host}`,
      "Connection: Upgrade",
      "Upgrade: websocket",
      "\r\n",
    ].join("\r\n");

    // Act.
    const header = await new Promise<string>((resolve, reject) => {
      const socket = connect(port, "localhost", () => {
        socket.write(requestText);
      });

      let buffer = "";
      const timeout = setTimeout(
        () => reject(new Error("Timed out waiting for upgrade response.")),
        2000,
      );

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf-8");
        if (buffer.includes("\r\n\r\n")) {
          clearTimeout(timeout);
          socket.end();
          resolve(buffer);
        }
      });

      socket.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Assert.
    expect(header).toContain("308 Permanent Redirect");
    expect(header).toContain(`Location: wss://${host}${path}`);
  });
});
