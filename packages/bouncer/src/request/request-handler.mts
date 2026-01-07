import type { IncomingMessage, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";

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

  /**
   * Handles websocket upgrade requests.
   *
   * @param req -
   *        The incoming request message.
   * @param socket -
   *        The socket being upgraded.
   * @param head -
   *        Any buffered bytes from the upgrade request.
   */
  upgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void;
}
