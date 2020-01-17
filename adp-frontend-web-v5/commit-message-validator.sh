#!/bin/sh

test "" != "$(egrep '^UNI\-\d{1,}:' "$1")" ||
  test "" != "$(egrep '^MISC:' "$1")" && {
  exit 0
}
echo >&2 "------Start the commit message with UNI-### or MISC followed by ':'------"
exit 1
