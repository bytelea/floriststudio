/* Florist Studio v2.5 — platform-aware PWA installation manager. */
(function () {
  "use strict";

  let deferredInstallEvent = null;
  let activeGuidePlatform = null;
  let lastFocusedElement = null;

  const $ = (id) => document.getElementById(id);

  function isInstalled() {
    return Boolean(
      window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        navigator.standalone,
    );
  }

  function detectPlatform() {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const iPadDesktopMode = platform === "MacIntel" && navigator.maxTouchPoints > 1;

    if (/iphone|ipod/i.test(ua)) return "iphone";
    if (/ipad/i.test(ua) || iPadDesktopMode) return "tablet";
    if (/android/i.test(ua) && !/mobile/i.test(ua)) return "tablet";
    if (/android/i.test(ua)) return "android";
    return "desktop";
  }

  function detectBrowser() {
    const ua = navigator.userAgent || "";
    if (/edg\//i.test(ua)) return "edge";
    if (/samsungbrowser/i.test(ua)) return "samsung";
    if (/firefox|fxios/i.test(ua)) return "firefox";
    if (/crios|chrome|chromium/i.test(ua)) return "chrome";
    if (/safari/i.test(ua)) return "safari";
    return "browser";
  }

  function platformName(platform) {
    return {
      desktop: "Desktop computer",
      android: "Android phone",
      iphone: "iPhone",
      tablet: "iPad or tablet",
    }[platform] || "This device";
  }

  function platformButtonLabel(platform) {
    if (isInstalled()) return "Florist Studio is installed";
    if (platform === "iphone" || platform === "tablet") return `Add to ${platform === "iphone" ? "iPhone" : "this tablet"}`;
    return `Install on ${platform === "android" ? "Android" : "this desktop"}`;
  }

  function getGuide(platform) {
    const browser = detectBrowser();
    const isAndroidTablet = platform === "tablet" && /android/i.test(navigator.userAgent || "");

    if (platform === "iphone") {
      return {
        eyebrow: "iPhone installation",
        title: "Add Florist Studio to your Home Screen",
        steps: [
          "Open Florist Studio in Safari or your preferred iPhone browser.",
          "Tap the Share button in the browser toolbar.",
          "Choose Add to Home Screen, then tap Add.",
          "Open Florist Studio from its new Home Screen icon.",
        ],
        note: "Apple uses an Add to Home Screen flow instead of a downloadable installer. Once added, Florist Studio opens full-screen and works like an app.",
        action: "Show me the Share steps",
        canPrompt: false,
      };
    }

    if (platform === "tablet" && !isAndroidTablet) {
      return {
        eyebrow: "iPad installation",
        title: "Add Florist Studio to your iPad",
        steps: [
          "Open this page in Safari on the iPad.",
          "Tap Share in the browser toolbar.",
          "Choose Add to Home Screen and confirm with Add.",
          "Launch the new icon for the full tablet workspace.",
        ],
        note: "The installed app automatically uses the two-row iPad navigation and keeps local data on that iPad.",
        action: "Got it",
        canPrompt: false,
      };
    }

    if (platform === "android" || isAndroidTablet) {
      const steps = browser === "samsung"
        ? [
            "Open the browser menu.",
            "Choose Add page to, then Home screen.",
            "Confirm the Florist Studio icon and open it from your apps.",
          ]
        : [
            "Open the browser menu (usually three dots).",
            "Choose Install app or Add to Home screen.",
            "Confirm Install, then open Florist Studio from the new icon.",
          ];
      return {
        eyebrow: isAndroidTablet ? "Android tablet installation" : "Android installation",
        title: `Install Florist Studio on ${isAndroidTablet ? "this tablet" : "Android"}`,
        steps,
        note: deferredInstallEvent
          ? "Your browser is ready to show its secure installation prompt now."
          : "The install option appears after the site has loaded securely. Chrome, Edge and Samsung Internet provide the most reliable Android installation flow.",
        action: deferredInstallEvent ? "Install now" : "Close guide",
        canPrompt: Boolean(deferredInstallEvent),
      };
    }

    let steps;
    if (browser === "edge") {
      steps = [
        "Open the Edge menu (three dots).",
        "Choose Apps, then Install Florist Studio.",
        "Confirm Install and choose whether to pin it to your taskbar or desktop.",
      ];
    } else if (browser === "safari") {
      steps = [
        "Open Florist Studio in Safari on macOS.",
        "Choose File in the menu bar, then Add to Dock.",
        "Confirm the app name and open it from the Dock or Applications.",
      ];
    } else if (browser === "firefox") {
      steps = [
        "Open Florist Studio in Chrome or Edge for the full desktop installation flow.",
        "Use the Install icon in the address bar or the browser menu.",
        "Confirm Install to create a standalone Florist Studio window.",
      ];
    } else {
      steps = [
        "Look for the Install icon at the right side of the address bar.",
        "Or open the browser menu and choose Install Florist Studio.",
        "Confirm Install to add the app to your desktop and app launcher.",
      ];
    }

    return {
      eyebrow: "Desktop installation",
      title: "Install Florist Studio on your computer",
      steps,
      note: deferredInstallEvent
        ? "Your browser is ready to show its secure installation prompt now."
        : "Installation requires HTTPS or localhost. Chrome and Edge offer the most consistent desktop PWA installation experience.",
      action: deferredInstallEvent ? "Install now" : "Close guide",
      canPrompt: Boolean(deferredInstallEvent),
    };
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function updateInstallUI(message) {
    const platform = detectPlatform();
    const installed = isInstalled();
    const label = platformName(platform);

    setText("detectedDeviceLabel", installed ? `${label} · app installed` : `${label} detected`);
    setText(
      "installSupportText",
      message ||
        (installed
          ? "Florist Studio is already running as an installed app."
          : platform === "iphone" || platform === "tablet"
            ? "We’ll show the correct Add to Home Screen steps."
            : deferredInstallEvent
              ? "Your browser is ready to install Florist Studio."
              : "The correct browser installation flow will open when available."),
    );
    setText("smartInstallButtonLabel", platformButtonLabel(platform));

    const smartButton = $("smartInstallButton");
    if (smartButton) {
      smartButton.disabled = installed;
      smartButton.classList.toggle("is-installed", installed);
      smartButton.setAttribute("aria-label", platformButtonLabel(platform));
    }

    document.querySelectorAll('[onclick="promptInstall()"]').forEach((button) => {
      button.textContent = installed ? "App installed" : platformButtonLabel(platform);
      button.disabled = installed;
    });

    document.querySelectorAll("[data-install-platform]").forEach((card) => {
      const cardPlatform = card.getAttribute("data-install-platform");
      const matches = cardPlatform === platform;
      card.classList.toggle("is-detected", matches);
      card.classList.toggle("is-installed", matches && installed);
      const state = card.querySelector(".install-platform-state");
      if (state) state.textContent = matches ? (installed ? "Installed" : "This device") : (cardPlatform === "iphone" || cardPlatform === "tablet" ? "Steps" : "Install");
      if (matches) card.setAttribute("aria-current", "true");
      else card.removeAttribute("aria-current");
    });

    document.documentElement.dataset.installPlatform = platform;
    document.documentElement.classList.toggle("is-installed", installed);
  }

  async function triggerNativeInstall() {
    if (!deferredInstallEvent) return false;
    const event = deferredInstallEvent;
    deferredInstallEvent = null;
    await event.prompt();
    const result = await event.userChoice;
    if (result && result.outcome === "accepted") {
      updateInstallUI("Installation accepted. Florist Studio will appear with your apps.");
    } else {
      updateInstallUI("Installation was closed. You can try again from your browser menu.");
    }
    return true;
  }

  function renderGuide(platform) {
    const guide = getGuide(platform);
    activeGuidePlatform = platform;
    setText("installGuideEyebrow", guide.eyebrow);
    setText("installGuideTitle", guide.title);
    setText(
      "installGuideDevice",
      platform === detectPlatform()
        ? `${platformName(platform)} · ${detectBrowser()}`
        : `Installation guide · ${platformName(platform)}`,
    );
    setText("installGuideNote", guide.note);
    setText("installGuideAction", guide.action);

    const list = $("installGuideSteps");
    if (list) {
      list.innerHTML = "";
      guide.steps.forEach((step) => {
        const item = document.createElement("li");
        const marker = document.createElement("span");
        marker.className = "install-step-marker";
        marker.setAttribute("aria-hidden", "true");
        marker.textContent = String(list.children.length + 1);
        const copy = document.createElement("span");
        copy.textContent = step;
        item.append(marker, copy);
        list.appendChild(item);
      });
    }

    const action = $("installGuideAction");
    if (action) action.classList.toggle("primary", guide.canPrompt);
  }

  window.openInstallGuide = function (platform) {
    const modal = $("installGuideModal");
    if (!modal) return;
    lastFocusedElement = document.activeElement;
    renderGuide(platform || detectPlatform());
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("install-guide-open");
    window.requestAnimationFrame(() => modal.classList.add("is-open"));
    const closeButton = modal.querySelector(".install-guide-head .icon-button");
    if (closeButton) closeButton.focus();
  };

  window.closeInstallGuide = function () {
    const modal = $("installGuideModal");
    if (!modal || modal.hidden) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("install-guide-open");
    window.setTimeout(() => {
      modal.hidden = true;
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
    }, 180);
  };

  window.runInstallFromGuide = async function () {
    const guide = getGuide(activeGuidePlatform || detectPlatform());
    if (guide.canPrompt && (activeGuidePlatform === detectPlatform() || !activeGuidePlatform)) {
      closeInstallGuide();
      await triggerNativeInstall();
      return;
    }
    closeInstallGuide();
  };

  window.handleSmartInstall = async function (requestedPlatform) {
    const currentPlatform = detectPlatform();
    const targetPlatform = requestedPlatform || currentPlatform;

    if (isInstalled() && targetPlatform === currentPlatform) {
      updateInstallUI("Florist Studio is already installed on this device.");
      return;
    }

    if (targetPlatform !== currentPlatform) {
      openInstallGuide(targetPlatform);
      return;
    }

    if ((targetPlatform === "desktop" || targetPlatform === "android" || /android/i.test(navigator.userAgent || "")) && deferredInstallEvent) {
      await triggerNativeInstall();
      return;
    }

    openInstallGuide(targetPlatform);
  };

  // Replace the original generic install helper without touching the invoice/app logic file.
  window.promptInstall = function () {
    return window.handleSmartInstall();
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallEvent = event;
    updateInstallUI("Your browser is ready to install Florist Studio.");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallEvent = null;
    updateInstallUI("Installation complete. Florist Studio is ready from your apps.");
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeInstallGuide();
  });

  window.addEventListener("DOMContentLoaded", () => {
    updateInstallUI();
    const displayMode = window.matchMedia("(display-mode: standalone)");
    if (typeof displayMode.addEventListener === "function") {
      displayMode.addEventListener("change", () => updateInstallUI());
    }
  });
})();
