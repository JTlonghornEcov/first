# Website rebuild: how a page goes from brief to live

## The loop

1. **Brief.** James briefs Claude in this project, based on the calendar in the Website project plan
   (https://claude.ai/artifact/X859E3yBB59CRoaBynYy8Z).
2. **Build.** Claude builds the page (CMS hero + HTML method below it), following the strategic review
   ("Does every page earn its place?", Oct 2026):
   - Functional and concise. Every section moves a prospect towards getting in touch.
   - About 75% commercial, 25% educational. Reference detail belongs in guides and articles, linked from the page.
   - One clear offer per page, proof near the claim, hero button that converts, form with a heading and an outcome.
   - Lead tools are marked as placeholders ("Lead tool · to be built") until they are built.
   - Disabled concept page first; live pages change only through a draft that a person applies.
3. **Tasks.** The build produces the tasks the page still needs (see below). Claude adds them to the planner,
   each linked to its page and to the part it completes.
4. **Review copy.** Once James accepts a build, Claude publishes a review copy as a Claude artifact
   (`node tools/review/build.mjs <slug>`, then publish `artifacts/review/<slug>.html`; republish the same file on later
   rebuilds so the link stays the same) and sets `reviewUrl` on that page in the planner. The planner shows the
   Review copy button once the page has at least one layout, one imagery and one copy task. Peers comment on the
   review copy; Claude turns comments into fixes or tasks.
5. **Team.** The team reviews, assigns, groups and dates the tasks, and ticks them off. A page part (layout,
   imagery, copy) counts as done when every task linked to it is done.

## Which tasks a build creates

`node tools/planner/tasks.mjs <slug>` lists them for a concept page in `payloads/strategy/<slug>/`.

| Found in the page | Task | Part |
| --- | --- | --- |
| Always | Review and approve the layout of `<page>` | Layout |
| Always | Review the copy of `<page>` (facts, dates, tone) | Copy |
| Each "Lead tool · to be built" / "… · to be built" block | Build the `<tool>` on `<page>` | Layout |
| Each "Image/Photo to be sourced" placeholder | One task per page: Find imagery for `<page>`: `<slots>` | Imagery |
| `imagery` notes in page.json (e.g. hero borrowed from another page) | Same imagery task, extra slots | Imagery |
| No images needed | Approve the imagery of `<page>` | Imagery |
| `checks` in page.json (facts to confirm) | Policy team: confirm `<fact>` on `<page>` | Copy |
| Always, last | Apply the draft and check `<page>` live | (none: tracked as a note) |

Grouping across pages (e.g. one person sourcing images for several pages) is done by the team in the planner.

## Getting tasks into the planner

The planner keeps pages and tasks in its shared database (collections `pages` and `tasks`, one document each).
After a build:
1. Add or update the page in `payloads/planner/pages.json` and any extra follow-ups in `payloads/planner/extra-tasks.json`.
2. `node tools/planner/seed.mjs .seed` writes one JSON file per document plus batches of at most 50 writes.
3. Claude sends the batches with the ArtifactData tool to https://claude.ai/artifact/X859E3yBB59CRoaBynYy8Z.
   Task ids are stable ("c-" + page + title), so only new tasks are added: before writing, read the existing
   task ids and skip any that already exist, so the team's assignments, deadlines, ticks and combinations are never
   overwritten. Tasks created this way show "From the build" in the planner.
