import { useState, type FormEvent } from "react";
import { isValidMapId, localMapIdFromFileName } from "../lib/mapIntake";

interface PrivateReviewLauncherProps {
  onOpenIntake: (input: { mapId: string; issueNumber?: number }) => void;
  onOpenLocalReview: (input: { file: File; issueNumber?: number }) => void;
}

export function PrivateReviewLauncher({
  onOpenIntake,
  onOpenLocalReview
}: PrivateReviewLauncherProps) {
  const [mapId, setMapId] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [selectedFile, setSelectedFile] = useState<File>();
  const [formError, setFormError] = useState<string>();

  function parsedIssueNumber(): number | undefined {
    return /^[1-9][0-9]*$/.test(issueNumber) ? Number(issueNumber) : undefined;
  }

  function handleRepositorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidMapId(mapId)) {
      setFormError(
        "Enter the map ID from the Issue using lowercase letters, numbers, and hyphens."
      );
      return;
    }
    if (issueNumber && !parsedIssueNumber()) {
      setFormError("Issue number must be a positive whole number.");
      return;
    }
    setFormError(undefined);
    onOpenIntake({ mapId, issueNumber: parsedIssueNumber() });
  }

  function handleLocalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setFormError("Choose a PNG, JPEG, or WebP review image first.");
      return;
    }
    if (issueNumber && !parsedIssueNumber()) {
      setFormError("Issue number must be a positive whole number.");
      return;
    }
    setFormError(undefined);
    onOpenLocalReview({ file: selectedFile, issueNumber: parsedIssueNumber() });
  }

  return (
    <section className="private-review-launcher panel" aria-label="Open a map review">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Review workspace</p>
          <h2>Open the map linked to your Issue</h2>
        </div>
        <span className="source-badge">GitHub Pages</span>
      </div>
      <p className="panel-note">
        This browser workspace receives no GitHub or Dropbox credentials and never writes to an
        Issue automatically.
      </p>

      <div className="private-review-options">
        <form className="private-review-form" onSubmit={handleRepositorySubmit}>
          <h3>Repository review copy</h3>
          <p>
            Use the map ID from the Issue. GitHub Pages loads the small review copy from
            <code> maps/inbox</code>; it never receives a GitHub or Dropbox credential.
          </p>
          <label className="field-label" htmlFor="map-id">
            Map ID
          </label>
          <input
            id="map-id"
            onChange={(event) => setMapId(event.target.value)}
            placeholder="kentwood-mi-zoning-1970"
            value={mapId}
          />
          <label className="field-label" htmlFor="repository-issue-number">
            Issue number (optional)
          </label>
          <input
            id="repository-issue-number"
            inputMode="numeric"
            min="1"
            onChange={(event) => setIssueNumber(event.target.value)}
            placeholder="42"
            type="number"
            value={issueNumber}
          />
          <button className="primary-button" type="submit">
            Open repository copy
          </button>
        </form>

        <form className="private-review-form" onSubmit={handleLocalSubmit}>
          <h3>Private Issue attachment or local review copy</h3>
          <p>
            Download an authorized image from the Issue or Dropbox, then select it here. It stays in
            this browser session and is not uploaded or committed.
          </p>
          <label className="field-label" htmlFor="local-review-image">
            Review image
          </label>
          <input
            accept="image/png,image/jpeg,image/webp"
            id="local-review-image"
            onChange={(event) => setSelectedFile(event.target.files?.[0])}
            type="file"
          />
          <label className="field-label" htmlFor="local-issue-number">
            Issue number (optional)
          </label>
          <input
            id="local-issue-number"
            inputMode="numeric"
            min="1"
            onChange={(event) => setIssueNumber(event.target.value)}
            placeholder="42"
            type="number"
            value={issueNumber}
          />
          <p className="file-name">
            {selectedFile
              ? "Will open as " + localMapIdFromFileName(selectedFile.name)
              : "Use a PNG, JPEG, or WebP review image. Convert PDF pages before loading."}
          </p>
          <button className="primary-button" type="submit">
            Open local review copy
          </button>
        </form>
      </div>

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}
    </section>
  );
}
