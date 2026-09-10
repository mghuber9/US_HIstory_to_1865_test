# HIST 1301 Complete-Course Upgrade

## Completed implementation

- Preserved the existing Unit 1 Learn, Practice, Multiple Choice, smart test selection, local progress, remote reporting, accessibility patterns, responsive styling, and timeline.
- Added 18 complete sections for Units 2–4 using the existing section/data architecture.
- Added Learn screens, Learn Checks, recall practice, multiple-choice practice, Test Mode inclusion, unit/section metadata, and tracking for every new section.
- Added a course home page and navigation spanning all four units.
- Extended the timeline from the Revolution through the Thirteenth Amendment.
- Replaced passive Practice Test results with a two-stage review: retry missed questions first, then a full test/Learn review.

## Question-bank counts

| Unit | Section | Questions |
|---|---|---:|
| 2 | 5.1 Rebellion to Revolution | 20 |
| 2 | 5.2 The Final Push to Victory | 20 |
| 2 | 6.1 A New Nation | 20 |
| 2 | 6.2 The Federalist Era | 20 |
| 2 | 7.1 The Early Republic | 20 |
| 2 | 7.2 The War of 1812 | 20 |
| 2 | 8 The Market Economy | 20 |
| **Unit 2 total** |  | **140** |
| 3 | 9 The Era of Good Feelings | 20 |
| 3 | 10 The Jacksonian Era | 20 |
| 3 | 11.1 The South | 20 |
| 3 | 11.2 Black Society in the South | 20 |
| 3 | 12.1 Religion & Romanticism | 20 |
| 3 | 12.2 The Reform Impulse | 20 |
| **Unit 3 total** |  | **120** |
| 4 | 13.1 Western Expansion | 20 |
| 4 | 13.2 The Mexican-American War | 20 |
| 4 | 14 The Gathering Storm | 20 |
| 4 | 15.1 The War for the Union | 20 |
| 4 | 15.2 The Faltering Confederacy | 20 |
| **Unit 4 total** |  | **100** |
| **New total** |  | **360** |

Each new section has 10 Casey-style core questions and 10 deeper-understanding questions: **180 core and 180 deeper items** in the full new bank. Smart Test Mode substantially favors core items while retaining deeper questions. The large bank preserves variation between 20-question attempts.

## Casey-style calibration

The actual Unit 1 exam evidence showed short stems, four answer choices, mostly direct identification or definition, occasional exception wording, and distractors drawn from nearby course material. New core items use short identification/description prompts and course-neighbor distractors. Deeper items focus on cause, effect, importance, and relationships without using obscure trivia. No Unit 1 exam question was copied into Units 2–4.

## Learn coverage

Each new Learn section contains 10 focused concept screens. Each screen teaches a central person, event, policy, movement, or relationship and explains why it matters. Every new question ID is attached to a Learn Check, and each Learn concept has a recall-practice prompt plus two multiple-choice applications. Coverage emphasizes the professor's chapter organization: revolutionary chronology and strategy; constitutional and party development; early-republic diplomacy; the market economy; sectional politics and slavery; religion and reform; western expansion; the slavery crisis; and Civil War military/political turning points.

## Practice Test review

Stage 1 presents only originally missed items. The original wrong choice is struck through and disabled. The correct answer remains hidden until the student submits a retry. Retry-correct and retry-incorrect outcomes are tracked separately.

Stage 2 displays the full test and result history beside the complete Learn section associated with the selected question. Each question includes unit and section metadata, original answer/result, retry answer/result when applicable, correct answer, and explanation. Clicking a question loads its Learn section; the Learn pane also has a manual section selector. The layout stacks on screens below 800px.

## Tracking

- Local progress remains in the existing `hist1301.studyProgress.v1` store, now separated by `unit1` through `unit4`.
- Remote reporting continues to use the existing endpoint and spreadsheet schema.
- New outcomes use existing fields and `Details` JSON: `test_retry_scored`, `full_review_opened`, and `learn_section_reviewed` events; retry counts are included with test completion.
- No Google Apps Script or workbook schema change is required.

## Validation performed

- JavaScript syntax checks for new and changed scripts.
- 500 Unit 1 smart-selection runs from the existing regression test: 20 unique questions and balanced section coverage.
- Remote offline queue, retry, and identifier tests.
- Course integrity audit: 26 total sections, 18 new sections, 360 new questions, 626 unique unit/section/question keys, no malformed four-choice objects, no invalid answers, no duplicate keys, no invalid Learn Check references, and no broken local links in section pages.
- Static verification that all new section pages load the shared application, progress, and reporting layers and that all new Test Mode questions point to valid Learn sections.

## Limitation

The included Playwright browser smoke test could not run in this workspace because its Chromium binary was not installed. Static, VM-based JavaScript, selection, reporting, link, and data-integrity checks passed. The repository retains the smoke test for a final browser pass after upload or in any environment with Playwright Chromium installed.
