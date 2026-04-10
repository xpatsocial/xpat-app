#!/bin/bash
# bump-version.sh — Standard pre-build version bump
#
# Bumps the patch version in both app.json and package.json,
# keeping them in sync. Run automatically before every EAS build
# via pre-build-check.sh, or manually with: bash scripts/bump-version.sh [patch|minor|major]
#
# Convention:
#   patch  — bug fixes, small tweaks (default, every build)
#   minor  — new features, significant improvements (manual)
#   major  — breaking changes (manual)
#
# After bumping, the changes are NOT auto-committed — caller decides
# (the build script commits them as part of the build commit).

set -e
cd "$(dirname "$0")/.."

BUMP_TYPE="${1:-patch}"

# Read current version from app.json
CURRENT=$(node -p "require('./app.json').expo.version")

if [ -z "$CURRENT" ]; then
  echo "✗ Could not read version from app.json" >&2
  exit 1
fi

# Parse semver
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP_TYPE" in
  patch)
    PATCH=$((PATCH + 1))
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  *)
    echo "✗ Unknown bump type: $BUMP_TYPE (use patch|minor|major)" >&2
    exit 1
    ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

# Update app.json
node -e "
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
app.expo.version = '${NEW_VERSION}';
fs.writeFileSync('./app.json', JSON.stringify(app, null, 2) + '\n');
"

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
pkg.version = '${NEW_VERSION}';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "✓ Version bumped: ${CURRENT} → ${NEW_VERSION} (${BUMP_TYPE})"
echo "  Updated: app.json + package.json"
echo "  Note: changes NOT yet committed — include in your next commit"
