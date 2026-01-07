import {
  ZViteConfigBuilder,
  ZViteServerBuilder,
  ZViteTestBuilder,
} from "@zthun/janitor-build-config/vite";
import { defineConfig } from "vite";

const test = new ZViteTestBuilder().browser().build();
const dev = new ZViteServerBuilder().dev().build();
const config = new ZViteConfigBuilder()
  .react()
  .server(dev)
  .test(test)
  .lodash()
  .build();
export default defineConfig(config);
