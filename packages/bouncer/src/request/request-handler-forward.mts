import { firstDefined } from "@zthun/helpful-fn";
import { ZHttpRequestBuilder, type IZHttpService } from "@zthun/webigail-http";
import { find } from "lodash-es";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { IZBouncerDomain } from "../config/config-domain.mjs";
import type { IZBouncerRequestHandler } from "./request-handler.mjs";

/**
 * A request handler that forwards request to different domain endpoints.
 */
export class ZBouncerRequestHandlerForward implements IZBouncerRequestHandler {
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
  ) {}

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

  public handle(req: IncomingMessage, res: ServerResponse) {
    const path = firstDefined("/", req.url);
    const host = req.headers.host;
    const url = this._findRoute(host, path);

    if (!url) {
      res.writeHead(404).end("Not Found");
      return;
    }

    const request = new ZHttpRequestBuilder()
      .url(url)
      .headers(req.headers as Record<string, string>)
      .build();

    this._forward.request(request).then((r) => {
      type HeaderValue = number | string | readonly string[];
      type Header = [string, HeaderValue];

      const pairs = Object.keys(r).map<Header>((k) => [k, r[k]]);
      const headers = new Map(pairs);

      res.setHeaders(headers).writeHead(r.status).end(r.data);
    });
  }
}
