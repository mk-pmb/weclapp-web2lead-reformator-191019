// -*- coding: utf-8, tab-width: 2 -*-
(function setup() {
  const win = window; // eslint-disable-line no-undef
  const doc = win.document;

  function ifDef(x, u) { return (x === undefined ? u : x); }
  function unixtime() { return Math.floor(Date.now() / 1e3); }

  function parseAttr(tag) {
    const attr = {};
    function save(m, k, v) {
      if (attr[k] !== undefined) { return m; }
      attr[k] = ifDef(v, true);
      return '';
    }
    const unparsed = tag.replace(/^<\w+(?=\s+)/, '')
      .replace(/\s+$/, '').replace(/\s*>$/, '')
      .replace(/\s+(\w+)(?:="([\w\-]+)"|)/g, save);
    if (unparsed) {
      const e = ('Unparsed attributes:\n[[' + unparsed
        + ']]\nin\n[[' + tag + ']]');
      throw new Error(e);
      // return { ERROR: e };
    }
    return attr;
  }


  function fixSelects(selHtml) {
    const optVals = selHtml.replace(/\s*<\/(option|select)>\s*/g, ''
    ).split(/<option/);
    const selOpt = parseAttr(optVals.shift());
    const allowMulti = selOpt.multiple;
    if (!allowMulti) {
      const sz = Math.min(Math.max(optVals.length + 1, 3), 10);
      return selHtml.replace(/>/, ' size=' + sz + '>');
    }
    function renderOpt(opt, idx) {
      const m = fixSelects.optRgx.exec(opt);
      if (!m) {
        const e = ('Unsupported option syntax for ' + selOpt.name + ': ' + opt);
        throw new Error(e);
      }
      let first = '';
      if (!idx) {
        if (selOpt.id) { first += ' id="' + selOpt.id + '"'; }
        if (!allowMulti) { first += ' checked'; }
      }
      const h = ('    <label><input'
        + ' type="' + (allowMulti ? 'checkbox' : 'radio') + '"'
        + ' name="' + selOpt.name + '"'
        + ' value="' + ifDef(m[1], m[2]).replace(/"/g, '&quot;') + '"'
        + first + '> ' + m[2] + '</label>');
      return h;
    }
    return [
      ('<div class="ff-select ff-select-' + (allowMulti ? 'multi' : 'one')
        + '">'),
      ...optVals.map(renderOpt),
      '  <div class="unfloat"></div>',
      '  </div>',
    ].join('\n');
  }
  fixSelects.selRgx = /<select [^<>]+>(?:[^<]|<\/?option\b)+<\/select>/g;
  fixSelects.optRgx = /^\s*(?:value="([^<>&"]+)"|)>([^<>]+)$/;


  function refineCore(orig) {
    const formHTML = (orig
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
      .replace(fixSelects.selRgx, fixSelects)
    );
    const tmpl = doc.selfHtml.split(/<!-- ##cut## -->/);
    const pageHTML = tmpl[0] + formHTML + tmpl[2];
    return pageHTML;
  }


  function tryRefine() {
    const sourceMode = false;
    const mgElem = doc.forms.mgr.elements;
    let html;
    try {
      html = refineCore(mgElem.orig_html.value);
    } catch (err) {
      html = String(err);
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


  async function init() {
    const mgForm = doc.forms.mgr;
    const mgElem = mgForm.elements;
    mgForm.onreset = () => mgElem.orig_html.focus();
    doc.selfHtml = await download('?download-self', 'self-downoad failed');
    mgElem.orig_html.value = await download('origform.utf8.html', '');
    mgElem.refine.onclick = tryRefine;
    mgElem.save_html.onclick = saveHtml;
    tryRefine();

    const waitLoad = doc.getElementById('loading-wait-plz');
    waitLoad.parentNode.removeChild(waitLoad);
  }

  init();
}());
