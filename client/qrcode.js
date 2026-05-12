(function () {
  var QR_CONFIG = [
    null,
    { dataCodewords: 19, eccCodewordsPerBlock: 7, blocks: [19] },
    { dataCodewords: 34, eccCodewordsPerBlock: 10, blocks: [34] },
    { dataCodewords: 55, eccCodewordsPerBlock: 15, blocks: [55] },
    { dataCodewords: 80, eccCodewordsPerBlock: 20, blocks: [80] },
    { dataCodewords: 108, eccCodewordsPerBlock: 26, blocks: [108] },
    { dataCodewords: 136, eccCodewordsPerBlock: 18, blocks: [68, 68] },
    { dataCodewords: 156, eccCodewordsPerBlock: 20, blocks: [78, 78] },
    { dataCodewords: 194, eccCodewordsPerBlock: 24, blocks: [97, 97] },
    { dataCodewords: 232, eccCodewordsPerBlock: 30, blocks: [116, 116] },
    { dataCodewords: 274, eccCodewordsPerBlock: 18, blocks: [68, 68, 69, 69] }
  ];

  var ALIGNMENT_POSITIONS = [
    null,
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50]
  ];

  function normalizeInput(rawValue) {
    var value = String(rawValue || "").replace(/^\s+|\s+$/g, "");
    if (!value) return "";

    var hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
    var looksLikeDomain = /^(?:[\w-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i.test(value);
    if (!hasScheme && looksLikeDomain) {
      return "https://" + value;
    }
    return value;
  }

  function createQrMatrix(text) {
    var bytes = utf8Bytes(text);
    var version = chooseVersion(bytes.length);
    var config = QR_CONFIG[version];
    var dataCodewords = makeDataCodewords(bytes, version, config.dataCodewords);
    var codewords = addErrorCorrectionAndInterleave(dataCodewords, config);
    return buildMatrix(codewords, version);
  }

  function utf8Bytes(text) {
    if (typeof TextEncoder !== "undefined") {
      return Array.prototype.slice.call(new TextEncoder().encode(text));
    }

    var encoded = unescape(encodeURIComponent(text));
    var bytes = [];
    for (var i = 0; i < encoded.length; i += 1) {
      bytes.push(encoded.charCodeAt(i));
    }
    return bytes;
  }

  function chooseVersion(byteLength) {
    for (var version = 1; version < QR_CONFIG.length; version += 1) {
      var countBits = version <= 9 ? 8 : 16;
      var requiredBits = 4 + countBits + byteLength * 8;
      if (Math.ceil(requiredBits / 8) <= QR_CONFIG[version].dataCodewords) {
        return version;
      }
    }
    throw new Error("O texto e muito longo para esta versao simples do gerador.");
  }

  function makeDataCodewords(bytes, version, capacity) {
    var bits = [];
    appendBits(bits, 0x4, 4);
    appendBits(bits, bytes.length, version <= 9 ? 8 : 16);
    for (var i = 0; i < bytes.length; i += 1) appendBits(bits, bytes[i], 8);

    var capacityBits = capacity * 8;
    appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);

    var codewords = [];
    for (var j = 0; j < bits.length; j += 8) {
      codewords.push(parseInt(bits.slice(j, j + 8).join(""), 2));
    }

    for (var pad = 0; codewords.length < capacity; pad += 1) {
      codewords.push(pad % 2 === 0 ? 0xec : 0x11);
    }

    return codewords;
  }

  function appendBits(bits, value, length) {
    for (var i = length - 1; i >= 0; i -= 1) {
      bits.push((value >>> i) & 1);
    }
  }

  function addErrorCorrectionAndInterleave(dataCodewords, config) {
    var divisor = reedSolomonDivisor(config.eccCodewordsPerBlock);
    var dataBlocks = [];
    var eccBlocks = [];
    var offset = 0;

    for (var i = 0; i < config.blocks.length; i += 1) {
      var size = config.blocks[i];
      var block = dataCodewords.slice(offset, offset + size);
      dataBlocks.push(block);
      eccBlocks.push(reedSolomonRemainder(block, divisor));
      offset += size;
    }

    var result = [];
    var maxDataLength = 0;
    for (var b = 0; b < dataBlocks.length; b += 1) {
      maxDataLength = Math.max(maxDataLength, dataBlocks[b].length);
    }

    for (var j = 0; j < maxDataLength; j += 1) {
      for (var k = 0; k < dataBlocks.length; k += 1) {
        if (j < dataBlocks[k].length) result.push(dataBlocks[k][j]);
      }
    }

    for (var e = 0; e < config.eccCodewordsPerBlock; e += 1) {
      for (var eb = 0; eb < eccBlocks.length; eb += 1) result.push(eccBlocks[eb][e]);
    }

    return result;
  }

  function reedSolomonDivisor(degree) {
    var result = new Array(degree);
    for (var i = 0; i < degree; i += 1) result[i] = 0;
    result[degree - 1] = 1;
    var root = 1;

    for (var j = 0; j < degree; j += 1) {
      for (var k = 0; k < degree; k += 1) {
        result[k] = gfMultiply(result[k], root);
        if (k + 1 < degree) result[k] ^= result[k + 1];
      }
      root = gfMultiply(root, 0x02);
    }

    return result;
  }

  function reedSolomonRemainder(data, divisor) {
    var result = new Array(divisor.length);
    for (var i = 0; i < divisor.length; i += 1) result[i] = 0;

    for (var j = 0; j < data.length; j += 1) {
      var factor = data[j] ^ result.shift();
      result.push(0);
      for (var k = 0; k < divisor.length; k += 1) {
        result[k] ^= gfMultiply(divisor[k], factor);
      }
    }

    return result;
  }

  function gfMultiply(x, y) {
    var product = 0;
    for (var i = 7; i >= 0; i -= 1) {
      product = (product << 1) ^ ((product >>> 7) * 0x11d);
      product ^= ((y >>> i) & 1) * x;
    }
    return product & 0xff;
  }

  function buildMatrix(codewords, version) {
    var size = 21 + (version - 1) * 4;
    var base = createEmptyMatrix(size);
    drawFunctionPatterns(base, version);
    drawCodewords(base, codewords);

    var best = null;
    var bestPenalty = Infinity;
    for (var mask = 0; mask < 8; mask += 1) {
      var candidate = cloneMatrix(base);
      applyMask(candidate, mask);
      drawFormatBits(candidate, mask);
      if (version >= 7) drawVersionBits(candidate, version);
      var penalty = getPenaltyScore(candidate.modules);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        best = candidate.modules;
      }
    }
    return best;
  }

  function createEmptyMatrix(size) {
    var modules = [];
    var reserved = [];
    var data = [];
    for (var y = 0; y < size; y += 1) {
      modules[y] = [];
      reserved[y] = [];
      data[y] = [];
      for (var x = 0; x < size; x += 1) {
        modules[y][x] = false;
        reserved[y][x] = false;
        data[y][x] = false;
      }
    }
    return { modules: modules, reserved: reserved, data: data };
  }

  function cloneMatrix(matrix) {
    return {
      modules: cloneRows(matrix.modules),
      reserved: cloneRows(matrix.reserved),
      data: cloneRows(matrix.data)
    };
  }

  function cloneRows(rows) {
    var clone = [];
    for (var i = 0; i < rows.length; i += 1) clone[i] = rows[i].slice(0);
    return clone;
  }

  function setModule(matrix, x, y, value, isReserved) {
    if (isReserved === undefined) isReserved = true;
    if (x < 0 || y < 0 || y >= matrix.modules.length || x >= matrix.modules.length) return;
    matrix.modules[y][x] = Boolean(value);
    if (isReserved) matrix.reserved[y][x] = true;
  }

  function drawFunctionPatterns(matrix, version) {
    var size = matrix.modules.length;
    drawFinderPattern(matrix, 3, 3);
    drawFinderPattern(matrix, size - 4, 3);
    drawFinderPattern(matrix, 3, size - 4);

    for (var i = 8; i < size - 8; i += 1) {
      setModule(matrix, i, 6, i % 2 === 0);
      setModule(matrix, 6, i, i % 2 === 0);
    }

    var positions = ALIGNMENT_POSITIONS[version];
    for (var px = 0; px < positions.length; px += 1) {
      for (var py = 0; py < positions.length; py += 1) {
        var x = positions[px];
        var y = positions[py];
        var overlapsFinder = (x === 6 && y === 6) || (x === 6 && y === size - 7) || (x === size - 7 && y === 6);
        if (!overlapsFinder) drawAlignmentPattern(matrix, x, y);
      }
    }

    setModule(matrix, 8, size - 8, true);
    reserveFormatAreas(matrix);
    if (version >= 7) reserveVersionAreas(matrix);
  }

  function drawFinderPattern(matrix, centerX, centerY) {
    for (var dy = -4; dy <= 4; dy += 1) {
      for (var dx = -4; dx <= 4; dx += 1) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy));
        setModule(matrix, centerX + dx, centerY + dy, dist !== 2 && dist !== 4);
      }
    }
  }

  function drawAlignmentPattern(matrix, centerX, centerY) {
    for (var dy = -2; dy <= 2; dy += 1) {
      for (var dx = -2; dx <= 2; dx += 1) {
        setModule(matrix, centerX + dx, centerY + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  function reserveFormatAreas(matrix) {
    var size = matrix.modules.length;
    for (var i = 0; i < 9; i += 1) {
      setModule(matrix, 8, i, matrix.modules[i][8]);
      setModule(matrix, i, 8, matrix.modules[8][i]);
    }
    for (var j = 0; j < 8; j += 1) {
      setModule(matrix, size - 1 - j, 8, matrix.modules[8][size - 1 - j]);
      setModule(matrix, 8, size - 1 - j, matrix.modules[size - 1 - j][8]);
    }
  }

  function reserveVersionAreas(matrix) {
    var size = matrix.modules.length;
    for (var i = 0; i < 6; i += 1) {
      for (var j = 0; j < 3; j += 1) {
        setModule(matrix, size - 11 + j, i, false);
        setModule(matrix, i, size - 11 + j, false);
      }
    }
  }

  function drawCodewords(matrix, codewords) {
    var bits = [];
    for (var i = 0; i < codewords.length; i += 1) appendBits(bits, codewords[i], 8);

    var size = matrix.modules.length;
    var bitIndex = 0;
    var upward = true;

    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right -= 1;
      for (var vert = 0; vert < size; vert += 1) {
        var y = upward ? size - 1 - vert : vert;
        for (var dx = 0; dx < 2; dx += 1) {
          var x = right - dx;
          if (!matrix.reserved[y][x]) {
            matrix.modules[y][x] = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
            matrix.data[y][x] = true;
            bitIndex += 1;
          }
        }
      }
      upward = !upward;
    }
  }

  function applyMask(matrix, mask) {
    var size = matrix.modules.length;
    for (var y = 0; y < size; y += 1) {
      for (var x = 0; x < size; x += 1) {
        if (matrix.data[y][x] && maskCondition(mask, x, y)) {
          matrix.modules[y][x] = !matrix.modules[y][x];
        }
      }
    }
  }

  function maskCondition(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return false;
    }
  }

  function drawFormatBits(matrix, mask) {
    var bits = getFormatBits(mask);
    var size = matrix.modules.length;
    for (var i = 0; i <= 5; i += 1) setModule(matrix, 8, i, getBit(bits, i));
    setModule(matrix, 8, 7, getBit(bits, 6));
    setModule(matrix, 8, 8, getBit(bits, 7));
    setModule(matrix, 7, 8, getBit(bits, 8));
    for (var j = 9; j < 15; j += 1) setModule(matrix, 14 - j, 8, getBit(bits, j));
    for (var k = 0; k < 8; k += 1) setModule(matrix, size - 1 - k, 8, getBit(bits, k));
    for (var m = 8; m < 15; m += 1) setModule(matrix, 8, size - 15 + m, getBit(bits, m));
    setModule(matrix, 8, size - 8, true);
  }

  function getFormatBits(mask) {
    var data = (1 << 3) | mask;
    var remainder = data;
    for (var i = 0; i < 10; i += 1) {
      remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
    }
    return ((data << 10) | remainder) ^ 0x5412;
  }

  function drawVersionBits(matrix, version) {
    var remainder = version;
    for (var i = 0; i < 12; i += 1) {
      remainder = (remainder << 1) ^ (((remainder >>> 11) & 1) * 0x1f25);
    }
    var bits = (version << 12) | remainder;
    var size = matrix.modules.length;
    for (var j = 0; j < 18; j += 1) {
      var value = getBit(bits, j);
      var a = size - 11 + (j % 3);
      var b = Math.floor(j / 3);
      setModule(matrix, a, b, value);
      setModule(matrix, b, a, value);
    }
  }

  function getBit(value, index) {
    return ((value >>> index) & 1) === 1;
  }

  function getPenaltyScore(modules) {
    var size = modules.length;
    var penalty = 0;

    for (var y = 0; y < size; y += 1) {
      var runColor = modules[y][0];
      var runLength = 1;
      for (var x = 1; x < size; x += 1) {
        if (modules[y][x] === runColor) {
          runLength += 1;
          if (runLength === 5) penalty += 3;
          else if (runLength > 5) penalty += 1;
        } else {
          runColor = modules[y][x];
          runLength = 1;
        }
      }
    }

    for (var cx = 0; cx < size; cx += 1) {
      var columnRunColor = modules[0][cx];
      var columnRunLength = 1;
      for (var cy = 1; cy < size; cy += 1) {
        if (modules[cy][cx] === columnRunColor) {
          columnRunLength += 1;
          if (columnRunLength === 5) penalty += 3;
          else if (columnRunLength > 5) penalty += 1;
        } else {
          columnRunColor = modules[cy][cx];
          columnRunLength = 1;
        }
      }
    }

    for (var sy = 0; sy < size - 1; sy += 1) {
      for (var sx = 0; sx < size - 1; sx += 1) {
        var color = modules[sy][sx];
        if (color === modules[sy][sx + 1] && color === modules[sy + 1][sx] && color === modules[sy + 1][sx + 1]) {
          penalty += 3;
        }
      }
    }

    var pattern = [true, false, true, true, true, false, true, false, false, false, false];
    var reverse = pattern.slice(0).reverse();
    for (var py = 0; py < size; py += 1) {
      for (var px = 0; px <= size - 11; px += 1) {
        if (matchesPattern(modules, px, py, 1, 0, pattern) || matchesPattern(modules, px, py, 1, 0, reverse)) {
          penalty += 40;
        }
      }
    }
    for (var vx = 0; vx < size; vx += 1) {
      for (var vy = 0; vy <= size - 11; vy += 1) {
        if (matchesPattern(modules, vx, vy, 0, 1, pattern) || matchesPattern(modules, vx, vy, 0, 1, reverse)) {
          penalty += 40;
        }
      }
    }

    var black = 0;
    for (var by = 0; by < size; by += 1) {
      for (var bx = 0; bx < size; bx += 1) if (modules[by][bx]) black += 1;
    }
    var percent = (black * 100) / (size * size);
    penalty += Math.floor(Math.abs(percent - 50) / 5) * 10;

    return penalty;
  }

  function matchesPattern(modules, startX, startY, stepX, stepY, pattern) {
    for (var i = 0; i < pattern.length; i += 1) {
      if (modules[startY + i * stepY][startX + i * stepX] !== pattern[i]) return false;
    }
    return true;
  }

  function matrixToSvg(matrix, margin, pixelSize) {
    var qrSize = matrix.length;
    var totalSize = qrSize + margin * 2;
    var path = [];
    for (var y = 0; y < qrSize; y += 1) {
      for (var x = 0; x < qrSize; x += 1) {
        if (matrix[y][x]) path.push("M" + (x + margin) + " " + (y + margin) + "h1v1h-1z");
      }
    }
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + pixelSize + '" height="' + pixelSize + '" viewBox="0 0 ' + totalSize + " " + totalSize + '" shape-rendering="crispEdges">',
      '<rect width="100%" height="100%" fill="#fff"/>',
      '<path fill="#000" d="' + path.join("") + '"/>',
      "</svg>"
    ].join("");
  }

  function matrixToRows(matrix) {
    var rows = [];
    for (var y = 0; y < matrix.length; y += 1) {
      var row = "";
      for (var x = 0; x < matrix[y].length; x += 1) row += matrix[y][x] ? "1" : "0";
      rows.push(row);
    }
    return rows;
  }

  window.QrCodeSvg = {
    normalizeInput: normalizeInput,
    createQrMatrix: createQrMatrix,
    matrixToSvg: matrixToSvg,
    matrixToRows: matrixToRows
  };
})();
