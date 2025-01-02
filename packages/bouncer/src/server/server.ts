export interface IZBouncerServer {
  running(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
}
