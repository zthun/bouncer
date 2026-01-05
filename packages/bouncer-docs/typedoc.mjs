import { ZTypedocConfigBuilder } from "@zthun/janitor-build-config/typedoc";

export default new ZTypedocConfigBuilder()
  .web()
  .entry("../*")
  .exclude("../bouncer-web")
  .favicon("public/images/svg/bouncer.svg")
  .build();
