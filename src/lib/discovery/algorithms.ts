// Pure functions for Trending & Game Jam Bayesian Rankings (Section 2.4 & 3.2)

export interface HourlyEngagementBucket {
  ageHours: number;
  uniquePlays: number;
  completions: number;
  likes: number;
  remixes: number;
}

/**
 * Computes the time-decayed trending score (36-hour half-life) from hourly buckets:
 *   engagement = sum((uniquePlays*1 + completions*2 + likes*3 + remixes*5) * 0.5^(ageHours / 36))
 *   quality = (totalLikes + 1) / (totalPlays + 10)
 *   trendScore = engagement * (0.7 + 0.6 * quality)
 */
export function computeTrendScore(
  buckets: HourlyEngagementBucket[],
  totalPlays: number,
  totalLikes: number
): number {
  let engagement = 0;
  for (const b of buckets) {
    const raw =
      b.uniquePlays * 1 +
      b.completions * 2 +
      b.likes * 3 +
      b.remixes * 5;
    const decay = Math.pow(0.5, Math.max(0, b.ageHours) / 36);
    engagement += raw * decay;
  }

  const quality = (totalLikes + 1) / (totalPlays + 10);
  const score = engagement * (0.7 + 0.6 * quality);
  return Number(score.toFixed(2));
}

export interface JamCriterionRating {
  fun: number; // 1..5
  creativity: number; // 1..5
  theme: number; // 1..5
}

export interface JamBayesianResult {
  ratingCount: number;
  rawFun: number;
  rawCreativity: number;
  rawTheme: number;
  rawMean: number;
  adjustedScore: number;
  isRanked: boolean; // Requires >= 5 ratings unless jam has < 5 entries
}

/**
 * Computes Bayesian shrinkage score for a Game Jam entry:
 *   adjusted = (sum_of_ratings + m * globalMean) / (ratingCount + m), where m = 5
 */
export function computeJamBayesianScore(
  ratings: JamCriterionRating[],
  globalMean = 3.8,
  minRatingsForRank = 5
): JamBayesianResult {
  const m = 5;
  const count = ratings.length;
  if (count === 0) {
    return {
      ratingCount: 0,
      rawFun: 0,
      rawCreativity: 0,
      rawTheme: 0,
      rawMean: 0,
      adjustedScore: Number(globalMean.toFixed(2)),
      isRanked: false,
    };
  }

  let sumFun = 0;
  let sumCre = 0;
  let sumThm = 0;
  for (const r of ratings) {
    sumFun += r.fun;
    sumCre += r.creativity;
    sumThm += r.theme;
  }

  const rawFun = sumFun / count;
  const rawCreativity = sumCre / count;
  const rawTheme = sumThm / count;
  const sumOfMeans = (sumFun + sumCre + sumThm) / 3;
  const rawMean = sumOfMeans / count;

  const adjusted = (sumOfMeans + m * globalMean) / (count + m);

  return {
    ratingCount: count,
    rawFun: Number(rawFun.toFixed(2)),
    rawCreativity: Number(rawCreativity.toFixed(2)),
    rawTheme: Number(rawTheme.toFixed(2)),
    rawMean: Number(rawMean.toFixed(2)),
    adjustedScore: Number(adjusted.toFixed(2)),
    isRanked: count >= minRatingsForRank,
  };
}

/**
 * Validates a ZIP bundle's file list for the HTML5 Uploader (Section 7 of Architecture Plan).
 * Checks:
 *  - Must contain index.html at root
 *  - No unsafe executable scripts (.exe, .sh, .php, .bat, .dll, .py)
 *  - Total size <= 10 MB
 */
export function validateHtml5BundleEntries(
  filenames: string[],
  totalSizeBytes: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const maxBytes = 10 * 1024 * 1024; // 10 MB cap

  if (totalSizeBytes > maxBytes) {
    errors.push(
      `Bundle size (${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB limit.`
    );
  }

  const normalized = filenames.map((f) => f.replace(/\\/g, "/").replace(/^\.\//, ""));
  const hasRootIndex = normalized.some((f) => f.toLowerCase() === "index.html");
  if (!hasRootIndex) {
    errors.push("index.html must be at the root of the zip.");
  }

  const forbiddenExts = [".exe", ".sh", ".php", ".bat", ".cmd", ".dll", ".so", ".py", ".rb"];
  for (const f of normalized) {
    const lower = f.toLowerCase();
    for (const ext of forbiddenExts) {
      if (lower.endsWith(ext)) {
        errors.push(`Forbidden file type detected: "${f}" (${ext} files are blocked for security).`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
