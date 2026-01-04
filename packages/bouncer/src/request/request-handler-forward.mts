import { createError, firstDefined, firstTruthy } from "@zthun/helpful-fn";
import {
  ZLogEntryBuilder,
  ZLoggerContext,
  type IZLogger,
} from "@zthun/lumberjacky-log";
import fetch from "cross-fetch";
import { castArray, get } from "lodash-es";
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import type { ZBouncerDomainMap } from "../config/config-server.mjs";
import type { IZBouncerRequestHandler } from "./request-handler.mjs";

/**
 * Default error code for when fetch errors happen and there's no
 * set mapping of code to error.
 */
export const HttpErrorBadGateway = 502;

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

    const normalized = pathname.split("/").filter(Boolean).join("/");
    const path = `/${normalized}`;

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
        return `${base}${path}`;
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

    const init: RequestInit = {
      method,
      headers: this._castHeaders(req.headers),
    };

    fetch(url, init)
      .then(async (response) => {
        const body = await response.arrayBuffer();

        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.writeHead(response.status).end(Buffer.from(body));
      })
      .catch((reason) => {
        const code = get(reason, "code", "UNKNOWN");
        const status = firstDefined(HttpErrorBadGateway, CodeToHttpError[code]);

        const error = createError(reason);
        msg = error.message;
        this._logger.log(new ZLogEntryBuilder().error().message(msg).build());

        res.writeHead(status).end();
      });
  }
}
