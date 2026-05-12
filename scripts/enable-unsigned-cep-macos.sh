#!/usr/bin/env bash
set -euo pipefail

for version in 11 12 13; do
  defaults write "com.adobe.CSXS.$version" PlayerDebugMode 1
done

echo "CEP unsigned/debug habilitado para CSXS 11, 12 e 13."
echo "Reinicie o Illustrator antes de abrir o painel."
