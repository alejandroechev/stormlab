/**
 * SCS Rainfall Distributions — TR-55 Exhibit 4-1
 *
 * Cumulative fractions of 24-hour rainfall for Type I, IA, II, III storms.
 */

export type StormType = "I" | "IA" | "II" | "III";

/**
 * SCS Type II cumulative rainfall distribution.
 * Time is in hours (0–24), values are cumulative fraction of total 24-hr rainfall.
 * Source: TR-55 Table 5-5 / Exhibit 4-1
 */
const TYPE_II_CUMULATIVE: [number, number][] = [
  [0.0, 0.0],
  [0.5, 0.005],
  [1.0, 0.011],
  [1.5, 0.017],
  [2.0, 0.023],
  [2.5, 0.029],
  [3.0, 0.035],
  [3.5, 0.041],
  [4.0, 0.048],
  [4.5, 0.056],
  [5.0, 0.063],
  [5.5, 0.072],
  [6.0, 0.08],
  [6.5, 0.09],
  [7.0, 0.1],
  [7.5, 0.111],
  [8.0, 0.122],
  [8.5, 0.135],
  [9.0, 0.148],
  [9.5, 0.163],
  [10.0, 0.181],
  [10.5, 0.204],
  [11.0, 0.235],
  [11.5, 0.283],
  [12.0, 0.663],
  [12.5, 0.735],
  [13.0, 0.772],
  [13.5, 0.799],
  [14.0, 0.82],
  [14.5, 0.838],
  [15.0, 0.854],
  [15.5, 0.868],
  [16.0, 0.88],
  [16.5, 0.892],
  [17.0, 0.903],
  [17.5, 0.913],
  [18.0, 0.922],
  [18.5, 0.93],
  [19.0, 0.938],
  [19.5, 0.946],
  [20.0, 0.953],
  [20.5, 0.959],
  [21.0, 0.965],
  [21.5, 0.971],
  [22.0, 0.977],
  [22.5, 0.983],
  [23.0, 0.989],
  [23.5, 0.995],
  [24.0, 1.0],
];

const TYPE_I_CUMULATIVE: [number, number][] = [
  [0.0, 0.0],
  [0.5, 0.008],
  [1.0, 0.017],
  [1.5, 0.026],
  [2.0, 0.035],
  [2.5, 0.045],
  [3.0, 0.055],
  [3.5, 0.065],
  [4.0, 0.076],
  [4.5, 0.087],
  [5.0, 0.099],
  [5.5, 0.112],
  [6.0, 0.125],
  [6.5, 0.14],
  [7.0, 0.156],
  [7.5, 0.174],
  [8.0, 0.194],
  [8.5, 0.219],
  [9.0, 0.254],
  [9.5, 0.303],
  [10.0, 0.515],
  [10.5, 0.583],
  [11.0, 0.624],
  [11.5, 0.654],
  [12.0, 0.682],
  [12.5, 0.706],
  [13.0, 0.727],
  [13.5, 0.748],
  [14.0, 0.767],
  [14.5, 0.785],
  [15.0, 0.801],
  [15.5, 0.816],
  [16.0, 0.83],
  [16.5, 0.844],
  [17.0, 0.857],
  [17.5, 0.87],
  [18.0, 0.882],
  [18.5, 0.893],
  [19.0, 0.905],
  [19.5, 0.916],
  [20.0, 0.926],
  [20.5, 0.936],
  [21.0, 0.946],
  [21.5, 0.956],
  [22.0, 0.965],
  [22.5, 0.974],
  [23.0, 0.983],
  [23.5, 0.992],
  [24.0, 1.0],
];

const TYPE_IA_CUMULATIVE: [number, number][] = [
  [0.0, 0.0],
  [0.5, 0.01],
  [1.0, 0.022],
  [1.5, 0.036],
  [2.0, 0.051],
  [2.5, 0.067],
  [3.0, 0.083],
  [3.5, 0.099],
  [4.0, 0.116],
  [4.5, 0.135],
  [5.0, 0.156],
  [5.5, 0.179],
  [6.0, 0.204],
  [6.5, 0.233],
  [7.0, 0.268],
  [7.5, 0.31],
  [8.0, 0.515],
  [8.5, 0.583],
  [9.0, 0.624],
  [9.5, 0.654],
  [10.0, 0.682],
  [10.5, 0.706],
  [11.0, 0.727],
  [11.5, 0.748],
  [12.0, 0.767],
  [12.5, 0.785],
  [13.0, 0.801],
  [13.5, 0.816],
  [14.0, 0.83],
  [14.5, 0.844],
  [15.0, 0.857],
  [15.5, 0.87],
  [16.0, 0.882],
  [16.5, 0.893],
  [17.0, 0.905],
  [17.5, 0.916],
  [18.0, 0.926],
  [18.5, 0.936],
  [19.0, 0.946],
  [19.5, 0.956],
  [20.0, 0.965],
  [20.5, 0.974],
  [21.0, 0.983],
  [21.5, 0.992],
  [22.0, 0.997],
  [22.5, 0.998],
  [23.0, 0.999],
  [23.5, 1.0],
  [24.0, 1.0],
];

const TYPE_III_CUMULATIVE: [number, number][] = [
  [0.0, 0.0],
  [0.5, 0.005],
  [1.0, 0.01],
  [1.5, 0.015],
  [2.0, 0.02],
  [2.5, 0.026],
  [3.0, 0.032],
  [3.5, 0.037],
  [4.0, 0.043],
  [4.5, 0.05],
  [5.0, 0.057],
  [5.5, 0.065],
  [6.0, 0.072],
  [6.5, 0.081],
  [7.0, 0.089],
  [7.5, 0.1],
  [8.0, 0.111],
  [8.5, 0.125],
  [9.0, 0.14],
  [9.5, 0.16],
  [10.0, 0.185],
  [10.5, 0.217],
  [11.0, 0.26],
  [11.5, 0.298],
  [12.0, 0.5],
  [12.5, 0.702],
  [13.0, 0.751],
  [13.5, 0.785],
  [14.0, 0.811],
  [14.5, 0.83],
  [15.0, 0.848],
  [15.5, 0.867],
  [16.0, 0.886],
  [16.5, 0.895],
  [17.0, 0.904],
  [17.5, 0.913],
  [18.0, 0.922],
  [18.5, 0.93],
  [19.0, 0.938],
  [19.5, 0.946],
  [20.0, 0.953],
  [20.5, 0.959],
  [21.0, 0.965],
  [21.5, 0.971],
  [22.0, 0.977],
  [22.5, 0.983],
  [23.0, 0.989],
  [23.5, 0.995],
  [24.0, 1.0],
];

const DISTRIBUTIONS: Record<StormType, [number, number][]> = {
  I: TYPE_I_CUMULATIVE,
  IA: TYPE_IA_CUMULATIVE,
  II: TYPE_II_CUMULATIVE,
  III: TYPE_III_CUMULATIVE,
};

/**
 * Linearly interpolate cumulative rainfall fraction at a given time.
 */
function interpolateCumulative(
  dist: [number, number][],
  time: number,
): number {
  if (time <= dist[0][0]) return dist[0][1];
  if (time >= dist[dist.length - 1][0]) return dist[dist.length - 1][1];

  for (let i = 1; i < dist.length; i++) {
    if (time <= dist[i][0]) {
      const [t0, v0] = dist[i - 1];
      const [t1, v1] = dist[i];
      const frac = (time - t0) / (t1 - t0);
      return v0 + frac * (v1 - v0);
    }
  }
  return dist[dist.length - 1][1];
}

/**
 * Get cumulative rainfall depth at a given time for a specified storm type.
 * @param stormType SCS storm type (I, IA, II, III)
 * @param totalDepth Total 24-hour rainfall depth (inches)
 * @param time Time in hours (0–24)
 */
export function getCumulativeRainfall(
  stormType: StormType,
  totalDepth: number,
  time: number,
): number {
  const dist = DISTRIBUTIONS[stormType];
  if (!dist) throw new Error(`Unknown storm type: ${stormType}`);
  return totalDepth * interpolateCumulative(dist, time);
}

/**
 * Get incremental rainfall depths for a given time step.
 * Returns an array of [time, incrementalDepth] pairs.
 * @param stormType SCS storm type
 * @param totalDepth Total 24-hour rainfall depth (inches)
 * @param timeStep Time step in hours (e.g., 0.1 for 6-minute intervals)
 */
export function getIncrementalRainfall(
  stormType: StormType,
  totalDepth: number,
  timeStep: number,
): [number, number][] {
  if (timeStep <= 0) throw new Error("Time step must be positive");
  const result: [number, number][] = [];
  let prevCum = 0;
  for (let t = timeStep; t <= 24 + timeStep / 2; t += timeStep) {
    const time = Math.min(t, 24);
    const cum = getCumulativeRainfall(stormType, totalDepth, time);
    result.push([time, cum - prevCum]);
    prevCum = cum;
    if (time >= 24) break;
  }
  return result;
}

/**
 * Get the raw cumulative distribution data for a storm type.
 */
export function getRainfallDistribution(
  stormType: StormType,
): [number, number][] {
  const dist = DISTRIBUTIONS[stormType];
  if (!dist) throw new Error(`Unknown storm type: ${stormType}`);
  return [...dist];
}
