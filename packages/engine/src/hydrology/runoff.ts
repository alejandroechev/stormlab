/**
 * SCS Runoff Equation — TR-55 Chapter 2
 *
 * Q = (P - Ia)² / (P - Ia + S)
 * S = 1000/CN - 10  (inches)
 * Ia = λ * S  (default λ = 0.2)
 */

export interface RunoffResult {
  /** Runoff depth in inches */
  runoffDepth: number;
  /** Potential maximum retention S (inches) */
  potentialRetention: number;
  /** Initial abstraction Ia (inches) */
  initialAbstraction: number;
}

/**
 * Calculate runoff depth using the SCS Curve Number method.
 * @param rainfall Total rainfall depth P (inches)
 * @param cn Curve Number (0-100)
 * @param iaRatio Initial abstraction ratio λ (default 0.2)
 */
export function calculateRunoff(
  rainfall: number,
  cn: number,
  iaRatio: number = 0.2,
): RunoffResult {
  if (cn <= 0 || cn > 100) throw new Error("CN must be between 0 and 100");
  if (rainfall < 0) throw new Error("Rainfall must be non-negative");

  const S = 1000 / cn - 10;
  const Ia = iaRatio * S;

  let Q = 0;
  if (rainfall > Ia) {
    const numerator = (rainfall - Ia) ** 2;
    const denominator = rainfall - Ia + S;
    Q = numerator / denominator;
  }

  return {
    runoffDepth: Q,
    potentialRetention: S,
    initialAbstraction: Ia,
  };
}
