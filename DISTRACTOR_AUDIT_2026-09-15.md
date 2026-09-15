# Multiple-Choice Distractor Audit - 2026-09-15

## Scope

The authoritative repository contains 626 multiple-choice questions across 26 sections in Units 1-4. The repository does **not** contain a Unit 5 registry, Unit 5 section pages, a Unit 5 test selector option, or a Unit 5 question bank. No Unit 5 content was invented or added during this audit.

| Unit | Questions examined | Questions with distractor changes |
| --- | ---: | ---: |
| Unit 1 | 266 | 53 |
| Unit 2 | 140 | 140 |
| Unit 3 | 120 | 120 |
| Unit 4 | 100 | 100 |
| Unit 5 | 0 present in repository | 0 |
| **Total** | **626** | **413** |

## Main cue patterns found

The strongest problem was in the newer Units 2-4 bank. Many identification questions paired one full descriptive correct answer with three very short labels, while many deeper questions used the repeated distractor template `It was primarily associated with ...`. This made the correct answer visually and stylistically distinctive even when choices were randomized.

The automated baseline audit also found unusually short distractors, correct answers with substantially greater detail/specificity, and occasional grammatical-structure mismatches.

Baseline measurements across all 626 questions:

- Correct answer was the unique longest choice in 382 questions (61.0%).
- 179 questions contained at least one extremely short distractor relative to the correct answer.
- The average correct-answer word count was 2.561 times the mean distractor word count.
- `It was primarily associated with ...` appeared 540 times in distractors and 0 times in correct answers.

After the upgrade:

- Correct answer is the unique longest choice in 57 questions (9.1%).
- No question triggers the audit's very-short-distractor warning.
- The average correct-answer / mean-distractor word-count ratio is 0.993.
- The repeated `It was primarily associated with ...` distractor pattern has been eliminated.
- The intentionally sensitive audit still reports 66 low-level warnings, all limited to grammatical-shape or specificity differences; there are no remaining `correct-much-longer` or `very-short-distractor` warnings. These residual warnings were not mechanically flattened because doing so would make otherwise natural choices artificially uniform.

## How distractors were improved

For Units 2-4, correct answers, question wording, explanations, IDs, topics, and answer keys were preserved. Distractors were replaced with historically accurate descriptions or consequences already taught elsewhere in the same course bank, favoring related material and similar wording/detail levels. This removes the visual cue while keeping wrong answers plausible to a partially prepared student.

For Unit 1, 53 questions with stronger length, specificity, or structural cueing were improved. Existing Learn content and already-established course facts were used as the source for replacement concepts.

## Correct-answer position verification

`js/test.js` and `js/app.js` both use Fisher-Yates-style shuffling that tags the correct choice before shuffling and then recomputes the answer index afterward. No test-selection or randomization code was changed.

A simulation of 40,000 generated test questions (500 20-question tests for each of Units 1-4) produced:

- A: 10,046 (25.11%)
- B: 10,110 (25.27%)
- C: 9,934 (24.84%)
- D: 9,910 (24.77%)

This is consistent with genuine answer-position randomization and shows no predictable correct-position pattern.

## Historical-content integrity

A semantic before/after comparison verified:

- section count unchanged: 26
- question count unchanged: 626
- question IDs and counts unchanged
- question wording unchanged
- correct-answer text unchanged
- explanations unchanged
- Learn screens unchanged
- Practice prompts unchanged

No existing correct answer was silently changed for factual reasons. No question required a factual/interpretive human-review flag as part of this distractor upgrade. The one scope item requiring attention is that Unit 5 is absent from the authoritative repository.

## Regression checks

The repository's automated checks pass after the upgrade:

- `tests/course-integrity-test.js`: 26 sections, 626 unique question keys, 0 broken Learn references, 0 malformed questions, complete Learn-check coverage.
- `tests/smart-test-selection-test.js`: 100 default selections plus 400 cumulative-range selections, 20 questions per test, 0 duplicates.
- `tests/remote-tracker-test.js`: offline queue, retry behavior, and identifiers all pass.
- JavaScript syntax check passes for all data, application, test, and audit JavaScript files.

The functional JavaScript for Practice Mode, Test Mode, retry review, full-test/Learn review, local tracking, remote tracking, Timeline, and test selection was not modified. Only question-bank data files were changed, plus the development audit tool and this report.

## Files modified / added

Modified question-bank files:

- `data/1-1.js`
- `data/1-2.js`
- `data/2-1.js`
- `data/2-2.js`
- `data/3-1.js`
- `data/3-2.js`
- `data/4-1.js`
- `data/4-2.js`
- `data/course-data.js`

Added development/audit files:

- `tools/question-choice-audit.js` - non-student-facing heuristic audit for answer-choice cueing
- `DISTRACTOR_AUDIT_2026-09-15.md` - this audit report
