# Learning Worktable

Learning Worktable is a local-first, capability-based learning application and `child-learning` Omniplug showcase for school-age learners. It creates an evidence-backed graph for each subject, starts near the child's demonstrated ability, adds approved concepts and practice branches as learning evolves, and preserves every generated activity, completed work sample, roadmap revision, and progress decision.

The application never calls the Anthropic API and needs no model credentials. Claude Code supplies the optional reasoning layer through the compiled plugin and local stdio MCP server; application code remains responsible for validation, known answers, scoring, progression, storage, and audit history.

## What is included

- Original picture-rich workbook structure with clear modeling, guided practice, independent work, application, and review.
- Original early foundations plus data-driven later examples in place value, fractions, reading and writing, ecosystems, maps, communities, and local government; approved local packs can add any subject.
- A subject-neutral, versioned `ActivitySpec` stored before any worksheet is rendered.
- Digital child activities and stable US Letter worksheet PDFs.
- A separate adult answer sheet—never serialized through child routes or APIs.
- Local worksheet-photo submission with explicit adult review and no OCR claim.
- A visual child-specific learning graph with completed, current, upcoming, extension, review, and extra-practice branches; age and grade are context, never ceilings.
- Append-only progress, recommendation, evaluation, override, report, and artifact lineage records.
- Adult dashboard, full subject-roadmap controls, immutable curriculum proposal approval, worksheet/response archive, child-safe roadmap views, reports, and optional local PIN protection.
- Canonical Omniplug source compiling reusable capabilities and manual `/child-learning-*` entry points as Claude Code skills, alongside agents, hooks, guidance, and MCP configuration.

## Architecture

```text
Claude Code + compiled Omniplug plugin
              │
              │ stdio MCP
              ▼
packages/mcp-server ── application services
              │
      ┌───────┼──────────┐
      ▼       ▼          ▼
 domain     SQLite     artifact store
 policies   records    .data/artifacts
      │
      ▼
Next.js child/adult UI + Playwright PDF renderer
```

Important boundaries:

- `packages/contracts` owns durable Zod schemas and child-safe DTOs.
- `packages/domain` owns the validated runtime curriculum graph, capability/stage availability, seeded generators, scoring, progression, review, and recommendations.
- `packages/database` owns SQLite migrations, repositories, idempotency, and append-only triggers.
- `packages/storage` owns SHA-256 content-addressed artifacts and lineage.
- `packages/rendering` owns digital/print worksheet templates and PDF generation.
- `packages/mcp-server` exposes narrow local tools/resources to Claude Code.
- `apps/web` owns the local child and adult experiences.
- `plugin` is the canonical Omniplug source; generated output goes to `dist/plugin`.

Architecture decisions are recorded under [`docs/decisions`](docs/decisions/).

## Prerequisites

Required for the local application:

- Node.js 22 or newer
- pnpm 11 (or Corepack with the repository's pinned pnpm version)

Only needed for optional tooling:

- Go 1.23 or newer to compile/install the Omniplug plugin
- Playwright Chromium to run PDF and browser verification

## Install and start locally

```sh
git clone https://github.com/asingamaneni/I-have-kids.git
cd I-have-kids
corepack enable
pnpm install
pnpm db:migrate
pnpm dev
```

Open <http://127.0.0.1:3000> and choose **Set up a learner**. Creating a profile does **not** seed or assign a worksheet. An adult first selects structured abilities they have observed, completes the per-subject starting questionnaire, or explicitly chooses that subject's entry check. Only then does the app create diagnostics near the reported level. Parent input selects what to assess; it remains a hypothesis and never counts as mastery until confirmed by the child's work. Free-text notes remain context only. No demo seed or account is required.

To load the reproducible Ava demo, use **Explore the demo** on the landing page or run:

```sh
pnpm seed
pnpm dev
```

Synthetic learner evidence is physically isolated from household records in `.data/demo/learning-worktable.db` and `.data/demo/artifacts/`. Re-running the seed reuses its immutable dataset manifest and does not reset later demo attempts. Demo screens carry a visible **Demo data** notice, and normal mutation APIs never fall back to a demo learner.

Demo routes use a separate route family:

- Child current work: <http://127.0.0.1:3000/demo/child/student-demo-ava>
- Child learning map: <http://127.0.0.1:3000/demo/child/student-demo-ava/roadmap>
- Child history: <http://127.0.0.1:3000/demo/child/student-demo-ava/history>
- Adult dashboard: <http://127.0.0.1:3000/demo/adult/student-demo-ava>
- Adult full subject roadmap: <http://127.0.0.1:3000/demo/adult/student-demo-ava/path>

### Local data and configuration

| Variable | Purpose | Default |
|---|---|---|
| `CHILD_LEARNING_PROJECT_ROOT` | Preferred explicit project root for the plugin and MCP bundle | workspace root |
| `CHILD_LEARNING_DB_PATH` or `LEARNING_WORKTABLE_DB` | SQLite database path | `.data/learning-worktable.db` |
| `CHILD_LEARNING_ARTIFACTS_DIR` or `LEARNING_WORKTABLE_ARTIFACTS` | Immutable household activity, curriculum, roadmap, submission, evaluation, and report bytes | `.data/artifacts/` |
| `CHILD_LEARNING_DEMO_DB_PATH` | Optional isolated demo SQLite path | `.data/demo/learning-worktable.db` |
| `CHILD_LEARNING_DEMO_ARTIFACTS_DIR` | Optional isolated demo artifact directory | `.data/demo/artifacts/` |
| `LEARNING_ADULT_PIN` | Optional local adult-area PIN | unset |

The preferred `CHILD_LEARNING_*` names take precedence. Existing `KINDERGARTEN_PROJECT_ROOT`, `KINDERGARTEN_DB_PATH`, and `KINDERGARTEN_ARTIFACTS_DIR` settings remain supported as compatibility fallbacks. The web app and the Claude Code plugin resolve relative paths from the pnpm workspace root, not from the process working directory. A child created in the browser is therefore available to Claude Code from the same checkout. Existing checkouts that already contain `apps/web/.data/learning-worktable.db` continue using that legacy database and its artifact directory automatically, unless explicit paths are configured.

Both data locations are gitignored. To keep separate households or test environments isolated, start the app and Claude Code with the same explicit paths:

```sh
# Terminal 1: web app
LEARNING_WORKTABLE_DB="$HOME/.learning-worktable/family.db" \
LEARNING_WORKTABLE_ARTIFACTS="$HOME/.learning-worktable/artifacts" \
pnpm dev

# Terminal 2: Claude Code with the same local data
LEARNING_WORKTABLE_DB="$HOME/.learning-worktable/family.db" \
LEARNING_WORKTABLE_ARTIFACTS="$HOME/.learning-worktable/artifacts" \
claude --plugin-dir "$PWD/dist/plugin/claude"
```

Back up both the SQLite file and artifact directory together so report and worksheet lineage remains complete.

### Optional adult PIN

Set a PIN before starting the app:

```sh
LEARNING_ADULT_PIN=2468 pnpm dev
```

When configured, setup, adult pages, reports, answer sheets, curriculum review, activity generation, reviews, and overrides require the local PIN. Protected API requests without the access cookie return a JSON `401` response rather than redirecting and losing a pending mutation. Child pages and child-safe activity and roadmap reads remain available. This is a local demo boundary, not production identity management.

## Typical local workflow

1. Open `/setup` and create a learner profile. Select abilities observed by an adult, use the subject questionnaire, or explicitly request an entry diagnostic. With no intake answer, the learner remains **awaiting intake** and receives no worksheet.
2. In **Adult view → Learning roadmap**, inspect the complete approved subject progression as one top-to-bottom map. The learner's current placement is marked inside the whole path. Select a node to add extra practice, reassess it, prioritize/defer it, or begin a proposal for another graph step.
3. In **Child view → My learning map**, the focused view collapses completed history and shows the current placement plus the next five mainline steps. The child can choose **See the whole path** to explore the complete child-safe roadmap and “You are here” marker.
4. The child worktable is an action queue: corrections first, then the best next worksheet, other not-started work, and clearly labeled work waiting for validation. Completed pages move to **My history**, where the child may open or retry the exact same immutable worksheet with a new attempt ID.
5. Every newly generated worksheet defaults to 20 problems unless the adult explicitly requests another count. Print layouts select one, two, three, or compact multi-column grids by item type to save Letter pages without crowding reading/writing work.
6. Every new worksheet includes **How to learn this**, an answer-free concept guide tied to the activity and curriculum revision. The child can open or print it before attempting the page.
7. When a roadmap reaches its approved frontier, use `/child-learning-evolve-path`. Review, approve, and activate the immutable proposal in **Adult view → Curriculum**; Claude cannot approve or activate its own proposal.
8. In **Adult view → Reviews**, confirm subjective/photo evidence before it affects progress. Concept selection uses the active graph rather than requiring an internal ID to be typed.
9. In **Adult view → Worksheets**, open prior worksheets, responses, correct answers or rubrics, and per-item rationale.
10. In **Adult view → Reports**, the latest as-of report appears first with needs-attention information at the top. Select prior report dates or create immutable current, monthly, and calendar-quarter snapshots.

The application has no cloud model integration. Digital answers are scored deterministically; photo and open-ended work remains review-gated. Claude Code is optional and operates through the local plugin/MCP boundary.

## Adaptive learning graphs

Setup begins from subjects, goals, interests, accommodations, and an adult-reported snapshot or guided questionnaire of what the child can do today. A newly created profile receives no seeded activity. The structured intake locates a diagnostic neighborhood inside the complete subject progression; progress and prerequisite completion still come exclusively from confirmed evidence.

The runtime composes immutable curriculum pack revisions into a validated graph. Subjects and stages are registry-backed strings rather than closed grade lists. Each concept declares ordered stages, typed prerequisite/readiness/extension edges, supported activity primitives, evidence rules, and a registered generator/evaluator/renderer. The original concrete → pictorial → abstract paths remain valid, while later or custom curricula can use stages such as guided, visual, planned, and independent.

Every learner receives a per-subject graph projection. Confirmed work marks completed/current nodes, exposes approved successors, materializes work at the frontier, and adds extra-practice or review side branches after repeated confirmed difficulty. Side branches rejoin their core concept and never pretend to be prerequisite mastery. When no approved successor exists, the adult view reports that the graph is ready to expand.

Curriculum revisions are immutable and content-addressed. Claude can propose original nodes, edges, and templates through MCP, but deterministic validation rejects duplicates, dangling references, cycles, unsupported activity kinds, missing answers, or removal of historical concept IDs. An adult must explicitly approve and activate a proposal. Rollback is another activation event; old graphs, activities, evidence, and reports remain reconstructable.

The subject-pack structure follows one reusable reference model for any subject: ordered micro-skills grouped into strands and phases, several diagnostic entry anchors, explicit prerequisite/readiness links, consolidation and review points, and an open frontier for later immutable revisions. The supplied Kumon Math and English learning tables informed the breadth and continuity of this architecture. Their proprietary level system, tables, worksheet wording, sample pages, illustrations, branding, and exact sequence are not copied; Math, Language Arts, and every future subject use original concept IDs, descriptions, examples, guides, activities, and layouts.

The child worktable shows only actionable or waiting work; completed attempts live in **My history**. The focused learning map collapses completed history and shows the current focus plus five next mainline steps, while **See the whole path** opens the full child-safe subject progression. The adult roadmap is always the complete approved subject map in a long top-to-bottom view, with evidence, branches, placement, and node-level controls. Every worksheet, retry submission, evaluation, report, guide, and roadmap revision stays linked to stable immutable IDs.

## Demonstration scenario

```sh
pnpm demo
```

The idempotent demo creates one student and exercises the complete evidence loop. Its comparable Addition within 10 observations are:

| Activity | Result | Policy outcome |
|---|---:|---|
| A1 | 70% | Maintain and target the weak area |
| A2 | 90% | Maintain; only one qualifying result |
| A3 | 90% | Maintain; only two qualifying results |
| A4 | 90% | Advance exactly one controlled difficulty step |

It also stores an English activity/evaluation, recommendation evidence, report snapshot, and audited human override. Generated, submitted, evaluated, and reported artifacts remain linked by hash and lineage.

## Build and use the Omniplug plugin

The project pins Omniplug to commit `1da68b18cfbf74d7cdbc0ebae9416f06a8654676`.

```sh
pnpm plugin:validate
pnpm plugin:build
```

The Claude target is written to `dist/plugin/claude`. Omniplug keeps portable entry-point sources under `plugin/commands/`, but this plugin emits each `/child-learning-*` entry point under `skills/<name>/SKILL.md` as a manual, user-invocable skill. These entry skills are not selected automatically by the model. Reusable capability skills—including `evolve-learning-graph`—remain available for skill-to-skill and model-directed use.

`pnpm plugin:build` clears only the generated Claude target before rebuilding and verifies all 11 entry skills, reusable skills, the `child-learning` manifest, and the single `child-learning-local` MCP bundle without a legacy generated `commands/` directory.

Preview a project-scoped installation without changing a project:

```sh
go run github.com/asingamaneni/omniplug/cmd/omniplug@1da68b18cfbf74d7cdbc0ebae9416f06a8654676 \
  install -s plugin --scope project --project-dir /path/to/project --target claude --dry-run
```

The public plugin namespace changed from `kindergarten-learning` to `child-learning`. Omniplug installation is additive, so an existing project-scoped installation must remove the entire old plugin-owned root once before installing the new plugin. Do not delete shared `.claude/commands` or `.claude/skills` directories:

```sh
rm -rf .claude/plugins/kindergarten-learning
```

Existing learner databases and artifacts are not moved or rewritten. The old `KINDERGARTEN_*` environment variables and read-only `kindergarten://` MCP resource URIs remain compatibility fallbacks, but old `/kindergarten-*` slash entries are intentionally not duplicated.

Remove `--dry-run` when ready to install into the current checkout:

```sh
go run github.com/asingamaneni/omniplug/cmd/omniplug@1da68b18cfbf74d7cdbc0ebae9416f06a8654676 \
  install -s plugin --scope project --project-dir "$PWD" --target claude
claude
```

The application itself still requires no Anthropic API key. Claude Code uses the user's normal local Claude Code authentication and starts the bundled stdio MCP process from the project.

## Use with Claude Code

This integration runs in **Claude Code**, not directly in the Claude.ai website or the general Claude desktop chat. Parents need a normally authenticated Claude Code installation, but the learning application never asks for or stores an Anthropic API key.

### Choose an installation mode

The project-scoped Omniplug installation above exposes the flat user-invocable skill names documented in this repository, such as `/child-learning-start`.

For a temporary session without installing generated files into the project, launch the compiled target directly:

```sh
claude --plugin-dir "$PWD/dist/plugin/claude"
```

Native plugin-directory skills are normally namespaced, for example `/child-learning:child-learning-start`. Run `/help` after launch and use the exact names Claude Code displays.

### Start the application and Claude

Use two terminals when the parent wants both Claude-assisted generation and the browser interface.

Terminal 1 — browser application:

```sh
pnpm dev
```

Terminal 2 — Claude Code with the temporary plugin:

```sh
claude --plugin-dir "$PWD/dist/plugin/claude"
```

The plugin starts its bundled local stdio MCP server automatically. Do **not** also run `pnpm mcp`; that script is for MCP development and would start a second server. The web process is needed to view digital activities, print worksheets, upload paper work, and use adult review pages. Claude can generate and persist local activity specifications through MCP even when the web process is not running.

### Start or resume a learner

With a project-scoped installation:

```text
/child-learning-start <learner-id-or-name>
```

With `--plugin-dir`:

```text
/child-learning:child-learning-start <learner-id-or-name>
```

A learner created at `/setup` has an ID in the resulting child URL. The start skill can also list local learners and load the selected learner's reported starting context, confirmed evidence, available concepts, representation stage, due reviews, and recent work.

### Generate and store new material

Start the learner first so subsequent entry skills have the correct local context. Examples below use the flat project-scoped skill names; add the `child-learning:` namespace when using `--plugin-dir`.

Create focused practice:

```text
/child-learning-create-practice math math.addition-within-10 2 5
```

Create a picture-centered activity:

```text
/child-learning-create-picture-activity math math.subtraction-within-10 practice 2
```

Parents can also use natural language after starting the learner:

```text
Create a pictorial addition activity using the default 20 questions.
Check the learner's current stage first, validate every answer, store the
activity locally, and tell me the activity ID and why it was selected.
```

```text
Introduce subtraction with household counters before giving a worksheet.
Keep the adult-reported ability as a hypothesis until the child completes
confirmed work.
```

```text
Create a short mixed review using only concepts currently available to this
learner. Include one due review and avoid concepts practiced recently.
```

Claude uses the local application to validate known answers, enforce concept-stage availability, persist the exact `ActivitySpec`, and return real artifact/activity IDs. Claude wording may personalize the material, but deterministic application code owns arithmetic, answer keys, scoring, progression, and storage.

### Evolve a subject roadmap

When the current approved graph ends, a parent adds a goal, or confirmed work repeatedly needs another route:

```text
/child-learning-evolve-path <learner-id> <subject> <goal-or-frontier>
```

The skill reads the learner's current graph and stores a validated immutable proposal. It cannot activate its own proposal. Review the graph diff in `http://127.0.0.1:3000/adult/<learner-id>/curriculum`, add an adult note, approve or reject it, and activate only an approved revision. Every prior roadmap and activity remains linked to the revision used when it was created.

### Open generated material

After Claude returns an activity ID, open:

```text
Digital activity:
http://127.0.0.1:3000/child/<learner-id>/activity/<activity-id>

Answer-free concept guide:
http://127.0.0.1:3000/child/<learner-id>/activity/<activity-id>/how-to

Child attempt history:
http://127.0.0.1:3000/child/<learner-id>/history

Printable worksheet:
http://127.0.0.1:3000/print/activity/<activity-id>

Adult answer guide:
http://127.0.0.1:3000/print/activity/<activity-id>/answers
```

New worksheets default to 20 items unless the request explicitly overrides the count. The activity appears in the learner's current queue only while it needs action; completed attempts move to History. **How to learn this** opens an answer-free concept guide tied to the same activity and curriculum revision. The printable route uses item-aware one-, two-, three-, or compact multi-column layouts and has a **Print worksheet** button.

### Check work and review progress

Digital submissions are scored deterministically by the application. For paper work, upload a PNG or JPEG through the child activity page, then confirm the proposed result in **Adult view → Reviews**. Photo and open-ended work cannot affect progress before adult confirmation.

For an existing stored submission:

```text
/child-learning-check-work <activity-id> <submission-id>
```

Do not pass a new local photo path to this skill in the current release; upload the photo through the web interface first so it receives a stored submission ID and immutable lineage.

Inspect confirmed progress:

```text
/child-learning-progress <learner-id> <evaluation-id>
```

Explain one confirmed mistake:

```text
/child-learning-explain-mistakes <evaluation-id> <item-id> child
```

Generate a new immutable adult report:

```text
/child-learning-report <learner-id> current
/child-learning-report <learner-id> monthly
/child-learning-report <learner-id> quarterly
```

The report screen selects the newest evidence cutoff by default, places needs-attention and recommended next work first, and lets an adult choose an earlier report date or create a calendar-month/calendar-quarter snapshot in an explicit timezone. Reports can also be created and opened at:

```text
http://127.0.0.1:3000/adult/<learner-id>/reports
```

### Parent skill reference

The Claude build emits all 11 canonical entry points as manual skills. Arguments are positional and are passed to the underlying reusable skill through `$ARGUMENTS`.

| Project-scoped entry skill | Arguments | What it does |
|---|---|---|
| `/child-learning-start` | `[student-id-or-name]` | Start or resume a learner session, load real local state, and suggest the next action without changing progress. |
| `/child-learning-demo` | `[student-id]` | Walk through the canonical learning loop using actual local artifacts and results. |
| `/child-learning-create-practice` | `[subject] [concept] [difficulty] [question-count]` | Create and persist validated practice at the learner's currently available stage; question count defaults to 20. |
| `/child-learning-create-picture-activity` | `[subject] [concept] [activity-type] [difficulty]` | Create an original validated printable activity whose pictures carry instructional meaning. |
| `/child-learning-check-work` | `[activity-id] [submission-id]` | Evaluate stored work against its exact activity; deterministic checks remain in application code and uncertainty goes to adult review. |
| `/child-learning-explain-mistakes` | `[evaluation-id] [item-id] [audience]` | Explain one confirmed mistake safely without exposing hidden answers. |
| `/child-learning-progress` | `[student-id] [evaluation-id]` | Apply confirmed evidence through the deterministic progression policy. |
| `/child-learning-report` | `[student-id] [current-or-monthly-or-quarterly]` | Create an immutable as-of adult report from confirmed evidence. |
| `/child-learning-add-concept` | `[subject] [concept] [objectives] [prerequisites]` | Propose and validate an original curriculum concept for explicit adult approval. |
| `/child-learning-evolve-path` | `[student-id] [subject] [goal-or-frontier]` | Store an evidence-aware graph extension proposal, then stop for adult review and activation. |
| `/child-learning-verify` | `[scope]` | Run non-destructive plugin and learning-contract verification. |

A few additional examples:

```text
/child-learning-demo student-demo-ava
/child-learning-add-concept social-studies local-history "Build a simple timeline" "social-studies.communities"
/child-learning-verify all
```

For `--plugin-dir`, prefix these names with `child-learning:`—for example, `/child-learning:child-learning-demo student-demo-ava`. Run `/help` in Claude Code for the authoritative names exposed by the current installation.

The entry skills delegate to 14 reusable capabilities. These are implementation building blocks that Claude may select or one entry skill may call; parents normally begin with the `/child-learning-*` entries above.

| Capability area | Reusable skills |
|---|---|
| Activity creation | `create-practice`, `create-picture-activity`, `create-visual-assets` |
| Adaptation and review | `adjust-difficulty`, `practice-weak-area`, `review-old-topic`, `recommend-next-activity` |
| Evidence and reporting | `check-work`, `track-progress`, `explain-mistakes`, `generate-progress-report` |
| Curriculum and quality | `author-curriculum`, `evolve-learning-graph`, `audit-learning-loop` |

`author-curriculum` and `evolve-learning-graph` may validate and store proposals, but they cannot approve or activate their own curriculum changes. `check-work` operates on a submission already stored by the application; upload new paper or image work through the web interface first.

### Authentication and data boundary

- Claude Code uses the parent's normal Claude Code authentication.
- The application and MCP server require no `ANTHROPIC_API_KEY`.
- Application code never autonomously sends child data to a model API.
- When a parent deliberately uses Claude Code, prompts and the local context/tool results Claude reads are processed through that parent's configured Claude Code service. Keep profiles minimal and do not enter unnecessary identifying information.
- SQLite files, uploaded work, and immutable artifacts stay under the configured local paths unless the parent explicitly asks Claude to read them.
- Back up the database and artifact directory together.
- Setting `LEARNING_ADULT_PIN` protects setup, reports, answer guides, adult pages, generation, and review routes in the browser.

### Current distribution limitation

The repository currently contains canonical Omniplug source and a generated local Claude target, not a Claude plugin marketplace manifest. Parents therefore use the documented project-scoped Omniplug installation or `claude --plugin-dir`; `/plugin install` from a marketplace is not yet available.

The canonical plugin provides:

- 14 reusable capability skills, including practice generation, visual activities, work checking, progress, recommendations, reports, and curriculum authoring.
- 11 manual, user-invocable `/child-learning-*` entry skills generated from portable canonical command sources.
- Read-oriented curriculum, assessment, and child-experience agents.
- Safe session/verification hooks.
- A bundled local stdio MCP server that never calls the network or requests credentials.

## Verification

```sh
pnpm verify:fast      # branding gate, lint, typecheck, tests, Next build, and Claude plugin build/output checks
pnpm plugin:validate  # validate the canonical Omniplug source for Claude
pnpm verify           # verify:fast plus Playwright browser/PDF tests
```

The test corpus covers the tracked branding allowlist; contracts and child privacy; intake without implicit worksheets; diagnostic placement; demo/household isolation; lifecycle and retry lineage; focused/full roadmaps; curriculum activation; generated-answer consistency; 20-item defaults; adaptive print pagination; report cutoffs and calendar periods; SQLite immutability; artifact hashes; and desktop/mobile browser workflows.

Before the full verification suite, install its browser once:

```sh
pnpm exec playwright install chromium
```

### Troubleshooting

- **Port 3000 is busy:** run `pnpm --filter @child-learning/web exec next dev --webpack --port 3100` and open the printed URL.
- **SQLite native module did not build:** confirm Node 22+, run `pnpm install` again, and verify pnpm honored the repository's approved `better-sqlite3` build script.
- **The demo profile is missing:** use **Explore the demo** or run `pnpm seed`. Demo data is written only to `.data/demo`; normal reads and household storage are never seeded or modified.
- **A child cannot open an activity:** inspect **Adult view → Learning roadmap**. The concept may be locked, deferred, tied to an inactive curriculum revision, or waiting for an earlier learning stage. An adult can open an early introduction without recording false mastery.
- **Photo work does not affect progress:** this is intentional. Open **Adult view → Reviews** and confirm the evidence with a score and rationale.
- **Plugin changes are not visible:** rerun `pnpm plugin:build`, then reinstall the project-scoped Claude target.

## Safety and privacy

- Child-facing activity data use an explicit allowlist: answer contracts, scoring policy, curriculum revision internals, generator seeds, adult rationale, and provenance notes are omitted along with hidden item answers.
- Known facts are never delegated to Claude.
- Claude Code-assisted image interpretation is stored as a proposal and cannot change progress until an adult confirms it.
- Photo uploads remain local and are marked as requiring review; the MVP does not claim handwriting recognition.
- Historical evaluations, events, reports, recommendations, and overrides are append-only.
- A single result never creates a permanent ability label or an unsupported difficulty jump.
- School grade is context only and never limits concept availability or maximum difficulty.
- Adults may introduce a concept early with concrete materials, prioritize it, defer it, or bring it back without falsely recording prerequisite mastery.

## Workbook design and originality

Learning Worktable uses an original teaching rhythm: a named skill, short directions, a concrete model, guided practice, independent practice, application, and review. All passages, prompts, exercises, SVG assets, and page compositions are original.

The material decision is recorded in [`docs/decisions/0002-original-workbook-material.md`](docs/decisions/0002-original-workbook-material.md), and the reusable design rules are documented in [`docs/worksheet-design-principles.md`](docs/worksheet-design-principles.md).
