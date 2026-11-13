#!/usr/bin/env sh
set -eu

if pgrep -f "vite.*--host 0.0.0.0" >/dev/null 2>&1; then
  exit 0
fi

nohup pnpm exec vite --host 0.0.0.0 --strictPort >/tmp/map-georeference-picker.log 2>&1 &
printf '%s\n' "Private landmark picker is starting on port 5173."
