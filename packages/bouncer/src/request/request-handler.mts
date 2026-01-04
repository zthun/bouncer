import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Represents an object that can handle an incoming request.
 */
export interface IZBouncerRequestHandler {
  /**
   * Handles an incoming request.
   *
   * @param req -
   *        The incoming request message.
   * @param res -
   *        The server object to send back information to.
   */
  handle(req: IncomingMessage, res: ServerResponse): void;
}
