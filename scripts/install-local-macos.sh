#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_ID="com.fingerscrossed.qrcode.generator"
DEST_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/$EXT_ID"

mkdir -p "$(dirname "$DEST_DIR")"
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

rsync -a \
  --exclude '.DS_Store' \
  --exclude '.git' \
  --exclude 'dist' \
  "$ROOT_DIR/" "$DEST_DIR/"

echo "Extensao instalada em:"
echo "$DEST_DIR"
echo
echo "Se ela nao aparecer em Window > Extensions > QR Code Generator, execute:"
echo "$ROOT_DIR/scripts/enable-unsigned-cep-macos.sh"
echo "Depois reinicie o Illustrator."
