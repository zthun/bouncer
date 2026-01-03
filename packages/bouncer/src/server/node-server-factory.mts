import type { Server as HttpServer } from "node:http";
import type { Server as HttpsServer } from "node:https";

/**
 * Represents a type of supported server via the used version of node.
 */
export type NodeServerLike = HttpServer | HttpsServer;

/**
 * Constructs a NodeServerLike object based on the implementation of this interface.
 */
export interface IZBouncerNodeServerFactory {
  /**
   * The name of the server being created.
   *
   * This is going to be Http or Https depending on the
   * server like object that is being returned.
   */
  readonly name: string;

  /**
   * Constructs the server.
   *
   * @returns
   *        The created server.
   */
  create(): Promise<NodeServerLike>;
}
