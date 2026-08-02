#!/bin/sh
# Build the ama WebAssembly module. Requires only Docker on the host.
set -e

HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE"

if [ ! -d "$HERE/ama" ]; then
  echo "ERROR: expected the ama C++ source at $HERE/ama"
  echo "Unzip the ama repo so that $HERE/ama/ai/ai.h exists, then re-run."
  exit 1
fi

echo "==> docker build"
docker build -t amawasm-build .

echo "==> compiling"
mkdir -p "$HERE/built"
docker run --rm -v "$HERE/built:/out" amawasm-build

# NOTE: artefacts deliberately stay in wasm/built/ — inside the source tree.
# They must NOT be copied into public/: Vite refuses to let source code import
# modules from public/ ("can only be referenced via HTML tags"), and the loader
# imports the emscripten glue as an ES module. Keeping them here lets Vite
# resolve them in dev and bundle them for production.
echo "==> artefacts (imported directly from the source tree):"
ls -la "$HERE/built"

if [ ! -f "$HERE/built/amawasm.st.mjs" ]; then
  echo "!! single-thread glue missing — the loader will find nothing"
  exit 1
fi
echo "==> OK. Reload the page; check __puyoAi.native in the console."
