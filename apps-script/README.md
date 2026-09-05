# Mode B — Gallup Q12 as a Google Form

`mode-b-q12-form.gs` builds the traditional-survey arm of the study: the Gallup Q12
reworded in the past tense for a former employer, as a Google Form with a linked
response sheet and automatic scoring.

## Run it

1. Open [script.google.com](https://script.google.com) → **New project**.
2. Paste `mode-b-q12-form.gs` over the contents of `Code.gs` and save.
3. Run **`createModeBForm`**. Authorise when prompted (Forms, Sheets, Drive).
4. Open **Execution log** — it prints the respondent link, the edit link and the
   response-sheet link.
5. After the first response arrives, run **`setupScoring`** once.

## What it creates

| Part | Contents |
|---|---|
| Consent section | Two required confirmations: voluntary participation, and prior full-time work experience |
| Metadata section | Respondent code (R1–R3), programme, sector, role, months of experience — identical to the Mode A intake so the two records pair |
| Q0 | Gallup's overall-satisfaction item, reported separately and excluded from the index |
| Q12 | The twelve items in canonical order, 5-point Likert, all required |
| `Item map` sheet | Item → dimension mapping, weights, scoring rules and band thresholds — ready for the report appendix |
| `Scoring` sheet | One row per response: the twelve raw scores, five dimension means, index on 1–5, index on 0–100, and the engagement band |

## Configuration

Edit `CFG` at the top of the file.

- `itemStyle: 'scale'` — a 1–5 scale with end labels. Exports as a **number**. Recommended.
- `itemStyle: 'choice'` — five labelled radio buttons. Exports as text; `setupScoring`
  handles the conversion automatically.
- `oneItemPerPage: true` — one item per page. Slower to complete, but reduces priming
  across items.

## Scoring

Identical arithmetic to Mode A, which is what makes the two modes comparable:

```
dimension score = unweighted mean of that dimension's items
index (1–5)     = unweighted mean of the five dimension scores
index (0–100)   = (index − 1) / 4 × 100
bands           = ≥4.00 engaged · 3.00–3.99 not engaged · <3.00 actively disengaged
```

Dimension map: **D1** Q1,Q2 · **D2** Q4,Q5 · **D3** Q6,Q11,Q12 · **D4** Q7,Q9,Q10 · **D5** Q3,Q8.

## Note

Q12® is a trademark of Gallup, Inc. The items here are adapted into the past tense for
retrospective, educational use in coursework. This is not a Gallup product or endorsement,
and published Gallup benchmarks do not strictly apply to an adapted instrument.
