import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = (await readFile(new URL('../js/nutrition/check-in-calendar.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace(/export /g, '');
const context = vm.createContext({ Date, localStorage: { getItem: () => null } });
vm.runInContext(source, context);
function events(handledAt, reviewDate = '2026-10-14') {
    context.input = {phase: {id: 'bulk', startDate: '2026-09-17'}, status: {reviewDate, state: 'holding'}, bounds: {start: '2026-10-01', end: '2026-10-31'}, handled: {bulk: {handledAt}}, today: '2026-10-07'};
    return vm.runInContext('activePhaseEvents(input.phase, input.status, input.bounds, input.handled, input.today)', context);
}
test('accepted check-in counts immediately, with four monthly dates', () => {
    const result = events('2026-10-07T12:00:00');
    assert.equal(result.length, 4);
    assert.equal(result.filter(e => e.state === 'handled').length, 1);
    assert.equal(result.find(e => e.date === '2026-10-07').state, 'handled');
    assert.equal(result.find(e => e.date === '2026-10-14').state, 'upcoming');
});
test('pending check-in today is not counted as completed', () => {
    assert.equal(events(undefined).filter(e => e.state === 'handled').length, 0);
});
test('actual delayed completion survives a different weekly anchor', () => {
    const result = events('2026-10-07T12:00:00', '2026-10-15');
    assert.equal(result.find(e => e.date === '2026-10-07').state, 'handled');
});
