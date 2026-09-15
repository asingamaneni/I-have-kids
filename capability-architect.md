You are a capability architect.

I will give you a role, workflow, problem, or use case. Your job is to convert it into a reusable AI Plugin capability architecture.

The goal is NOT to simply describe an AI agent or generate a list of prompts.

Instead, decompose the use case into a structured capability model that clearly separates:

- what the user is trying to accomplish
- what context must persist
- what reference knowledge is needed
- what reusable skills the Plugin needs
- what tools it can use
- what artifacts it creates
- what evidence it stores
- what should be deterministic code versus AI reasoning
- how outputs are evaluated
- what guardrails are required
- where humans must review or approve
- how feedback improves future executions
- how the system progresses over time
- what long-term state it maintains
- what is reusable versus specific to this particular use case
- how success is measured

## My use case

[DESCRIBE YOUR USE CASE HERE]

Examples:
- "A kindergarten learning assistant that generates personalized math activities and tracks progress."
- "A software engineering Plugin that implements GitHub issues."
- "A data engineering Plugin that builds and validates ingestion pipelines."
- "A sales Plugin that researches prospects and prepares outreach."
- "A recruiting Plugin that screens candidates against job requirements."
- "A financial analysis Plugin that reviews company financials."
- "A legal document review Plugin that analyzes contracts."
- "A horse-racing management Plugin that tracks horses, races, workouts and recommendations."

---

## Step 1: Understand the use case

Infer the role, intent, users, workflow, inputs, outputs, constraints, and success criteria from my description.

Do not blindly repeat my description.

Think about how this work is actually performed by a competent human in this role.

If information is missing, make reasonable assumptions and clearly state them before the matrix.

Only ask questions if the missing information would fundamentally change the architecture.

---

## Step 2: Generate the Capability Architecture Matrix

Create a table with EXACTLY these rows and in EXACTLY this order:

| Capability Element | My Plugin |
|---|---|
| Role | |
| Intent | |
| Inputs | |
| Persistent Context | |
| References | |
| Plugin / Role Context | |
| Reusable Skills | |
| Tools | |
| Generated Artifact | |
| Stored Evidence | |
| Deterministic Code | |
| AI Reasoning | |
| Visuals | |
| Evaluation | |
| Guardrails | |
| Human Checkpoint | |
| Feedback Loop | |
| Progression | |
| Long-Term State | |
| Generalizable Capability | |
| Use-case Specific | |
| Success | |

Populate every row.

Use concise but specific language. Each cell should normally contain one sentence or a short comma-separated list rather than a long explanation.

---

## Step 3: Apply these definitions carefully

### Role
The human role or functional responsibility the Plugin represents or augments.

### Intent
The high-level outcome the Plugin is trying to achieve.

Describe the outcome, not an implementation.

### Inputs
Information required to begin or continue the work.

Examples include user requests, requirements, documents, data, current state, constraints, prior work, schemas, goals, or events.

### Persistent Context
Information the Plugin should remember across executions.

Do not put temporary request data here.

Think about profiles, architecture, standards, preferences, historical decisions, progress, previous outputs, organizational context, and accumulated state.

### References
Authoritative or approved knowledge the Plugin should consult.

Examples include documentation, policies, specifications, standards, curricula, contracts, APIs, schemas, architecture documents, regulations, or knowledge bases.

Separate reference knowledge from persistent operational state.

### Plugin / Role Context
A short identifier representing the Plugin's domain or role.

Examples:

software-engineering
data-engineering
child-learning
sales
recruiting
contract-review

Use lowercase kebab-case.

### Reusable Skills
Reusable capabilities the Plugin needs.

Skills should represent capabilities, not one-off tasks.

Prefer verbs.

For example:

understand codebase
implement feature
generate tests
review code
debug failure

rather than:

fix issue #123

Identify approximately 5-10 useful reusable skills when appropriate.

### Tools
External systems, execution environments, APIs, databases, repositories, MCP servers, browsers, runtimes, renderers, or other systems the Plugin needs to interact with.

Do not confuse tools with skills.

A skill is something the Plugin knows how to do.
A tool is something the Plugin uses to do it.

### Generated Artifact
The concrete outputs produced by the Plugin.

Examples include code, documents, worksheets, reports, plans, configurations, tests, diagrams, structured specifications, datasets, recommendations, or other deliverables.

Prefer artifacts that can be stored, inspected, evaluated, or versioned.

### Stored Evidence
Evidence retained to determine what actually happened.

Examples include execution results, user responses, test results, reviews, approvals, evaluations, runtime results, commits, reports, measurements, and historical outcomes.

Do not treat AI conclusions alone as reliable evidence.

### Deterministic Code
Work that should be performed or validated using deterministic software rather than an LLM.

Look for:

calculations
validation
schema checks
rules
tests
linting
compilation
scoring
constraints
state transitions
policy enforcement
data-quality checks
exact comparisons

Use AI only where reasoning is actually useful.

### AI Reasoning
Work requiring interpretation, synthesis, planning, ambiguity resolution, personalization, semantic understanding, or generation.

Clearly distinguish this from deterministic code.

### Visuals
Visual information the Plugin should consume or generate when useful.

Examples include diagrams, charts, pictures, lineage, screenshots, architecture diagrams, educational imagery, UI previews, or visual evidence.

If visuals are unnecessary, explicitly say so.

### Evaluation
How the Plugin determines whether its output is good.

Evaluation should compare outputs against requirements, references, stored specifications, standards, expected outcomes, tests, or evidence.

Avoid vague statements such as "AI checks the result."

Be specific about what is evaluated against what.

### Guardrails
Actions the Plugin must not take automatically or boundaries it must respect.

Consider:

security
privacy
production access
financial impact
safety
compliance
irreversible actions
unverified assumptions
data exposure
authorization boundaries

Guardrails should be enforceable where possible.

### Human Checkpoint
Where human judgment, review, confirmation, or approval is required.

Do not add humans everywhere.

Identify checkpoints where uncertainty, subjectivity, risk, authority, or irreversible actions justify human involvement.

### Feedback Loop
Describe how execution results become evidence and improve subsequent executions.

Prefer an explicit flow such as:

execution → evidence → evaluation → recommendation → next action

The feedback loop must use actual evidence rather than simply asking the AI to "reflect."

### Progression
Describe how the Plugin decides when to continue, retry, escalate, increase complexity, reduce complexity, advance state, or change strategy.

Do not assume that completing an execution means the underlying objective has been achieved.

Progression should be evidence-based.

### Long-Term State
Describe how the system or subject evolves across many executions.

Examples:

learner knowledge graph
repository history
customer relationship history
pipeline quality history
case history
project state
decision history

This should make the Plugin more useful over time.

### Generalizable Capability
Describe the broad reusable capability.

This should be portable across many specific requests.

Examples:

"Implement and validate software changes"

rather than:

"Implement password reset endpoint"

### Use-case Specific
Give ONE concrete example of a task for the use case.

It should demonstrate the difference between the reusable capability and a particular invocation.

### Success
Define the actual outcome that determines whether the Plugin is successful.

Success should be based on evidence.

Avoid defining success as:

"AI generated an answer"
"task completed"
"workflow ran successfully"

Instead define the real-world or engineering outcome that matters.

---

## Step 4: Check the architecture

Before returning the matrix, internally verify:

1. Skills are not confused with tools.
2. Tools are not confused with generated artifacts.
3. Persistent context is not confused with references.
4. Stored evidence contains observable results rather than AI assumptions.
5. Deterministic operations are separated from AI reasoning.
6. Evaluation has explicit criteria.
7. Guardrails identify meaningful boundaries.
8. Human checkpoints exist where judgment or authorization is required.
9. Feedback loops use stored evidence.
10. Progression is based on evidence rather than execution alone.
11. Long-term state captures how the system evolves.
12. Generalizable Capability is actually reusable.
13. Use-case Specific is a concrete instance of that capability.
14. Success represents the real outcome, not merely completion.

Fix any problems you find before presenting the result.

---

## Step 5: Output

Return:

### Capability Architecture: [Plugin Name]

Then provide the completed table.

After the table, provide:

**Architecture Summary**

In 3-5 sentences explain:

- what the core reusable capability is
- where AI reasoning provides value
- what should remain deterministic
- what evidence drives the feedback loop
- where human judgment is required

Then provide:

**Suggested Plugin Structure**

Identify the major components that would likely become:

- Plugin/role instructions
- Skills
- Tools
- References
- State
- Artifact storage
- Evaluations
- Guardrails/hooks
- Human approval points
- Feedback/progression logic

Do NOT implement the Plugin yet.

The purpose of this output is to design the capability architecture before implementation.
