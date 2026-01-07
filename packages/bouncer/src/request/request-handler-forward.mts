import { createError, firstDefined, firstTruthy } from "@zthun/helpful-fn";
import {
  ZLogEntryBuilder,
  ZLoggerContext,
  type IZLogger,
} from "@zthun/lumberjacky-log";
import { castArray, get } from "lodash-es";
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  OutgoingHttpHeaders,
  ServerResponse,
} from "node:http";
import { type Duplex } from "node:stream";
import type { ZBouncerDomainMap } from "../config/config-server.mjs";
import { forwardRequest } from "./forward-request.mjs";
import type { IZBouncerRequestHandler } from "./request-handler.mjs";
import {
  BadGateway,
  BadGatewayMsg,
  CodeToHttpError,
  Eol,
  Eos,
  Http,
  NoBodyVerbs,
  NotFound,
  NotFoundMsg,
  Success,
  SuccessMsg,
  Switch,
  SwitchMsg,
} from "./request-status.mjs";

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

  private _findRoute(req: IncomingMessage): URL | null {
    const host = firstDefined("", req.headers.host);
    const target = this._domains[host];

    if (target == null) {
      const msg = `No domain mapping exists for ${host}`;
      this._logger.log(new ZLogEntryBuilder().warning().message(msg).build());
      return null;
    }

    const pathname = firstTruthy("/", req.url);
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
        break;
      }

      if (mapped != null) {
        const base = mapped.replace(/\/$/, "");
        const url = new URL(`${base}${path}${query}`);
        const msg = `Forwarding ${host}${pathname} to ${url.toString()}`;
        this._logger.log(new ZLogEntryBuilder().info().message(msg).build());
        return url;
      }

      if (cursor === "/") {
        // We're at the root; We have to check this at least once,
        // so we can break at this point.
        break;
      }

      const lastSlash = cursor.lastIndexOf("/");
      cursor = firstTruthy("/", cursor.substring(0, lastSlash));
    }

    const msg = `No mapping exists for ${host}${pathname}`;
    this._logger.log(new ZLogEntryBuilder().warning().message(msg).build());
    return null;
  }

  private _castHeaders(headers: IncomingHttpHeaders) {
    const forward: OutgoingHttpHeaders = {};

    Object.entries(headers)
      .filter(([key, value]) => key.toLowerCase() !== "host" && value != null)
      .forEach(([key, value]) => {
        const values = castArray(value);
        forward[key] = values.map(String);
      });

    return forward;
  }

  private _processError(res: ServerResponse, reason: Error) {
    const code = get(reason, "code", "UNKNOWN");
    const status = firstDefined(BadGateway, CodeToHttpError[code]);
    const { message: msg } = createError(reason);
    this._logger.log(new ZLogEntryBuilder().error().message(msg).build());

    if (!res.headersSent) {
      res.writeHead(status);
    } else if (!res.writableEnded) {
      res.statusCode = status;
    }

    if (!res.writableEnded) {
      res.end();
    }
  }

  public handle(req: IncomingMessage, res: ServerResponse) {
    const method = firstDefined("GET", req.method).toUpperCase();
    const url = this._findRoute(req);

    if (!url) {
      res.writeHead(NotFound, NotFoundMsg).end();
      return;
    }

    const headers = this._castHeaders(req.headers);
    const outbound = forwardRequest(url, { method, headers })
      .on("error", this._processError.bind(this, res))
      .on("response", (msg) => {
        const { headers, statusCode, statusMessage } = msg;
        const h = Object.entries(headers).filter(([, v]) => v != null);
        h.forEach(([k, v]) => res.setHeader(k, v!));
        const status = firstDefined(Success, statusCode);
        const message = firstDefined(SuccessMsg, statusMessage);
        res.writeHead(status, message);
        msg.pipe(res);
        res.on("close", msg.destroy.bind(msg));
        msg.on("error", (reason) => {
          msg.unpipe();
          this._processError(res, reason);
        });
      });

    if (!NoBodyVerbs.includes(method)) {
      req.pipe(outbound);
    } else {
      outbound.end();
    }

    req.on("aborted", outbound.destroy.bind(outbound));

    req.on("close", () => {
      if (!req.complete) {
        outbound.destroy();
      }
    });

    res.on("close", () => {
      if (!res.writableEnded) {
        outbound.destroy();
      }
    });
  }

  public upgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const url = this._findRoute(req);

    if (!url) {
      socket.write(`${Http} ${NotFound} ${NotFoundMsg}${Eos}`);
      socket.destroy();
      return;
    }

    forwardRequest(url, { headers: req.headers })
      .on("error", (reason) => {
        const { message: msg } = createError(reason);
        this._logger.log(new ZLogEntryBuilder().error().message(msg).build());
        socket.write(`${Http} ${BadGateway} ${BadGatewayMsg}${Eos}`);
        socket.destroy();
      })
      .on("upgrade", (proxyRes, proxySocket, proxyHead) => {
        const casted = Object.entries(this._castHeaders(proxyRes.headers));
        const lines = Array.from(casted).map(([k, v]) => `${k}: ${v}`);
        const headers = lines.join(Eol);

        socket.write(`${Http} ${Switch} ${SwitchMsg}${Eol}${headers}${Eos}`);
        proxySocket.write(head);
        socket.write(proxyHead);
        proxySocket.pipe(socket).pipe(proxySocket);
        proxySocket.on("error", socket.destroy.bind(socket));
        socket.on("error", proxySocket.destroy.bind(proxySocket));
        proxySocket.on("close", socket.destroy.bind(socket));
        socket.on("close", proxySocket.destroy.bind(proxySocket));
      })
      .on("response", (proxyRes) => {
        // Target did not accept websocket; mirror response then close.
        const { statusCode: code, statusMessage: msg } = proxyRes;
        socket.write(`${Http} ${code} ${msg}${Eos}`);
        socket.destroy();
        proxyRes.resume();
      })
      .end();
  }
}
