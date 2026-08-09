const ICONS = {
  protein: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v3l2 3v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9l2-3V3Zm1.5 7.5h7M9 14h6M9 17h4"/></svg>',
  plate: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M12 12h8"/></svg>',
  cut: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M7 6l1 14h8l1-14M9 10h6M10 14h4"/></svg>',
  food: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20V9M5 4v4a2 2 0 0 0 4 0V4M17 20V4c-3 2-4 5-4 8h4"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
};

const foods = [
  ['Potatoes','High volume'],['Greek yogurt','Protein-rich'],['Eggs','Protein + nutrients'],['Berries','Fibre + volume'],
  ['Vegetables','Very high volume'],['Oats','Fibre-rich'],['Beans & lentils','Protein + fibre'],['Broth-based soup','Water + volume']
];

function card(icon, title, text) {
  return `<article class="nutrition-guide-card"><span class="nutrition-guide-icon">${icon}</span><div><h3>${title}</h3><p>${text}</p></div></article>`;
}

function markup() {
  return `
    <section class="nutrition-guide-v2" data-nutrition-guidance-v2>
      <header class="nutrition-guide-hero">
        <span class="eyebrow">LEVEL UP NUTRITION</span>
        <h2>Eat to support your training.</h2>
        <p>Keep nutrition practical: get enough protein, build most meals from nutrient-dense foods, and adjust total calories to match your goal.</p>
        <div class="nutrition-rule-strip">
          <span>Protein at meals</span><span>Mostly whole foods</span><span>Fruit & vegetables</span><span>Carbs fuel training</span><span>Include dietary fat</span>
        </div>
      </header>

      <section class="nutrition-guide-grid">
        ${card(ICONS.protein,'Prioritize protein','Protein provides the amino acids used to repair and build muscle. For adults who resistance train, a practical daily target is often around 1.6 g/kg, with individual needs varying. Spread protein across meals rather than relying on one very large serving.')}
        ${card(ICONS.plate,'Build the rest of the plate','After protein, include carbohydrate foods to support training and recovery, plus fruits and vegetables for fibre and micronutrients. Dietary fat is essential too; avoid driving it extremely low. Your calorie target still determines whether body weight tends to rise, fall or remain stable.')}
        ${card(ICONS.cut,'When cutting','Keep the calorie deficit reasonable and make each calorie work harder. Lean protein, vegetables, fruit, potatoes, oats, beans, yogurt and other filling foods can make a lower-calorie intake easier to sustain. Hunger is information—not a contest to ignore.')}
        ${card(ICONS.food,'Whole foods first','Build most meals around minimally processed foods you enjoy. They often provide more protein, fibre, water and micronutrients per calorie. Flexible foods can still fit; consistency matters more than trying to eat perfectly.')}
      </section>

      <section class="satiety-card">
        <div class="satiety-heading"><div><span class="eyebrow">CUT SMARTER</span><h2>High-satiety food picks</h2><p>Useful options when you want meals that provide plenty of food volume, protein or fibre for their calories.</p></div><span class="satiety-mark">${ICONS.food}</span></div>
        <div class="satiety-food-grid">
          ${foods.map(([name,why]) => `<div class="satiety-food"><span>${ICONS.check}</span><div><strong>${name}</strong><small>${why}</small></div></div>`).join('')}
        </div>
        <p class="satiety-note">No single food guarantees fullness. Combine protein, fibre, food volume and foods you genuinely enjoy.</p>
      </section>

      <section class="nutrition-principles">
        <span class="eyebrow">SIMPLE RULES</span><h2>What matters most</h2>
        <div class="nutrition-principle-list">
          <div><strong>1</strong><p><b>Calories set the direction.</b> Your overall energy intake is the main nutritional driver of weight gain or loss.</p></div>
          <div><strong>2</strong><p><b>Protein supports muscle.</b> Pair adequate protein with progressive resistance training.</p></div>
          <div><strong>3</strong><p><b>Carbs are useful fuel.</b> They can support hard training and do not need to be avoided.</p></div>
          <div><strong>4</strong><p><b>Keep enough fat.</b> Include sources such as nuts, seeds, olive oil, avocado, eggs and fatty fish.</p></div>
          <div><strong>5</strong><p><b>Choose sustainable foods.</b> A plan you can repeat is more useful than a theoretically perfect diet you dislike.</p></div>
        </div>
      </section>
    </section>`;
}

function upgradeNutrition() {
  const page = document.querySelector('.nutrition-page');
  if (!page || page.querySelector('[data-nutrition-guidance-v2]')) return;
  const tools = [...page.querySelectorAll(':scope > [data-more-tool]')];
  const mainNodes = [...page.children].filter(node => !node.hasAttribute('data-more-tool'));
  if (!mainNodes.length) return;
  mainNodes.forEach(node => node.remove());
  const holder = document.createElement('div');
  holder.innerHTML = markup();
  page.insertBefore(holder.firstElementChild, tools[0] || null);
}

const observer = new MutationObserver(() => upgradeNutrition());
observer.observe(document.body, {childList:true, subtree:true});
upgradeNutrition();