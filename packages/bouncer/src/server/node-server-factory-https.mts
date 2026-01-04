import { firstDefined } from "@zthun/helpful-fn";
import { createServer } from "node:https";
import type { IZBouncerCertGenerator } from "../cert/cert-generator.mjs";
import type { IZBouncerConfigServer } from "../config/config-server.mjs";
import type { IZBouncerRequestHandler } from "../request/request-handler.mjs";
import type {
  IZBouncerNodeServerFactory,
  NodeServerLike,
} from "./node-server-factory.mjs";

/**
 * Represents a server factory for http services.
 */
export class ZBouncerServerFactoryHttps implements IZBouncerNodeServerFactory {
  public name = "Https";

  /**
   * Initializes a new instance of this object.
   *
   * @param _generator -
   *        The certificate generator.  Https requires
   *        a certificate and one will be generated for you
   *        once the server is created.  A new certificate
   *        is created for each server.
   * @param _handler -
   *        The handler for incoming requests.
   */
  public constructor(
    private readonly _config: IZBouncerConfigServer,
    private readonly _generator: IZBouncerCertGenerator,
    private readonly _handler: IZBouncerRequestHandler,
  ) {}

  public async create(): Promise<NodeServerLike> {
    const certificate = await this._generator.generate();

    return new Promise((resolve, reject) => {
      const handle = this._handler.handle.bind(this._handler);
      const https = createServer(certificate, handle);
      const port = firstDefined(443, this._config.port);

      https.once("error", reject);

      https.listen(port, () => {
        https.removeListener("error", reject);
        resolve(https);
      });
    });
  }
}
