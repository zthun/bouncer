import type { ZDeepPartial } from "@zthun/helpful-fn";
import { describe, expect, it } from "vitest";

import type { IZBouncerConfig } from "./config.mjs";
import { ZBouncerConfigBuilder } from "./config.mjs";
import { ZBouncerConfigSecurityBuilder } from "./config-security.mjs";
import {
  ZBouncerConfigServerBuilder,
  ZBouncerConfigServerType,
} from "./config-server.mjs";

describe("ZBouncerConfig", () => {
  const createTestTarget = () => new ZBouncerConfigBuilder();

  describe("Default", () => {
    it("should return an empty server list", () => {
      // Arrange.
      const target = createTestTarget();

      // Act.
      const { servers: actual } = target.build();

      // Assert.
      expect(actual).toEqual([]);
    });
  });

  describe("Https", () => {
    const security = new ZBouncerConfigSecurityBuilder()
      .country("EU")
      .organization("Zthunworks")
      .build();

    it("should add a new configuration", () => {
      // Arrange.
      const target = createTestTarget();
      const expected = new ZBouncerConfigServerBuilder()
        .https()
        .port(9000)
        .path("local.zthunworks.com", "/", "http://localhost:9090")
        .path("local.zthunworks.com", "/api", "http://localhost:3000")
        .security(security)
        .build();

      // Act.
      const { servers: actual } = target.server(expected).build();

      // Assert.
      expect(actual).toEqual([expected]);
    });

    it("should merge existing configurations", () => {
      // Arrange.
      const expected = new ZBouncerConfigServerBuilder()
        .https()
        .port(8000)
        .path("local.zthunworks.com", "/", "http://localhost:9090")
        .path("local.zthunworks.com", "/api", "http://localhost:3000")
        .security(security)
        .build();
      const target = createTestTarget();
      const builder = () => new ZBouncerConfigServerBuilder().https();

      // Act.
      const { servers: actual } = target
        .server(builder().build())
        .server(builder().port(8000).build())
        .server(
          builder()
            .path("local.zthunworks.com", "/api", "some-garbage")
            .build(),
        )
        .server(
          builder()
            .path("local.zthunworks.com", "/", "http://localhost:9090")
            .build(),
        )
        .server(
          builder()
            .path("local.zthunworks.com", "/api", "http://localhost:3000")
            .build(),
        )
        .server(builder().security(security).build())
        .build();

      // Assert.
      expect(actual).toEqual([expected]);
    });
  });

  describe("Http", () => {
    it("should add a new configuration", () => {
      // Arrange.
      const target = createTestTarget();
      const expected = new ZBouncerConfigServerBuilder().http().build();

      // Act.
      const { servers: actual } = target.server(expected).build();

      // Assert.
      expect(actual).toEqual([expected]);
    });

    it("should merge existing configurations", () => {
      // Arrange.
      const expected = new ZBouncerConfigServerBuilder()
        .http()
        .port(81)
        .path("local.zthunworks.com", "/", "http://localhost:9090")
        .path("local.zthunworks.com", "/api", "http://localhost:3000")
        .build();
      const target = createTestTarget();
      const builder = () => new ZBouncerConfigServerBuilder().http();

      // Act.
      const { servers: actual } = target
        .server(builder().build())
        .server(builder().port(81).build())
        .server(
          builder()
            .path("local.zthunworks.com", "/api", "some-garbage")
            .build(),
        )
        .server(
          builder()
            .path("local.zthunworks.com", "/", "http://localhost:9090")
            .build(),
        )
        .server(
          builder()
            .path("local.zthunworks.com", "/api", "http://localhost:3000")
            .build(),
        )
        .build();

      // Assert.
      expect(actual).toEqual([expected]);
    });
  });

  describe("Merge", () => {
    it("should assign new servers with default values by type", () => {
      // Arrange.
      const https = new ZBouncerConfigServerBuilder().https().build();
      const http = new ZBouncerConfigServerBuilder().http().build();
      const expected = createTestTarget().server(https).server(http).build();
      const config: ZDeepPartial<IZBouncerConfig> = {
        servers: [
          { type: ZBouncerConfigServerType.Https },
          { type: ZBouncerConfigServerType.Http },
        ],
      };
      const target = createTestTarget();

      // Act.
      const actual = target.assign(config).build();

      // Assert.
      expect(actual).toEqual(expected);
    });
  });
});
