# Public repository access controls

A public GitHub repository is readable and forkable by anyone. The settings in
this guide limit who can change, merge, administer, or moderate the project;
they cannot limit who reads the repository or copies its cleared contents.

Use these steps before or immediately after making the repository public.

## Choose an access model

For a small project owned by a personal GitHub account, keep yourself as the
owner and invite someone as a collaborator only when they need to push changes.
Personal repositories have an owner and collaborators, rather than granular
repository roles.

If several people need different responsibilities, consider transferring the
repository to a GitHub organization. Organization repositories support Read,
Triage, Moderate, Write, Maintain, and Admin roles.

Recommended assignments for an organization repository:

| Responsibility                     | Recommended role                                               |
| ---------------------------------- | -------------------------------------------------------------- |
| Project owner and recovery contact | Admin (keep this to one or two people)                         |
| Release or repository maintainer   | Maintain                                                       |
| Trusted code contributor           | Write                                                          |
| Issue or discussion moderator      | Triage or Moderate                                             |
| Public contributor                 | No repository role; contribute through a fork and pull request |

Do not grant Admin merely to let someone review or merge code. Admins can
change repository settings, access, rules, and secrets-related configuration.

## Limit administration and write access

1. Open the repository, then select **Settings** > **Collaborators and teams**
   or **Manage access**.
2. Remove any person who no longer needs access.
3. Keep the owner or Admin list deliberately small.
4. Give active contributors Write access only when they need to push a branch.
   People who only propose changes can use forks and pull requests without
   collaborator access.
5. If the repository is organization-owned, use a team rather than repeatedly
   assigning individual access, and give the team the least-privileged role.

Review access again whenever a contributor leaves the project or changes roles.

## Require reviewed pull requests on the default branch

1. Select **Settings** > **Rules** > **Rulesets** > **New branch ruleset**.
2. Target the repository's default branch.
3. Enable these protections:
   - **Require a pull request before merging**.
   - Require one approving review; increase to two when two independent
     reviewers are available.
   - **Dismiss stale approvals** when new commits are pushed.
   - Require approval of the most recent reviewable push by someone other than
     the person who made that push.
   - Require conversation resolution before merging.
   - Require the successful job from this repository's **Quality** workflow.
   - Block force pushes and branch deletion.
4. Do not create a broad bypass list. If a bypass is necessary for emergency
   maintenance, restrict it to the owner or a named release maintainer and use
   a pull request when practical.

If you are the only maintainer, a required approval can prevent you from
merging your own pull request. Either retain a narrowly scoped owner bypass or
wait to require approvals until a second trusted reviewer is available.

After you identify trusted GitHub handles, add a `.github/CODEOWNERS` file and
turn on required code-owner review for workflow, map-policy, and deployment
changes. Do not enable this requirement until it names an available reviewer.

## Secure GitHub Actions and deployment settings

1. Select **Settings** > **Actions** > **General**.
2. Keep the default `GITHUB_TOKEN` permission set to read-only contents and
   packages.
3. Leave GitHub Actions unable to create or approve pull requests unless a
   reviewed workflow genuinely needs that ability.
4. Require approval for workflows triggered by pull requests from external
   contributors, where the setting is available.
5. Review **Secrets and variables** and remove secrets that are no longer
   needed. Keep `OPENAI_API_KEY`, if you enable the manual Codex workflow, as
   an Actions secret only.
6. Review installed GitHub Apps, deploy keys, webhooks, and GitHub Pages
   deployment settings for unnecessary access.

The current workflows explicitly request only the permissions they need. Test
the map-intake, Quality, and Pages deployment workflows after changing Actions
defaults. The Pages deployment should run only from the protected default
branch and receive only the Pages and identity-token permissions needed to
deploy its artifact. It must not receive GitHub, Dropbox, OpenAI, or map
provider credentials in browser-visible configuration.

## Moderate public participation

This project needs Issues for its research workflow, so leave Issues enabled
only if you want public map-intake submissions. Treat all public Issue content
and attachments as public material.

If spam appears, use **Settings** > **Moderation options** > **Interaction
limits**. Start with existing-user limits, then tighten to prior contributors
or collaborators if necessary. Interaction limits are temporary anti-abuse
controls; they do not make a public repository private.

You may also disable Discussions if you do not intend to moderate a separate
public forum.

## Verify the result

Before announcing the repository, confirm that:

- only intended people can administer it;
- a contributor cannot push directly to the default branch;
- a pull request requires the intended review and Quality check;
- Actions secrets are not visible in workflow logs;
- the Pages site deploys the intended `maps/inbox/` review assets from the
  protected default branch; and
- `pnpm run public:check` passes.

For current GitHub instructions, see [repository roles for organizations](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization), [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository), [Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository), and [interaction limits](https://docs.github.com/en/communities/moderating-comments-and-conversations/limiting-interactions-in-your-repository).
