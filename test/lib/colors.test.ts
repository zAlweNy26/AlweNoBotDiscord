import { describe, expect, it } from "vitest";
import { colorByStatus } from "../../src/lib/colors";

describe("colorByStatus", () => {
  it("covers every Steam persona state", () => {
    expect(colorByStatus(0)).toBe(0x747f8d);
    expect(colorByStatus(1)).toBe(0x2c82ec);
    expect(colorByStatus(2)).toBe(0xf04747);
    expect(colorByStatus(3)).toBe(0xfaa61a);
    expect(colorByStatus(4)).toBe(0xfaa61a);
    expect(colorByStatus(5)).toBe(0x2c82ec);
    expect(colorByStatus(6)).toBe(0x2c82ec);
  });

  it("falls back to gray for unknown states", () => {
    expect(colorByStatus(99)).toBe(0x747f8d);
  });
});
