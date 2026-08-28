#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_dir="$project_dir/releases"

if [[ ! -f "$project_dir/package.json" || ! -d "$project_dir/editions" ]]; then
  echo "Smart Job Hunter project files were not found."
  exit 1
fi

cd "$project_dir"
npm run build:hostinger

rm -rf "$release_dir"
mkdir -p \
  "$release_dir/Khaled-Personal" \
  "$release_dir/Smart-Job-Hunter-Commercial-Basic" \
  "$release_dir/Smart-Job-Hunter-Commercial-Standard" \
  "$release_dir/Smart-Job-Hunter-Commercial-Premium"

build_edition() {
  local edition_dir="$1"
  local release_name="$2"
  local target="$release_dir/$release_name"

  cp -R hostinger-dist/. "$target/"
  cp -R hostinger-backend/. "$target/"
  cp "editions/$edition_dir/edition-config.js" "$target/edition-config.js"
  cp "editions/$edition_dir/product-config.php" "$target/product-config.php"
  cp "editions/$edition_dir/README.txt" "$target/README.txt"
}

build_edition "personal" "Khaled-Personal"
build_edition "basic" "Smart-Job-Hunter-Commercial-Basic"
build_edition "standard" "Smart-Job-Hunter-Commercial-Standard"
build_edition "premium" "Smart-Job-Hunter-Commercial-Premium"

echo "Built Personal and all Commercial tiers in $release_dir"
