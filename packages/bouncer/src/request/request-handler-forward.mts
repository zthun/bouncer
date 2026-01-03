import { createError, firstDefined } from "@zthun/helpful-fn";
import {
  ZLogEntryBuilder,
  ZLoggerContext,
  type IZLogger,
} from "@zthun/lumberjacky-log";
import fetch from "cross-fetch";
import { castArray, find, get } from "lodash-es";
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import type { IZBouncerConfigDomain } from "../config/config-domain.mjs";
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
    private readonly _domains: IZBouncerConfigDomain[],
    logger: IZLogger,
  ) {
    this._logger = new ZLoggerContext("ZBouncerRequestHandlerForward", logger);
  }

  private _findRoute(
    host: string | undefined,
    pathname: string,
  ): string | null {
    const target = find(this._domains, (d) => d.host === host);

    if (target == null) {
      return null;
    }

    const { paths } = target;

    const mapping = paths[pathname];

    return firstDefined(null, mapping);
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
    const path = firstDefined("/", req.url);
    const host = req.headers.host;

    let msg = `Received a request for ${host} - ${path}`;
    this._logger.log(new ZLogEntryBuilder().info().message(msg).build());
    const url = this._findRoute(host, path);

    if (!url) {
      msg = `No mapping exists for ${req.url}`;
      this._logger.log(new ZLogEntryBuilder().warning().message(msg).build());

      res.writeHead(404).end("Not Found");
      return;
    }

    msg = `Forwarding to ${url}.`;
    this._logger.log(new ZLogEntryBuilder().info().message(msg).build());

    const method = firstDefined("GET", req.method).toUpperCase();

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
