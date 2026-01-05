/**
 * Path Finder Logic (TypeScript, no UI)
 *
 * - Points are { x: number; y: number }
 * - Finds all permutations of length k from `points` such that the total
 *   length of the polyline Start -> ...k points... -> End is within [minLen, maxLen].
 * - Each result includes:
 *    - path: intermediate points only (k points)
 *    - fullPath: [start, ...path, end]
 *    - length: total length (rounded to 2 decimals)
 *
 * NOTE: This brute-force approach can explode combinatorially for large n/k.
 */

export type Point = { x: number; y: number };

export type PathResult = {
  /** intermediate points only (k points) */
  path: Point[];
  /** [start, ...path, end] */
  fullPath: Point[];
  /** total length, rounded to 2 decimals */
  length: number;
};

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pathLength(start: Point, path: Point[], end: Point): number {
  if (!Array.isArray(path) || path.length === 0) {
    throw new Error("pathLength: 'path' must be a non-empty array of points");
  }

  let total = distance(start, path[0]);
  for (let i = 0; i < path.length - 1; i++) {
    total += distance(path[i], path[i + 1]);
  }
  total += distance(path[path.length - 1], end);
  return total;
}

/**
 * Generate permutations of exact length `k` from array `arr` (no repetition).
 * @example permutations([1,2,3], 2) -> [[1,2],[1,3],[2,1],[2,3],[3,1],[3,2]]
 */
export function permutations<T>(arr: readonly T[], k: number): T[][] {
  if (!Number.isInteger(k) || k < 1) {
    throw new Error("permutations: k must be a positive integer");
  }
  if (k > arr.length) return [];

  if (k === 1) return arr.map((item) => [item]);

  const result: T[][] = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = permutations(remaining, k - 1);
    for (const p of perms) result.push([item, ...p]);
  }

  return result;
}

/**
 * Find valid paths using brute-force permutations.
 */
export function findValidPaths(
  points: readonly Point[],
  start: Point,
  end: Point,
  minLen: number,
  maxLen: number,
  k: number
): PathResult[] {
  if (!Array.isArray(points)) throw new Error("findValidPaths: points must be an array");
  if (!Number.isFinite(minLen) || !Number.isFinite(maxLen)) {
    throw new Error("findValidPaths: minLen/maxLen must be numbers");
  }
  if (minLen > maxLen) throw new Error("findValidPaths: minLen must be <= maxLen");
  if (!Number.isInteger(k) || k < 1) throw new Error("findValidPaths: k must be a positive integer");
  if (k > points.length) return [];

  const valid: PathResult[] = [];
  const perms = permutations(points, k);

  for (const path of perms) {
    const len = pathLength(start, path, end);
    if (len >= minLen && len <= maxLen) {
      valid.push({
        path,
        fullPath: [start, ...path, end],
        length: Number(len.toFixed(2)),
      });
    }
  }

  // Optional: sort by length ascending
  valid.sort((a, b) => a.length - b.length);

  return valid;
}
