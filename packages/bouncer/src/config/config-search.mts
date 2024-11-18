import { cosmiconfig } from "cosmiconfig";
import { IZBouncerConfig, ZBouncerConfigBuilder } from "./config.mjs";

export interface IZBouncerConfigSearch {
  search(name?: string): Promise<IZBouncerConfig>;
}

export class ZBouncerConfigSearch implements IZBouncerConfigSearch {
  public async search(name = "bouncer") {
    const explorer = cosmiconfig(name);
    const searched = await explorer.search();
    let builder = new ZBouncerConfigBuilder();

    if (searched) {
      builder = builder.assign(searched.config);
    }

    return builder.build();
  }
}
