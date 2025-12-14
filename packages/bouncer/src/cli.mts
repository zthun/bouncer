import { ZLoggerConsole } from "@zthun/lumberjacky-log";
import { ZBouncerCertGeneratorSelfSigned } from "./cert/cert-generator-self-signed.mjs";
import { ZBouncerConfigSearch } from "./config/config-search.mjs";
import { ZBouncerServerHttps } from "./server/server-https.mjs";

(async function main() {
  const logger = new ZLoggerConsole(console);
  const generator = new ZBouncerCertGeneratorSelfSigned(logger);
  const explorer = new ZBouncerConfigSearch();
  const config = await explorer.search();
  const servers = [new ZBouncerServerHttps(config, generator, logger)];

  await Promise.all(servers.map((s) => s.start()));
})();
