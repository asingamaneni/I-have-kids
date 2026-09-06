# Learning Worktable

Learning Worktable is a local-first, capability-based early learning application and an Omniplug showcase. It creates original picture-rich practice, preserves generated and completed work, scores deterministic answers, tracks concept-level evidence, and explains why the next activity was selected.

The application never calls the Anthropic API and needs no model credentials. Claude Code supplies the optional reasoning layer through the compiled plugin and local stdio MCP server; application code remains responsible for validation, known answers, scoring, progression, storage, and audit history.

## What is included

- Original picture-rich workbook structure with clear modeling, guided practice, independent work, application, and review.
- Picture addition and subtraction, counting, equal-group and fair-sharing foundations, English phonics/reading/writing, reasoning, and starter science activity contracts.
- A subject-neutral, versioned `ActivitySpec` stored before any worksheet is rendered.
- Digital child activities and stable US Letter worksheet PDFs.
- A separate adult answer sheet—never serialized through child routes or APIs.
- Local worksheet-photo submission with explicit adult review and no OCR claim.
- A child-specific concept path that moves from concrete materials to pictures and symbols, with deterministic scoring, controlled difficulty steps, and spaced reviews.
- Append-only progress, recommendation, evaluation, override, report, and artifact lineage records.
- Adult dashboard, capability path controls, worksheet/response archive, correct-answer review, progress/history/review/report views, and optional local PIN protection.
- Canonical Omniplug source compiling to Claude Code skills, commands, agents, hooks, guidance, and MCP configuration.

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

Open <http://127.0.0.1:3000> and choose **Set up a learner**. An adult can state what the child comfortably does today and add a short observation note. The app creates brief starting diagnostics near that reported level; the statements remain hypotheses and never count as mastery until confirmed by the child's work. Leave the capability checklist blank to begin with a concrete counting introduction. No demo seed or account is required.

To load the reproducible Ava demo instead:

```sh
pnpm seed
pnpm dev
```

Demo routes:

- Child shelf: <http://127.0.0.1:3000/child/student-demo-ava>
- Adult dashboard: <http://127.0.0.1:3000/adult/student-demo-ava>
- Learning path: <http://127.0.0.1:3000/adult/student-demo-ava/path>
- Worksheet history: <http://127.0.0.1:3000/adult/student-demo-ava/worksheets>
- Printable worksheet: <http://127.0.0.1:3000/print/activity/activity-addition-01>
- Adult answer guide: <http://127.0.0.1:3000/print/activity/activity-addition-01/answers>

### Local data and configuration

| Variable | Purpose | Default |
|---|---|---|
| `LEARNING_WORKTABLE_DB` | SQLite database path | `.data/learning-worktable.db` |
| `LEARNING_WORKTABLE_ARTIFACTS` | Immutable activity, submission, evaluation, and report bytes | `.data/artifacts/` |
| `LEARNING_ADULT_PIN` | Optional local adult-area PIN | unset |

Both data locations are gitignored. To keep separate households or test environments isolated, start the app with explicit paths:

```sh
LEARNING_WORKTABLE_DB="$HOME/.learning-worktable/family.db" \
LEARNING_WORKTABLE_ARTIFACTS="$HOME/.learning-worktable/artifacts" \
pnpm dev
```

Back up both the SQLite file and artifact directory together so report and worksheet lineage remains complete.

### Optional adult PIN

Set a PIN before starting the app:

```sh
LEARNING_ADULT_PIN=2468 pnpm dev
```

When configured, setup, adult pages, reports, answer sheets, activity generation, reviews, and overrides require the local PIN. This is a local demo boundary, not production identity management.

## Typical local workflow

1. Open `/setup` and create a learner, or run `pnpm seed` for the demo.
2. In **Adult view → Learning path**, review every concept and its current concrete, pictorial, or abstract stage. Introduce, prioritize, defer, or restore concepts with an adult note.
3. In the child shelf, use **See all**, **By subject**, or **By concept** and open the recommended practice.
4. For paper work, choose **Use a paper worksheet**, then select **Print worksheet** in the browser. A completed paper page can be photographed and stored for adult review.
5. In **Adult view → Reviews**, confirm subjective/photo evidence before it affects progress.
6. In **Adult view → Worksheets**, open prior worksheets, child responses, correct answers or rubrics, and per-item rationale.
7. In **Adult view → Reports**, create an immutable current report and open any historical snapshot.

The application has no cloud model integration. Digital answers are scored deterministically; photo and open-ended work remains review-gated. Claude Code is optional and operates through the local plugin/MCP boundary.

## Capability-based learning path

Setup can begin from an adult-reported snapshot of what the child can do today. The system uses that snapshot only to choose starting diagnostic activities; progress and prerequisite mastery still come exclusively from confirmed assessment evidence.

The runtime loads the versioned concept graph from `curriculum/*.json`. Each concept declares ordered learning stages, delivery mode, evidence purpose, readiness relationships, and the generator used to materialize work.

- **Concrete:** introduce the idea with real objects, movement, sorting, or spoken language.
- **Pictorial:** connect the same idea to pictures and structured practice.
- **Abstract:** use words and symbols only when the child has enough prior evidence.

Locked and deferred work is excluded before recommendation scoring and is not exposed through child routes. Confirmed evidence can unlock and materialize the next stage automatically. An adult can open an early concrete introduction, prioritize eligible work, defer a concept, or clear a directive from the Learning path page. These actions are append-only and never masquerade as mastery.

The child shelf supports See all, By subject, and By concept views. Adults can open Worksheet history to see every prior submission, the original worksheet, the adult answer guide, the child's responses, and per-item evaluation rationale. Immutable progress reports include recent worksheet results and links back to this review trail.

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

The project pins Omniplug to commit `c0d7e55729c91f9d618380835ec356f312dcb1ef`.

```sh
pnpm plugin:validate
pnpm plugin:build
```

The Claude target is written to `dist/plugin/claude`. Preview a project-scoped installation without changing a project:

```sh
go run github.com/asingamaneni/omniplug/cmd/omniplug@c0d7e55729c91f9d618380835ec356f312dcb1ef \
  install -s plugin --scope project --project-dir /path/to/project --target claude --dry-run
```

Remove `--dry-run` when ready to install into the current checkout:

```sh
go run github.com/asingamaneni/omniplug/cmd/omniplug@c0d7e55729c91f9d618380835ec356f312dcb1ef \
  install -s plugin --scope project --project-dir "$PWD" --target claude
claude
```

The application itself still requires no Anthropic API key. Claude Code uses the user's normal local Claude Code authentication and starts the bundled stdio MCP process from the project.

The canonical plugin provides:

- 13 focused skills, including practice generation, visual activities, work checking, progress, recommendations, reports, and curriculum authoring.
- 10 `/kindergarten-*` commands.
- Read-oriented curriculum, assessment, and child-experience agents.
- Safe session/verification hooks.
- A bundled local stdio MCP server that never calls the network or requests credentials.

## Verification

```sh
pnpm verify:fast   # lint, typecheck, unit/integration tests, Next build, Omniplug validation
pnpm verify        # verify:fast plus Playwright browser/PDF tests
```

The test corpus covers contracts, generated-answer consistency, progression boundaries, child answer privacy, SQLite immutability, idempotency, artifact hashes/lineage, MCP review/override flows, worksheet pagination, physical Letter PDFs, and browser workflows.

Before the full verification suite, install its browser once:

```sh
pnpm exec playwright install chromium
```

### Troubleshooting

- **Port 3000 is busy:** run `pnpm --filter @kindergarten/web exec next dev --webpack --port 3100` and open the printed URL.
- **SQLite native module did not build:** confirm Node 22+, run `pnpm install` again, and verify pnpm honored the repository's approved `better-sqlite3` build script.
- **The demo profile is missing:** run `pnpm seed`. Normal read requests deliberately never seed or modify data.
- **A child cannot open an activity:** inspect **Adult view → Learning path**. The concept may be locked, deferred, or waiting for an earlier representation stage. An adult can open a concrete introduction without recording false mastery.
- **Photo work does not affect progress:** this is intentional. Open **Adult view → Reviews** and confirm the evidence with a score and rationale.
- **Plugin changes are not visible:** rerun `pnpm plugin:build`, then reinstall the project-scoped Claude target.

## Safety and privacy

- Child-facing data omit both `answerSpecs` and hidden item answer fields.
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
