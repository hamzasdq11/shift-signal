const fs = require('fs');
const vm = require('vm');

/* ── minimal DOM shim: enough for the render path to execute ── */
function node(id) {
  const n = {
    id, _html: '', children: [], style: {}, dataset: {}, classList: { add(){}, remove(){}, contains(){return false;} },
    value: '', checked: false, textContent: '', type: 'text',
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); },
    setAttribute(){}, getAttribute(){return null;}, addEventListener(){}, removeEventListener(){},
    appendChild(c){ this.children.push(c); return c; }, replaceWith(){}, focus(){}, click(){},
    querySelectorAll(){ return []; }, querySelector(){ return null; },
    getBoundingClientRect(){ return {left:0,top:0,width:10,height:10}; },
    matches(){ return false; }
  };
  return n;
}
const nodes = new Map();
const doc = {
  getElementById(id) { if (!nodes.has(id)) nodes.set(id, node(id)); return nodes.get(id); },
  createElement(t) { return node('new-' + t); },
  addEventListener(){}, querySelectorAll(){ return []; },
  documentElement: node('html'), body: node('body')
};
const storeMem = {};
const ctx = {
  console, Math, Date, JSON, Number, String, Object, Array, Boolean, Error, isNaN, parseInt, parseFloat,
  btoa, atob, unescape, escape, performance, setTimeout, setInterval, clearInterval, clearTimeout,
  document: doc,
  location: { hash: '' },
  navigator: { clipboard: { writeText: async () => {} } },
  localStorage: {
    getItem: k => (k in storeMem ? storeMem[k] : null),
    setItem: (k, v) => { storeMem[k] = String(v); },
    removeItem: k => { delete storeMem[k]; }
  },
  confirm: () => true,
  Promise, Map, Set, Symbol, RegExp, Intl
};
ctx.window = ctx;
ctx.window.innerWidth = 1200; ctx.window.innerHeight = 800;
ctx.window.addEventListener = () => {};
ctx.window.scrollTo = () => {};
ctx.window.getSelection = () => ({ removeAllRanges(){}, addRange(){} });
ctx.globalThis = ctx;

let src = fs.readFileSync(require('path').resolve(__dirname,'check.js'),'utf8');
/* const/let at script top level are not context properties in vm — export them explicitly */
src += `\nglobalThis.__set = (k, v) => { if (k === 'run') run = v; if (k === 'stationIx') stationIx = v; };\nglobalThis.__X = { STATIONS, Q12, Q0, DIMS, DIM, EXP_ITEMS, LIKERT, rescale4to5, pct100, mean,
  r1, r2, r0, c2, c0, pearson, sd, median, band, chartPaired, chartScatter, chartDelta, chartDims,
  chartCost, chartExp, chartTrace, narrateConvergence, narrateDims, narrateVerdict, csvSummary,
  csvItems, encodeRun, decodeRun, tabComparison, tabData, tabQual, AX };\n`;
vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: 'shiftsignal.js' });
console.log('✓ script evaluated and booted');

/* ── drive a full synthetic run through the real state machine ── */
const S = Object.assign({}, ctx, ctx.__X);
S.newRun = ctx.newRun; S.computeScores = ctx.computeScores; S.dataPoints = ctx.dataPoints;
S.rowFromRun = ctx.rowFromRun; S.traceSVG = ctx.traceSVG;
S.localStorage = ctx.localStorage;
function fullRun(code, prog, pattern, expA, expB, anchor, qbase) {
  const r = S.newRun();
  r.code = code; r.programme = prog; r.consent = true;
  r.bio = { industry: 'IT / Software', role: 'Analyst', months: 26, teamSize: '6–15', since: '' };
  r.a.startedAt = 1000;
  r.a.answers = S.STATIONS.map((st, i) => ({ value: pattern[i % pattern.length], ms: 4000 + i * 250, revisions: i % 4 === 0 ? 1 : 0, at: 1000 }));
  r.a.incident = 'The week the client escalated and my manager took the call with me instead of sending me in alone.';
  r.a.probeQ = 'What made speaking up feel safe on that team but not with the client?';
  r.a.probeA = 'Internally we had history. Externally I had no standing.';
  r.a.anchor = anchor; r.a.stay = 'unsure'; r.a.recommend = 'yes';
  r.a.endedAt = 1000 + 9 * 60 * 1000;
  S.Q12.forEach((qq, i) => { r.b.scores['q' + qq.n] = Math.max(1, Math.min(5, Math.round(qbase + Math.sin(i * 1.7) * 0.9))); });
  r.b.scores.q0 = 4;
  r.b.startedAt = 2e6; r.b.endedAt = 2e6 + 3.4 * 60 * 1000;
  S.EXP_ITEMS.forEach((it, i) => { r.exp.sim[it.id] = expA[i]; r.exp.q12[it.id] = expB[i]; });
  r.exp.preferred = 'sim'; r.exp.cadence = 'monthly';
  r.completedAt = new Date().toISOString();
  r.scores = S.computeScores(r);
  r.points = S.dataPoints(r);
  return r;
}
const runs = [
  fullRun('R1', 'MBA (Core)', [4,3,4,2,3,4,3,4,2,3,4,3], [5,4,4,4], [3,4,5,2], 7, 3.6),
  fullRun('R2', 'MBA (HRM)', [2,2,3,1,2,3,2,2,1,2,3,2], [4,5,3,4], [3,3,4,2], 4, 2.4),
  fullRun('R3', 'MBA (Business Analytics)', [4,4,4,3,4,4,4,3,4,4,4,4], [5,4,5,5], [4,4,4,3], 9, 4.3)
];
S.localStorage.setItem('ss.runs.v1', JSON.stringify(runs));
S.localStorage.setItem('ss.gate.v1', 'true');

console.log('\n── scoring ──');
runs.forEach(r => {
  const s = r.scores;
  console.log(`${r.code} ${r.programme.padEnd(26)} A=${S.r2(s.sim)} (${S.r0(s.sim100)}/100)  B=${S.r2(s.q12)} (${S.r0(s.q12100)}/100)  Δ=${S.r2(s.delta)}  pts A/B=${r.points.a}/${r.points.b}  band A=${S.band(s.sim).label}`);
});
const rows = runs.map(S.rowFromRun);
console.log('index range check:', rows.every(r => r.sim >= 1 && r.sim <= 5 && r.q12 >= 1 && r.q12 <= 5) ? 'all indices inside 1–5 ✓' : 'OUT OF RANGE ✗');
console.log('rescale check: raw 1..4 →', [1,2,3,4].map(v => S.r2(S.rescale4to5(v))).join(' / '));
console.log('dimension weights A/B:', S.DIMS.map(d => `${d.k}:${S.STATIONS.filter(s=>s.dim===d.id).length}/${d.q12.length}`).join(' '));
console.log('pearson r:', S.r2(S.pearson(rows.map(r=>r.sim), rows.map(r=>r.q12))));

console.log('\n── figures ──');
const figs = {
  'F1 paired': () => S.chartPaired(rows),
  'F2 scatter': () => S.chartScatter(rows),
  'F3 delta': () => S.chartDelta(rows),
  'F4 dims': () => S.chartDims(rows),
  'F5 cost': () => S.chartCost(rows),
  'F6 experience': () => S.chartExp(rows),
  'F7 trace': () => S.chartTrace(rows[0]),
  'trace compact': () => S.chartTrace(rows[1], { compact: true }),
  'sparkline': () => { ctx.__set('run', runs[0]); return ctx.traceSVG(); }
};
for (const [k, fn] of Object.entries(figs)) {
  try {
    const out = fn();
    const bad = /NaN|undefined|Infinity/.test(out);
    console.log(`${bad ? '✗' : '✓'} ${k.padEnd(15)} ${out.length} chars${bad ? '  ← contains ' + (out.match(/NaN|undefined|Infinity/g)||[]).slice(0,3).join(',') : ''}`);
  } catch (e) { console.log(`✗ ${k} THREW ${e.message}`); }
}

console.log('\n── narration ──');
[['convergence', S.narrateConvergence], ['dims', S.narrateDims], ['verdict', S.narrateVerdict]].forEach(([k, fn]) => {
  try { const t = fn(rows); console.log(`${/NaN|undefined/.test(t) ? '✗' : '✓'} ${k}: ${t.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0,150)}…`); }
  catch (e) { console.log(`✗ ${k} THREW ${e.message}`); }
});

console.log('\n── export ──');
const sum = S.csvSummary(rows), items = S.csvItems(rows);
const hcols = sum.split('\n')[0].split(',').length, rcols = sum.split('\n')[1].split(',').length;
console.log(`summary.csv  ${sum.split('\n').length} rows · header ${hcols} cols · data ${rcols} cols ${hcols===rcols?'✓':'✗ MISMATCH'}`);
const ih = items.split('\n')[0].split(',').length;
const allIt = items.split('\n').slice(1).every(l => (l.match(/,/g)||[]).length >= ih-1);
console.log(`items.csv    ${items.split('\n').length} rows (expect ${1 + rows.length*(S.STATIONS.length+13)}) · cols consistent ${allIt?'✓':'✗'}`);
console.log(`em dashes in csv: ${/—/.test(sum+items) ? '✗ present' : '✓ none'}`);
const enc = S.encodeRun(runs[0]), dec = S.decodeRun(enc);
console.log(`result code round-trip: ${enc.length} chars → ${dec && dec.code === 'R1' ? '✓ decodes to R1' : '✗ FAILED'}`);

console.log('\n── tabs & screens ──');
for (const [k, fn] of Object.entries({ comparison: S.tabComparison, data: S.tabData, qual: S.tabQual })) {
  try { const h = fn(rows); console.log(`${/NaN|undefined/.test(h) ? '✗' : '✓'} tab ${k.padEnd(10)} ${h.length} chars`); }
  catch (e) { console.log(`✗ tab ${k} THREW ${e.message}`); }
}
try { console.log(`${/NaN|undefined/.test(S.tabComparison([])) ? '✗' : '✓'} empty-state comparison renders`); } catch(e){ console.log('✗ empty comparison THREW', e.message); }
try { ctx.__set('run', runs[0]); ctx.renderReceipt('local'); console.log('✓ receipt screen rendered'); } catch (e) { console.log('✗ receipt THREW', e.message); }
try { ctx.renderAnalysis(); console.log('✓ analysis screen rendered'); } catch (e) { console.log('✗ analysis THREW', e.message); }
try { const nr = ctx.newRun(); nr.consent = true; nr.code='R9'; nr.programme='MBA (Core)'; nr.a.startedAt=1; ctx.__set('run', nr); ctx.__set('stationIx', 0); ctx.renderIntake(); ctx.renderSimIntro(); ctx.renderStation();  ctx.renderQ12(); ctx.renderExperience(); ctx.renderLanding(); console.log('✓ all respondent screens rendered'); } catch (e) { console.log('✗ flow THREW', e.message); }
