#!/bin/bash
set -euo pipefail

SRC=/src/ama
OUT=/out

mkdir -p "$OUT"

# Every ama translation unit except the standalone executables (test/, tuner/,
# puyop/) which pull in file I/O and a main().
FILES=$(find "$SRC" -name '*.cpp' \
  ! -path "$SRC/test/*" \
  ! -path "$SRC/tuner/*" \
  ! -path "$SRC/puyop/*")

echo "=== translation units ==="
echo "$FILES" | sed "s|$SRC/||"
echo "$FILES" | wc -l | xargs echo "count:"

COMMON=(
  -std=c++20
  -O3
  -msimd128
  -msse4.1
  -flto
  -I/src/shim          # shim x86intrin.h must win over the system header
  -I"$SRC"
  -I"$SRC/core"
  -DNDEBUG
  -sALLOW_MEMORY_GROWTH=1
  -sINITIAL_MEMORY=134217728
  -sMODULARIZE=1
  -sEXPORT_ES6=1
  -sEXPORT_NAME=createAmaModule
  -sENVIRONMENT=web,worker
  -sEXPORTED_FUNCTIONS='["_ama_decide","_ama_set_params","_ama_grid_ptr","_ama_queue_ptr","_ama_palette_ptr","_ama_result_ptr","_malloc","_free"]'
  -sEXPORTED_RUNTIME_METHODS='["HEAPU8","HEAP32","cwrap"]'
)

echo
echo "=== building threaded build (fastest: 6 parallel beams) ==="
em++ "${COMMON[@]}" \
  -pthread \
  -sPTHREAD_POOL_SIZE=8 \
  -sSHARED_MEMORY=1 \
  /src/bridge/ama_wasm.cpp $FILES \
  -o "$OUT/amawasm.mjs" 2>&1 | tail -25 || {
    echo "!! threaded build FAILED — see errors above"; exit 1; }

echo
echo "=== building single-thread fallback (no COOP/COEP headers needed) ==="
em++ "${COMMON[@]}" \
  -DAMA_NO_THREADS=1 \
  /src/bridge/ama_wasm.cpp $FILES \
  -o "$OUT/amawasm.st.mjs" 2>&1 | tail -25 || {
    echo "!! single-thread build FAILED"; exit 1; }

echo
echo "=== artefacts ==="
ls -la "$OUT"/amawasm* 2>/dev/null
