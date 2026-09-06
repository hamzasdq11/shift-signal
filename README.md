# Shift Signal

**An engagement-measurement instrument built as a scenario simulation.**

Built for *Introduction to HRM*, Term VII, IIM Ranchi — a study of AI-enabled, real-time
engagement measurement.

One respondent, one previous employer, one instrument:

| | The simulation |
|---|---|
| **What it is** | A 12-station scenario walk through one retrospective workday, 09:10 → 18:40 |
| **How it feels** | Interactive, scenario-based, with a live engagement trace |
| **Captures** | Choices, per-item latency, answer revisions, a within-day trace, a critical incident, an AI-generated adaptive probe |
| **Returns** | Engagement index on 1–5 and 0–100 |

---

## Run it

`shift-signal.html` is a single self-contained file. Open it in any browser — no build
step, no server, no dependencies.

- **Respondent flow** — open the file. Consent → the simulation → closing questions →
  a receipt with the engagement index and the within-day trace.
- **Instrument design record** — `#/methods`. Construct, the five dimensions, the full
  item bank with scoring ladders, the scoring model, limitations and references.
- **Researcher view** — `#/analysis`, access code `IIMR-T7`. Dimension profile, cost of
  measurement, the within-day trace, coverage tracking, prioritised recommendations, and
  CSV/JSON export.

The access code is a courtesy screen that keeps respondents out of the results. It is not
a security control.

---

## The construct

Engagement is defined as **the investment of the self in a work role** — Kahn's (1990)
personal engagement, expressed as the vigour, dedication and absorption measured by the
UWES (Schaufeli et al., 2002), and made possible by the job resources of the JD-R model
(Bakker & Demerouti, 2007).

Five dimensions span Kahn's three psychological conditions — meaningfulness, safety and
availability:

| | Dimension | Stations | Theoretical anchor |
|---|---|---|---|
| **D1** | Role Clarity & Resources | 2 | Kahn: availability · JD-R: resources |
| **D2** | Recognition & Being Valued | 2 | Kahn: meaningfulness & safety |
| **D3** | Growth & Progress | 3 | JD-R: developmental resources |
| **D4** | Voice & Team Trust | 3 | Kahn: psychological safety |
| **D5** | Meaning & Strengths Use | 2 | Kahn: meaningfulness · UWES: absorption |

---

## Scoring

```
raw option value   ∈ {4, 3, 2, 1}          full presence → active absence
rescaled           s = 1 + (raw − 1) × 4/3  →  5.00 / 3.67 / 2.33 / 1.00
dimension score    unweighted mean of its stations
engagement index   unweighted mean of the five dimension scores
0–100              (index − 1) / 4 × 100
bands              ≥4.00 engaged · 3.00–3.99 not engaged · <3.00 actively disengaged
```

Interaction signals — latency, revisions, the within-day trace — are recorded but
deliberately **excluded** from the index; they are diagnostic, not construct-valid.

---

## Data capture

Every run is written to the browser's local storage first, so a refresh never costs a
respondent their answers. On completion the receipt issues a **result code** containing
the full anonymised record, which the project group pastes into *Researcher view →
Data & export → Add a respondent*.

For three respondents the intended procedure is a briefed sitting on the group's own
device — all three runs then land in the same researcher view with no handback step.

Exports: summary CSV (one row per respondent), item-level CSV (one row per station, with
latencies), and full JSON.

Respondents are identified only as R1–R3 with programme and work-history metadata. No
name, email or employer name is collected at any point.

---

## Repository

```
shift-signal.html              the entire application, self-contained
test/
  build-check.js               extracts the inline <script> for testing
  harness.js                   headless logic suite — scoring, all figures, CSV exports
  e2e.js                       Playwright end-to-end, phone + desktop, both themes
  package.json
```

### Tests

```bash
cd test && npm install
npm run lint     # extract + syntax check
npm run logic    # drive a synthetic run through the real state machine
npm run e2e      # full click-through at 390px and 1440px, light and dark
```

The end-to-end suite asserts: the complete respondent flow completes, no runtime errors,
no horizontal page scroll on any screen, instrument-bar elements never overlap, every
figure renders free of `NaN`/`undefined`, CSV header and row widths match, the result
code round-trips, and **no text falls below its WCAG AA contrast requirement in either
theme**.

---

## Design notes

- **Series colour** — teal `#00897B` / `#2FA89A`. Validated for colour-vision-deficiency
  separation, chroma, lightness band and contrast against both the light and dark chart
  surfaces.
- **Themes** — the complete light palette is defined on bare `:root`; the dark values are
  redefined under both `prefers-color-scheme: dark` and `[data-theme="dark"]`, so the page
  resolves correctly in all three viewer states.
- **Type** — Archivo (structure), Newsreader (scenario narrative), IBM Plex Mono (data).
- **Option order** is shuffled per respondent from a seed derived from the run id, so
  position bias is removed without a page refresh reshuffling mid-study.

## References

Bakker, A. B., & Demerouti, E. (2007). The job demands–resources model: State of the art.
*Journal of Managerial Psychology, 22*(3), 309–328.

Harter, J. K., Schmidt, F. L., & Hayes, T. L. (2002). Business-unit-level relationship
between employee satisfaction, employee engagement, and business outcomes: A meta-analysis.
*Journal of Applied Psychology, 87*(2), 268–279.

Kahn, W. A. (1990). Psychological conditions of personal engagement and disengagement at
work. *Academy of Management Journal, 33*(4), 692–724.

Macey, W. H., & Schneider, B. (2008). The meaning of employee engagement.
*Industrial and Organizational Psychology, 1*(1), 3–30.

Podsakoff, P. M., MacKenzie, S. B., Lee, J.-Y., & Podsakoff, N. P. (2003). Common method
biases in behavioral research. *Journal of Applied Psychology, 88*(5), 879–903.

Schaufeli, W. B., Salanova, M., González-Romá, V., & Bakker, A. B. (2002). The measurement
of engagement and burnout. *Journal of Happiness Studies, 3*(1), 71–92.
