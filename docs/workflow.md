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
4. **Team.** The team reviews, assigns, groups and dates the tasks, and ticks them off. A page part (layout,
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
