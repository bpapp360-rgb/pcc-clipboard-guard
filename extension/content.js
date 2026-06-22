(function () {
  'use strict';

  // --- Phase 1: Immediate event blocking (document exists at document_start) ---

  // Block copy, cut, paste, and right-click events before PCC's handlers fire.
  // useCapture: true puts our listener first in the event chain.
  ['copy', 'cut', 'paste', 'contextmenu'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
  });

  // Block Ctrl/Cmd + C (copy), X (cut), V (paste), A (select all).
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && ['KeyC', 'KeyX', 'KeyV', 'KeyA'].includes(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // --- Phase 2: API overrides (requires world: MAIN to reach navigator/document) ---

  // Override the modern Clipboard API. Each method returns a rejected Promise
  // so that any PCC code calling navigator.clipboard.writeText() fails silently.
  if (navigator.clipboard) {
    var blocked = function () {
      return Promise.reject(new DOMException('Clipboard access blocked.', 'NotAllowedError'));
    };
    navigator.clipboard.writeText = blocked;
    navigator.clipboard.readText  = blocked;
    navigator.clipboard.write     = blocked;
    navigator.clipboard.read      = blocked;
  }

  // Override the legacy execCommand API for copy/cut/paste.
  // Preserve all other execCommand calls (e.g., PCC uses it for rich-text editing).
  var _execCommand = document.execCommand.bind(document);
  document.execCommand = function (command) {
    if (['copy', 'cut', 'paste'].indexOf((command || '').toLowerCase()) !== -1) {
      return false;
    }
    return _execCommand.apply(document, arguments);
  };

  // --- Phase 3: CSS selection block + MutationObserver (requires document.body) ---

  function applySelectionBlock() {
    // Global CSS: prevent text selection on every element.
    // !important overrides any PCC styles that re-enable selection.
    var style = document.createElement('style');
    style.id = 'pcc-clipboard-guard-style';
    style.textContent = [
      '* {',
      '  user-select: none !important;',
      '  -webkit-user-select: none !important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);

    // MutationObserver: re-apply user-select to any element PCC dynamically adds
    // after initial load (modals, SPA route changes, lazy-loaded sections).
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            node.style.userSelect = 'none';
            node.style.webkitUserSelect = 'none';
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // document.body may not yet exist at document_start — wait for it.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySelectionBlock);
  } else {
    applySelectionBlock();
  }

})();
