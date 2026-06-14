/* The Desk — shared print helper.
   Populates the print header (tool name + date), intercepts the Print button to
   collect an optional borrower last name + file number, stamps them on the
   printout header, hides empty input rows, then prints. Falls back to plain
   window.print() if not loaded. */
(function () {
  var lastName = '', fileNo = '', modal = null;
  function byId(id) { return document.getElementById(id); }

  function setHeaderMeta() {
    var t = byId('print-tool'), h = document.querySelector('.tool-page-head h1');
    if (t && h) t.textContent = h.textContent.replace(/\s+/g, ' ').trim();
    var d = byId('print-date');
    if (d) d.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function fileSlot() {
    var meta = document.querySelector('.print-header .ph-meta');
    if (!meta) return null;
    var slot = meta.querySelector('.ph-file');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'ph-file';
      meta.insertBefore(slot, meta.querySelector('.ph-date') || null);
    }
    return slot;
  }

  function applyFile() {
    var slot = fileSlot();
    if (!slot) return;
    var parts = [];
    if (lastName) parts.push(lastName);
    if (fileNo) parts.push('File #' + fileNo);
    slot.textContent = parts.join('  \u00b7  ');
    slot.style.display = parts.length ? '' : 'none';
  }

  /* Hide empty add-back / line-item rows (and any subhead left with no rows)
     so a sparsely-filled worksheet collapses onto one page. */
  function markEmptyRows() {
    document.querySelectorAll('.line-row').forEach(function (row) {
      var filled = false;
      row.querySelectorAll('input').forEach(function (i) {
        var v = parseFloat(i.value);
        if (!isNaN(v) && v !== 0) filled = true;
      });
      row.classList.toggle('print-empty', !filled);
    });
    document.querySelectorAll('.calc-input .subhead').forEach(function (sub) {
      var n = sub.nextElementSibling, sawRow = false, anyVisible = false;
      while (n && !n.classList.contains('subhead')) {
        if (n.classList.contains('line-row')) {
          sawRow = true;
          if (!n.classList.contains('print-empty')) anyVisible = true;
        }
        n = n.nextElementSibling;
      }
      sub.classList.toggle('print-empty', sawRow && !anyVisible);
    });
  }

  function build() {
    modal = document.createElement('div');
    modal.className = 'print-modal';
    modal.innerHTML =
      '<div class="print-modal-card" role="dialog" aria-modal="true" aria-label="Print details">' +
        '<h4>Print details</h4>' +
        '<p>Optional \u2014 these stamp onto the printout header. Leave blank to skip.</p>' +
        '<label for="pm-last">Borrower last name</label>' +
        '<input id="pm-last" type="text" autocomplete="off" spellcheck="false">' +
        '<label for="pm-file">File # (F#)</label>' +
        '<input id="pm-file" type="text" autocomplete="off" spellcheck="false">' +
        '<div class="print-modal-actions">' +
          '<button type="button" class="pm-cancel">Cancel</button>' +
          '<button type="button" class="pm-go">Print</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeM(); });
    modal.querySelector('.pm-cancel').addEventListener('click', closeM);
    modal.querySelector('.pm-go').addEventListener('click', go);
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeM();
      else if (e.key === 'Enter') { e.preventDefault(); go(); }
    });
  }

  function openM() {
    if (!modal) build();
    byId('pm-last').value = lastName;
    byId('pm-file').value = fileNo;
    modal.classList.add('open');
    setTimeout(function () { byId('pm-last').focus(); }, 20);
  }
  function closeM() { if (modal) modal.classList.remove('open'); }
  function go() {
    lastName = byId('pm-last').value.trim();
    fileNo = byId('pm-file').value.trim();
    applyFile();
    closeM();
    setTimeout(function () { window.print(); }, 60);
  }

  function init() {
    setHeaderMeta();
    window.addEventListener('beforeprint', markEmptyRows);
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.print-btn');
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();   // suppress the inline onclick="window.print()" fallback
      openM();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
