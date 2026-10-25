#!/usr/bin/env bash
# Move skill-root AGENTS.md → reference/compiled-full.md so Cursor does not
# inject ~100k+ tokens of always-applied rules every turn.
set -euo pipefail

root="${1:-.}"
skills_dir="$root/.agents/skills"

if [[ ! -d "$skills_dir" ]]; then
  echo "No $skills_dir — nothing to do"
  exit 0
fi

moved=0
while IFS= read -r -d '' agents; do
  skill_dir="$(dirname "$agents")"
  mkdir -p "$skill_dir/reference"
  dest="$skill_dir/reference/compiled-full.md"
  if [[ -f "$dest" ]]; then
    dest="$skill_dir/reference/compiled-full-$(date +%s).md"
  fi
  mv "$agents" "$dest"
  echo "moved: $agents -> $dest"
  moved=$((moved + 1))
done < <(find "$skills_dir" -maxdepth 2 -name 'AGENTS.md' -print0)

echo "neutralized $moved AGENTS.md file(s)"
