import { firstDefined, firstTruthy } from "@zthun/helpful-fn";
import {
  ZLogEntryBuilder,
  ZLoggerContext,
  type IZLogger,
} from "@zthun/lumberjacky-log";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import type { IZBouncerRequestHandler } from "./request-handler.mjs";

/**
 * A redirect handler that is mostly to redirect to a different protocol.
 *
 * The most common use case of this is to redirect http to https.
 */
export class ZBouncerRequestHandlerRedirect implements IZBouncerRequestHandler {
  private _logger: IZLogger;

  /**
   * Initializes a new instance of this object.
   *
   * @param logger -
   *        The logger for messages.
   */
  public constructor(logger: IZLogger) {
    this._logger = new ZLoggerContext("ZBouncerRequestHandlerRedirect", logger);
  }

  public handle(req: IncomingMessage, res: ServerResponse): void {
    const path = firstTruthy("/", req.url);
    const host = firstDefined("", req.headers.host);
    const location = `https://${host}${path}`;
    const message = `Redirecting ${host}${path} to ${location}`;

    this._logger.log(new ZLogEntryBuilder().info().message(message).build());
    res.writeHead(308, { Location: location }).end();
  }

  public upgrade(_: IncomingMessage, socket: Duplex): void {
    const msg = `Redirect upgrade: not supported`;
    this._logger.log(new ZLogEntryBuilder().warning().message(msg).build());
    socket.write("HTTP/1.1 505 Not Supported\r\n\r\n");
    socket.destroy();
  }
}
