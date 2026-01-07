import { firstDefined } from "@zthun/helpful-fn";
import { createServer } from "node:http";
import type { IZBouncerConfigServer } from "../config/config-server.mjs";
import type { IZBouncerRequestHandler } from "../request/request-handler.mjs";
import type {
  IZBouncerNodeServerFactory,
  NodeServerLike,
} from "./node-server-factory.mjs";

/**
 * Represents a server factory for http services.
 */
export class ZBouncerNodeServerFactoryHttp implements IZBouncerNodeServerFactory {
  public name = "Http";

  /**
   * Initializes a new instance of this object.
   *
   * @param _config -
   *        The server config.
   * @param _handler -
   *        The handler for incoming requests.
   */
  public constructor(
    private readonly _config: IZBouncerConfigServer,
    private readonly _handler: IZBouncerRequestHandler,
  ) {}

  public async create(): Promise<NodeServerLike> {
    return new Promise((resolve, reject) => {
      const port = firstDefined(80, this._config.port);
      const request = this._handler.handle.bind(this._handler);
      const upgrade = this._handler.upgrade.bind(this._handler);

      const http = createServer(request)
        .once("error", reject)
        .listen(port, () => {
          http.removeListener("error", reject);
          http.on("upgrade", upgrade);
          resolve(http);
        });
    });
  }
}
