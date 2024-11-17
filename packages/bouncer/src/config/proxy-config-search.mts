import { cosmiconfig } from "cosmiconfig";
import { IZProxyConfig, ZProxyConfigBuilder } from "./proxy-config.mjs";

export interface IZProxyConfigSearch {
  search(name?: string): Promise<IZProxyConfig>;
}

export class ZProxyConfigSearch implements IZProxyConfigSearch {
  public async search(name = "bouncer") {
    const explorer = cosmiconfig(name);
    const searched = await explorer.search();
    let builder = new ZProxyConfigBuilder();

    if (searched) {
      builder = builder.assign(searched.config);
    }

    return builder.build();
  }
}
