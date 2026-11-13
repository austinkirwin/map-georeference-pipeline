# Optional Codex Issue assistance

The `Codex landmark-record review (manual)` workflow is an optional, narrowly
scoped review aid. It is not an automatic agent and it does not replace the
landmark picker, georeferencing process, or human research review.

## What it does

When manually dispatched from the default branch, the workflow:

1. retrieves one selected map Issue;
2. selects only the latest comment containing the picker’s matching
   `georef-control-points` marker for that Issue;
3. loads the corresponding small `map.json` intake record when available;
4. asks Codex for a structured completeness and uncertainty review; and
5. shows the JSON output in the workflow summary.

The workflow is disabled by default. It has no `issues`, `push`, pull-request,
or scheduled trigger. Checking **Run Codex** is required each time it runs.

## Enable it

1. Create an OpenAI API key for the project that should pay for this optional
   automation.
2. In GitHub, open **Settings → Secrets and variables → Actions** for this
   repository and add it as the `OPENAI_API_KEY` secret.
3. Open **Actions → Codex landmark-record review (manual) → Run workflow**.
4. Select the default branch, enter the map Issue number, and check **Run
   Codex**. Leave **Post the reviewed JSON to the Issue** unchecked for the
   first run.
5. Inspect the run’s `summarize` job. If the draft is appropriate, rerun the
   workflow with posting explicitly enabled, or copy the result into the Issue
   yourself.

The [official OpenAI documentation for the Codex GitHub Action](https://learn.chatgpt.com/docs/github-action)
describes the action and its security controls.

## Boundaries and safeguards

- The Codex job has only `contents: read` and `issues: read`; it uses a
  read-only sandbox and no GitHub write permission.
- A separate job receives `issues: write` only when posting was explicitly
  requested. It can create one comment but cannot modify labels, close Issues,
  commit files, or open pull requests.
- The API key is supplied only to the `openai/codex-action` step, not as a
  job-wide environment variable.
- The prepared task context includes only the selected landmark comment, map
  metadata, and minimal Issue metadata. Those inputs are untrusted data. It
  strips HTML comments from selected text and the prompt directs Codex not to
  follow instructions embedded in that data.
- The workflow does not run a raster-processing job. Because Codex can read the
  checked-out repository, do not store restricted maps or other sensitive
  material there.
- Output is a draft review of completeness and uncertainty. It cannot
  authenticate sources, validate a legal conclusion, or approve a map for
  processing.

Keep this workflow manual until repeated human-reviewed runs show that its
output is useful and appropriately cautious. Any future automatic trigger
should be added only after a separate security and provenance review.
