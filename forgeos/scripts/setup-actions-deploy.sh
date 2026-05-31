#!/usr/bin/env bash
# One-time setup so future changes auto-deploy with NO token.
# Pushes source to main, points Pages at GitHub Actions, stores the credential
# so subsequent `git push` runs need no re-auth.
# Usage: GH_TOKEN=ghp_xxx REPO=forgeos ./scripts/setup-actions-deploy.sh <github-username>
set -euo pipefail

GH_USER="${1:?usage: setup-actions-deploy.sh <github-username>  (GH_TOKEN env required)}"
REPO="${REPO:-forgeos}"
: "${GH_TOKEN:?set GH_TOKEN env var to a token with 'repo' + 'workflow' scope}"
API="https://api.github.com"
HDRS=(-H "Authorization: token ${GH_TOKEN}" -H "Accept: application/vnd.github+json")

# Repo root (this script lives in forgeos/scripts)
cd "$(git rev-parse --show-toplevel)"

echo "==> Storing credential for future pushes (no re-auth needed)"
git config credential.helper store
printf "protocol=https\nhost=github.com\nusername=%s\npassword=%s\n\n" "$GH_USER" "$GH_TOKEN" | git credential approve

echo "==> Pointing origin at ${GH_USER}/${REPO}"
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${GH_USER}/${REPO}.git"

echo "==> Pushing current branch to main"
git push -u origin "HEAD:main" --force

echo "==> Switching Pages source to GitHub Actions"
# create (POST) or update (PUT) the Pages config to build_type=workflow
curl -s -o /dev/null "${HDRS[@]}" -X POST "${API}/repos/${GH_USER}/${REPO}/pages" -d '{"build_type":"workflow"}' || true
curl -s -o /dev/null "${HDRS[@]}" -X PUT  "${API}/repos/${GH_USER}/${REPO}/pages" -d '{"build_type":"workflow"}' || true

echo "==> Done. The Actions workflow will build and deploy now."
echo "    Live at https://${GH_USER}.github.io/${REPO}/"
echo "    Future changes: just 'git push' — it auto-deploys."
