import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

import { describe, expect, it, vi } from "vitest";

import { forwardRequest } from "./forward-request.mjs";

vi.mock("node:http");
vi.mock("node:https");

describe("Forward Request", () => {
  describe("Https", () => {
    it("should forward the https request object", () => {
      // Arrange.
      const url = new URL("https://localhost");
      const expected = {
        hostname: "localhost",
        port: 443,
      };

      // Act.
      forwardRequest(url);

      // Assert.
      expect(httpsRequest).toHaveBeenCalledWith(
        expect.objectContaining(expected),
      );
    });

    it("should forward with the supplied port if there is one given", () => {
      // Arrange.
      const port = 8080;
      const url = new URL(`https://localhost:${port}`);
      const expected = { port };

      // Act.
      forwardRequest(url);

      // Assert.
      expect(httpsRequest).toHaveBeenCalledWith(
        expect.objectContaining(expected),
      );
    });
  });

  describe("Http", () => {
    it("should forward the https request object", () => {
      // Arrange.
      const url = new URL("http://localhost");
      const expected = {
        hostname: "localhost",
        port: 80,
      };

      // Act.
      forwardRequest(url);

      // Assert.
      expect(httpRequest).toHaveBeenCalledWith(
        expect.objectContaining(expected),
      );
    });
  });
});
