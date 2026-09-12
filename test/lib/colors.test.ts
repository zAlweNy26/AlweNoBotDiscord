import { describe, expect, it } from "vitest";
import { colorByNumber, colorByStatus } from "../../src/lib/colors";

describe("colorByNumber", () => {
  it("maps game counts to the original thresholds", () => {
    expect(colorByNumber(0)).toBe(0x00dc00);
    expect(colorByNumber(99)).toBe(0x00dc00);
    expect(colorByNumber(100)).toBe(0xffdc00);
    expect(colorByNumber(399)).toBe(0xffdc00);
    expect(colorByNumber(400)).toBe(0xff6400);
    expect(colorByNumber(699)).toBe(0xff6400);
    expect(colorByNumber(700)).toBe(0xc80000);
    expect(colorByNumber(999)).toBe(0xc80000);
    expect(colorByNumber(1000)).toBe(0x000000);
  });
});

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
