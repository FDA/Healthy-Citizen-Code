#!/bin/bash -x
npm version patch
rm .env
ln -s stage.env .env
npm run release-android-staging
rm .env
ln -s development.env .env
