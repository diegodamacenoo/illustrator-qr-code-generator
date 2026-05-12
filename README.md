# QR Code Generator para Adobe Illustrator

Versao atual: `1.3.2`

Painel CEP local para gerar QR Codes offline e inserir o resultado no documento ativo do Illustrator como SVG vetorial editavel ou PNG raster.

## Uso local no macOS

```bash
cd "/Volumes/SSD Externo/Fingers Crossed/Plugins/illustrator-qr-code-generator"
chmod +x scripts/*.sh
./scripts/enable-unsigned-cep-macos.sh
./scripts/install-local-macos.sh
```

Depois reinicie o Illustrator e abra `Window > Extensions > QR Code Generator`.

Se uma aba antiga chamada `QR Code SVG` estiver aberta, feche essa aba e reinicie o Illustrator. Essa era a extensao anterior e pode ficar em cache depois da remocao/renomeacao.

## ZXP local

O empacotamento ZXP exige `ZXPSignCmd` e certificado `.p12`. Os arquivos em `dist/` sao locais e nao devem ser publicados no Git.

```bash
CERT_PATH=/caminho/certificado.p12 CERT_PASSWORD='senha' ./scripts/package-zxp.sh
```

Se `ZXPSignCmd` nao estiver instalado, use a instalacao por pasta CEP para validar o painel.

## Comportamento

- `example.com` e normalizado para `https://example.com`.
- SVG e inserido no centro da prancheta ativa como grupo vetorial editavel.
- PNG e gerado no tamanho escolhido e inserido como imagem raster embutida.
- O QR tem fundo branco e modulos pretos.
- Se nao houver documento aberto, o painel mostra erro sem alterar nada.
