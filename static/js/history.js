(function () {
  const listEl = document.getElementById('history-list');

  function formatDate(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function labeledBlock(labelText, contentEl) {
    const block = document.createElement('div');
    block.className = 'history-block';
    const label = document.createElement('div');
    label.className = 'history-block-label';
    label.textContent = labelText;
    block.appendChild(label);
    block.appendChild(contentEl);
    return block;
  }

  function renderEntry(entry) {
    const wrapper = document.createElement('div');
    wrapper.className = 'history-entry';

    const header = document.createElement('div');
    header.className = 'history-entry-header';

    const typeBadge = document.createElement('span');
    typeBadge.className = `history-type-badge history-type-${entry.type}`;
    typeBadge.textContent = entry.type === 'hairstyle' ? 'Hairstyle Recommendation' : 'Color Analysis';
    header.appendChild(typeBadge);

    const time = document.createElement('span');
    time.className = 'history-entry-time';
    time.textContent = formatDate(entry.createdAt);
    header.appendChild(time);

    wrapper.appendChild(header);

    const body = document.createElement('div');
    body.className = 'history-entry-body';

    if (entry.imageUrl) {
      const img = document.createElement('img');
      img.src = entry.imageUrl;
      img.alt = 'Uploaded photo';
      img.className = 'history-thumb';
      body.appendChild(labeledBlock('Uploaded photo', img));
    }

    if (entry.type === 'color' && entry.color) {
      const swatchRow = document.createElement('div');
      swatchRow.className = 'history-swatch-row';

      const swatch = document.createElement('div');
      swatch.className = 'history-color-swatch';
      swatch.style.backgroundColor = entry.color;
      swatch.title = entry.color;
      swatchRow.appendChild(swatch);

      const label = document.createElement('span');
      label.textContent = entry.color;
      swatchRow.appendChild(label);

      body.appendChild(labeledBlock('Recommended color', swatchRow));
    }

    if (entry.type === 'hairstyle' && entry.hairstyleUrl) {
      const img = document.createElement('img');
      img.src = entry.hairstyleUrl;
      img.alt = 'Recommended hairstyle';
      img.className = 'history-thumb';
      body.appendChild(labeledBlock('Recommended hairstyle', img));
    }

    wrapper.appendChild(body);
    return wrapper;
  }

  fetch('/api/history', { credentials: 'same-origin' })
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load history');
      return res.json();
    })
    .then((data) => {
      listEl.innerHTML = '';
      if (!data.history.length) {
        listEl.innerHTML = '<p>No predictions yet — try the Color or Hairstyle models on the Home page.</p>';
        return;
      }
      data.history.forEach((entry) => listEl.appendChild(renderEntry(entry)));
    })
    .catch(() => {
      listEl.innerHTML = '<p>Error: could not load your history.</p>';
    });
})();
