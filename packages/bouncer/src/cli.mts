import { ZLoggerConsole } from "@zthun/lumberjacky-log";
import { ZBouncerCertGeneratorSelfSigned } from "./cert/cert-generator-self-signed.mjs";
import { ZBouncerConfigSearch } from "./config/config-search.mjs";
import { ZBouncerRequestHandlerForward } from "./request/request-handler-forward.mjs";
import { ZBouncerNodeServerFactoryHttps } from "./server/node-server-factory-https.mjs";
import { ZBouncerServer } from "./server/server.mjs";

(async function main() {
  const logger = new ZLoggerConsole(console);
  const explorer = new ZBouncerConfigSearch();
  const config = await explorer.search();
  const { servers } = config;

  await Promise.all(
    servers.map((server) => {
      const { domains, security } = server;

      const handler = new ZBouncerRequestHandlerForward(domains, logger);
      const cert = new ZBouncerCertGeneratorSelfSigned(security, logger);
      const factory = new ZBouncerNodeServerFactoryHttps(server, cert, handler);

      return new ZBouncerServer(factory, logger).start();
    }),
  );
})();
