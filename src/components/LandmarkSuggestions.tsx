import { landmarkSuggestionsFor } from "../data/landmarkSuggestions";

interface LandmarkSuggestionsProps {
  mapId: string;
}

export function LandmarkSuggestions({ mapId }: LandmarkSuggestionsProps) {
  const suggestions = landmarkSuggestionsFor(mapId);
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <details className="panel landmark-suggestions">
      <summary>Preliminary landmark suggestions ({suggestions.length})</summary>
      <p>
        These AI-assisted suggestions come from an initial visual inspection of this Kentwood scan.
        They are approximate and have not been matched to the modern map. Check each feature and
        place both halves yourself, or choose different landmarks. Suggestions do not enter the fit.
      </p>
      <ul>
        {suggestions.map((suggestion) => (
          <li key={suggestion.id}>
            <strong>{suggestion.label}</strong>
            <div>{suggestion.historicLocation}</div>
            <div>{suggestion.note}</div>
          </li>
        ))}
      </ul>
    </details>
  );
}
