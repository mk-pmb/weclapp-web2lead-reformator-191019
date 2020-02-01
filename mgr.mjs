// -*- coding: utf-8, tab-width: 2 -*-
(function setup() {
  const win = window; // eslint-disable-line no-undef
  const doc = win.document;
  let refineCfg = false;

  // function ifDef(x, u) { return (x === undefined ? u : x); }
  function unixtime() { return Math.floor(Date.now() / 1e3); }
  function sumOptTextLen(sum, opt) { return sum + opt.text.length; }
  function orf(x) { return (x || false); }
  // function ores(x) { return (x || ''); }
  function finOr(x, d) { return (Number.isFinite(x) ? x : d); }


  function parseSimplifiedJson(text) {
    const json = (('{\n' + String(text || '') + '\n}')
      .replace(/\r/g, '')
      .replace(/\n\s*\/{2}[ -\uFFFF]*/g, '')
      .replace(/(\n\s*)(\w+):/g, '$1"$2":')
      .replace(/(\w|"|\]|\})\n/g, '$1,\n')
      .replace(/,(\s*[\}\]])/g, '$1')
      );
    try {
      return JSON.parse(json);
    } catch (parseErr) {
      parseErr.message += ' <pre>' + json + '</pre>';
      throw parseErr;
    }
  }


  function fixOneSelect(selBox) {
    const origVals = Array.from(selBox.options);
    const selDiv = doc.createElement('div');
    const allowMulti = selBox.multiple;
    const elemType = (allowMulti ? 'checkbox' : 'radio');
    const selCls = [
      (allowMulti ? 'multi' : 'one'),
      fixOneSelect.decideBoxed(origVals),
    ];

    origVals.forEach(function renderOpt(opt, idx) {
      selDiv.innerHTML += '\n    <label><input></input> <span></span></label>';
      const lbl = selDiv.lastChild;
      lbl.lastChild.innerHTML = opt.innerHTML;
      const inp = lbl.firstChild;
      inp.type = elemType;
      inp.name = selBox.name;
      inp.value = opt.value;
      if (!idx) {
        if (selBox.id) { inp.id = selBox.id; }
        if (!allowMulti) { inp.checked = true; }
      }
    });

    selDiv.className = ('% ' + selCls.join(' %-')).replace(/%/g, 'ff-select');
    selDiv.innerHTML += '\n    <div class="unfloat"></div>\n';
    selBox.parentNode.insertBefore(selDiv, selBox);
    selBox.parentNode.removeChild(selBox);
  }
  fixOneSelect.decideBoxed = function decideBoxed(optVals) {
    const dfMaxItems = 5;
    const dfMaxLenSum = 80;
    const cfg = orf(orf(refineCfg.selects).shortList);
    if (optVals.length > finOr(cfg.maxItems, dfMaxItems)) { return 'boxed'; }
    const lenSum = optVals.reduce(sumOptTextLen, 0);
    if (lenSum > finOr(cfg.maxTextLenSum, dfMaxLenSum)) { return 'boxed'; }
    return 'short';
  };


  function refineCore(orig) {
    // First, reghaxx it into something somewhat usable:
    const tmpDom = doc.createElement('div');
    tmpDom.innerHTML = (orig
      .replace(/\r/g, '')
      .replace(/°/g, '&deg;')
      .replace(/(<form )/, '$1target="_blank" ')
      .replace(/\n(<input type="submit")/,
        '\n<label for="submit">Aktionen</label>$1')
      .replace(/(<label for="(?:idWC_|)([\w\-]+)")/g,
        '\n<div class="ff ff-$2" data-ff="$2">\n  $1')
      .replace(/(<\/label>)/g, '$1\n  <div class="ff-reply">')
      .replace(/\n(<\/select)/g, '\n  $1')
      .replace(/\n(<option)/g, '\n    $1')
      .replace(/(<input type="hidden"[^<>]*>)<br\s*\/?>/g, '$1')
      .replace(/(<\/form)/, '<br>\n\n$1')
      .replace(/<br\s*\/?>/g, ('</div>'
        + '\n  <div class="unfloat"></div>'
        + '\n</div>'))
    );

    // Then, let's refine it on DOM level:
    function tmpQsa(sel) { return Array.from(tmpDom.querySelectorAll(sel)); }
    tmpQsa('select').forEach(fixOneSelect);

    const tmpl = doc.selfHtml.split(/<!-- ##cut## -->/);
    const pageHTML = tmpl[0] + tmpDom.innerHTML + tmpl[2];
    return pageHTML;
  }


  function tryRefine() {
    const sourceMode = false;
    const mgElem = doc.forms.mgr.elements;
    let html;
    try {
      refineCfg = parseSimplifiedJson(mgElem.config.value);
      html = refineCore(mgElem.orig_html.value);
    } catch (err) {
      html = String(err);
      console.error(err);
    }
    mgElem.nice_html.value = html;
    const dest = doc.getElementById('preview');
    if (sourceMode) {
      dest.innerHTML = '<pre></pre>';
      dest.firstChild.appendChild(doc.createTextNode(html));
    } else {
      dest.innerHTML = html;
    }
  }


  async function download(url, dflt) {
    const resp = await win.fetch(url);
    if (!resp.ok) { return dflt; }
    return resp.text();
  }


  function saveHtml() {
    const mgElem = doc.forms.mgr.elements;
    const pageHTML = mgElem.nice_html.value;
    if (!pageHTML) { throw new Error('Empty pageHTML'); }
    const blobUrl = win.URL.createObjectURL(new win.Blob([pageHTML],
      { type: 'application/octet-stream' }));
    const dlLink = mgElem.save_html.nextSibling;
    dlLink.href = blobUrl;
    dlLink.download = 'web2lead-' + unixtime() + '.html';
    dlLink.click();
    win.URL.revokeObjectURL(blobUrl);
  }


  function addTextAreaClearer(formElems, fieldName) {
    const field = formElems[fieldName];
    function clearTextArea() {
      field.value = '';
      field.focus();
    };
    const elem = formElems['clear_' + fieldName];
    elem.onclick = clearTextArea;
  }


  async function init() {
    const mgForm = doc.forms.mgr;
    const mgElem = mgForm.elements;
    mgForm.onreset = () => mgElem.orig_html.focus();
    doc.selfHtml = await download('?download-self', 'self-downoad failed');
    const cacheBuster = '?refresh=' + unixtime();
    mgElem.orig_html.value = await download('origform.html' + cacheBuster, '');
    mgElem.config.value = await download('config.txt' + cacheBuster, '');
    mgElem.refine.onclick = tryRefine;
    mgElem.save_html.onclick = saveHtml;
    addTextAreaClearer(mgElem, 'orig_html');
    addTextAreaClearer(mgElem, 'config');
    tryRefine();

    const waitLoad = doc.getElementById('loading-wait-plz');
    waitLoad.parentNode.removeChild(waitLoad);
  }


  init();
}());
