import { ZLoggerConsole } from "@zthun/lumberjacky-log";
import { ZBouncerCertGeneratorSelfSigned } from "./cert/cert-generator-self-signed.mjs";
import { ZBouncerConfigSearch } from "./config/config-search.mjs";
import { ZBouncerConfigServerType } from "./config/config-server.mjs";
import { ZBouncerRequestHandlerForward } from "./request/request-handler-forward.mjs";
import type { IZBouncerRequestHandler } from "./request/request-handler.mjs";
import { ZBouncerNodeServerFactoryHttp } from "./server/node-server-factory-http.mjs";
import { ZBouncerNodeServerFactoryHttps } from "./server/node-server-factory-https.mjs";
import type { IZBouncerNodeServerFactory } from "./server/node-server-factory.mjs";
import { ZBouncerServer } from "./server/server.mjs";

(async function main() {
  const logger = new ZLoggerConsole(console);
  const explorer = new ZBouncerConfigSearch();
  const config = await explorer.search();
  const { servers } = config;

  await Promise.all(
    servers.map((server) => {
      const { domains, security, type } = server;

      let factory: IZBouncerNodeServerFactory;
      let handler: IZBouncerRequestHandler;

      // eslint-disable-next-line prefer-const
      handler = new ZBouncerRequestHandlerForward(domains, logger);

      if (type === ZBouncerConfigServerType.Http) {
        factory = new ZBouncerNodeServerFactoryHttp(server, handler);
      } else {
        const cert = new ZBouncerCertGeneratorSelfSigned(security, logger);
        factory = new ZBouncerNodeServerFactoryHttps(server, cert, handler);
      }

      return new ZBouncerServer(factory, logger).start();
    }),
  );
})();
