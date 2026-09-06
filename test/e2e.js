const { chromium } = require('playwright');
const path = 'file://' + require('path').resolve(__dirname, '..', 'shift-signal.html');
// Set CHROMIUM_PATH to reuse an already-downloaded browser; otherwise Playwright
// uses whatever `npx playwright install chromium` fetched.
const LAUNCH = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const errs = [];

async function overflow(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const bad = [];
    document.querySelectorAll('*').forEach(n => {
      const r = n.getBoundingClientRect();
      if (r.width > 0 && (r.right > window.innerWidth + 1.5 || r.left < -1.5)) {
        const own = n.scrollWidth > n.clientWidth + 1;
        bad.push((n.tagName + '.' + (n.className || '').toString().split(' ')[0]).slice(0, 44) +
          ` right=${Math.round(r.right)}` + (own ? ' (scrolls)' : ''));
      }
    });
    return { pageScrollX: de.scrollWidth > window.innerWidth + 1, w: de.scrollWidth, vw: window.innerWidth, bad: bad.slice(0, 6) };
  });
}

async function run(name, width, height, theme) {
  const b = await chromium.launch(LAUNCH);
  const ctx = await b.newContext({ viewport: { width, height }, colorScheme: theme, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(`[${name}] console: ${m.text().slice(0,120)}`); });
  page.on('pageerror', e => errs.push(`[${name}] pageerror: ${e.message.slice(0,120)}`));
  await page.goto(path);
  await page.waitForTimeout(700);

  const out = [];
  const rigOverlap = async () => page.evaluate(() => {
    const r = document.getElementById('rig');
    if (!r || r.hidden) return 'bar hidden';
    const boxes = [...r.querySelectorAll('.brand, .rig-mid > *, .rig-right > *')]
      .map(n => ({ t: (n.className || n.tagName).toString().split(' ')[0], ...n.getBoundingClientRect().toJSON() }))
      .filter(b => b.width > 0).sort((a, b) => a.left - b.left);
    const hits = [];
    for (let i = 1; i < boxes.length; i++) if (boxes[i].left < boxes[i-1].right - 0.5) hits.push(`${boxes[i-1].t}↔${boxes[i].t}`);
    const over = boxes.some(b => b.right > window.innerWidth + 0.5);
    return hits.length || over ? `OVERLAP ${hits.join(',')}${over ? ' +past-edge' : ''}` : 'clean';
  });
  const shot = async tag => { await page.waitForTimeout(420); await page.screenshot({ path: `${__dirname}/screenshots/shot-${name}-${tag}.png`, fullPage: false }); };

  // ── landing
  let o = await overflow(page);
  out.push(`landing: body h-scroll ${o.pageScrollX ? 'YES ✗ ' + JSON.stringify(o.bad) : 'no ✓'}`);
  const font = await page.evaluate(() => {
    const h = document.querySelector('h1');
    return { fam: getComputedStyle(h).fontFamily.split(',')[0], loaded: document.fonts ? document.fonts.check('700 3rem Archivo') : null };
  });
  out.push(`display font: ${font.fam} · Archivo loaded=${font.loaded}`);
  await shot('1-landing');

  // ── consent + intake
  await page.click('#begin');
  await page.waitForSelector('#c1');
  await page.check('#c1'); await page.check('#c2');
  await page.selectOption('#f-code', 'R1');
  await page.selectOption('#f-prog', 'MBA (Core)');
  await page.selectOption('#f-ind', 'Consulting');
  await page.fill('#f-role', 'Associate consultant');
  await page.fill('#f-mon', '30');
  await page.selectOption('#f-team', '6–15');
  const gateDisabled = await page.isDisabled('#next');
  out.push(`intake gate: enabled once complete ${gateDisabled ? '✗ still disabled' : '✓'}`);
  o = await overflow(page); out.push(`intake: h-scroll ${o.pageScrollX ? 'YES ✗' : 'no ✓'}`);
  await shot('2-intake');
  await page.click('#next');

  // ── mode A · all 12 stations, via keyboard on some
  await page.click('#go');
  await page.waitForSelector('.opt');
  const picks = [1, 2, 1, 3, 2, 1, 2, 4, 1, 2, 3, 1];
  for (let i = 0; i < 12; i++) {
    await page.waitForSelector('.opt');
    if (i % 3 === 0) { await page.keyboard.press(String(picks[i])); }
    else { await page.locator('.opt').nth(picks[i] - 1).click(); }
    if (i === 4) { await page.locator('.opt').nth(0).click(); }   // exercise the revision counter
    if (i === 0) { o = await overflow(page); out.push(`station: h-scroll ${o.pageScrollX ? 'YES ✗ ' + JSON.stringify(o.bad) : 'no ✓'}`); await shot('3-station'); out.push('rig @station: ' + ((await rigOverlap()) === 'clean' ? 'clean ✓' : '✗ ' + await rigOverlap())); }
    const trace = await page.locator('.trace-box path').count();
    if (i === 6 && trace === 0) out.push('trace: ✗ no polyline drawn mid-run');
    await page.click('#cont');
    await page.waitForTimeout(60);
  }
  out.push('mode A: 12 stations completed ✓');

  // ── closing tail
  await page.waitForSelector('#inc');
  await page.fill('#inc', 'The quarter we lost the biggest account and my manager defended the team in front of the client.');
  await page.evaluate(() => { const a = document.getElementById('anchor'); a.value = 7; a.dispatchEvent(new Event('input')); });
  await page.locator('#stay button').nth(1).click();
  await page.locator('#rec button').nth(0).click();
  const probeShown = await page.locator('#probeBox .note').count();
  out.push(`adaptive probe: ${probeShown ? 'offered' : 'hidden (no sample capability offline) ✓ degrades'}`);
  await shot('4-closing');
  await page.click('#doneA');

  // ── receipt
  await page.waitForSelector('.score-big');
  const scores = await page.locator('.score-big').allTextContents();
  const codeLen = (await page.locator('#codeBox').textContent()).length;
  out.push(`receipt: score ${scores.join(' / ')} · result code ${codeLen} chars ✓`);
  o = await overflow(page); out.push(`receipt: h-scroll ${o.pageScrollX ? 'YES ✗ ' + JSON.stringify(o.bad) : 'no ✓'}`);
  const figs = await page.locator('#stage svg.viz').count();
  out.push(`receipt figures: ${figs}`);
  await shot('6-receipt'); out.push(`rig @receipt: ${(await rigOverlap()) === 'clean' ? 'clean ✓' : '✗ ' + await rigOverlap()}`);

  // ── researcher view
  await page.evaluate(() => { location.hash = '#/analysis'; });
  await page.waitForTimeout(400);
  if (await page.locator('#gate').count()) { await page.fill('#gate', 'IIMR-T7'); await page.click('#gateGo'); }
  await page.waitForTimeout(500);
  const kpis = await page.locator('.kpi').count();
  const vizN = await page.locator('svg.viz').count();
  out.push(`analysis: ${kpis} KPI tiles · ${vizN} figures rendered`);
  o = await overflow(page); out.push(`analysis: body h-scroll ${o.pageScrollX ? 'YES ✗ ' + JSON.stringify(o.bad) : 'no ✓'}`);
  await shot('7-analysis'); out.push(`rig @analysis: ${(await rigOverlap()) === 'clean' ? 'clean ✓' : '✗ ' + await rigOverlap()}`);

  // contrast sample: is any body text below 4.5:1 on its ground?
  const contrast = await page.evaluate(() => {
    const lum = c => { const [r,g,b] = c.match(/\d+/g).map(Number).map(v => { v/=255; return v <= .03928 ? v/12.92 : ((v+.055)/1.055)**2.4; }); return .2126*r+.7152*g+.0722*b; };
    const bgOf = n => { let e = n; while (e) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; e = e.parentElement; } return 'rgb(255,255,255)'; };
    const out = [];
  const rigOverlap = async () => page.evaluate(() => {
    const r = document.getElementById('rig');
    if (!r || r.hidden) return 'bar hidden';
    const boxes = [...r.querySelectorAll('.brand, .rig-mid > *, .rig-right > *')]
      .map(n => ({ t: (n.className || n.tagName).toString().split(' ')[0], ...n.getBoundingClientRect().toJSON() }))
      .filter(b => b.width > 0).sort((a, b) => a.left - b.left);
    const hits = [];
    for (let i = 1; i < boxes.length; i++) if (boxes[i].left < boxes[i-1].right - 0.5) hits.push(`${boxes[i-1].t}↔${boxes[i].t}`);
    const over = boxes.some(b => b.right > window.innerWidth + 0.5);
    return hits.length || over ? `OVERLAP ${hits.join(',')}${over ? ' +past-edge' : ''}` : 'clean';
  });
    document.querySelectorAll('p, td, th, span, text, h1, h2, h3').forEach(n => {
      if (!n.textContent.trim() || n.children.length) return;
      const cs = getComputedStyle(n); const fs = parseFloat(cs.fontSize);
      const l1 = lum(cs.color), l2 = lum(bgOf(n));
      const ratio = (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
      const need = fs >= 18.66 ? 3 : 4.5;
      if (ratio < need) out.push(`${n.tagName}.${(n.className||'').toString().split(' ')[0]} ${fs}px ${ratio.toFixed(2)}:1 need ${need}`);
    });
    return [...new Set(out)].slice(0, 8);
  });
  out.push(`text contrast failures: ${contrast.length ? '✗ ' + JSON.stringify(contrast) : 'none ✓'}`);

  // data tab + CSV
  await page.locator('.tab').nth(1).click();
  await page.waitForTimeout(350);
  const tables = await page.locator('table').count();
  o = await overflow(page);
  out.push(`data tab: ${tables} tables · body h-scroll ${o.pageScrollX ? 'YES ✗ ' + JSON.stringify(o.bad) : 'no ✓ (tables scroll in place)'}`);
  await shot('8-data');
  await page.locator('.tab').nth(2).click();
  await page.waitForTimeout(300);
  out.push(`qualitative tab: ${(await page.locator('#stage').textContent()).includes('biggest account') ? 'incident shown ✓' : '✗ incident missing'}`);
  await shot('9-qual');

  // coverage strip + recommendations on the results tab
  await page.locator('.tab').nth(0).click();
  await page.waitForTimeout(400);
  const cov = await page.locator('.cover-cell').count();
  const covTxt = await page.locator('.cover').textContent();
  out.push(`coverage strip: ${cov} programme cells ${cov === 3 ? '✓' : '✗'} · flags gaps ${covTxt.includes('not yet collected') ? '✓' : 'all collected'}`);
  const recs = await page.locator('.rec').count();
  const recTxt = await page.locator('.rec').first().textContent();
  out.push(`recommendations: ${recs} prioritised items ${recs >= 5 ? '✓' : '✗'} · evidence-linked ${recTxt.includes('Evidence ·') ? '✓' : '✗'}`);
  await shot('10-recs');

  // methods page
  await page.evaluate(() => { location.hash = '#/methods'; });
  await page.waitForTimeout(500);
  const banks = await page.locator('details.bank').count();
  const refs = (await page.locator('#stage').textContent()).match(/https:\/\/doi\.org/g) || [];
  out.push(`methods page: ${banks} station ladders ${banks === 12 ? '✓' : '✗'} · ${refs.length} DOI-cited references ${refs.length >= 5 ? '✓' : '✗'}`);
  await page.locator('details.bank').first().click();
  await page.waitForTimeout(200);
  const rungs = await page.locator('details.bank[open] .rung').count();
  out.push(`item bank expands: ${rungs} scoring rungs on first station ${rungs === 4 ? '✓' : '✗'}`);
  o = await overflow(page); out.push(`methods: h-scroll ${o.pageScrollX ? 'YES ✗ ' + JSON.stringify(o.bad) : 'no ✓'}`);
  await shot('11-methods'); out.push(`rig @methods: ${(await rigOverlap()) === 'clean' ? 'clean ✓' : '✗ ' + await rigOverlap()}`);

  await b.close();
  console.log(`\n╔══ ${name}  ${width}×${height}  ${theme} ══`);
  out.forEach(l => console.log('║ ' + l));
  return out;
}

(async () => {
  const all = [];
  all.push(...await run('phone', 390, 844, 'dark'));
  all.push(...await run('desktop', 1440, 900, 'light'));
  console.log('\n══ runtime errors ══');
  console.log(errs.length ? errs.join('\n') : 'none ✓');
  const fails = all.filter(l => l.includes('✗'));
  console.log(`\n══ VERDICT: ${fails.length ? fails.length + ' FAILURES' : 'all checks passed'} ══`);
  fails.forEach(f => console.log('✗ ' + f));
})();
