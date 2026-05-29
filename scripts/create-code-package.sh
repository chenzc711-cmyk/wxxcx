#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
PACKAGE_NAME="inventory-mini-program-latest.zip"
PACKAGE_PATH="${DIST_DIR}/${PACKAGE_NAME}"
BUILD_INFO="${DIST_DIR}/BUILD_INFO.txt"

mkdir -p "${DIST_DIR}"
rm -f "${PACKAGE_PATH}" "${BUILD_INFO}"

{
  echo "project=inventory-mini-program"
  echo "generated_at=${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
  echo "git_ref=${GITHUB_REF_NAME:-$(git -C "${ROOT_DIR}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}"
  echo "git_sha=${GITHUB_SHA:-$(git -C "${ROOT_DIR}" rev-parse HEAD 2>/dev/null || echo unknown)}"
} > "${BUILD_INFO}"

cd "${ROOT_DIR}"
zip -qr "${PACKAGE_PATH}" \
  README.md \
  app.js \
  app.json \
  app.wxss \
  project.config.json \
  sitemap.json \
  pages \
  dist/BUILD_INFO.txt

echo "Created ${PACKAGE_PATH}"
