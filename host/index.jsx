function insertQrCodeFromPanel(encodedRows, encodedText) {
  try {
    if (app.documents.length === 0) {
      return "ERROR: Abra ou crie um documento no Illustrator antes de inserir o QR Code.";
    }

    var rows = decodeURIComponent(encodedRows).split("/");
    var encodedValue = decodeURIComponent(encodedText);
    if (!rows.length || rows[0].length === 0) {
      return "ERROR: QR Code vazio.";
    }

    var doc = app.activeDocument;
    var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()];
    var rect = artboard.artboardRect;
    var artLeft = rect[0];
    var artTop = rect[1];
    var artRight = rect[2];
    var artBottom = rect[3];
    var centerX = (artLeft + artRight) / 2;
    var centerY = (artTop + artBottom) / 2;

    var targetSize = 512;
    var margin = 4;
    var qrSize = rows.length;
    var totalModules = qrSize + margin * 2;
    var moduleSize = targetSize / totalModules;
    var left = centerX - targetSize / 2;
    var top = centerY + targetSize / 2;

    var group = doc.groupItems.add();
    group.name = "QR Code Generator - " + encodedValue;

    var white = makeRgbColor(255, 255, 255);
    var black = makeRgbColor(0, 0, 0);
    var background = doc.pathItems.rectangle(top, left, targetSize, targetSize);
    background.filled = true;
    background.fillColor = white;
    background.stroked = false;
    background.move(group, ElementPlacement.PLACEATEND);

    for (var y = 0; y < qrSize; y += 1) {
      for (var x = 0; x < rows[y].length; x += 1) {
        if (rows[y].charAt(x) === "1") {
          var moduleLeft = left + (x + margin) * moduleSize;
          var moduleTop = top - (y + margin) * moduleSize;
          var item = doc.pathItems.rectangle(moduleTop, moduleLeft, moduleSize, moduleSize);
          item.filled = true;
          item.fillColor = black;
          item.stroked = false;
          item.move(group, ElementPlacement.PLACEATEND);
        }
      }
    }

    background.zOrder(ZOrderMethod.SENDTOBACK);
    group.selected = true;
    return "OK";
  } catch (error) {
    return "ERROR: " + error;
  }
}

function insertQrPngFromPanel(encodedPath, encodedText, size) {
  try {
    if (app.documents.length === 0) {
      return "ERROR: Abra ou crie um documento no Illustrator antes de inserir o QR Code.";
    }

    var pngPath = decodeURIComponent(encodedPath);
    var encodedValue = decodeURIComponent(encodedText);
    var pngFile = new File(pngPath);
    if (!pngFile.exists) {
      return "ERROR: PNG temporario nao encontrado.";
    }

    var doc = app.activeDocument;
    var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()];
    var rect = artboard.artboardRect;
    var centerX = (rect[0] + rect[2]) / 2;
    var centerY = (rect[1] + rect[3]) / 2;
    var targetSize = Number(size);
    if (!targetSize || targetSize <= 0) {
      return "ERROR: Tamanho de PNG invalido.";
    }

    var placed = doc.placedItems.add();
    placed.file = pngFile;
    placed.name = "QR Code Generator PNG - " + encodedValue;
    placed.width = targetSize;
    placed.height = targetSize;
    placed.position = [centerX - targetSize / 2, centerY + targetSize / 2];
    placed.selected = true;
    placed.embed();
    return "OK";
  } catch (error) {
    return "ERROR: " + error;
  }
}

function makeRgbColor(red, green, blue) {
  var color = new RGBColor();
  color.red = red;
  color.green = green;
  color.blue = blue;
  return color;
}
