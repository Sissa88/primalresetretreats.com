'use strict';
const storageKey = 'primal-reset-inquiries-v1';
for (const form of document.querySelectorAll('form')) {
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.className = 'form-status';
  const note = document.createElement('p');
  note.className = 'form-note';
  note.textContent = 'Local preview: this form saves only in this browser. It does not email the retreat team. You can download or delete your saved inquiry below. Avoid including sensitive health information.';
  form.append(note, status);
  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const download = document.createElement('button');
  download.type = 'button'; download.textContent = 'Download saved inquiries';
  const clear = document.createElement('button');
  clear.type = 'button'; clear.textContent = 'Delete saved inquiries';
  actions.append(download, clear); form.append(actions);
  const kind = form.dataset.kind || 'retreat';
  const read = () => {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(data)) throw new Error('Invalid saved data');
    return data;
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      const entry = Object.fromEntries(new FormData(form));
      if (!String(entry.name || '').trim()) {
        status.textContent = 'Please enter your name.'; form.elements.name.focus(); return;
      }
      for (const key of Object.keys(entry)) entry[key] = String(entry[key]).trim();
      const entries = read();
      entries.push({ ...entry, kind, savedAt: new Date().toISOString() });
      localStorage.setItem(storageKey, JSON.stringify(entries));
      status.textContent = 'Saved on this device. Nothing has been sent. Download your inquiry below to keep a copy.';
      form.reset();
    } catch {
      status.textContent = 'Your inquiry could not be saved. Check that browser storage is enabled and try again. Your form has been kept.';
    }
  });
  download.addEventListener('click', () => {
    try {
      const entries = read().filter(entry => entry.kind === kind);
      if (!entries.length) { status.textContent = 'There are no saved inquiries of this type.'; return; }
      const url = URL.createObjectURL(new Blob([JSON.stringify(entries, null, 2)], {type:'application/json'}));
      const link = document.createElement('a'); link.href = url; link.download = `primal-reset-${kind}-inquiries.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = 'Your saved inquiries have been downloaded.';
    } catch { status.textContent = 'Saved inquiries could not be read from this browser.'; }
  });
  clear.addEventListener('click', () => {
    try {
      const entries = read().filter(entry => entry.kind !== kind);
      localStorage.setItem(storageKey, JSON.stringify(entries));
      status.textContent = 'Saved inquiries of this type have been deleted from this browser.';
    } catch { status.textContent = 'Browser storage could not be updated.'; }
  });
}
for (const header of document.querySelectorAll('header')) {
  const menu = document.createElement('details'); menu.className = 'local-menu';
  const summary = document.createElement('summary'); summary.textContent = 'Menu'; menu.append(summary);
  const nav = document.createElement('nav'); nav.setAttribute('aria-label','All pages');
  for (const [label, href] of [['Home','/'],["The Men’s Rebirth",'/retreats/mens-rebirth/'],['Coach with us','/coach-with-us/'],['Inquire','/#inquire']]) {
    const a = document.createElement('a'); a.textContent = label; a.href = href; nav.append(a);
  }
  menu.append(nav); header.append(menu);
  nav.addEventListener('click', () => { menu.open = false; });
}
const skip = document.createElement('a'); skip.href = '#main-content'; skip.className = 'skip-link'; skip.textContent = 'Skip to content';
const main = document.querySelector('main');
if (main) { main.id = 'main-content'; main.tabIndex = -1; document.body.prepend(skip); }
