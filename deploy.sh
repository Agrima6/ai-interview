#!/usr/bin/env bash
# Auto-deploy script for WorkmateIQ, run remotely by the GitHub Actions
# workflow (.github/workflows/deploy.yml) on every push to main.
#
# Pulls main, and only touches what actually changed in this push: runs
# npm install in a service directory if its package.json/package-lock.json
# changed, rebuilds the client if anything under client/ changed, and
# restarts only the pm2 processes whose service directory changed - mirrors
# exactly what was being done by hand before this existed.
set -euo pipefail
cd /opt/workmateiq

BEFORE_SHA=$(git rev-parse HEAD)
git fetch origin main
# Deployed checkouts are not meant to carry local edits - reset hard to
# whatever main says, rather than a plain pull that can fail on drift.
git reset --hard origin/main
AFTER_SHA=$(git rev-parse HEAD)

if [ "$BEFORE_SHA" = "$AFTER_SHA" ]; then
    echo "Already up to date at $AFTER_SHA - nothing to deploy."
    exit 0
fi

echo "Deploying $BEFORE_SHA -> $AFTER_SHA"
CHANGED=$(git diff --name-only "$BEFORE_SHA" "$AFTER_SHA")
echo "--- changed files ---"
echo "$CHANGED"
echo "---------------------"

declare -A SERVICE_PM2_NAME=(
    [server]="legacy-server"
    [services/auth-service]="auth-service"
    [services/registration-service]="registration-service"
    [services/onboarding-service]="onboarding-service"
    [services/client-service]="client-service"
    [services/communication-service]="communication-service"
    [services/enquiry-service]="enquiry-service"
    [services/form-service]="form-service"
    [services/dashboard-service]="dashboard-service"
    [services/api-gateway]="api-gateway"
)

RESTART_LIST=()

for dir in "${!SERVICE_PM2_NAME[@]}"; do
    if echo "$CHANGED" | grep -q "^${dir}/"; then
        echo "Changes detected in ${dir}"
        if echo "$CHANGED" | grep -qE "^${dir}/package(-lock)?\.json$"; then
            echo "  package.json changed - running npm install"
            (cd "$dir" && npm install --no-audit --no-fund)
        fi
        RESTART_LIST+=("${SERVICE_PM2_NAME[$dir]}")
    fi
done

if echo "$CHANGED" | grep -q "^client/"; then
    echo "Changes detected in client/ - rebuilding"
    if echo "$CHANGED" | grep -qE "^client/package(-lock)?\.json$"; then
        (cd client && npm install --no-audit --no-fund)
    fi
    (cd client && npm run build)
fi

if [ ${#RESTART_LIST[@]} -gt 0 ]; then
    echo "Restarting: ${RESTART_LIST[*]}"
    pm2 restart "${RESTART_LIST[@]}" --update-env
else
    echo "No backend services need restarting."
fi

echo "Deploy complete: $AFTER_SHA"
# CI/CD verified 2026-08-20T18:32:29Z
