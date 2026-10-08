const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses = ['Under review', 'Planned', 'In progress', 'Released'];

export function renderFeatureRequests() {
  return `<section class="owner-features" aria-labelledby="owner-features-title">
    <header class="admin-analytics-head"><div><span class="eyebrow">COMMUNITY IDEAS</span><h2 id="owner-features-title">Feature Requests</h2><p>Review new ideas here. Publish a request to show it in the app and open voting.</p></div><button type="button" data-feature-refresh>Refresh requests</button></header>
    <div class="owner-feature-filters" role="group" aria-label="Request visibility"><button type="button" data-feature-view="pending" aria-pressed="true">Awaiting review <span data-feature-count="pending">—</span></button><button type="button" data-feature-view="published" aria-pressed="false">Published <span data-feature-count="published">—</span></button></div>
    <p class="owner-feature-status" data-feature-message role="status"></p>
    <div data-feature-requests aria-busy="true">Loading requests…</div>
    <div class="owner-feature-pages"><button type="button" data-feature-previous disabled>Previous page</button><span data-feature-page></span><button type="button" data-feature-next disabled>Next page</button></div>
  </section>`;
}

export function initializeFeatureRequests(root, api) {
  let view = 'pending', offset = 0, sequence = 0, busy = false, pageHasMore = false;
  const list = root.querySelector('[data-feature-requests]');
  const message = root.querySelector('[data-feature-message]');
  const tell = (text, error = false) => { message.textContent = text; message.classList.toggle('is-error', error); };
  async function load() {
    const current = ++sequence;
    list.setAttribute('aria-busy', 'true');
    root.querySelector('[data-feature-previous]').disabled = true;
    root.querySelector('[data-feature-next]').disabled = true;
    list.textContent = 'Loading requests…';
    try {
      const data = await api(`/v1/features?view=${view}&offset=${offset}`);
      if (!root.isConnected || current !== sequence) return;
      if (!data.admin) throw new Error('Owner authorization required. Sign in with the owner account.');
      // A publication can remove the last request on a page.
      if (!data.requests.length && offset > 0) { offset = Math.max(0, offset - 50); return load(); }
      root.querySelectorAll('[data-feature-count]').forEach(el => { el.textContent = data.counts?.[el.dataset.featureCount] ?? '—'; });
      list.innerHTML = data.requests.map(requestMarkup).join('') || `<p class="owner-feature-empty">${view === 'pending' ? 'No requests awaiting review. New submissions will appear here.' : 'No published requests yet. Publish an idea from Awaiting review to open voting in the app.'}</p>`;
      root.querySelector('[data-feature-page]').textContent = data.requests.length ? `${offset + 1}–${offset + data.requests.length} of ${data.counts[view]}` : '';
      root.querySelector('[data-feature-previous]').disabled = offset === 0;
      pageHasMore = Boolean(data.hasMore);
      root.querySelector('[data-feature-next]').disabled = !pageHasMore;
      list.querySelectorAll('form').forEach(form => form.addEventListener('submit', async event => {
        event.preventDefault();
        if (busy) return;
        busy = true;
        const request = data.requests.find(r => r.id === form.dataset.request);
        const unpublish = event.submitter?.dataset.unpublish === 'true';
        const published = !unpublish;
        const status = form.querySelector('select').value;
        root.querySelectorAll('button').forEach(button => { button.disabled = true; });
        tell('Saving review…');
        try {
          await api(`/v1/features/${encodeURIComponent(request.id)}`, { method: 'PATCH', body: { status, published } });
          if (!root.isConnected) return;
          tell(unpublish ? 'Request is private again. It no longer appears on the public board.' : request.published ? 'Public request status updated.' : 'Published. Everyone can now see this request in More → Help & Support → Request a Feature. Signed-in members can vote.');
          await load();
        } catch (error) { tell(error.message || 'Review could not be saved. Try again.', true); }
        finally { busy = false; if (root.isConnected) { root.querySelectorAll('button:not([data-feature-next]):not([data-feature-previous])').forEach(button => { button.disabled = false; }); root.querySelector('[data-feature-previous]').disabled = offset === 0; root.querySelector('[data-feature-next]').disabled = !pageHasMore; } }
      }));
    } catch (error) {
      if (root.isConnected && current === sequence) { list.textContent = 'Requests could not be loaded. Use Refresh requests to retry.'; tell(error.message || 'Check your connection and try again.', true); }
    } finally { if (current === sequence) list.setAttribute('aria-busy', 'false'); }
  }
  root.querySelectorAll('[data-feature-view]').forEach(button => button.addEventListener('click', () => {
    if (busy) return;
    view = button.dataset.featureView; offset = 0; tell('');
    root.querySelectorAll('[data-feature-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    void load();
  }));
  root.querySelector('[data-feature-refresh]').addEventListener('click', () => { if (!busy) { tell(''); void load(); } });
  root.querySelector('[data-feature-previous]').addEventListener('click', () => { if (!busy) { offset = Math.max(0, offset - 50); void load(); } });
  root.querySelector('[data-feature-next]').addEventListener('click', () => { if (!busy) { offset += 50; void load(); } });
  void load();
}

function requestMarkup(r) {
  const date = new Date(r.created_at);
  return `<article class="owner-feature-card"><div class="owner-feature-card-head"><h3>${escape(r.title)}</h3><span class="owner-feature-badge">${r.published ? 'Public · Voting open' : 'Private · Awaiting review'}</span></div>
    <p class="owner-feature-body">${escape(r.body)}</p>
    <p class="owner-feature-meta">${escape(r.author)} · ${Number.isNaN(date.getTime()) ? '' : escape(date.toLocaleDateString())} · ${Number(r.votes) || 0} votes · ${Number(r.comments) || 0} comments</p>
    <form data-request="${escape(r.id)}"><label>Roadmap status<select>${statuses.map(s => `<option${s === r.status ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
      <p class="owner-feature-help">${r.published ? 'Members see this status on the public board. Unpublishing keeps the request and existing votes, but hides it from other members.' : 'Publishing approves visibility and opens voting. It does not commit you to building this feature.'}</p>
      <div class="owner-feature-actions"><button class="owner-primary" type="submit">${r.published ? 'Save status' : 'Publish & Open Voting'}</button>${r.published ? '<button type="submit" data-unpublish="true">Unpublish</button>' : '<span>Leave it here to keep it private.</span>'}</div>
    </form></article>`;
}
