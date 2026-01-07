import { firstDefined, firstTruthy } from "@zthun/helpful-fn";
import {
  ZLogEntryBuilder,
  ZLoggerContext,
  type IZLogger,
} from "@zthun/lumberjacky-log";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import type { IZBouncerRequestHandler } from "./request-handler.mjs";
import { Eol, Eos, Http, Redirect, RedirectMsg } from "./request-status.mjs";

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

  public upgrade(req: IncomingMessage, socket: Duplex): void {
    const path = firstTruthy("/", req.url);
    const host = firstDefined("", req.headers.host);
    const location = `wss://${host}${path}`;
    const message = `Redirecting upgrade ${host}${path} to ${location}`;
    const to = `Location: ${location}`;

    this._logger.log(new ZLogEntryBuilder().info().message(message).build());
    socket.write(`${Http} ${Redirect} ${RedirectMsg}${Eol}${to}${Eos}`);
    socket.destroy();
  }
}
