---
name: create-visual-assets
description: "Create or select original, printable visual assets for a validated learning activity."
whenToUse: When an activity needs an illustration, icon-like asset, scene, or worksheet visual.
argumentHint: "[concept] [asset-purpose] [style-notes]"
model: inherit
effort: medium
---

Visual assets are teaching material, not decoration.

1. Read `references/workbook-material-style.md`. Use only local asset tooling or deterministic/vector generation exposed by the local MCP server. Do not request network access or credentials.
2. Confirm the activity item and its answer contract exist before making an asset. Ask for an asset brief with subject, represented object(s), count/order/feature constraints, intended print size, grayscale behavior, and ambiguity checks.
3. Keep the asset original, uncluttered, child-friendly, and distinguishable without color. Do not imitate or copy third-party branding, protected artwork, text, or page layouts.
4. Return asset metadata and a stable local reference to the application. Validate that every visual claim matches the answer specification before render; if interpretation is uncertain, mark it for adult review.
5. Never treat an asset-generation response as a score or progress update. Persist asset lineage only through the local application/MCP tool and report failures plainly.
