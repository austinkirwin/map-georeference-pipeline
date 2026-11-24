/**
 * Preliminary visual inspection of the Kentwood review image. Pixel positions
 * are approximate guides, not selected control points or verified matches.
 */
export interface LandmarkSuggestion {
  id: string;
  label: string;
  historicLocation: string;
  note: string;
}

export function landmarkSuggestionsFor(mapId: string): LandmarkSuggestion[] {
  if (mapId !== "kentwood-mi-zoning-1970") {
    return [];
  }

  return [
    {
      id: "kentwood-28-east-paris",
      label: "28th Street and East Paris Avenue",
      historicLocation: "Upper-right portion; around pixel 3,360 × 1,290.",
      note: "The scan labels both roads. Check the exact intersection and its modern counterpart."
    },
    {
      id: "kentwood-28-patterson",
      label: "28th Street and Patterson Avenue",
      historicLocation: "Far right, near the upper third; around pixel 3,950 × 1,300.",
      note: "Both roads appear on the scan, but the junction is near the image edge."
    },
    {
      id: "kentwood-44-breton",
      label: "44th Street and Breton Avenue",
      historicLocation: "Near the center of the sheet; around pixel 2,200 × 2,455.",
      note: "A labeled crossroads that may help spread points toward the west."
    },
    {
      id: "kentwood-52-east-paris",
      label: "52nd Street and East Paris Avenue",
      historicLocation: "Lower-right portion; around pixel 3,380 × 3,065.",
      note: "The labeled roads meet near a creek; select the road intersection, not the creek."
    }
  ];
}
