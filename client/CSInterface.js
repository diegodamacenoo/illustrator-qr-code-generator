(function () {
  function CSInterface() {}

  CSInterface.THEME_COLOR_CHANGED_EVENT = "com.adobe.csxs.events.ThemeColorChanged";

  CSInterface.prototype.getHostEnvironment = function () {
    if (window.__adobe_cep__ && typeof window.__adobe_cep__.getHostEnvironment === "function") {
      return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    }

    return {
      appSkinInfo: {
        baseFontFamily: "Arial",
        baseFontSize: 12,
        panelBackgroundColor: { color: { red: 47, green: 47, blue: 47 } },
        systemHighlightColor: { color: { red: 38, green: 128, blue: 235 } }
      }
    };
  };

  CSInterface.prototype.evalScript = function (script, callback) {
    if (window.__adobe_cep__ && typeof window.__adobe_cep__.evalScript === "function") {
      window.__adobe_cep__.evalScript(script, callback);
      return;
    }

    if (callback) {
      callback("ERROR: CEP runtime indisponivel. Abra este painel dentro do Adobe Illustrator.");
    }
  };

  CSInterface.prototype.addEventListener = function (type, listener) {
    if (window.__adobe_cep__ && typeof window.__adobe_cep__.addEventListener === "function") {
      window.__adobe_cep__.addEventListener(type, listener);
    }
  };

  window.CSInterface = CSInterface;
})();
