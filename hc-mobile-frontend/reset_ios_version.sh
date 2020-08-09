#!/usr/bin/env bash -e

cd $(dirname $0)

PROJECT_DIR="ios/HealthyCitizen"
INFOPLIST_FILE="Info.plist"
INFOPLIST_DIR="${PROJECT_DIR}/${INFOPLIST_FILE}"

# Update plist with new values
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 0.0.0" "${INFOPLIST_DIR}"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion 0" "${INFOPLIST_DIR}"
