/**
 * Shift Signal — Mode B builder
 * Creates the Gallup Q12 (retrospectively worded) as a Google Form, linked to a
 * response spreadsheet, with a Scoring sheet that computes each respondent's
 * dimension means and engagement index on the same 1–5 metric as Mode A.
 *
 * HOW TO RUN
 *   1. script.google.com → New project → paste this file over Code.gs
 *   2. Run  createModeBForm   → authorise when prompted (Forms, Sheets, Drive)
 *   3. Read the Execution log for the form link, edit link and sheet link
 *   4. After the first response lands, run  setupScoring   once
 *
 * Item wording is identical to Mode B inside the Shift Signal app, so a
 * respondent measured in either place is directly comparable.
 *
 * Q12® is a trademark of Gallup, Inc. The items below are adapted into the past
 * tense for a former employer, for educational coursework. Not a Gallup product.
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────
var CFG = {
  title: 'Shift Signal · Mode B — Workplace Engagement at Your Previous Employer',

  // 'scale'  → 1–5 slider with end labels. Exports as a NUMBER. Recommended.
  // 'choice' → five labelled radio buttons. Exports as TEXT, needs parsing.
  itemStyle: 'scale',

  createSpreadsheet: true,   // link a response sheet and remember its id
  collectEmail: false,       // keep the study anonymous
  oneItemPerPage: false      // true = one Q12 item per page (slower, less priming)
};

// ─── INSTRUMENT ────────────────────────────────────────────────────────────
var LIKERT = ['1 — Strongly disagree', '2 — Disagree', '3 — Neither agree nor disagree',
              '4 — Agree', '5 — Strongly agree'];

var Q0 = 'Overall, how satisfied were you with that organisation as a place to work?';

// dim keys match the five Shift Signal dimensions
var Q12 = [
  { n: 1,  dim: 'D1 Role Clarity & Resources',  t: 'I knew what was expected of me at work.' },
  { n: 2,  dim: 'D1 Role Clarity & Resources',  t: 'I had the materials and equipment I needed to do my work right.' },
  { n: 3,  dim: 'D5 Meaning & Strengths Use',   t: 'At work, I had the opportunity to do what I did best every day.' },
  { n: 4,  dim: 'D2 Recognition & Being Valued', t: 'In a typical week there, I received recognition or praise for doing good work.' },
  { n: 5,  dim: 'D2 Recognition & Being Valued', t: 'My supervisor, or someone at work, seemed to care about me as a person.' },
  { n: 6,  dim: 'D3 Growth & Progress',         t: 'There was someone at work who encouraged my development.' },
  { n: 7,  dim: 'D4 Voice & Team Trust',        t: 'At work, my opinions seemed to count.' },
  { n: 8,  dim: 'D5 Meaning & Strengths Use',   t: 'The mission or purpose of the organisation made me feel my job was important.' },
  { n: 9,  dim: 'D4 Voice & Team Trust',        t: 'My colleagues were committed to doing quality work.' },
  { n: 10, dim: 'D4 Voice & Team Trust',        t: 'I had a close friend at work.' },
  { n: 11, dim: 'D3 Growth & Progress',         t: 'In my last six months there, someone talked to me about my progress.' },
  { n: 12, dim: 'D3 Growth & Progress',         t: 'In my last year there, I had opportunities at work to learn and grow.' }
];

// dimension → the Q12 items it is scored from (the Shift Signal map)
var DIM_MAP = [
  { key: 'D1', name: 'Role Clarity & Resources',  items: [1, 2] },
  { key: 'D2', name: 'Recognition & Being Valued', items: [4, 5] },
  { key: 'D3', name: 'Growth & Progress',         items: [6, 11, 12] },
  { key: 'D4', name: 'Voice & Team Trust',        items: [7, 9, 10] },
  { key: 'D5', name: 'Meaning & Strengths Use',   items: [3, 8] }
];

var PROGRAMMES = ['MBA (Core)', 'MBA (HRM)', 'MBA (Business Analytics)'];
var SECTORS = ['IT / Software', 'Consulting', 'Banking / Financial services',
  'Manufacturing / Engineering', 'FMCG / Retail', 'Healthcare / Pharma',
  'Energy / Infrastructure', 'Media / Advertising', 'Public sector / Non-profit',
  'Startup (< 50 people)', 'Other'];

var FRAMING = 'Answer about the workplace you left before joining your MBA — the last ' +
  'full-time role you held. Not about student life, and not about any job you have held since. ' +
  'Pick that one employer now and keep it in mind for every question.';

// ─── MAIN ──────────────────────────────────────────────────────────────────
function createModeBForm() {
  var form = FormApp.create(CFG.title);

  form.setDescription(
    'Mode B of a two-mode engagement measurement study — Introduction to HRM, Term VII, IIM Ranchi.\n\n' +
    'RETROSPECTIVE FRAMING\n' + FRAMING + '\n\n' +
    'This is the Gallup Q12, a validated twelve-item engagement scale, reworded in the past tense. ' +
    'It takes about four minutes. There are no right answers.\n\n' +
    'Anonymous: no name, email or employer name is collected. You are identified only by a ' +
    'respondent code (R1–R3) assigned by the project group.'
  );
  form.setCollectEmail(CFG.collectEmail);
  form.setProgressBar(true);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage(
    'Recorded — thank you. Please tell the project group you have finished Mode B so they can ' +
    'pair it with your Mode A simulation result.'
  );

  // ── Section 1 · consent and eligibility
  form.addSectionHeaderItem()
    .setTitle('1 · Consent and eligibility')
    .setHelpText('Your responses are used only for this coursework, in anonymised and aggregated form.');

  form.addCheckboxItem()
    .setTitle('Informed consent')
    .setHelpText('Tick to confirm. You may stop at any time by closing this tab.')
    .setChoiceValues(['I am taking part voluntarily and consent to my anonymised responses being used in this coursework.'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Eligibility')
    .setChoiceValues(['I held a full-time role before joining my MBA, and I will answer about that workplace.'])
    .setRequired(true);

  // ── Section 2 · respondent metadata (kept identical to Mode A intake)
  form.addSectionHeaderItem()
    .setTitle('2 · About you and that job')
    .setHelpText('Four short items so your two measurements can be paired.');

  form.addMultipleChoiceItem()
    .setTitle('Respondent code')
    .setHelpText('Assigned to you by the project group. Use the same code you used in the simulation.')
    .setChoiceValues(['R1', 'R2', 'R3'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Programme')
    .setChoiceValues(PROGRAMMES)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Previous employer's sector")
    .setChoiceValues(SECTORS)
    .setRequired(true);

  form.addTextItem()
    .setTitle('Your role there')
    .setHelpText('e.g. Business analyst')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Months of full-time work experience')
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter a whole number of months between 1 and 480.')
      .requireNumberBetween(1, 480)
      .build())
    .setRequired(true);

  // ── Section 3 · overall satisfaction (Gallup's Q00, reported separately)
  form.addSectionHeaderItem()
    .setTitle('3 · Overall')
    .setHelpText(FRAMING);

  addLikert_(form, Q0, 'Q0');

  // ── Section 4 · the twelve items, canonical order
  form.addSectionHeaderItem()
    .setTitle('4 · The twelve items')
    .setHelpText('Thinking about that previous workplace, how strongly do you agree with each ' +
      'statement? 1 = strongly disagree, 3 = neither, 5 = strongly agree. Please answer every item.');

  for (var i = 0; i < Q12.length; i++) {
    if (CFG.oneItemPerPage && i > 0) {
      form.addPageBreakItem().setTitle('Item ' + (i + 1) + ' of 12').setHelpText(FRAMING);
    }
    addLikert_(form, Q12[i].t, 'Q' + Q12[i].n);
  }

  // ── link a response spreadsheet
  var ssUrl = '(not created)';
  var props = PropertiesService.getScriptProperties();
  props.setProperty('FORM_ID', form.getId());

  if (CFG.createSpreadsheet) {
    var ss = SpreadsheetApp.create(CFG.title + ' — responses');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    props.setProperty('SS_ID', ss.getId());
    ssUrl = ss.getUrl();
    writeMapSheet_(ss);
  }

  var out = [
    '',
    '════════════════════════════════════════════════════════════',
    ' SHIFT SIGNAL · MODE B — created',
    '════════════════════════════════════════════════════════════',
    ' Send to respondents : ' + form.getPublishedUrl(),
    ' Edit the form       : ' + form.getEditUrl(),
    ' Responses sheet     : ' + ssUrl,
    '',
    ' Items               : Q0 + 12 Q12 items, ' + CFG.itemStyle + ' style',
    ' Dimensions          : D1(2) D2(2) D3(3) D4(3) D5(2) — matches Mode A',
    '',
    ' NEXT: once the first response arrives, run  setupScoring',
    '       to add the Scoring sheet that computes the Q12 index.',
    '════════════════════════════════════════════════════════════'
  ].join('\n');
  Logger.log(out);
  return { formUrl: form.getPublishedUrl(), editUrl: form.getEditUrl(), sheetUrl: ssUrl };
}

/** One Likert item, in whichever style CFG asks for. */
function addLikert_(form, text, tag) {
  if (CFG.itemStyle === 'choice') {
    form.addMultipleChoiceItem()
      .setTitle(tag + '. ' + text)
      .setChoiceValues(LIKERT)
      .setRequired(true);
  } else {
    form.addScaleItem()
      .setTitle(tag + '. ' + text)
      .setBounds(1, 5)
      .setLabels('Strongly disagree', 'Strongly agree')
      .setRequired(true);
  }
}

// ─── SCORING ───────────────────────────────────────────────────────────────
/**
 * Adds a Scoring sheet: one row per response, the twelve raw item scores, the
 * five dimension means, and the engagement index on 1–5 and 0–100 — the same
 * arithmetic Mode A uses, so the two indices are directly comparable.
 * Run once, after at least one response has been submitted.
 */
function setupScoring() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SS_ID');
  if (!ssId) throw new Error('No linked spreadsheet. Run createModeBForm first, or set SS_ID in Project Settings → Script properties.');

  var ss = SpreadsheetApp.openById(ssId);
  var resp = findResponseSheet_(ss);
  if (!resp) throw new Error('No response sheet found yet. Submit one test response, then run setupScoring again.');

  var header = resp.getRange(1, 1, 1, resp.getLastColumn()).getValues()[0];
  var col = {};
  for (var i = 0; i < header.length; i++) {
    var h = String(header[i]).trim();
    var m = h.match(/^(Q\d{1,2})\./);
    if (m) col[m[1]] = i + 1;
    if (/^Respondent code/i.test(h)) col.code = i + 1;
    if (/^Programme/i.test(h)) col.prog = i + 1;
    if (/^Timestamp/i.test(h)) col.ts = i + 1;
  }
  var missing = [];
  for (var k = 1; k <= 12; k++) if (!col['Q' + k]) missing.push('Q' + k);
  if (missing.length) throw new Error('Could not find these item columns in "' + resp.getName() + '": ' + missing.join(', '));

  var q = quoteSheet_(resp.getName());
  var numeric = CFG.itemStyle === 'choice';   // text answers need the leading digit extracted
  function itemRange(n) {
    var c = colA1_(col['Q' + n]);
    var r = q + '!' + c + '2:' + c;
    return numeric ? 'IFERROR(VALUE(LEFT(' + r + ', 1)), "")' : r;
  }
  function dimFormula(items) {
    var parts = items.map(function (n) { return 'N(' + itemRange(n) + ')'; });
    return '(' + parts.join('+') + ')/' + items.length;
  }

  var sh = ss.getSheetByName('Scoring');
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet('Scoring', 0);

  var head = ['Timestamp', 'Respondent code', 'Programme'];
  for (var n = 1; n <= 12; n++) head.push('Q' + n);
  DIM_MAP.forEach(function (d) { head.push(d.key + ' ' + d.name); });
  head.push('Q12 index (1–5)', 'Q12 index (0–100)', 'Engagement band');
  sh.getRange(1, 1, 1, head.length).setValues([head]);

  var live = q + '!' + colA1_(col.code || 2) + '2:' + colA1_(col.code || 2);
  var guard = 'IF(LEN(' + live + ')=0, "", ';

  var f = [];
  f.push(arr_(guard + q + '!' + colA1_(col.ts || 1) + '2:' + colA1_(col.ts || 1) + ')'));
  f.push(arr_(guard + live + ')'));
  f.push(arr_(guard + q + '!' + colA1_(col.prog || 3) + '2:' + colA1_(col.prog || 3) + ')'));
  for (var n2 = 1; n2 <= 12; n2++) f.push(arr_(guard + itemRange(n2) + ')'));
  DIM_MAP.forEach(function (d) { f.push(arr_(guard + dimFormula(d.items) + ')')); });

  var firstDim = 4 + 12;                                  // column P
  var dimCols = DIM_MAP.map(function (d, i) { return colA1_(firstDim + i) + '2:' + colA1_(firstDim + i); });
  var idxCol = colA1_(firstDim + DIM_MAP.length);
  f.push(arr_('IF(LEN($B2:$B)=0, "", (' + dimCols.join('+') + ')/' + DIM_MAP.length + ')'));
  f.push(arr_('IF(LEN($B2:$B)=0, "", (' + idxCol + '2:' + idxCol + '-1)/4*100)'));
  f.push(arr_('IF(LEN($B2:$B)=0, "", IF(' + idxCol + '2:' + idxCol + '>=4, "Engaged", IF(' + idxCol + '2:' + idxCol + '>=3, "Not engaged", "Actively disengaged")))'));

  for (var c2 = 0; c2 < f.length; c2++) sh.getRange(2, c2 + 1, 1, 1).setFormula(f[c2]);

  sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setWrap(true);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(3);
  sh.getRange(2, firstDim, 200, DIM_MAP.length + 2).setNumberFormat('0.00');
  sh.autoResizeColumns(1, 3);

  Logger.log('Scoring sheet built against "' + resp.getName() + '". Index column: ' + idxCol +
             '. Open: ' + ss.getUrl());
}

/** Documents the item → dimension map, for the report appendix. */
function writeMapSheet_(ss) {
  var sh = ss.getSheetByName('Item map') || ss.insertSheet('Item map');
  var rows = [['Item', 'Dimension', 'Statement (retrospective wording)']];
  rows.push(['Q0', 'reported separately — not in the index', Q0]);
  Q12.forEach(function (it) { rows.push(['Q' + it.n, it.dim, it.t]); });
  rows.push([]);
  rows.push(['Dimension', 'Items', 'Weight in the index']);
  DIM_MAP.forEach(function (d) {
    rows.push([d.key + ' ' + d.name, d.items.map(function (n) { return 'Q' + n; }).join(', '), '1/' + DIM_MAP.length + ' (equal)']);
  });
  rows.push([]);
  rows.push(['Scoring', 'dimension score = unweighted mean of its items; index = unweighted mean of the five dimension scores; 0–100 = (index − 1) / 4 × 100', '']);
  rows.push(['Bands', '>= 4.00 engaged · 3.00–3.99 not engaged · < 3.00 actively disengaged', '']);
  sh.getRange(1, 1, rows.length, 3).setValues(rows.map(function (r) {
    return [r[0] || '', r[1] || '', r[2] || ''];
  }));
  sh.getRange(1, 1, 1, 3).setFontWeight('bold');
  sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 260); sh.setColumnWidth(3, 520);
  sh.getRange(1, 1, rows.length, 3).setWrap(true);
}

// ─── helpers ───────────────────────────────────────────────────────────────
function findResponseSheet_(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getLastColumn() < 1 || sheets[i].getLastRow() < 1) continue;
    var h = String(sheets[i].getRange(1, 1).getValue()).trim();
    if (/^timestamp$/i.test(h)) return sheets[i];
  }
  return null;
}
function quoteSheet_(name) { return "'" + String(name).replace(/'/g, "''") + "'"; }
function arr_(body) { return '=ARRAYFORMULA(' + body + ')'; }
function colA1_(n) {
  var s = '';
  while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; }
  return s;
}
