import { createError, firstDefined, firstTruthy } from "@zthun/helpful-fn";
import type { RequestInit as URequestInit } from "undici-types";

import {
  ZLogEntryBuilder,
  ZLoggerContext,
  type IZLogger,
} from "@zthun/lumberjacky-log";
import { castArray, get } from "lodash-es";
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable, type Duplex } from "node:stream";
import type { ZBouncerDomainMap } from "../config/config-server.mjs";
import type { IZBouncerRequestHandler } from "./request-handler.mjs";

/**
 * Default error code for when fetch errors happen and there's no
 * set mapping of code to error.
 */
export const HttpErrorBadGateway = 502;

const Http = "Http/1.1";
const Eol = "\r\n";
const Eos = `${Eol}${Eol}`;

// Partial codes to overrides.  Anything not found in this map, should
// result in DefaultErrorCode
const CodeToHttpError: Record<string, number> = {
  // Aborted - 499 isn't standard, but it's the most widely accepted
  // one we have for this case - see docs for NGINX
  AbortError: 499,
  ERR_REQUEST_ABORTED: 499,
  // Timeout - 504 - Sometimes you'll see odd errors with this one.
  ETIMEDOUT: 504,
  ESOCKETTIMEDOUT: 504,
  UND_ERR_CONNECT_TIMEOUT: 504,
  UND_ERR_HEADERS_TIMEOUT: 504,
  UND_ERR_BODY_TIMEOUT: 504,
  // Out of Resources - 503 Service Unavailable
  EMFILE: 503,
  ENFILE: 503,
  ENOMEM: 503,
  EAGAIN: 503,
};

// Most HttpVerbs allow a body, but these do not allow it,
// so we have to check to make sure that we don't forward
// any ghost bodies with them.
const NoBodyVerbs = ["GET", "HEAD"];

/**
 * A request handler that forwards request to different domain endpoints.
 */
export class ZBouncerRequestHandlerForward implements IZBouncerRequestHandler {
  private _logger: IZLogger;

  /**
   * Initializes a new instance of this object.
   *
   * @param _domains -
   *        The domain configurations to forward to.
   */
  public constructor(
    private readonly _domains: ZBouncerDomainMap,
    logger: IZLogger,
  ) {
    this._logger = new ZLoggerContext("ZBouncerRequestHandlerForward", logger);
  }

  private _findRoute(host: string, pathname: string): string | null {
    const target = this._domains[host];

    if (target == null) {
      return null;
    }

    const [_path, _query] = pathname.split("?");
    const normalized = _path.split("/").filter(Boolean).join("/");
    const path = `/${normalized}`;
    const query = _query?.length ? `?${_query}` : "";

    for (let cursor = path; ; ) {
      const mapped = target[cursor];

      if (mapped === null) {
        // This is a special case.  If the actual value is set to null,
        // then we are done since this path is essentially black listed
        // explicitly
        return null;
      }

      if (mapped != null) {
        const base = mapped.replace(/\/$/, "");
        return `${base}${path}${query}`;
      }

      if (cursor === "/") {
        // We're at the root; We have to check this at least once,
        // so we can break at this point.
        break;
      }

      const lastSlash = cursor.lastIndexOf("/");
      cursor = firstTruthy("/", cursor.substring(0, lastSlash));
    }

    return null;
  }

  private _castHeaders(headers: IncomingHttpHeaders) {
    const forward = new Headers();

    Object.entries(headers)
      .filter(([key, value]) => key.toLowerCase() !== "host" && value != null)
      .forEach(([key, value]) => {
        const values = castArray(value);
        values.forEach((item) => forward.append(key, String(item)));
      });

    return forward;
  }

  public handle(req: IncomingMessage, res: ServerResponse) {
    const method = firstDefined("GET", req.method).toUpperCase();
    const path = firstTruthy("/", req.url);
    const host = req.headers.host;

    let msg = `Received a request for ${method} - ${host} - ${path}`;
    this._logger.log(new ZLogEntryBuilder().info().message(msg).build());
    const url = this._findRoute(firstDefined("", host), path);

    if (!url) {
      msg = `No mapping exists for ${req.url}`;
      this._logger.log(new ZLogEntryBuilder().warning().message(msg).build());

      res.writeHead(404).end("Not Found");
      return;
    }

    msg = `Forwarding to ${url}`;
    this._logger.log(new ZLogEntryBuilder().info().message(msg).build());

    const init: RequestInit & URequestInit = {
      method,
      headers: this._castHeaders(req.headers),
      redirect: "manual",
    };

    if (!NoBodyVerbs.includes(method)) {
      init.duplex = "half";
      init.body = req as any;
    }

    fetch(url, init)
      .then(async (response) => {
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.writeHead(response.status);
        const bodyStream = response.body
          ? Readable.fromWeb(response.body as any)
          : null;

        if (!bodyStream) {
          res.end();
          return;
        }

        res.on("close", () => {
          bodyStream.destroy();
        });

        bodyStream.pipe(res);
      })
      .catch((reason) => {
        const code = get(reason, "code", "UNKNOWN");
        const status = firstDefined(HttpErrorBadGateway, CodeToHttpError[code]);

        const error = createError(reason);
        const msg = error.message;
        this._logger.log(new ZLogEntryBuilder().error().message(msg).build());

        res.writeHead(status).end();
      });
  }

  public upgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const path = firstTruthy("/", req.url);
    const host = req.headers.host;
    const url = this._findRoute(firstDefined("", host), path);

    if (!url) {
      const msg = `No websocket mapping exists for ${host}${path}`;
      this._logger.log(new ZLogEntryBuilder().warning().message(msg).build());
      socket.write(`${Http} 404 Not Found${Eos}`);
      socket.destroy();
      return;
    }

    const target = new URL(url);
    const msg = `Forwarding websocket to ${target.toString()}`;
    this._logger.log(new ZLogEntryBuilder().info().message(msg).build());

    const isSecure = target.protocol === "https:";
    const proxy = isSecure ? httpsRequest : httpRequest;
    const port = target.port ? Number(target.port) : isSecure ? 443 : 80;
    const options = {
      hostname: target.hostname,
      port,
      path: `${target.pathname}${target.search}`,
      method: "GET",
      headers: {
        ...req.headers,
        host: target.host,
      },
    };

    proxy(options)
      .on("error", (reason) => {
        const { message: msg } = createError(reason);
        this._logger.log(new ZLogEntryBuilder().error().message(msg).build());
        socket.write(`${Http} 502 Bad Gateway${Eos}`);
        socket.destroy();
      })
      .on("upgrade", (proxyRes, proxySocket, proxyHead) => {
        const heads = this._castHeaders(proxyRes.headers);
        const lines = Array.from(heads).map(([k, v]) => `${k}: ${v}`);
        const headers = lines.join(Eol);

        socket.write(`${Http} 101 Switching Protocols${Eol}${headers}${Eos}`);

        proxySocket.write(head);
        socket.write(proxyHead);
        proxySocket.pipe(socket).pipe(proxySocket);
        proxySocket.on("error", socket.destroy.bind(socket));
        socket.on("error", proxySocket.destroy.bind(proxySocket));
      })
      .on("response", (proxyRes) => {
        // Target did not accept websocket; mirror response then close.
        const { statusCode: code, statusMessage: msg } = proxyRes;
        socket.write(`${Http} ${code} ${msg}${Eos}`);
        socket.destroy();
      })
      .end();
  }
}
