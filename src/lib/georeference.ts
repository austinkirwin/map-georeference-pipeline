import type { GroundControlPoint, HistoricPixel, MapCoordinate } from "../domain/types";

const EARTH_RADIUS_METERS = 6_378_137;
const MAX_MERCATOR_LATITUDE = 85.0511287798;

export interface ProjectedCoordinate {
  x: number;
  y: number;
}

export interface AffineTransform {
  /**
   * Maps a historic pixel to Web Mercator metres:
   * x' = a*x + b*y + c; y' = d*x + e*y + f.
   */
  parameters: [number, number, number, number, number, number];
}

export interface GeoreferenceAnalysis {
  transform?: AffineTransform;
  residualMetersByPointId: Record<string, number>;
  fitRmseMeters?: number;
  checkRmseMeters?: number;
  coverageRatio: number;
  coverage: "poor" | "adequate" | "good";
  warnings: string[];
}

export interface ProjectedAffineSample {
  pixel: HistoricPixel;
  projected: ProjectedCoordinate;
}

export function toWebMercator(point: MapCoordinate): ProjectedCoordinate {
  const latitude = Math.max(
    Math.min(point.latitude, MAX_MERCATOR_LATITUDE),
    -MAX_MERCATOR_LATITUDE
  );
  const longitudeRadians = (point.longitude * Math.PI) / 180;
  const latitudeRadians = (latitude * Math.PI) / 180;

  return {
    x: EARTH_RADIUS_METERS * longitudeRadians,
    y: EARTH_RADIUS_METERS * Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2))
  };
}

export function fromWebMercator(point: ProjectedCoordinate): MapCoordinate {
  return {
    longitude: (point.x / EARTH_RADIUS_METERS) * (180 / Math.PI),
    latitude:
      (2 * Math.atan(Math.exp(point.y / EARTH_RADIUS_METERS)) - Math.PI / 2) * (180 / Math.PI),
    crs: "EPSG:4326"
  };
}

export function applyAffineTransform(
  transform: AffineTransform,
  pixel: HistoricPixel
): ProjectedCoordinate {
  const [a, b, c, d, e, f] = transform.parameters;
  return {
    x: a * pixel.x + b * pixel.y + c,
    y: d * pixel.x + e * pixel.y + f
  };
}

/**
 * Solves an affine pixel-to-projected-coordinate transform with ordinary least squares.
 * The caller must supply at least three non-collinear samples.
 */
export function fitProjectedAffine(samples: ProjectedAffineSample[]): AffineTransform | undefined {
  if (samples.length < 3) {
    return undefined;
  }

  const normalMatrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  const projectedX = [0, 0, 0];
  const projectedY = [0, 0, 0];

  for (const sample of samples) {
    const row = [sample.pixel.x, sample.pixel.y, 1];
    for (let i = 0; i < row.length; i += 1) {
      for (let j = 0; j < row.length; j += 1) {
        normalMatrix[i][j] += row[i] * row[j];
      }
      projectedX[i] += row[i] * sample.projected.x;
      projectedY[i] += row[i] * sample.projected.y;
    }
  }

  const xParameters = solveLinearSystem(normalMatrix, projectedX);
  const yParameters = solveLinearSystem(normalMatrix, projectedY);
  if (!xParameters || !yParameters) {
    return undefined;
  }

  return {
    parameters: [
      xParameters[0],
      xParameters[1],
      xParameters[2],
      yParameters[0],
      yParameters[1],
      yParameters[2]
    ]
  };
}

export function analyzeGeoreference(
  controlPoints: GroundControlPoint[],
  imageWidth: number,
  imageHeight: number
): GeoreferenceAnalysis {
  const enabledFitPoints = controlPoints.filter((point) => point.enabled && point.role === "fit");
  const transform = fitProjectedAffine(
    enabledFitPoints.map((point) => ({
      pixel: point.historicPixel,
      projected: toWebMercator(point.modernLocation)
    }))
  );
  const warnings: string[] = [];

  if (enabledFitPoints.length < 3) {
    warnings.push("Add at least three enabled fit points before calculating an affine transform.");
  }

  const coverageRatio = calculateCoverage(enabledFitPoints, imageWidth, imageHeight);
  const coverage = coverageRatio < 0.22 ? "poor" : coverageRatio < 0.48 ? "adequate" : "good";
  if (enabledFitPoints.length >= 3 && coverage === "poor") {
    warnings.push("Fit points are clustered. Spread them across the map sheet before approval.");
  }

  const enabledCheckPoints = controlPoints.filter(
    (point) => point.enabled && point.role === "check"
  );
  if (enabledFitPoints.length >= 3 && enabledCheckPoints.length === 0) {
    warnings.push(
      "Add at least one independent check point; it must not be used to fit the transform."
    );
  }

  if (!transform) {
    if (enabledFitPoints.length >= 3) {
      warnings.push(
        "The selected fit points are collinear or otherwise cannot form an affine transform."
      );
    }
    return {
      residualMetersByPointId: {},
      coverageRatio,
      coverage,
      warnings
    };
  }

  const residualMetersByPointId = Object.fromEntries(
    controlPoints
      .filter((point) => point.enabled)
      .map((point) => [
        point.id,
        distanceMeters(
          applyAffineTransform(transform, point.historicPixel),
          toWebMercator(point.modernLocation)
        )
      ])
  );

  return {
    transform,
    residualMetersByPointId,
    fitRmseMeters: rootMeanSquare(
      enabledFitPoints.map((point) => residualMetersByPointId[point.id])
    ),
    checkRmseMeters:
      enabledCheckPoints.length > 0
        ? rootMeanSquare(enabledCheckPoints.map((point) => residualMetersByPointId[point.id]))
        : undefined,
    coverageRatio,
    coverage,
    warnings
  };
}

function calculateCoverage(
  points: GroundControlPoint[],
  imageWidth: number,
  imageHeight: number
): number {
  if (points.length === 0 || imageWidth <= 0 || imageHeight <= 0) {
    return 0;
  }

  const xs = points.map((point) => point.historicPixel.x);
  const ys = points.map((point) => point.historicPixel.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);

  return Math.min(1, (width * height) / (imageWidth * imageHeight));
}

function distanceMeters(first: ProjectedCoordinate, second: ProjectedCoordinate): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function rootMeanSquare(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0) / values.length);
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | undefined {
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  const size = augmented.length;

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let maxRow = pivotIndex;
    for (let row = pivotIndex + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivotIndex]) > Math.abs(augmented[maxRow][pivotIndex])) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow][pivotIndex]) < 1e-12) {
      return undefined;
    }

    [augmented[pivotIndex], augmented[maxRow]] = [augmented[maxRow], augmented[pivotIndex]];
    const pivot = augmented[pivotIndex][pivotIndex];
    for (let column = pivotIndex; column <= size; column += 1) {
      augmented[pivotIndex][column] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivotIndex) {
        continue;
      }
      const factor = augmented[row][pivotIndex];
      for (let column = pivotIndex; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivotIndex][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
}
