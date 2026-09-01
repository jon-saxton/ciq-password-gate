/**
 * CaptivateIQ password gate — embed on Webflow site.
 *
 * Setup:
 * 1. Deploy this app to Webflow Cloud (e.g. mount at /gate).
 * 2. Add this script to Site Settings → Custom Code → Footer.
 * 3. Set window.CIQ_PASSWORD_GATE.apiUrl to your deployed validate endpoint.
 * 4. Add data-pw-gate="gate-id" to any link that should be protected.
 *
 * Example link:
 *   <a href="#" data-pw-gate="partner-deck">Partner resources</a>
 */
(function () {
  "use strict";

  var config = window.CIQ_PASSWORD_GATE || {};
  var apiUrl = config.apiUrl;

  if (!apiUrl) {
    console.warn(
      "[CIQ Password Gate] Missing window.CIQ_PASSWORD_GATE.apiUrl — password protection is disabled.",
    );
    return;
  }

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    var style = document.createElement("style");
    style.textContent =
      ".ciq-pw-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(15,23,42,.55);backdrop-filter:blur(2px)}" +
      ".ciq-pw-dialog{width:100%;max-width:24rem;background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 20px 60px rgba(15,23,42,.25);font-family:system-ui,-apple-system,sans-serif}" +
      ".ciq-pw-dialog h2{margin:0 0 .5rem;font-size:1.125rem;font-weight:600;color:#0f172a}" +
      ".ciq-pw-dialog p{margin:0 0 1rem;font-size:.875rem;color:#475569;line-height:1.5}" +
      ".ciq-pw-dialog input{width:100%;box-sizing:border-box;padding:.625rem .75rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem;margin-bottom:.75rem}" +
      ".ciq-pw-dialog input:focus{outline:2px solid #2563eb;outline-offset:1px;border-color:#2563eb}" +
      ".ciq-pw-actions{display:flex;gap:.5rem;justify-content:flex-end}" +
      ".ciq-pw-btn{padding:.5rem 1rem;border-radius:8px;border:none;font-size:.875rem;font-weight:600;cursor:pointer}" +
      ".ciq-pw-btn--ghost{background:#f1f5f9;color:#334155}" +
      ".ciq-pw-btn--primary{background:#2563eb;color:#fff}" +
      ".ciq-pw-btn:disabled{opacity:.6;cursor:not-allowed}" +
      ".ciq-pw-error{margin:0 0 .75rem;font-size:.8125rem;color:#dc2626}";
    document.head.appendChild(style);
  }

  function createDialog(gateId, onSubmit, onCancel) {
    injectStyles();

    var overlay = document.createElement("div");
    overlay.className = "ciq-pw-overlay";
    overlay.setAttribute("role", "presentation");

    var dialog = document.createElement("div");
    dialog.className = "ciq-pw-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "ciq-pw-title");

    var title = config.title || "Password required";
    var message =
      config.message || "Enter the password to access this resource.";

    dialog.innerHTML =
      '<h2 id="ciq-pw-title">' +
      escapeHtml(title) +
      "</h2>" +
      "<p>" +
      escapeHtml(message) +
      "</p>" +
      '<p class="ciq-pw-error" hidden></p>' +
      '<form><input type="password" autocomplete="current-password" placeholder="Password" required /><div class="ciq-pw-actions">' +
      '<button type="button" class="ciq-pw-btn ciq-pw-btn--ghost">Cancel</button>' +
      '<button type="submit" class="ciq-pw-btn ciq-pw-btn--primary">Continue</button>' +
      "</div></form>";

    overlay.appendChild(dialog);

    var form = dialog.querySelector("form");
    var input = dialog.querySelector("input");
    var errorEl = dialog.querySelector(".ciq-pw-error");
    var cancelBtn = dialog.querySelector(".ciq-pw-btn--ghost");
    var submitBtn = dialog.querySelector(".ciq-pw-btn--primary");

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKeyDown);
    }

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.hidden = false;
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        close();
        onCancel();
      }
    }

    cancelBtn.addEventListener("click", function () {
      close();
      onCancel();
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        close();
        onCancel();
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!input) return;

      submitBtn.disabled = true;
      showError("");
      errorEl.hidden = true;

      onSubmit(input.value)
        .then(function (result) {
          if (result.ok) {
            close();
            window.location.href = result.url;
            return;
          }

          showError(result.error || "Incorrect password.");
          submitBtn.disabled = false;
          input.focus();
          input.select();
        })
        .catch(function () {
          showError("Something went wrong. Please try again.");
          submitBtn.disabled = false;
        });
    });

    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKeyDown);
    input.focus();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function validatePassword(gateId, password) {
    return fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gate: gateId, password: password }),
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          return { ok: false, error: data.error || "Incorrect password." };
        }

        return { ok: true, url: data.url };
      });
    });
  }

  function handleClick(event) {
    var target = event.target.closest("[data-pw-gate]");
    if (!target) return;

    event.preventDefault();

    var gateId = target.getAttribute("data-pw-gate") || "default";

    createDialog(
      gateId,
      function (password) {
        return validatePassword(gateId, password);
      },
      function () {},
    );
  }

  document.addEventListener("click", handleClick);
})();
