import { ZTypedocConfigBuilder } from "@zthun/janitor-build-config/typedoc";

export default new ZTypedocConfigBuilder()
  .web()
  .entry("../*")
  .favicon("public/images/svg/bouncer.svg")
  .build();
