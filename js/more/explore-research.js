const SAVED_KEY = "level_up_saved_research_v1";
const CACHE_KEY = "level_up_research_feed_v1";
const CACHE_MAX_AGE = 6 * 60 * 60 * 1000;
const EUROPE_PMC_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=%28TITLE_ABS%3A%22resistance%20training%22%20OR%20TITLE_ABS%3A%22muscle%20hypertrophy%22%29%20AND%20%28TITLE_ABS%3Amuscle%20OR%20TITLE_ABS%3Aprotein%20OR%20TITLE_ABS%3Acreatine%20OR%20TITLE_ABS%3Anutrition%29%20AND%20FIRST_PDATE%3A%5B2025-01-01%20TO%202026-12-31%5D%20AND%20LANG%3Aeng&format=json&resultType=core&pageSize=24";

const SITE_IMAGES = {
  male: "https://images.pexels.com/photos/1547248/pexels-photo-1547248.jpeg?auto=compress&cs=tinysrgb&w=1400",
  female: "https://images.pexels.com/photos/29825216/pexels-photo-29825216.jpeg?auto=compress&cs=tinysrgb&w=1200",
  training: "https://images.pexels.com/photos/32172866/pexels-photo-32172866.jpeg?auto=compress&cs=tinysrgb&w=1400"
};

const CURATED = [
  {
    id: "volume-frequency-2026", topic: "Training Volume", tags: ["Muscle Growth", "Training Volume"], featured: true,
    title: "More weekly sets can produce more growth—but with diminishing returns",
    paperTitle: "The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains",
    authors: "Pelland et al.", date: "February 2026", journal: "Sports Medicine", studyType: "Meta-analysis", evidence: "High", tone: "high",
    sample: "67 studies · 2,058 participants", image: SITE_IMAGES.male, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41343037/", pmid: "41343037",
    summary: "Across 67 studies, higher weekly training volume was associated with greater hypertrophy and strength gains, although the expected benefit became smaller as volume increased.",
    bottomLine: "Volume matters, but each additional set is likely to contribute less than the one before it.",
    studied: "The authors modelled weekly resistance-training volume and frequency against changes in muscle size and strength. Direct and indirect sets were counted separately.",
    found: "Hypertrophy and strength tended to improve as weekly volume increased. Frequency showed a clearer relationship with strength than hypertrophy when volume was considered.",
    practical: "Use enough weekly sets to create progress, then add volume only when performance and recovery support it. The study does not identify one perfect set target for everyone.",
    limitations: "Most participants were young adults and approximately four in five were male. Meta-regression can describe dose-response patterns but cannot guarantee the same response for every individual."
  },
  {
    id: "acsm-position-2026", topic: "Muscle Growth", tags: ["Muscle Growth", "Evidence Guide"],
    title: "ACSM updates its resistance-training position stand",
    paperTitle: "American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults",
    authors: "Currier et al.", date: "April 2026", journal: "Medicine & Science in Sports & Exercise", studyType: "Position stand", evidence: "High", tone: "high",
    sample: "Overview of systematic reviews", image: SITE_IMAGES.female, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41843416/", pmid: "41843416",
    summary: "The new position stand synthesizes the resistance-training evidence for strength, hypertrophy and physical performance, emphasizing consistent training and goal-specific programming over rigid universal rules.",
    bottomLine: "A sound program is consistent, progressive and adjusted to the individual—not built around one supposedly mandatory method.",
    studied: "An expert group reviewed the accumulated systematic-review evidence on resistance-training prescription in healthy adults.",
    found: "Multiple loading and programming approaches can work. The most useful choices depend on the outcome, the trainee and whether the program can be performed consistently.",
    practical: "Treat programming variables as tools. Start with a sustainable plan, track progress and make targeted changes when the data justify them.",
    limitations: "A position stand summarizes a broad evidence base and is not a personalized prescription. Individual medical or rehabilitation needs require qualified care."
  },
  {
    id: "carbohydrate-hypertrophy-2026", topic: "Nutrition", tags: ["Nutrition", "Carbohydrates"],
    title: "Higher carbohydrate intake may not independently increase hypertrophy",
    paperTitle: "The Effect of Carbohydrate Intake on Muscle Hypertrophy: A Systematic Review and Meta-Analysis",
    authors: "Henselmans et al.", date: "2026", journal: "Sports Medicine", studyType: "Systematic review", evidence: "Low certainty", tone: "caution",
    sample: "11 studies", image: SITE_IMAGES.training, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41712097/", pmid: "41712097",
    summary: "The pooled analysis did not find a significant independent hypertrophy benefit from higher carbohydrate intake, but the certainty of evidence was low.",
    bottomLine: "Carbohydrates can support training performance, but eating more carbohydrate alone has not been shown to guarantee more muscle growth.",
    studied: "Eleven studies comparing different carbohydrate intakes were reviewed, including analyses limited to calorie-matched trials and direct muscle-size measurements.",
    found: "Higher carbohydrate intake was not associated with a statistically significant independent increase in hypertrophy across the pooled studies.",
    practical: "Set carbohydrates around calorie needs, training performance and preference. Do not interpret this as evidence that carbohydrates are unimportant for hard training.",
    limitations: "The evidence was rated low certainty because of imprecision, moderate risk of bias and a small number of tightly controlled trials."
  },
  {
    id: "creatine-experience-2025", topic: "Supplements", tags: ["Supplements", "Creatine"],
    title: "Creatine benefits were seen in novice and experienced lifters",
    paperTitle: "Creatine Supplementation and Resistance Training: A Comparison Between Novice and Experienced Lifters",
    authors: "Ashtary-Larky et al.", date: "2025", journal: "Journal of the International Society of Sports Nutrition", studyType: "Systematic review", evidence: "Moderate", tone: "moderate",
    sample: "61 controlled trials", image: SITE_IMAGES.female, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41433021/", pmid: "41433021",
    summary: "Across 61 trials, creatine combined with resistance training increased fat-free mass compared with control conditions in both novice and experienced lifters.",
    bottomLine: "Prior training experience did not remove the potential body-composition benefit of creatine supplementation.",
    studied: "Controlled trials combining creatine with resistance training were pooled, with additional comparisons between trained and untrained participants.",
    found: "Creatine increased fat-free mass by about 1.39 kg on average. Experienced lifters showed numerically larger gains, but the difference between experience groups was not statistically significant.",
    practical: "Creatine monohydrate remains a well-supported option for suitable adults. Changes in fat-free mass can include water as well as muscle tissue.",
    limitations: "Trials varied in dose, duration, training programs and body-composition methods. The trained-versus-untrained difference was uncertain."
  },
  {
    id: "superset-review-2025", topic: "Training Methods", tags: ["Training Methods", "Supersets"],
    title: "Supersets appear useful when training time is limited",
    paperTitle: "Superset Versus Traditional Resistance Training Prescriptions: A Systematic Review and Meta-Analysis",
    authors: "Zhang et al.", date: "2025", journal: "Sports Medicine", studyType: "Systematic review", evidence: "Moderate", tone: "moderate",
    sample: "Resistance-training studies", image: SITE_IMAGES.training, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/39903375/", pmid: "39903375",
    summary: "Superset training reduced session duration without clearly compromising training volume or longer-term adaptations compared with traditional set structures.",
    bottomLine: "Supersets can make training more time-efficient, but exercise pairing and fatigue still matter.",
    studied: "The review compared superset configurations with traditional resistance-training prescriptions across acute and longitudinal studies.",
    found: "Supersets generally shortened sessions while maintaining training volume and muscle activation. Longer-term outcomes did not clearly favour one structure.",
    practical: "Pair exercises that do not excessively interfere with one another, especially when performance on a priority lift matters.",
    limitations: "Superset types and study protocols varied, and the available long-term hypertrophy evidence remains smaller than the acute performance literature."
  }
];

const GUIDES = [
  { ...CURATED[0], id: "guide-volume", topic: "Evidence Guides", guide: true, title: "How to think about weekly training volume", date: "Evidence guide" },
  { ...CURATED[2], id: "guide-carbs", topic: "Evidence Guides", guide: true, title: "Carbohydrates, performance and muscle growth", date: "Evidence guide" },
  { ...CURATED[3], id: "guide-creatine", topic: "Evidence Guides", guide: true, title: "Creatine: what the current evidence supports", date: "Evidence guide" }
];

let activeTab = "new";
let activeTopic = "All";
let liveArticles = [];
let feedStatus = "Checking for newly indexed literature…";

const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const stripHtml = value => String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const clip = (value, limit = 220) => { const text = stripHtml(value); return text.length > limit ? `${text.slice(0, limit).replace(/\s+\S*$/, "")}…` : text; };

function getSaved() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")); } catch { return new Set(); }
}

function setSaved(saved) { localStorage.setItem(SAVED_KEY, JSON.stringify([...saved])); }

function classifyTopic(title) {
  const value = String(title || "").toLowerCase();
  if (/creatine|supplement/.test(value)) return "Supplements";
  if (/protein|carbohydrate|diet|nutrition|energy/.test(value)) return "Nutrition";
  if (/volume|frequency|set/.test(value)) return "Training Volume";
  if (/superset|drop set|failure|training system/.test(value)) return "Training Methods";
  return "Muscle Growth";
}

function normalizeLive(record) {
  const source = record.source || "MED";
  const id = record.id || record.pmid || record.doi;
  const types = record.pubTypeList?.pubType || [];
  const studyType = types.find(type => /meta|systematic|random|review|trial/i.test(type)) || types[0] || "New publication";
  const abstract = clip(record.abstractText || "A new publication has been indexed. Open the source to review the abstract and full study details.", 260);
  return {
    id: `live-${source}-${id}`, live: true, topic: classifyTopic(record.title), tags: [classifyTopic(record.title), "Newly indexed"],
    title: record.title || "New resistance-training research", paperTitle: record.title || "New resistance-training research",
    authors: record.authorString || "Authors listed at source", date: record.firstPublicationDate || record.journalInfo?.printPublicationDate || record.pubYear || "Recently indexed",
    journal: record.journalTitle || record.journalInfo?.journal?.title || "Journal record", studyType, evidence: "Not yet reviewed", tone: "unreviewed",
    sample: "Automated literature feed", image: SITE_IMAGES.male, sourceUrl: `https://europepmc.org/article/${encodeURIComponent(source)}/${encodeURIComponent(id)}`,
    summary: abstract, bottomLine: "Level Up has not yet completed an editorial review of this paper.",
    studied: abstract, found: "Open the publication record to review the authors’ complete abstract and reported results.",
    practical: "Do not change training or nutrition from one unreviewed feed item. Compare it with the wider evidence base.",
    limitations: "This entry was imported from publication metadata and has not been independently checked against the full paper."
  };
}

async function fetchLiveArticles() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached?.savedAt && Date.now() - cached.savedAt < CACHE_MAX_AGE && Array.isArray(cached.articles)) return cached.articles;
  } catch { /* Fetch a fresh copy. */ }
  const response = await fetch(EUROPE_PMC_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Literature feed returned ${response.status}`);
  const payload = await response.json();
  const curatedPmids = new Set(CURATED.map(item => item.pmid).filter(Boolean));
  const articles = (payload.resultList?.result || []).filter(record => !curatedPmids.has(record.pmid)).map(normalizeLive).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);
  localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), articles }));
  return articles;
}

function allArticles() { return [...CURATED, ...liveArticles, ...GUIDES]; }
function articleById(id) { return allArticles().find(article => article.id === id); }

function evidenceBadge(article) {
  return `<span class="explore-evidence is-${escapeHtml(article.tone)}"><i></i>${escapeHtml(article.evidence)}</span>`;
}

function renderResearchCard(article, saved) {
  return `<article class="explore-study-card${article.featured ? " is-featured" : ""}" data-explore-topic-value="${escapeHtml(article.topic)}">
    <button class="explore-study-image" type="button" data-explore-open="${escapeHtml(article.id)}" style="--study-image:url('${escapeHtml(article.image)}')" aria-label="Read ${escapeHtml(article.title)}"><span>${escapeHtml(article.topic)}</span></button>
    <div class="explore-study-body"><div class="explore-study-meta">${evidenceBadge(article)}<span>${escapeHtml(article.studyType)}</span><span>${escapeHtml(article.date)}</span></div>
    <button class="explore-study-title" type="button" data-explore-open="${escapeHtml(article.id)}"><strong>${escapeHtml(article.title)}</strong></button>
    <p>${escapeHtml(article.summary)}</p><div class="explore-study-footer"><span>${escapeHtml(article.authors)}</span><button class="explore-save${saved.has(article.id) ? " is-saved" : ""}" type="button" data-explore-save="${escapeHtml(article.id)}" aria-label="${saved.has(article.id) ? "Remove from saved research" : "Save research"}">${saved.has(article.id) ? "Saved" : "Save"}</button></div></div>
  </article>`;
}

function visibleArticles() {
  const saved = getSaved();
  let source = activeTab === "guides" ? GUIDES : activeTab === "saved" ? allArticles().filter(article => saved.has(article.id)) : [...CURATED, ...liveArticles];
  if (activeTopic !== "All") source = source.filter(article => article.topic === activeTopic || article.tags?.includes(activeTopic));
  return source;
}

function renderFeed() {
  const target = document.querySelector("[data-explore-feed]");
  if (!target) return;
  const saved = getSaved();
  const articles = visibleArticles();
  target.innerHTML = articles.length ? articles.map(article => renderResearchCard(article, saved)).join("") : `<div class="explore-empty"><strong>${activeTab === "saved" ? "No saved research yet" : "No articles in this filter"}</strong><p>${activeTab === "saved" ? "Tap Save on any research card to build your reading list." : "Choose another topic to continue exploring."}</p></div>`;
  const status = document.querySelector("[data-explore-feed-status]");
  if (status) status.textContent = activeTab === "new" ? feedStatus : activeTab === "guides" ? "Level Up explainers grounded in the wider evidence base." : `${articles.length} saved item${articles.length === 1 ? "" : "s"}.`;
  document.querySelectorAll("[data-explore-tab]").forEach(button => button.classList.toggle("active", button.dataset.exploreTab === activeTab));
  document.querySelectorAll("[data-explore-topic]").forEach(button => button.classList.toggle("active", button.dataset.exploreTopic === activeTopic));
}

function renderExplorePage() {
  const topics = ["All", "Muscle Growth", "Training Volume", "Training Methods", "Nutrition", "Supplements"];
  return `<section class="explore-page">
    <header class="explore-hero" style="--explore-hero:url('${SITE_IMAGES.male}')"><div class="explore-hero-shade"></div><div class="explore-hero-content"><button class="explore-back" type="button" data-explore-back>← More</button><span class="eyebrow">LEVEL UP · RESEARCH</span><h1>Train with the evidence.</h1><p>New muscle-growth and nutrition research, translated into useful context without turning one paper into a rule.</p><div class="explore-hero-facts"><span><b>Reviewed</b> evidence labels</span><span><b>Direct</b> study links</span><span><b>Saved</b> reading list</span></div></div></header>
    <nav class="explore-tabs" aria-label="Explore sections"><button class="active" type="button" data-explore-tab="new">New Research</button><button type="button" data-explore-tab="guides">Evidence Guides</button><button type="button" data-explore-tab="saved">Saved</button></nav>
    <section class="explore-intro"><div><span class="eyebrow">CURRENT LITERATURE</span><h2>What’s worth knowing now</h2></div><p>Prioritized toward systematic reviews, meta-analyses, position stands and controlled human research.</p></section>
    <div class="explore-topics" aria-label="Filter by topic">${topics.map(topic => `<button class="${topic === activeTopic ? "active" : ""}" type="button" data-explore-topic="${escapeHtml(topic)}">${escapeHtml(topic)}</button>`).join("")}</div>
    <div class="explore-feed-heading"><strong>${activeTab === "new" ? "Latest research" : activeTab === "guides" ? "Evidence guides" : "Saved research"}</strong><span data-explore-feed-status>${escapeHtml(feedStatus)}</span></div>
    <section class="explore-feed" data-explore-feed></section>
    <aside class="explore-method"><span>HOW LEVEL UP HANDLES RESEARCH</span><h3>New does not automatically mean better.</h3><p>Reviewed cards separate findings from practical interpretation and limitations. Automatically indexed publications remain marked as unreviewed until they receive an editorial check.</p></aside>
  </section>`;
}

function renderStudyDetail(article) {
  const saved = getSaved();
  const sections = [["What was studied", article.studied], ["What the researchers found", article.found], ["What it may mean in practice", article.practical], ["Important limitations", article.limitations]];
  return `<article class="explore-detail"><header class="explore-detail-hero" style="--explore-hero:url('${escapeHtml(article.image)}')"><div class="explore-hero-shade"></div><div><button class="explore-back" type="button" data-explore-detail-back>← Explore</button><span class="eyebrow">${escapeHtml(article.topic)}</span><h1>${escapeHtml(article.title)}</h1><div class="explore-study-meta">${evidenceBadge(article)}<span>${escapeHtml(article.studyType)}</span><span>${escapeHtml(article.date)}</span></div></div></header>
    <section class="explore-detail-summary"><span>THE BOTTOM LINE</span><h2>${escapeHtml(article.bottomLine)}</h2><p>${escapeHtml(article.summary)}</p></section>
    <section class="explore-detail-grid">${sections.map(([title, body], index) => `<section><b>0${index + 1}</b><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div></section>`).join("")}</section>
    <section class="explore-citation"><div><span>ORIGINAL PUBLICATION</span><strong>${escapeHtml(article.paperTitle)}</strong><small>${escapeHtml(article.authors)} · ${escapeHtml(article.journal)}${article.pmid ? ` · PMID ${escapeHtml(article.pmid)}` : ""}</small></div><div class="explore-citation-actions"><button class="explore-save${saved.has(article.id) ? " is-saved" : ""}" type="button" data-explore-save="${escapeHtml(article.id)}">${saved.has(article.id) ? "Saved" : "Save"}</button><a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">View study ↗</a></div></section>
    <p class="explore-disclaimer">Educational information only. Research summaries do not replace individualized medical, nutrition or training advice.</p></article>`;
}

function bindExploreEvents(content) {
  content.querySelector("[data-explore-back]")?.addEventListener("click", () => document.querySelector('.nav-btn[data-page="more"]')?.click());
  content.querySelectorAll("[data-explore-tab]").forEach(button => button.addEventListener("click", () => { activeTab = button.dataset.exploreTab; activeTopic = "All"; renderFeed(); }));
  content.querySelectorAll("[data-explore-topic]").forEach(button => button.addEventListener("click", () => { activeTopic = button.dataset.exploreTopic; renderFeed(); }));
  content.querySelector("[data-explore-feed]")?.addEventListener("click", handleExploreClick);
}

function handleExploreClick(event) {
  const saveButton = event.target.closest("[data-explore-save]");
  if (saveButton) { toggleSaved(saveButton.dataset.exploreSave); renderFeed(); return; }
  const openButton = event.target.closest("[data-explore-open]");
  if (openButton) openStudy(openButton.dataset.exploreOpen);
}

function toggleSaved(id) {
  const saved = getSaved();
  saved.has(id) ? saved.delete(id) : saved.add(id);
  setSaved(saved);
}

function openStudy(id) {
  const article = articleById(id);
  const content = document.getElementById("content");
  if (!article || !content) return;
  content.innerHTML = renderStudyDetail(article);
  content.querySelector("[data-explore-detail-back]")?.addEventListener("click", openExploreResearch);
  content.querySelector("[data-explore-save]")?.addEventListener("click", event => { toggleSaved(id); event.currentTarget.textContent = getSaved().has(id) ? "Saved" : "Save"; event.currentTarget.classList.toggle("is-saved", getSaved().has(id)); });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function openExploreResearch() {
  const content = document.getElementById("content");
  if (!content) return;
  content.innerHTML = renderExplorePage();
  bindExploreEvents(content);
  renderFeed();
  window.scrollTo({ top: 0, behavior: "smooth" });
  fetchLiveArticles().then(articles => {
    liveArticles = articles;
    feedStatus = articles.length ? `${articles.length} newly indexed publications added from Europe PMC.` : "Curated research is up to date.";
    if (document.querySelector(".explore-page")) renderFeed();
  }).catch(() => {
    feedStatus = "Curated research is available. Live literature refresh is temporarily unavailable.";
    if (document.querySelector(".explore-page")) renderFeed();
  });
}

function ensureDashboardEntry() {
  const content = document.getElementById("content");
  if (!content?.classList.contains("dashboard-command-center") || content.querySelector("[data-dashboard-explore-research]")) return;
  const anchor = content.querySelector(".dashboard-command-today, .dashboard-command-weekly");
  if (!anchor) return;
  const card = document.createElement("button");
  card.type = "button";
  card.className = "dashboard-explore-research";
  card.dataset.dashboardExploreResearch = "";
  card.style.setProperty("--explore-hero", `url('${SITE_IMAGES.training}')`);
  card.innerHTML = `<span class="dashboard-explore-shade"></span><span class="dashboard-explore-copy"><small>NEW IN RESEARCH</small><strong>Training volume has diminishing returns.</strong><em>Read the latest evidence summary</em></span><b aria-hidden="true">›</b>`;
  card.addEventListener("click", openExploreResearch);
  anchor.insertAdjacentElement("afterend", card);
}

new MutationObserver(ensureDashboardEntry).observe(document.body, { childList: true, subtree: true });
document.addEventListener("click", event => {
  if (event.target.closest("[data-dashboard-explore-research]")) openExploreResearch();
});
setTimeout(ensureDashboardEntry, 0);
