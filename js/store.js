// Shared by the portfolio and the manager. Unsaved edits live in this browser
// only, so visitors always see what is in data/content.js.
window.Store = (function () {
  var DRAFT_KEY = 'portfolio.draft';

  function readDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeDraft(content) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(content));
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  function hasUnsavedDraft() {
    var draft = readDraft();
    return !!draft && JSON.stringify(draft) !== JSON.stringify(window.PORTFOLIO);
  }

  function load() {
    return readDraft() || window.PORTFOLIO;
  }

  // Returns a safe absolute link, or '' if it is not a web address.
  function safeUrl(value) {
    var url = String(value || '').trim();
    if (!url) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
    try {
      var parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
    } catch (e) {
      return '';
    }
  }

  function safeImage(value) {
    var src = String(value || '').trim();
    if (/^data:image\/(png|jpe?g|webp|gif);/i.test(src)) return src;
    if (/^https?:\/\//i.test(src)) return src;
    if (/^[\w./-]+$/.test(src) && src.indexOf('..') === -1) return src;
    return '';
  }

  return {
    load: load,
    writeDraft: writeDraft,
    clearDraft: clearDraft,
    hasUnsavedDraft: hasUnsavedDraft,
    safeUrl: safeUrl,
    safeImage: safeImage
  };
})();
