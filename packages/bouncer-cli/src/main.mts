#!/usr/bin/env node

import type {
  IZBouncerNodeServerFactory,
  IZBouncerRequestHandler,
} from "@zthun/bouncer";
import {
  ZBouncerCertGeneratorSelfSigned,
  ZBouncerConfigSearch,
  ZBouncerConfigServerHandle,
  ZBouncerConfigServerType,
  ZBouncerNodeServerFactoryHttp,
  ZBouncerNodeServerFactoryHttps,
  ZBouncerRequestHandlerForward,
  ZBouncerRequestHandlerRedirect,
  ZBouncerServer,
} from "@zthun/bouncer";
import { ZLogEntryBuilder, ZLoggerConsole } from "@zthun/lumberjacky-log";

void (async function main() {
  const logger = new ZLoggerConsole(console);
  const explorer = new ZBouncerConfigSearch();
  const config = await explorer.search();
  const { servers } = config;

  const entry = new ZLogEntryBuilder()
    .info()
    .context("ZBouncerCli")
    .message(`Initializing ${servers.length} servers`)
    .build();
  logger.log(entry);

  await Promise.all(
    servers.map((server) => {
      const { domains, security, type, handle } = server;

      let factory: IZBouncerNodeServerFactory;
      let handler: IZBouncerRequestHandler;

      if (handle === ZBouncerConfigServerHandle.Redirect) {
        handler = new ZBouncerRequestHandlerRedirect(logger);
      } else {
        handler = new ZBouncerRequestHandlerForward(domains, logger);
      }

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
