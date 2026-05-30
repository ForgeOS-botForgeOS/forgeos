#!/usr/bin/env bash
# Deploy ForgeOS to GitHub Pages.
# Usage: GH_TOKEN=ghp_xxx REPO=forgeos ./scripts/deploy-ghpages.sh <github-username>
set -euo pipefail

GH_USER="${1:?usage: deploy-ghpages.sh <github-username>  (GH_TOKEN env required)}"
REPO="${REPO:-forgeos}"
: "${GH_TOKEN:?set GH_TOKEN env var to a GitHub token with 'repo' scope}"
API="https://api.github.com"
HDRS=(-H "Authorization: token ${GH_TOKEN}" -H "Accept: application/vnd.github+json")
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Ensuring repo ${GH_USER}/${REPO} exists"
curl -s -o /dev/null "${HDRS[@]}" -X POST "${API}/user/repos" \
  -d "{\"name\":\"${REPO}\",\"private\":false,\"description\":\"ForgeOS — installable PWA\",\"homepage\":\"https://${GH_USER}.github.io/${REPO}/\"}" || true

echo "==> Building for /${REPO}/ base"
DEPLOY_BASE="/${REPO}/" npm run build
touch dist/.nojekyll
cp dist/index.html dist/404.html   # SPA fallback

echo "==> Pushing build to gh-pages branch"
rm -rf dist/.git
git -C dist init -q
git -C dist checkout -q -b gh-pages
git -C dist add -A
git -C dist -c user.email="petosupix@gmail.com" -c user.name="Peter" commit -q -m "Deploy ForgeOS PWA"
git -C dist push -q --force "https://${GH_USER}:${GH_TOKEN}@github.com/${GH_USER}/${REPO}.git" gh-pages
rm -rf dist/.git

echo "==> Enabling GitHub Pages (gh-pages branch, root)"
curl -s -o /dev/null "${HDRS[@]}" -X POST "${API}/repos/${GH_USER}/${REPO}/pages" \
  -d '{"source":{"branch":"gh-pages","path":"/"}}' || \
curl -s -o /dev/null "${HDRS[@]}" -X PUT "${API}/repos/${GH_USER}/${REPO}/pages" \
  -d '{"source":{"branch":"gh-pages","path":"/"}}' || true

echo "DEPLOYED_URL=https://${GH_USER}.github.io/${REPO}/"
