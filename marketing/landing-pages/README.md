# Lead-magnet landing pages (Mailchimp)

Workaround for the website's single enquiry form: each lead magnet gets its own Mailchimp landing page whose form
applies its own tag, so a Customer Journey can deliver the right document.

| Page (Mailchimp, draft) | Tag applied | Code block to paste |
|---|---|---|
| TEST – EU PPWR essentials pack (`0300cf52e1f0`) | EU PPWR Lead Magnet (12460084) | `ppwr-pack.code-block.html` |
| TEST – Free PRN audit application (`0300ce52e1f0`) | PRN Audit Request (12461223) | `prn-audit.code-block.html` |

Content lives in `payloads/mailchimp/landing/*.json`; render with
`node scripts/mailchimp-landing.mjs payloads/mailchimp/landing/<slug>.json`. Open `<slug>.html` in a browser to preview.

## Why paste by hand
The Mailchimp API can create landing pages and set their name, title and audience, but it can't write their
content (PUT/PATCH/POST on `/landing-pages/{id}/content` all return 405). So the design is pasted once into a Code block.

## Paste steps (about 5 minutes per page)
1. Mailchimp → Website → Landing pages → open the TEST page → Edit design.
2. Delete the template's default blocks.
3. Add a **Code** block (if your editor doesn't offer one, stop and tell Claude: fallback is native blocks).
4. Open the matching `*.code-block.html`, copy everything, paste into the Code block, save.
5. Set the page URL (e.g. `ppwr-pack`), then Publish. Unpublished pages can't take sign-ups.

## Test before linking from the site
- Submit the form with a fresh test address. Check in Audience that the contact exists with the right tag.
- Submit again with an address that is **already** in the audience. Check whether the tag was added.
  Embedded forms may treat existing contacts as "already subscribed"; if the tag isn't applied, switch the form part to
  Mailchimp's native Signup Form block (which can apply tags) and keep the Code block for the rest of the design.
- After submitting, Mailchimp shows its audience-level thank-you page (shared with the website enquiry form).
