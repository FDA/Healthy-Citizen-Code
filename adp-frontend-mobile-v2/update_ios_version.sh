#!/usr/bin/env bash -e

cd $(dirname $0)

PROJECT_DIR="ios/ADP"
INFOPLIST_FILE="Info.plist"
INFOPLIST_DIR="${PROJECT_DIR}/${INFOPLIST_FILE}"

PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')

SHORT_VERSION=${PACKAGE_VERSION#*v}
IFS='.' read -a exVersion <<< "$SHORT_VERSION"
FIRST_BUILD_VERSION=`printf "%02d" ${exVersion[0]}`
SECOND_BUILD_VERSION=`printf "%02d" ${exVersion[1]}`
THIRD_BUILD_VERSION=`printf "%02d" ${exVersion[2]}`
BUILD_NUMBER=$(echo ${FIRST_BUILD_VERSION}${SECOND_BUILD_VERSION}${THIRD_BUILD_VERSION} | bc)

# Update plist with new values
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${PACKAGE_VERSION#*v}" "${INFOPLIST_DIR}"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${BUILD_NUMBER}" "${INFOPLIST_DIR}"
