import BACK_BASE_A from "./recovery-user-back-base-a.js?v=back-user-1";
import BACK_BASE_B from "./recovery-user-back-base-b.js?v=back-user-1";
import BACK_BASE_C from "./recovery-user-back-base-c.js?v=back-user-1";
import BACK_BASE_D from "./recovery-user-back-base-d.js?v=back-user-1";

const BACK_BASE = `data:image/webp;base64,${BACK_BASE_A}${BACK_BASE_B}${BACK_BASE_C}${BACK_BASE_D}`;
const BACK_PATHS = [
  ["Calves", "M325.5 1146.5L349 1119.5H353L379.5 1114.5L389.5 1132L402 1170L413.5 1242.5V1275.5L402 1306L398 1333.5L383.5 1414.5L371 1461.5V1399L383.5 1333.5V1314L371 1306L357.5 1275.5L349 1296L331 1314L337 1353L349 1456.5L343.5 1481.5L331 1474L325.5 1434L314.5 1333.5L307.5 1296L298 1257.5L307.5 1192L325.5 1146.5Z", true],
  ["Calves", "M620 1146L596.5 1119H592.5L566 1114L556 1131.5L543.5 1169.5L532 1242V1275L543.5 1305.5L547.5 1333L562 1414L574.5 1461V1398.5L562 1333V1313.5L574.5 1305.5L588 1275L596.5 1295.5L614.5 1313.5L608.5 1352.5L596.5 1456L602 1481L614.5 1473.5L620 1433.5L631 1333L638 1295.5L647.5 1257L638 1191.5L620 1146Z", true],
  ["Back", "M591.5 581L601 566V577L599 590.5V610L601 628.5L608.5 654.5V672.5L611 687.5L599 679.5L576.5 672.5H561.5L547 677L555 662.5V649L561.5 628.5L572 610L591.5 581Z", true],
  ["Back", "M356.5 581L347 566V577L349 590.5V610L347 628.5L339.5 654.5V672.5L337 687.5L349 679.5L371.5 672.5H386.5L401 677L393 662.5V649L386.5 628.5L376 610L356.5 581Z", true],
  ["Back", "M449.5 534.5L456 513L467 521.5L473.5 527L483 529.5L485.5 521.5L496.5 513V527L502.5 550L523 590.5L536.5 611.5L550 638.5V661L544 677L518 698.5L485.5 728L473.5 750.5L467 737.5L432.5 698.5L398 677V668.5V647L405 626.5L419 605.5L432.5 584L442.5 561L449.5 534.5Z", true],
  ["Back", "M567 334L598.5 315.5V326.5L605 338L623 355.5L648.5 386V393L638.5 442L623 509L605 553L584 587.5L561 618L552.5 639L547.5 622L528 593.5L513 568L503 539L498.5 513V503.5L503 494L520 464L528 446.5L538.5 401L547.5 367.5L552.5 355.5L567 334Z", true],
  ["Back", "M383.5 334.5L352 316V327L345.5 338.5L327.5 356L302 386.5V393.5L312 442.5L327.5 509.5L345.5 553.5L366.5 588L389.5 618.5L398 639.5L403 622.5L422.5 594L437.5 568.5L447.5 539.5L452 513.5V504L447.5 494.5L430.5 464.5L422.5 447L412 401.5L403 368L398 356L383.5 334.5Z", true],
  ["Back", "M449.5 210L461.5 183L477 177.5L492.5 183L520 234L567 258.5L632.5 298.5L575.5 325L569.5 331L557.5 341L540 377.5L532 414.5L520 457L497 498L481 528.5L471 523.5L461.5 511L449.5 492L430 457L418 421.5L407 381L397 353.5L383.5 334L351 311L318 298.5L328 292L343.5 285L367.5 270L393 258.5L412 247.5L433.5 234L449.5 210Z", true],
  ["Hamstrings", "M305 846.5L314.5 801.5L321.5 827L330.5 859.5L349 901.5L366.5 872L416.5 859.5L465.5 842L461 901.5L443.5 966.5L426 1054.5L416.5 1125.5L400.5 1156L384 1114H366.5H349L321.5 1144V1132.5V1054.5L305 1011.5L297 924.5L305 846.5Z", true],
  ["Hamstrings", "M640.5 847L631 802L624 827.5L615 860L596.5 902L579 872.5L529 860L480 842.5L484.5 902L502 967L519.5 1055L529 1126L545 1156.5L561.5 1114.5H579H596.5L624 1144.5V1133V1055L640.5 1012L648.5 925L640.5 847Z", true],
  ["Glutes", "M496.5 727.5L488.5 746.5L482.5 760.5L477.5 786.5V814L482.5 829.5L501.5 849.5L534.5 859L581.5 873L601.5 898L616.5 849.5L624 819L632 794L624 734L609.5 691.5L588.5 676H565.5L545.5 681.5L530 691.5L509 711L496.5 727.5Z", true],
  ["Glutes", "M451.5 727.5L459.5 746.5L465.5 760.5L470.5 786.5V814L465.5 829.5L446.5 849.5L413.5 859L366.5 873L346.5 898L331.5 849.5L324 819L316 794L324 734L338.5 691.5L359.5 676H382.5L402.5 681.5L418 691.5L439 711L451.5 727.5Z", true],
  ["Triceps", "M647.5 415.5L656 399.5L666 403L675.5 406.5L681.5 415.5L695 421L715.5 433L726.5 454L734 484L738 511.5L734 546.5L726.5 532.5L715.5 511.5L707.5 498H695V511.5L691 532.5L695 557V578.5V582L675.5 557L660 524.5L640.5 474L647.5 415.5Z", true],
  ["Triceps", "M303.5 416L295 400L285 403.5L275.5 407L269.5 416L256 421.5L235.5 433.5L224.5 454.5L217 484.5L213 512L217 547L224.5 533L235.5 512L243.5 498.5H256V512L260 533L256 557.5V579V582.5L275.5 557.5L291 525L310.5 474.5L303.5 416Z", true],
  ["Rear Delts", "M303 299H317L324 303L343 310.5L349.5 316.5V324L343 333L320 360L303 380L285.5 396L258 416L240.5 430H235L231.5 403.5L235 380L244 353L254.5 333L270.5 316.5L285.5 307.5L303 299Z", true],
  ["Rear Delts", "M650.5 299H636.5L629.5 303L610.5 310.5L604 316.5V324L610.5 333L633.5 360L650.5 380L668 396L695.5 416L713 430H718.5L722 403.5L718.5 380L709.5 353L699 333L683 316.5L668 307.5L650.5 299Z", true],
  ["Forearms", "M193.5 572L212 530V554.5V572L205 600.5L219 612.5H237.5L255.5 590L265 572L287.75 543.75L281 564.5L265 590V612.5L255.5 657.5L231.5 702L212 735.5L189.5 790.5L176.5 797H157L135.5 785.5L142.5 771.5L157 696L166 630L176.5 600.5L193.5 572Z", true],
  ["Forearms", "M294.5 523L287.75 543.75M287.75 543.75L281 564.5L265 590V612.5L255.5 657.5L231.5 702L212 735.5L189.5 790.5L176.5 797H157L135.5 785.5L142.5 771.5L157 696L166 630L176.5 600.5L193.5 572L212 530V554.5V572L205 600.5L219 612.5H237.5L255.5 590L265 572L287.75 543.75Z", false],
  ["Forearms", "M757 572L738.5 530V554.5V572L745.5 600.5L731.5 612.5H713L695 590L685.5 572L662.75 543.75L669.5 564.5L685.5 590V612.5L695 657.5L719 702L738.5 735.5L761 790.5L774 797H793.5L815 785.5L808 771.5L793.5 696L784.5 630L774 600.5L757 572Z", true],
  ["Forearms", "M656 523L662.75 543.75M662.75 543.75L669.5 564.5L685.5 590V612.5L695 657.5L719 702L738.5 735.5L761 790.5L774 797H793.5L815 785.5L808 771.5L793.5 696L784.5 630L774 600.5L757 572L738.5 530V554.5V572L745.5 600.5L731.5 612.5H713L695 590L685.5 572L662.75 543.75Z", false]
];

function copyStyles(root) {
  const map = new Map();
  root.querySelectorAll('[data-recovery-muscle]').forEach(node => {
    const key = node.dataset.recoveryMuscle;
    if (!key || map.has(key)) return;
    const style = getComputedStyle(node);
    map.set(key, {
      opacity: node.style.getPropertyValue('--recovery-opacity') || style.getPropertyValue('--recovery-opacity'),
      fill: node.style.getPropertyValue('--recovery-fill') || style.getPropertyValue('--recovery-fill'),
      noData: node.classList.contains('no-data')
    });
  });
  return map;
}

function applyStyles(root, styles) {
  root.querySelectorAll('[data-recovery-muscle]').forEach(node => {
    const state = styles.get(node.dataset.recoveryMuscle);
    if (!state) return;
    if (state.opacity) node.style.setProperty('--recovery-opacity', state.opacity);
    if (state.fill) node.style.setProperty('--recovery-fill', state.fill);
    node.classList.toggle('no-data', state.noData);
  });
}

function backMarkup() {
  const paths = BACK_PATHS.map(([muscle,d,filled]) =>
    `<path d="${d}" data-recovery-muscle="${muscle}" class="recovery-user-muscle ${filled ? 'recovery-user-fill' : 'recovery-user-stroke'}"/>`
  ).join('');
  return `<svg class="recovery-user-back-svg" viewBox="0 0 941 1672" role="img" aria-label="Back muscle recovery map">
    <image href="${BACK_BASE}" x="0" y="0" width="941" height="1672" preserveAspectRatio="none"/>
    ${paths}
  </svg>`;
}

function installUserBack() {
  document.querySelectorAll('.muscle-recovery-map-view').forEach(view => {
    const root = view.querySelector('[data-recovery-body-back]');
    if (!root || root.dataset.userBackSvg === 'true') return;
    const styles = copyStyles(root);
    root.innerHTML = backMarkup();
    root.dataset.userBackSvg = 'true';
    root.dataset.designedRecoveryAsset = 'true';
    root.classList.add('recovery-user-back-wrap');
    applyStyles(root, styles);
  });
}

document.addEventListener('click', event => {
  if (event.target.closest?.('.training-progress-tab[data-view="recovery"], [data-recovery-facing], [data-recovery-map-button], [data-recovery-details-button], [data-recovery-mode]')) {
    requestAnimationFrame(installUserBack);
  }
}, true);

const content = document.getElementById('content');
if (content) {
  new MutationObserver(installUserBack).observe(content, { childList: true, subtree: true });
}

window.setTimeout(installUserBack, 0);
