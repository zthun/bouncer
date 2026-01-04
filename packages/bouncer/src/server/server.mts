import { createError } from "@zthun/helpful-fn";
import {
  ZLogEntryBuilder,
  ZLoggerContext,
  type IZLogger,
} from "@zthun/lumberjacky-log";
import type {
  IZBouncerNodeServerFactory,
  NodeServerLike,
} from "./node-server-factory.mjs";

export interface IZBouncerServer {
  running(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class ZBouncerServer implements IZBouncerServer {
  private _log: IZLogger;
  private _server: NodeServerLike | null = null;

  public constructor(
    private readonly _factory: IZBouncerNodeServerFactory,
    log: IZLogger,
  ) {
    this._log = new ZLoggerContext("ZBouncerServer", log);
  }

  public async running(): Promise<boolean> {
    return this._server != null;
  }

  public async start(): Promise<void> {
    if (await this.running()) {
      return;
    }

    const { name } = this._factory;

    let msg = `Starting proxy server: ${name}`;
    this._log.log(new ZLogEntryBuilder().info().message(msg).build());

    try {
      this._server = await this._factory.create();

      msg = `Proxy server started: ${name}`;
      this._log.log(new ZLogEntryBuilder().info().message(msg).build());
    } catch (e) {
      const error = createError(e);
      const { message } = error;
      msg = `Failed to start proxy server: ${message}`;
      this._log.log(new ZLogEntryBuilder().error().message(msg).build());
    }
  }

  public async stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this._server == null) {
        resolve();
        return;
      }

      this._server.close(() => {
        this._server = null;
        resolve();
      });
    });
  }
}
