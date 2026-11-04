// Demonstration slide page (Batch 750). Reads ?slide=<slide identifier>, looks it up in manifest.json next to this page,
// and draws that slide's Deep Zoom tiles with OpenSeadragon, with its source and licence. Only identifiers listed in the
// manifest are shown; everything from the address or the manifest is written as text, never as markup.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const say = (text) => { $('message').textContent = text; };
  const slideId = (new URLSearchParams(window.location.search).get('slide') || '').trim();
  $('slide-id').textContent = slideId ? 'Slide ' + slideId : '';

  function credit(entry) {
    $('credit-source').textContent = 'Source: ' + (entry.source || 'not recorded');
    const licence = $('credit-licence');
    licence.textContent = 'Licence: ';
    if (entry.licenceUrl && /^https:\/\//.test(entry.licenceUrl)) {
      const a = document.createElement('a');
      a.href = entry.licenceUrl; a.rel = 'noopener noreferrer'; a.target = '_blank';
      a.textContent = entry.licence || entry.licenceUrl;
      licence.appendChild(a);
    } else {
      licence.appendChild(document.createTextNode(entry.licence || 'not recorded'));
    }
    $('credit-note').textContent = entry.note || '';
  }

  fetch('manifest.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); })
    .then((manifest) => {
      const slides = (manifest && manifest.slides) || {};
      if (!slideId) { say('No slide was named in the address.'); return; }
      if (!Object.prototype.hasOwnProperty.call(slides, slideId)) { say('There is no demonstration image for this slide.'); return; }
      const entry = slides[slideId];
      $('slide-title').textContent = entry.title || 'Demonstration slide';
      document.title = (entry.title || 'Demonstration slide') + ' (demonstration only)';
      credit(entry);
      if (!entry.dzi || /^[a-z]+:/i.test(entry.dzi) || entry.dzi.includes('..')) { say('This slide has no tiles listed.'); return; }
      if (typeof OpenSeadragon !== 'function') { say('The image library did not load. Check the connection and reload.'); return; }
      OpenSeadragon({
        id: 'viewer',
        prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
        tileSources: entry.dzi,
        showNavigator: true,
        crossOriginPolicy: 'Anonymous',
      }).addHandler('open-failed', () => say('The tiles for this slide could not be loaded.'));
    })
    .catch(() => say('The list of demonstration images could not be loaded.'));
})();
