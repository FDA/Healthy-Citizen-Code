#!/bin/sh
if [ ! -d ../../../hc-data-bridge/ ]; then
  echo "HC Databridge supporting xls->json transformation is required for this script"
  echo "Please checkout that code at the same level as adp-backend-vX"
  exit 1
fi
if [ ! -f ../../../hc-data-bridge/generateAppModelByFile.js ]; then
  echo "The version of the databridge you have checked out doesn't have the xls->json capability"
  echo "Please checkout complete version of hc-data-bridge"
  exit 1
fi

# Keeping this block here for future use, but for now I decided to split core.xls into multiple files
#if [ "$#" -ne 1 ]; then
#  echo "Please specify the .xls file version number as the only argument for this command. For example:"
#  echo "./update_model.sh v0.0.1"
#  exit 2
#fi

function updateModel() {
  node generateAppModelByFile.js --inputFilePath=../adp-backend-v5/model/xls/${1}-v${2}.xlsx --outputModelPath=../adp-backend-v5/model/model/00_${1}.from_xls.json
}

cd ../../../hc-data-bridge/

#updateModel core 0.0.1 # do not update it!
updateModel journal 0.0.7
updateModel datasets 0.0.7
updateModel dataPulls 0.0.6
