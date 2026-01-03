import { firstDefined } from "@zthun/helpful-fn";
import {
  ZLogEntryBuilder,
  ZLoggerContext,
  type IZLogger,
} from "@zthun/lumberjacky-log";
import {
  ZHttpCodeServer,
  ZHttpRequestBuilder,
  type IZHttpService,
} from "@zthun/webigail-http";
import { find, get } from "lodash-es";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { IZBouncerDomain } from "../config/config-domain.mjs";
import type { IZBouncerRequestHandler } from "./request-handler.mjs";

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
   * @param _forward -
   *        The http service that will forward the request.
   */
  public constructor(
    private readonly _domains: IZBouncerDomain[],
    private readonly _forward: IZHttpService,
    logger: IZLogger,
  ) {
    this._logger = new ZLoggerContext("ZBouncerRequestHandlerForward", logger);
  }

  private _findRoute(
    host: string | undefined,
    pathname: string,
  ): string | null {
    if (!host) {
      return null;
    }

    const target = find(this._domains, (d) => d.host === host);

    if (target == null) {
      return null;
    }

    const { paths } = target;

    const mapping = paths[pathname];

    return firstDefined(null, mapping);
  }

  private _castHeaders(headers: Record<string, any>) {
    type HeaderValue = number | string | readonly string[];
    type Header = [string, HeaderValue];

    const pairs = Object.keys(headers).map<Header>((k) => [k, headers[k]]);
    return new Map(pairs);
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

    const request = new ZHttpRequestBuilder()
      .url(url)
      .headers(req.headers as Record<string, string>)
      .build();

    this._forward
      .request(request)
      .then((r) => {
        res
          .setHeaders(this._castHeaders(r.headers))
          .writeHead(r.status)
          .end(r.data);
      })
      .catch((reason) => {
        const status = get(
          reason,
          "status",
          ZHttpCodeServer.InternalServerError,
        );

        const headers = get(reason, "headers", {});

        res.setHeaders(this._castHeaders(headers)).writeHead(status).end();
      });
  }
}
