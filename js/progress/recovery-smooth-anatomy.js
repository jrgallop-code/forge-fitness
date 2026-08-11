function copyRecoveryStyles(root) {
  const styles = new Map();
  root.querySelectorAll('[data-recovery-muscle]').forEach(node => {
    const muscle = node.dataset.recoveryMuscle;
    if (!muscle || styles.has(muscle)) return;
    styles.set(muscle, {
      opacity: node.style.getPropertyValue('--recovery-opacity'),
      fill: node.style.getPropertyValue('--recovery-fill'),
      noData: node.classList.contains('no-data')
    });
  });
  return styles;
}

function applyRecoveryStyles(root, styles) {
  root.querySelectorAll('[data-recovery-muscle]').forEach(node => {
    const state = styles.get(node.dataset.recoveryMuscle);
    if (!state) return;
    if (state.opacity) node.style.setProperty('--recovery-opacity', state.opacity);
    if (state.fill) node.style.setProperty('--recovery-fill', state.fill);
    node.classList.toggle('no-data', state.noData);
  });
}

function p(muscle, d) {
  return `<path class="recovery-muscle-overlay" data-recovery-muscle="${muscle}" d="${d}"/>`;
}

function smoothFrontSvg() {
  const silhouette = `M215 15
    C193 15 180 29 177 49 C175 65 181 80 190 91
    C190 102 187 113 180 123
    C165 132 144 140 122 151 C103 160 91 177 87 200
    C82 228 77 253 66 278 C58 299 48 321 40 341
    C34 356 26 368 16 380 C23 386 31 389 42 389
    C38 403 41 416 51 427 C61 422 69 411 74 397
    C80 379 84 360 90 342 C100 316 111 290 123 263
    C129 250 137 239 146 230 C149 251 154 274 160 299
    C165 322 163 347 157 373 C149 406 143 441 144 475
    C145 510 152 540 155 565 C157 586 154 610 150 634
    C147 654 143 673 137 693 C148 704 162 707 177 702
    C190 685 196 667 198 646 C202 606 204 566 207 526
    C209 493 210 462 214 432
    C217 462 219 493 221 526 C224 566 226 606 230 646
    C232 667 238 685 251 702 C266 707 280 704 291 693
    C285 673 281 654 278 634 C274 610 271 586 273 565
    C276 540 283 510 284 475 C285 441 279 406 271 373
    C265 347 263 322 268 299 C274 274 279 251 282 230
    C291 239 299 250 305 263 C317 290 328 316 338 342
    C344 360 348 379 354 397 C359 411 367 422 377 427
    C387 416 390 403 386 389 C397 389 405 386 412 380
    C402 368 394 356 388 341 C380 321 370 299 362 278
    C351 253 346 228 341 200 C337 177 325 160 306 151
    C284 140 263 132 248 123 C241 113 238 102 238 91
    C247 80 253 65 251 49 C248 29 237 15 215 15 Z`;

  return `<svg class="recovery-body-svg recovery-smooth-anatomy" viewBox="0 0 430 730" role="img" aria-label="Front muscle recovery map">
    <path class="recovery-master-silhouette" d="${silhouette}"/>
    <g class="recovery-muscle-boundaries">
      ${p('Shoulders', 'M121 154 C105 158 94 170 91 188 C89 204 94 217 105 226 C117 230 129 225 138 213 C145 199 149 183 147 168 C141 158 132 153 121 154 Z')}
      ${p('Shoulders', 'M309 154 C325 158 336 170 339 188 C341 204 336 217 325 226 C313 230 301 225 292 213 C285 199 281 183 283 168 C289 158 298 153 309 154 Z')}
      ${p('Chest', 'M141 162 C160 153 183 150 210 157 L210 222 C189 229 168 228 149 220 C135 214 126 204 123 190 C122 177 128 168 141 162 Z')}
      ${p('Chest', 'M289 162 C270 153 247 150 220 157 L220 222 C241 229 262 228 281 220 C295 214 304 204 307 190 C308 177 302 168 289 162 Z')}
      ${p('Biceps', 'M106 216 C94 227 89 245 89 263 C89 281 94 295 104 301 C114 304 123 298 129 285 C135 269 138 251 136 235 C130 223 120 216 106 216 Z')}
      ${p('Biceps', 'M324 216 C336 227 341 245 341 263 C341 281 336 295 326 301 C316 304 307 298 301 285 C295 269 292 251 294 235 C300 223 310 216 324 216 Z')}
      ${p('Quads', 'M154 399 C143 421 139 452 140 484 C141 518 148 547 160 570 C168 584 176 591 183 591 C189 574 193 549 193 520 C193 482 189 446 182 417 C174 406 165 400 154 399 Z')}
      ${p('Quads', 'M276 399 C287 421 291 452 290 484 C289 518 282 547 270 570 C262 584 254 591 247 591 C241 574 237 549 237 520 C237 482 241 446 248 417 C256 406 265 400 276 399 Z')}
      ${p('Quads', 'M184 406 C194 401 203 402 211 410 C215 433 215 464 212 499 C209 535 203 563 194 586 C187 566 182 541 180 511 C178 474 179 439 184 406 Z')}
      ${p('Quads', 'M246 406 C236 401 227 402 219 410 C215 433 215 464 218 499 C221 535 227 563 236 586 C243 566 248 541 250 511 C252 474 251 439 246 406 Z')}
      ${p('Calves', 'M156 558 C146 577 143 602 145 626 C147 648 153 666 162 677 C170 676 176 666 180 648 C184 624 183 597 178 575 C172 565 165 559 156 558 Z')}
      ${p('Calves', 'M274 558 C284 577 287 602 285 626 C283 648 277 666 268 677 C260 676 254 666 250 648 C246 624 247 597 252 575 C258 565 265 559 274 558 Z')}
    </g>
  </svg>`;
}

function smoothBackSvg() {
  const silhouette = `M215 15
    C193 15 181 30 178 49 C176 65 182 79 191 91
    C191 104 187 116 179 126
    C162 136 142 144 120 154 C101 163 90 179 86 201
    C82 225 77 249 68 273 C60 295 50 316 42 338
    C36 354 28 368 18 380 C25 386 33 389 44 389
    C40 404 43 417 53 428 C63 423 71 412 76 398
    C82 379 86 360 92 341 C101 315 112 289 124 264
    C131 249 139 238 148 230 C151 251 156 274 162 298
    C167 321 165 346 159 372 C151 405 145 440 146 475
    C147 510 154 540 157 565 C159 586 156 610 152 634
    C149 654 145 673 139 693 C150 704 164 707 179 702
    C192 685 198 667 200 646 C204 606 206 566 209 526
    C211 493 212 462 215 432
    C218 462 219 493 221 526 C224 566 226 606 230 646
    C232 667 238 685 251 702 C266 707 280 704 291 693
    C285 673 281 654 278 634 C274 610 271 586 273 565
    C276 540 283 510 284 475 C285 440 279 405 271 372
    C265 346 263 321 268 298 C274 274 279 251 282 230
    C291 238 299 249 306 264 C318 289 329 315 338 341
    C344 360 348 379 354 398 C359 412 367 423 377 428
    C387 417 390 404 386 389 C397 389 405 386 412 380
    C402 368 394 354 388 338 C380 316 370 295 362 273
    C353 249 348 225 344 201 C340 179 329 163 310 154
    C288 144 268 136 251 126 C243 116 239 104 239 91
    C248 79 254 65 252 49 C249 30 237 15 215 15 Z`;

  return `<svg class="recovery-body-svg recovery-smooth-anatomy" viewBox="0 0 430 730" role="img" aria-label="Back muscle recovery map">
    <path class="recovery-master-silhouette" d="${silhouette}"/>
    <g class="recovery-muscle-boundaries">
      ${p('Shoulders', 'M119 157 C103 161 93 173 91 190 C90 207 96 219 108 227 C120 230 132 224 141 211 C147 198 150 181 147 168 C140 159 130 155 119 157 Z')}
      ${p('Shoulders', 'M311 157 C327 161 337 173 339 190 C340 207 334 219 322 227 C310 230 298 224 289 211 C283 198 280 181 283 168 C290 159 300 155 311 157 Z')}
      ${p('Back', 'M178 126 C166 136 150 144 134 154 C139 182 151 205 168 225 C181 241 196 257 210 273 L210 159 C198 151 187 140 178 126 Z')}
      ${p('Back', 'M252 126 C264 136 280 144 296 154 C291 182 279 205 262 225 C249 241 234 257 220 273 L220 159 C232 151 243 140 252 126 Z')}
      ${p('Back', 'M153 206 C143 224 139 245 143 266 C149 289 161 312 178 336 L210 286 C192 265 176 244 163 222 C159 215 156 209 153 206 Z')}
      ${p('Back', 'M277 206 C287 224 291 245 287 266 C281 289 269 312 252 336 L220 286 C238 265 254 244 267 222 C271 215 274 209 277 206 Z')}
      ${p('Triceps', 'M105 218 C94 231 90 248 91 267 C92 286 98 300 108 305 C118 307 126 300 132 286 C137 270 140 251 136 236 C129 224 119 218 105 218 Z')}
      ${p('Triceps', 'M325 218 C336 231 340 248 339 267 C338 286 332 300 322 305 C312 307 304 300 298 286 C293 270 290 251 294 236 C301 224 311 218 325 218 Z')}
      ${p('Glutes', 'M168 365 C151 377 144 398 147 423 C150 447 160 464 177 474 C192 478 204 472 213 457 L213 385 C201 371 186 365 168 365 Z')}
      ${p('Glutes', 'M262 365 C279 377 286 398 283 423 C280 447 270 464 253 474 C238 478 226 472 217 457 L217 385 C229 371 244 365 262 365 Z')}
      ${p('Hamstrings', 'M164 469 C151 489 147 519 151 551 C154 582 162 610 174 628 C183 625 190 611 194 588 C199 555 198 521 192 490 C184 478 175 471 164 469 Z')}
      ${p('Hamstrings', 'M266 469 C279 489 283 519 279 551 C276 582 268 610 256 628 C247 625 240 611 236 588 C231 555 232 521 238 490 C246 478 255 471 266 469 Z')}
      ${p('Calves', 'M157 557 C146 576 143 601 145 626 C147 648 153 666 162 677 C171 676 177 665 181 646 C185 622 183 596 178 575 C172 565 165 559 157 557 Z')}
      ${p('Calves', 'M273 557 C284 576 287 601 285 626 C283 648 277 666 268 677 C259 676 253 665 249 646 C245 622 247 596 252 575 C258 565 265 559 273 557 Z')}
    </g>
  </svg>`;
}

function replaceAnatomy() {
  document.querySelectorAll('.muscle-recovery-map-view').forEach(view => {
    const front = view.querySelector('[data-recovery-body-front]');
    const back = view.querySelector('[data-recovery-body-back]');
    if (!front || !back || front.dataset.smoothAnatomy === 'true') return;

    const frontStyles = copyRecoveryStyles(front);
    const backStyles = copyRecoveryStyles(back);
    front.innerHTML = smoothFrontSvg();
    back.innerHTML = smoothBackSvg();
    front.dataset.smoothAnatomy = 'true';
    back.dataset.smoothAnatomy = 'true';
    front.classList.add('recovery-smooth-wrap');
    back.classList.add('recovery-smooth-wrap');
    applyRecoveryStyles(front, frontStyles);
    applyRecoveryStyles(back, backStyles);
  });
}

document.addEventListener('click', event => {
  if (event.target.closest?.('.training-progress-tab[data-view="recovery"], [data-recovery-facing], [data-recovery-map-button]')) {
    requestAnimationFrame(replaceAnatomy);
  }
}, true);

const content = document.getElementById('content');
if (content) {
  const observer = new MutationObserver(() => replaceAnatomy());
  observer.observe(content, { childList: true, subtree: true });
}
window.setTimeout(replaceAnatomy, 0);
