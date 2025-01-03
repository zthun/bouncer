import { ZLoggerConsole } from "@zthun/lumberjacky-log";
import { ZBouncerConfigSearch } from "./config/config-search.mjs";
import { ZBouncerServer } from "./server/server.mjs";

(async function main() {
  const logger = new ZLoggerConsole(console);
  const explorer = new ZBouncerConfigSearch();
  const config = await explorer.search();

  const server = new ZBouncerServer(config, logger);
  await server.start();
})();
