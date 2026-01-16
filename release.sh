#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Release Process..."

# 1. Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed. Please install it first."
    exit 1
fi

# 2. Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes. Please commit or stash them first."
    git status -s
    exit 1
fi

# 3. Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📊 Current version: $CURRENT_VERSION"

# 4. Prompt for new version
read -p "🔢 Enter new version (e.g., 0.0.4): " NEW_VERSION

if [[ -z "$NEW_VERSION" ]]; then
    echo "❌ Error: Version cannot be empty."
    exit 1
fi

# 5. Update version in package.json
echo "📝 Updating version to $NEW_VERSION..."
npm version $NEW_VERSION --no-git-tag-version

# 6. Update version badges in README files (Optional but recommended)
if [[ -f "README_ZH.md" ]]; then
    sed -i '' "s/version-$CURRENT_VERSION/version-$NEW_VERSION/g" README_ZH.md
fi
if [[ -f "README.md" ]]; then
    sed -i '' "s/version-$CURRENT_VERSION/version-$NEW_VERSION/g" README.md
fi

# 7. Extract Release Notes from README_ZH.md
# This assumes you have a section like '### v0.0.3' in your README
echo "📖 Extracting release notes for v$NEW_VERSION from README_ZH.md..."
# We try to get the content between the new version header and the next header
# This is a bit simplified, but works if the README structure is consistent
NOTES=$(sed -n "/### v$NEW_VERSION/,/---/p" README_ZH.md | sed '1d;$d')

if [[ -z "$NOTES" ]]; then
    echo "⚠️  Warning: Could not find release notes for $NEW_VERSION in README_ZH.md."
    echo "Please enter release notes manually (Ctrl+D to finish):"
    NOTES=$(cat)
fi

# 8. Git Commit and Tag
echo "💾 Committing and tagging..."
git add .
git commit -m "chore: release v$NEW_VERSION"
git tag "v$NEW_VERSION"

# 9. Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push origin main
git push origin "v$NEW_VERSION"

echo "✨ Tag v$NEW_VERSION pushed. GitHub Actions will now build the release."
echo "🔗 Monitor progress here: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:\/]//;s/\.git$//')/actions"

# 10. Optional: Create Release via gh CLI immediately if you don't want to wait for CI
read -p "❓ Create draft release via gh CLI now? (y/n): " CREATE_GH_RELEASE
if [[ "$CREATE_GH_RELEASE" == "y" ]]; then
    gh release create "v$NEW_VERSION" --title "v$NEW_VERSION" --notes "$NOTES" --draft
    echo "✅ Draft release created. You can upload files manually or let CI handle it."
fi

echo "🎉 Done!"
