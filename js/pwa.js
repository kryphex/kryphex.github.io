(function initPwa() {
  let deferredInstallPrompt = null;
  let swRegistration = null;
  let didReloadFromControllerChange = false;

  function ensurePwaUi() {
    if (document.getElementById("kryphexPwaUiStyle")) return;

    const style = document.createElement("style");
    style.id = "kryphexPwaUiStyle";
    style.textContent = `
      .kryphex-install-modal {
        position: fixed;
        inset: 0;
        background: rgba(2, 6, 23, 0.55);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 5000;
        padding: 16px;
      }
      .kryphex-install-modal.open { display: flex; }
      .kryphex-install-card {
        width: min(560px, 100%);
        border: 1px solid #d7e3f6;
        border-radius: 18px;
        background: #f8fbff;
        box-shadow: 0 30px 60px rgba(15, 23, 42, 0.24);
        padding: 18px;
        color: #11295a;
      }
      .kryphex-install-card h3 { margin: 0 0 8px; font-size: 22px; }
      .kryphex-install-card p { margin: 0 0 12px; color: #405b84; }
      .kryphex-install-card ol { margin: 0; padding-left: 20px; line-height: 1.65; color: #1f3965; }
      .kryphex-install-card .actions { margin-top: 14px; display: flex; justify-content: flex-end; }
      .kryphex-update-banner {
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        z-index: 4500;
        display: none;
        align-items: center;
        gap: 10px;
        background: #0f2a57;
        color: #dbeafe;
        border: 1px solid rgba(191, 219, 254, 0.32);
        border-radius: 14px;
        padding: 10px 12px;
        box-shadow: 0 16px 36px rgba(2, 6, 23, 0.28);
      }
      .kryphex-update-banner.open { display: flex; }
      .kryphex-update-banner button {
        border: 1px solid #93c5fd;
        background: #1d4ed8;
        color: #fff;
        border-radius: 10px;
        padding: 6px 10px;
        font-weight: 700;
        cursor: pointer;
      }`;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "kryphexInstallModal";
    modal.className = "kryphex-install-modal";
    modal.innerHTML = `
      <div class="kryphex-install-card">
        <h3>Install Kryphex App</h3>
        <p>Use your browser install menu when direct prompt is unavailable.</p>
        <ol>
          <li>Open the browser <strong>menu</strong> (three dots).</li>
          <li>Select <strong>Apps</strong> or <strong>Install app</strong>.</li>
          <li>Confirm <strong>Install</strong>.</li>
        </ol>
        <div class="actions">
          <button id="kryphexInstallClose" class="btn-outline" type="button">Close</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.classList.remove("open");
    });
    const closeBtn = document.getElementById("kryphexInstallClose");
    if (closeBtn) closeBtn.addEventListener("click", () => modal.classList.remove("open"));

    const updateBar = document.createElement("div");
    updateBar.id = "kryphexUpdateBanner";
    updateBar.className = "kryphex-update-banner";
    updateBar.innerHTML = `
      <span>New app version available.</span>
      <button id="kryphexUpdateNow" type="button">Refresh</button>
    `;
    document.body.appendChild(updateBar);

    const updateBtn = document.getElementById("kryphexUpdateNow");
    if (updateBtn) {
      updateBtn.addEventListener("click", () => {
        if (swRegistration && swRegistration.waiting) {
          swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        window.location.reload();
      });
    }
  }

  function showUpdateBanner() {
    ensurePwaUi();
    const bar = document.getElementById("kryphexUpdateBanner");
    if (bar) bar.classList.add("open");
  }

  function hookServiceWorkerUpdates(reg) {
    if (!reg) return;
    swRegistration = reg;

    if (reg.waiting) showUpdateBanner();

    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (didReloadFromControllerChange) return;
      didReloadFromControllerChange = true;
      window.location.reload();
    });
  }

  window.kryphexCanInstall = function () {
    return !!deferredInstallPrompt;
  };

  window.kryphexPromptInstall = async function () {
    if (!deferredInstallPrompt) {
      return { ok: false, reason: "unavailable" };
    }
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    return { ok: true, outcome: choice && choice.outcome ? choice.outcome : "unknown" };
  };

  window.kryphexShowInstallGuide = function () {
    ensurePwaUi();
    const modal = document.getElementById("kryphexInstallModal");
    if (modal) modal.classList.add("open");
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
  });

  window.addEventListener("load", () => ensurePwaUi(), { once: true });

  const head = document.head || document.getElementsByTagName("head")[0];
  if (!head) return;

  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/manifest.webmanifest";
    head.appendChild(manifest);
  }

  if (!document.querySelector('meta[name="theme-color"]')) {
    const theme = document.createElement("meta");
    theme.name = "theme-color";
    theme.content = "#1d4ed8";
    head.appendChild(theme);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener(
      "load",
      async () => {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js");
          hookServiceWorkerUpdates(reg);
        } catch (_) {}
      },
      { once: true }
    );
  }
})();
