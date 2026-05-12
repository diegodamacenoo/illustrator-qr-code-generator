#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist"
ZXP_PATH="$OUT_DIR/qr-code-generator-illustrator.zxp"
STAGE_DIR="$OUT_DIR/package-stage"

mkdir -p "$OUT_DIR"

if ! command -v ZXPSignCmd >/dev/null 2>&1; then
  echo "ZXPSignCmd nao encontrado."
  echo "Instale o Adobe ZXPSignCmd para gerar o ZXP, ou use scripts/install-local-macos.sh para testar por pasta CEP."
  exit 1
fi

CERT_PATH="${CERT_PATH:-}"
CERT_PASSWORD="${CERT_PASSWORD:-}"

if [[ -z "$CERT_PATH" || -z "$CERT_PASSWORD" ]]; then
  echo "Defina CERT_PATH e CERT_PASSWORD para assinar o ZXP."
  echo "Exemplo:"
  echo "CERT_PATH=/caminho/certificado.p12 CERT_PASSWORD='senha' $0"
  exit 1
fi

rm -rf "$STAGE_DIR" "$ZXP_PATH"
mkdir -p "$STAGE_DIR"

rsync -a \
  --exclude '.DS_Store' \
  --exclude '*.ai' \
  --exclude '~ai-*' \
  --exclude '*.tmp' \
  --exclude 'dist' \
  --exclude '.git' \
  "$ROOT_DIR/CSXS" \
  "$ROOT_DIR/client" \
  "$ROOT_DIR/icons" \
  "$ROOT_DIR/host" \
  "$ROOT_DIR/README.md" \
  "$STAGE_DIR/"

ZXPSignCmd -sign "$STAGE_DIR" "$ZXP_PATH" "$CERT_PATH" "$CERT_PASSWORD"
rm -rf "$STAGE_DIR"
echo "ZXP gerado em: $ZXP_PATH"
