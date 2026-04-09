#!/bin/bash
# Pre-build validation loop — run before every EAS build to catch issues early.
# Feedback loop: catches bundle errors, syntax errors, and missing modules before burning build credits.
#
# Usage: bash scripts/pre-build-check.sh
#
# Exit codes:
#   0 — all checks passed, safe to build
#   1 — validation failed, DO NOT build

set -e
cd "$(dirname "$0")/.."

echo "╔══════════════════════════════════════════════════════════╗"
echo "║        x/pat Pre-Build Validation Pipeline             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

FAIL=0

# 1. Verify git is clean or report dirty state
echo "→ [1/5] Git status check"
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "  ⚠ Uncommitted changes detected:"
  git status --porcelain 2>/dev/null | head -10 | sed 's/^/    /'
fi

# 2. Validate Expo config
echo "→ [2/5] Expo config validation"
if npx expo config --type public > /dev/null 2>&1; then
  echo "  ✓ Expo config valid"
else
  echo "  ✗ Expo config failed to parse"
  FAIL=1
fi

# 3. Try to export the iOS bundle locally — this catches ALL Metro bundler errors
echo "→ [3/5] iOS bundle export (Metro validation)"
rm -rf /tmp/xpat-prebuild-check
if npx expo export --platform ios --output-dir /tmp/xpat-prebuild-check --dump-sourcemap=false > /tmp/xpat-prebuild-ios.log 2>&1; then
  SIZE=$(du -h /tmp/xpat-prebuild-check/_expo/static/js/ios/*.hbc 2>/dev/null | cut -f1 | head -1)
  echo "  ✓ iOS bundle exported (${SIZE:-unknown})"
else
  echo "  ✗ iOS bundle export failed. Last 20 lines of log:"
  tail -20 /tmp/xpat-prebuild-ios.log | sed 's/^/    /'
  FAIL=1
fi

# 4. Try Android bundle export too
echo "→ [4/5] Android bundle export (Metro validation)"
rm -rf /tmp/xpat-prebuild-android
if npx expo export --platform android --output-dir /tmp/xpat-prebuild-android --dump-sourcemap=false > /tmp/xpat-prebuild-android.log 2>&1; then
  SIZE=$(du -h /tmp/xpat-prebuild-android/_expo/static/js/android/*.hbc 2>/dev/null | cut -f1 | head -1)
  echo "  ✓ Android bundle exported (${SIZE:-unknown})"
else
  echo "  ✗ Android bundle export failed. Last 20 lines of log:"
  tail -20 /tmp/xpat-prebuild-android.log | sed 's/^/    /'
  FAIL=1
fi

# 5. Check for common startup crash risks
echo "→ [5/5] Startup crash risk scan"
RISKS=0

# Unhandled module-level throws in critical files
if grep -l "^throw new Error" src/lib/*.ts 2>/dev/null; then
  echo "  ⚠ Unhandled module-level throw in src/lib/ — could crash on startup"
  RISKS=$((RISKS + 1))
fi

# Missing font files referenced in App.tsx
if [ -f "App.tsx" ]; then
  MISSING_FONTS=0
  for FONT in $(grep -oE "'[^']*\.ttf'" App.tsx | tr -d "'"); do
    FONT_PATH="./$(echo "$FONT" | sed 's|^\./||')"
    if [ ! -f "$FONT_PATH" ]; then
      echo "  ✗ Missing font: $FONT_PATH"
      MISSING_FONTS=$((MISSING_FONTS + 1))
    fi
  done
  if [ "$MISSING_FONTS" -gt 0 ]; then
    FAIL=1
  fi
fi

# Required packages that crash if missing
for PKG in "expo-linking" "expo-font" "@react-native-async-storage/async-storage" "react-native-mmkv"; do
  if ! grep -q "\"$PKG\"" package.json 2>/dev/null; then
    echo "  ✗ Missing required package: $PKG"
    FAIL=1
  fi
done

if [ "$RISKS" -eq 0 ] && [ "$FAIL" -eq 0 ]; then
  echo "  ✓ No obvious startup risks detected"
fi

# Cleanup
rm -rf /tmp/xpat-prebuild-check /tmp/xpat-prebuild-android

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  ✓ ALL CHECKS PASSED — safe to build                    ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  exit 0
else
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  ✗ VALIDATION FAILED — do not build                     ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  exit 1
fi
