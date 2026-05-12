(function () {
  var csInterface = new CSInterface();
  var form = document.getElementById("qr-form");
  var input = document.getElementById("qr-input");
  var formatSelect = document.getElementById("format-select");
  var dimensionFieldset = document.getElementById("dimension-fieldset");
  var dimensionSelect = document.getElementById("dimension-select");
  var dimensionValueWrap = document.getElementById("dimension-value-wrap");
  var dimensionValue = document.getElementById("dimension-value");
  var dimensionUnit = document.getElementById("dimension-unit");
  var insertButton = document.getElementById("insert-button");
  var statusEl = document.getElementById("status");
  var preview = document.getElementById("preview");
  var previewBox = document.getElementById("preview-box");
  var encodedText = document.getElementById("encoded-text");
  var BASE_SIZE = 512;
  var customSelects = [];

  applyHostTheme();
  if (CSInterface.THEME_COLOR_CHANGED_EVENT) {
    csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, applyHostTheme);
  }

  customSelects.push(createCustomSelect(formatSelect));
  customSelects.push(createCustomSelect(dimensionSelect));
  input.addEventListener("input", updateSubmitState);
  formatSelect.addEventListener("change", updateDimensionState);
  dimensionSelect.addEventListener("change", updateDimensionState);
  dimensionValue.addEventListener("input", updateSubmitState);
  updateDimensionState();

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    setStatus("");

    var value = window.QrCodeSvg.normalizeInput(input.value);
    if (!value) {
      setStatus("Informe um link antes de gerar o QR Code.", "error");
      input.focus();
      return;
    }

    try {
      var matrix = window.QrCodeSvg.createQrMatrix(value);
      var svg = window.QrCodeSvg.matrixToSvg(matrix, 4, 512);
      var rows = window.QrCodeSvg.matrixToRows(matrix);
      previewBox.innerHTML = svg;
      preview.classList.add("visible");
      encodedText.textContent = value;

      if (formatSelect.value === "png") {
        insertPngIntoIllustrator(matrix, value);
      } else {
        insertSvgIntoIllustrator(rows, value);
      }
    } catch (error) {
      setStatus(error.message || "Nao foi possivel gerar o QR Code.", "error");
    }
  });

  function insertSvgIntoIllustrator(rows, text) {
    setStatus("Inserindo no Illustrator...");

    var script = "insertQrCodeFromPanel(" +
      quoteForExtendScript(encodeURIComponent(rows.join("/"))) + "," +
      quoteForExtendScript(encodeURIComponent(text)) +
      ")";

    csInterface.evalScript(script, function (result) {
      if (!result) {
        setStatus("Nao foi possivel confirmar a insercao no Illustrator.", "error");
        return;
      }

      if (result.indexOf("ERROR:") === 0) {
        setStatus(result.replace(/^ERROR:\\s*/, ""), "error");
        return;
      }

      setStatus("QR Code inserido no documento ativo.", "success");
    });
  }

  function insertPngIntoIllustrator(matrix, text) {
    var size = resolvePngSize();
    var pngPath = writePngToTemporaryFile(matrix, size);
    setStatus("Inserindo PNG no Illustrator...");

    var script = "insertQrPngFromPanel(" +
      quoteForExtendScript(encodeURIComponent(pngPath)) + "," +
      quoteForExtendScript(encodeURIComponent(text)) + "," +
      Number(size) +
      ")";

    csInterface.evalScript(script, function (result) {
      if (!result) {
        setStatus("Nao foi possivel confirmar a insercao do PNG no Illustrator.", "error");
        return;
      }

      if (result.indexOf("ERROR:") === 0) {
        setStatus(result.replace(/^ERROR:\\s*/, ""), "error");
        return;
      }

      setStatus("PNG inserido no documento ativo.", "success");
    });
  }

  function writePngToTemporaryFile(matrix, size) {
    if (typeof require !== "function") {
      throw new Error("Runtime Node indisponivel no painel CEP. Nao foi possivel salvar o PNG temporario.");
    }

    var fs = require("fs");
    var os = require("os");
    var path = require("path");
    var pngData = matrixToPngDataUrl(matrix, 4, size);
    var base64 = pngData.replace(/^data:image\/png;base64,/, "");
    var filePath = path.join(os.tmpdir(), "qr-code-generator-" + Date.now() + ".png");
    fs.writeFileSync(filePath, base64, "base64");
    return filePath;
  }

  function matrixToPngDataUrl(matrix, margin, pixelSize) {
    var qrSize = matrix.length;
    var totalModules = qrSize + margin * 2;
    var canvas = document.createElement("canvas");
    canvas.width = pixelSize;
    canvas.height = pixelSize;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pixelSize, pixelSize);
    ctx.fillStyle = "#000000";

    for (var y = 0; y < qrSize; y += 1) {
      for (var x = 0; x < qrSize; x += 1) {
        if (matrix[y][x]) {
          var left = Math.round(((x + margin) * pixelSize) / totalModules);
          var top = Math.round(((y + margin) * pixelSize) / totalModules);
          var right = Math.round(((x + margin + 1) * pixelSize) / totalModules);
          var bottom = Math.round(((y + margin + 1) * pixelSize) / totalModules);
          ctx.fillRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
        }
      }
    }

    return canvas.toDataURL("image/png");
  }

  function resolvePngSize() {
    var option = dimensionSelect.value;
    var scaleMap = {
      "1x": 1,
      "2x": 2,
      "3x": 3,
      "4x": 4,
      "1.5x": 1.5,
      "0.5x": 0.5,
      "0.75x": 0.75
    };

    if (scaleMap[option]) {
      return Math.max(1, Math.round(BASE_SIZE * scaleMap[option]));
    }

    var value = Number(dimensionValue.value);
    if (!isFinite(value) || value <= 0) {
      throw new Error("Informe um valor valido para dimensionar o PNG.");
    }

    if (option === "resolution") {
      return Math.max(1, Math.round((BASE_SIZE / 72) * value));
    }

    return Math.max(1, Math.round(value));
  }

  function updateDimensionState() {
    var png = formatSelect.value === "png";
    var custom = dimensionSelect.value === "width" || dimensionSelect.value === "height" || dimensionSelect.value === "resolution";
    dimensionFieldset.disabled = !png;
    dimensionValueWrap.hidden = false;
    dimensionValue.disabled = !png || !custom;

    if (dimensionSelect.value === "resolution") {
      dimensionUnit.textContent = "ppi";
      if (custom && !dimensionValue.value) dimensionValue.value = "300";
    } else {
      dimensionUnit.textContent = "px";
      if (custom && !dimensionValue.value) dimensionValue.value = "512";
    }

    if (!custom) {
      dimensionValue.value = "";
    }
    syncCustomSelectDisabled();
    updateSubmitState();
  }

  function updateSubmitState() {
    insertButton.disabled = !hasRequiredFields();
  }

  function hasRequiredFields() {
    if (!window.QrCodeSvg.normalizeInput(input.value)) return false;
    if (formatSelect.value !== "png") return true;

    var custom = dimensionSelect.value === "width" || dimensionSelect.value === "height" || dimensionSelect.value === "resolution";
    if (!custom) return true;

    var value = Number(dimensionValue.value);
    return isFinite(value) && value > 0;
  }

  function quoteForExtendScript(value) {
    return "'" + String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", type === "error");
    statusEl.classList.toggle("success", type === "success");
  }

  function applyHostTheme() {
    try {
      var environment = csInterface.getHostEnvironment();
      var skin = environment && environment.appSkinInfo;
      if (!skin || !skin.panelBackgroundColor) return;

      var base = colorFromSkin(skin.panelBackgroundColor.color, { red: 47, green: 47, blue: 47 });
      var highlight = colorFromSkin(
        skin.systemHighlightColor && skin.systemHighlightColor.color,
        { red: 38, green: 128, blue: 235 }
      );
      var luminance = getLuminance(base);
      var dark = luminance < 145;

      setCssColor("--host-bg", base);
      setCssColor("--panel-bg", base);
      setCssColor("--panel-bg-raised", adjustColor(base, dark ? 12 : -8));
      setCssColor("--control-bg", adjustColor(base, dark ? -18 : 12));
      setCssColor("--control-bg-hover", adjustColor(base, dark ? 24 : -18));
      setCssColor("--control-bg-active", adjustColor(base, dark ? 34 : -26));
      setCssColor("--control-border", adjustColor(base, dark ? -34 : -36));
      setCssColor("--control-border-strong", adjustColor(base, dark ? 42 : -58));
      setCssColor("--text", dark ? { red: 220, green: 220, blue: 220 } : { red: 38, green: 38, blue: 38 });
      setCssColor("--text-muted", dark ? { red: 176, green: 176, blue: 176 } : { red: 93, green: 93, blue: 93 });
      setCssColor("--text-dim", dark ? { red: 128, green: 128, blue: 128 } : { red: 121, green: 121, blue: 121 });
      setCssColor("--button-text", dark ? { red: 232, green: 232, blue: 232 } : { red: 32, green: 32, blue: 32 });
      setCssColor("--accent", highlight);

      if (skin.baseFontFamily) {
        document.documentElement.style.setProperty("--font-family", skin.baseFontFamily + ", Arial, Helvetica, sans-serif");
      }
      if (skin.baseFontSize) {
        document.documentElement.style.setProperty("--font-size", Math.max(10, Math.min(14, skin.baseFontSize)) + "px");
      }
    } catch (error) {
      // Fallback CSS already matches Illustrator's default dark panel style.
    }
  }

  function colorFromSkin(color, fallback) {
    color = color || fallback;
    return {
      red: clampColor(color.red),
      green: clampColor(color.green),
      blue: clampColor(color.blue)
    };
  }

  function adjustColor(color, amount) {
    return {
      red: clampColor(color.red + amount),
      green: clampColor(color.green + amount),
      blue: clampColor(color.blue + amount)
    };
  }

  function setCssColor(name, color) {
    document.documentElement.style.setProperty(name, "rgb(" + color.red + ", " + color.green + ", " + color.blue + ")");
  }

  function clampColor(value) {
    return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
  }

  function getLuminance(color) {
    return (color.red * 0.299) + (color.green * 0.587) + (color.blue * 0.114);
  }

  function createCustomSelect(select) {
    var root = document.createElement("div");
    var button = document.createElement("button");
    var list = document.createElement("div");

    root.className = "ui-select";
    button.className = "ui-select-button";
    button.type = "button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    list.className = "ui-select-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;

    for (var i = 0; i < select.options.length; i += 1) {
      var option = select.options[i];
      var item = document.createElement("div");
      item.className = "ui-select-option";
      item.setAttribute("role", "option");
      item.setAttribute("data-value", option.value);
      item.textContent = option.textContent;
      list.appendChild(item);
    }

    select.parentNode.insertBefore(root, select.nextSibling);
    root.appendChild(button);
    document.body.appendChild(list);

    button.addEventListener("click", function () {
      if (select.disabled || select.closest("fieldset") && select.closest("fieldset").disabled) return;
      if (list.hidden) openCustomSelect(select, root, button, list);
      else closeCustomSelect(button, list);
    });

    list.addEventListener("click", function (event) {
      var item = event.target.closest(".ui-select-option");
      if (!item) return;
      select.value = item.getAttribute("data-value");
      select.dispatchEvent(new Event("change"));
      updateCustomSelect(select, button, list);
      closeCustomSelect(button, list);
    });

    updateCustomSelect(select, button, list);
    return { select: select, button: button, list: list };
  }

  function openCustomSelect(select, root, button, list) {
    closeAllCustomSelects();
    var rect = root.getBoundingClientRect();
    list.style.left = rect.left + "px";
    list.style.top = rect.bottom + "px";
    list.style.width = rect.width + "px";
    list.hidden = false;
    button.setAttribute("aria-expanded", "true");
    updateCustomSelect(select, button, list);
  }

  function closeCustomSelect(button, list) {
    list.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }

  function closeAllCustomSelects() {
    for (var i = 0; i < customSelects.length; i += 1) {
      closeCustomSelect(customSelects[i].button, customSelects[i].list);
    }
  }

  function updateCustomSelect(select, button, list) {
    var selectedText = "";
    for (var i = 0; i < select.options.length; i += 1) {
      if (select.options[i].value === select.value) selectedText = select.options[i].textContent;
    }
    button.textContent = selectedText;
    button.setAttribute("aria-disabled", select.disabled || select.closest("fieldset") && select.closest("fieldset").disabled ? "true" : "false");

    var items = list.querySelectorAll(".ui-select-option");
    for (var j = 0; j < items.length; j += 1) {
      var selected = items[j].getAttribute("data-value") === select.value;
      items[j].setAttribute("aria-selected", selected ? "true" : "false");
      items[j].classList.toggle("active", selected);
    }
  }

  function syncCustomSelectDisabled() {
    for (var i = 0; i < customSelects.length; i += 1) {
      updateCustomSelect(customSelects[i].select, customSelects[i].button, customSelects[i].list);
    }
  }

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".ui-select") && !event.target.closest(".ui-select-list")) {
      closeAllCustomSelects();
    }
  });

  window.QrPanelDebug = {
    resolvePngSize: resolvePngSize,
    updateDimensionState: updateDimensionState,
    hasRequiredFields: hasRequiredFields
  };
})();
