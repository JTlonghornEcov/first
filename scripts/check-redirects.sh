#!/usr/bin/env bash
# Checks each redirect in docs/redirects.txt with a plain GET (no login, read-only) and prints one status line each.
# Run by the UserPromptSubmit hook in .claude/settings.json, so the result reaches Claude at the start of every prompt.
cd "$(dirname "$0")/.." || exit 0
out=""
while read -r from to; do
  [[ -z "$from" || "$from" == \#* ]] && continue
  r=$(curl -s -o /dev/null -m 8 -w '%{http_code} %{redirect_url}' "https://www.ecoveritas.com$from?rc=$RANDOM")
  code=${r%% *}; dest=${r#* }; dest=${dest%%\?*}
  if [[ "$code" =~ ^30[178]$ && "$dest" == *"$to" ]]; then out+="OK      $from -> $to ($code)"$'\n'
  else out+="FAILING $from: got $code ${dest:-no redirect}, expected 301 to $to"$'\n'; fi
done < docs/redirects.txt
[[ -n "$out" ]] && printf 'Redirect check (docs/redirects.txt):\n%s' "$out"
exit 0
