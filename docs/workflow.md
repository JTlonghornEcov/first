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
   - No JavaScript (agreed 28 Oct, after EXP flagged injected JS as a security risk). Interactive parts are HTML and
     CSS only (radio buttons plus `:has()`, `<details>`); `tools/strategy/save.mjs` refuses scripts, inline event
     handlers and `javascript:` links. Test them with `node tools/strategy/check-css-tool.mjs`.
   - Disabled concept page first; live pages change only through a draft that a person applies.
3. **Tasks.** The build produces the tasks the page still needs (see below). Claude adds them to the planner,
   each linked to its page and to the part it completes.
4. **Review copy.** Once James accepts a build, Claude builds a review copy (`node tools/review/from-preview.mjs` or
   `tools/review/build.mjs <slug>`, giving `artifacts/review/<slug>.html`) and publishes it **inside the Website project plan
   artifact** as `reviews/<slug>.html` (republish the plan with that file in `files`). It then sets `reviewUrl` on the page,
   and `previewUrl` on its images task, to `reviews/<slug>.html`. Because the copies live inside the plan, anyone who can
   open the plan can open them: nobody has to share each review copy separately. The planner shows the Review copy
   button once the page has at least one layout, one imagery and one copy task.
5. **Team.** The team reviews, assigns, groups and dates the tasks, and ticks them off. A page part (layout,
   imagery, copy) counts as done when every task linked to it is done.

## Which tasks a page gets

Every inner page has the same three steps (agreed 28 Oct, to keep the list simple):

| Step | Task | Completes |
| --- | --- | --- |
| 1 | Build the first draft of `<page>` | Layout and copy |
| 2 | Find the images for `<page>` | Imagery |
| 3 | Review and sign off `<page>` | Sign-off (the planner adds this once 1 and 2 are done) |

Claude ticks step 1 when it has built the page. The images task lists each photo slot in its note and links to the
page's review copy ("See the page"). Everything else (lead tools, policy checks, drafts to apply, questions for EXP)
goes in the page's notes on the Pages tab, not the task list. The homepage keeps its own decision task.
`node tools/planner/tasks.mjs <slug>` prints the two tasks for a concept page in `payloads/strategy/<slug>/`.
The task list as it was before 28 Oct is in `payloads/planner/backup-2026-10-28.json`.

## Getting tasks into the planner

The planner keeps pages and tasks in its shared database (collections `pages` and `tasks`, one document each).
After a build:
1. Add or update the page in `payloads/planner/pages.json` and any extra follow-ups in `payloads/planner/extra-tasks.json`.
2. `node tools/planner/seed.mjs .seed` writes one JSON file per document plus batches of at most 50 writes.
3. Claude sends the batches with the ArtifactData tool to https://claude.ai/artifact/X859E3yBB59CRoaBynYy8Z.
   Task ids are stable ("c-" + page + title), so only new tasks are added: before writing, read the existing
   task ids and skip any that already exist, so the team's assignments, deadlines, ticks and combinations are never
   overwritten. Tasks created this way show "From the build" in the planner.

## Placing supplied images

- A supplied photo goes into a "Photo to be sourced" placeholder (`.ph`). It never replaces an existing hero image unless James says so.
- A filled slot is `<div class="ph[ wide|tall] photo"><img src="…" alt="…" style="object-position:X% Y%" loading="lazy"></div>`. The image always covers the frame; set `object-position` so the subject (people's faces, the product, the hands at work) stays in view at desktop and phone widths, and check both with a screenshot.
- Name the asset after the page and slot, e.g. `data-collection-three-stages-banner.jpg`.

## Weekly rhythm (from 12 Nov 2026)

The plan opens on **This week**. Wednesday is the team meeting; Thursday to Tuesday is work time.

- **Wednesday:** go through the meeting agenda at the bottom of This week, sign off pages where both checks are *Good to go*, then switch to *Next week* and add the coming week's pages.
- **Thursday to Tuesday:** Viviana checks **Images and look** and Matias checks **Copy** on each page in the week. Each check is *Not checked*, *Needs work* (with a note saying exactly what to change) or *Good to go*. After a fix, set the check back to *Not checked* for another look.
- A page's stage comes from those checks: Not built yet → Being checked → Needs work → Ready to sign off → Signed off → Live.
- Data: page documents carry `week` (the meeting date, `YYYY-MM-DD`), `lookState/lookNote/lookBy/lookAt`, `wordsState/wordsNote/wordsBy/wordsAt`, `signedOff`, `isLive`. The old task list stays in the `tasks` collection but is no longer shown; the photo brief on each Images check is read from the old image task's note.
