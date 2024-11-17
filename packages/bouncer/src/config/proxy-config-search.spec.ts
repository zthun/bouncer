import { describe, expect, it } from "vitest";
import { ZProxyConfigSearch } from "./proxy-config-search.mjs";
import { ZProxyConfigBuilder } from "./proxy-config.mjs";

describe("ZProxyConfigSearch", () => {
  const createTestTarget = () => new ZProxyConfigSearch();

  it("should return the configuration loaded from the search", async () => {
    // Arrange.
    const target = createTestTarget();

    // Act.
    const actual = await target.search();

    // Assert.
    expect(actual.domains.length).toBeGreaterThan(0);
  });

  it("should return the default configuration if no config can be found", async () => {
    // Arrange.
    const target = createTestTarget();
    const expected = new ZProxyConfigBuilder().build();

    // Act.
    const actual = await target.search("wrong-name");

    // Assert.
    expect(actual).toEqual(expected);
  });
});
