import { describe, it, expect } from "vitest";
import { calculateRunoff } from "../src/hydrology/runoff.js";

describe("SCS Runoff Equation", () => {
  it("should return zero runoff when rainfall <= initial abstraction", () => {
    // CN=70, S=4.286, Ia=0.857. Rainfall of 0.5 < Ia => Q=0
    const result = calculateRunoff(0.5, 70);
    expect(result.runoffDepth).toBe(0);
  });

  it("should calculate runoff for CN=75, P=5.0 inches", () => {
    // S = 1000/75 - 10 = 3.333
    // Ia = 0.2 * 3.333 = 0.667
    // Q = (5.0 - 0.667)^2 / (5.0 - 0.667 + 3.333) = 18.777 / 7.667 = 2.449
    const result = calculateRunoff(5.0, 75);
    expect(result.runoffDepth).toBeCloseTo(2.449, 2);
    expect(result.potentialRetention).toBeCloseTo(3.333, 2);
    expect(result.initialAbstraction).toBeCloseTo(0.667, 2);
  });

  it("should calculate runoff for CN=80, P=4.0 inches (TR-55 example)", () => {
    // S = 1000/80 - 10 = 2.5
    // Ia = 0.2 * 2.5 = 0.5
    // Q = (4.0 - 0.5)^2 / (4.0 - 0.5 + 2.5) = 12.25 / 6.0 = 2.042
    const result = calculateRunoff(4.0, 80);
    expect(result.runoffDepth).toBeCloseTo(2.042, 2);
  });

  it("should calculate runoff for CN=65, P=6.0 inches", () => {
    // S = 1000/65 - 10 = 5.385
    // Ia = 0.2 * 5.385 = 1.077
    // Q = (6.0 - 1.077)^2 / (6.0 - 1.077 + 5.385) = 24.21 / 10.308 = 2.349
    const result = calculateRunoff(6.0, 65);
    expect(result.runoffDepth).toBeCloseTo(2.349, 2);
  });

  it("should handle CN=98 (nearly impervious)", () => {
    // S = 1000/98 - 10 = 0.2041
    // Ia = 0.2 * 0.2041 = 0.0408
    // Q = (3.0 - 0.0408)^2 / (3.0 - 0.0408 + 0.2041) = 8.7584 / 3.1633 = 2.7683
    const result = calculateRunoff(3.0, 98);
    expect(result.runoffDepth).toBeCloseTo(2.768, 2);
  });

  it("should support custom Ia/S ratio", () => {
    // With λ=0.05 instead of 0.2
    // CN=80, S=2.5, Ia=0.05*2.5=0.125
    // Q = (4.0 - 0.125)^2 / (4.0 - 0.125 + 2.5) = 15.016 / 6.375 = 2.355
    const result = calculateRunoff(4.0, 80, 0.05);
    expect(result.runoffDepth).toBeCloseTo(2.355, 2);
  });

  it("should throw for invalid CN", () => {
    expect(() => calculateRunoff(5.0, 0)).toThrow();
    expect(() => calculateRunoff(5.0, 101)).toThrow();
  });

  it("should throw for negative rainfall", () => {
    expect(() => calculateRunoff(-1, 75)).toThrow();
  });

  it("should return zero runoff for zero rainfall", () => {
    const result = calculateRunoff(0, 75);
    expect(result.runoffDepth).toBe(0);
  });
});
