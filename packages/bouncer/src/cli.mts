import { ZLoggerConsole } from "@zthun/lumberjacky-log";
import { ZBouncerCertGeneratorSelfSigned } from "./cert/cert-generator-self-signed.mjs";
import { ZBouncerConfigSearch } from "./config/config-search.mjs";
import { ZBouncerServer } from "./server/server.mjs";

(async function main() {
  const logger = new ZLoggerConsole(console);
  const generator = new ZBouncerCertGeneratorSelfSigned(logger);
  const explorer = new ZBouncerConfigSearch();
  const config = await explorer.search();
  const server = new ZBouncerServer(config, generator, logger);

  await server.start();
})();
