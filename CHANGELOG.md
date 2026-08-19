# Unit 1 Upgrade Changelog — August 2026

## Summary

This update preserves the existing static GitHub Pages architecture and historical content while adding a one-button Learn Check workflow, a 20-question Unit 1 Test Mode, browser-local performance tracking, smart test rotation, and a modest student-facing progress panel.

No server, account, database, login, external service, framework, or build step was added.

## Files modified

- `index.html` — updates Test Mode description to 20 questions and adds the Unit 1 progress panel.
- `test.html` — updates Test Mode copy to 20 questions and loads the shared tracking layer.
- `index2.html` — keeps its Test Mode question-count copy consistent at 20.
- `js/app.js` — implements the one-button Learn Check workflow and records graded Learn/section-MC activity.
- `js/test.js` — implements 20-question Test Mode, smart selection, test history, and post-submit explanation review.
- `css/styles.css` — adds styles for Learn instructions, progress, reset controls, test notices, and answer review.
- `sections/1-1.html` through `sections/4-2.html` — load the shared progress script before the existing section app.
- `README.md` — documents the browser-local tracking behavior.

## Files added

- `js/progress.js` — shared versioned localStorage API for question/test history.
- `js/dashboard.js` — calculates and displays recent scores, accuracy, coverage, and Review Next.
- `CHANGELOG.md` — this file.

## Learn Check workflow

For each Check Your Understanding question:

1. Select an answer.
2. The single primary action is **Check Answer**.
3. After checking, feedback and explanation appear.
4. That same primary action becomes **Next Check →**, **Next →**, or **Finish Learn →**.

A Check cannot be advanced until it has been graded. Correct/incorrect feedback continues to use explicit text and symbols in addition to color.

## Tracking

Storage key:

`hist1301.studyProgress.v1`

The data is versioned and organized by unit so the same model can be reused later for Units 2–4.

Simplified structure:

```text
{
  version: 1,
  units: {
    unit1: {
      questions: {
        "1.1:q01": {
          questionId,
          section,
          timesSeen,
          timesCorrect,
          timesIncorrect,
          lastResult,
          lastSeen
        }
      },
      testAttempts: [
        {
          timestamp,
          score,
          total,
          percentage,
          questionKeys,
          sectionResults
        }
      ]
    }
  }
}
```

Question IDs already present in the question bank were preserved. Because IDs such as `q01` repeat across sections, the tracking key namespaces the existing ID with its section, for example `1.1:q01`.

Learn Checks, section Multiple Choice, and submitted Unit 1 Tests count as graded responses. Self-rated active-recall Practice prompts do not affect objective accuracy.

Test history is capped at the 50 most recent attempts to prevent unbounded browser storage growth. The dashboard displays the five most recent scores.

## Smart 20-question selection

Each test targets exactly five questions from each chapter (20 total) and keeps both sections within each chapter represented.

Within a chapter, available questions are grouped into three understandable categories:

- **Unseen** — strongest selection weight.
- **Weak** — previously missed or still below 80% historical accuracy.
- **Correct/review** — previously successful questions retained for spaced reinforcement.

When all three categories exist, category selection is weighted approximately 60% unseen, 25% weak, and 15% correct/review. If a category is unavailable, the remaining weights naturally re-balance.

Within the chosen category, selection also considers:

- repeated misses and last result,
- how long ago the question was last seen,
- a penalty for questions used in the two most recent completed tests,
- a stronger penalty for very recent exposure,
- a modest section-balance adjustment.

This allows missed questions to return even while unseen questions remain, periodically recycles correct questions, and naturally shifts toward weak/older material as coverage grows.

## Student progress display

The Unit 1 home page now shows:

- Recent Test Scores
- Overall Accuracy
- Coverage (calculated dynamically from the current question bank; currently 266 questions)
- Review Next

`Review Next` is intentionally withheld until a section has at least three graded responses, which avoids labeling a section as the weakest based on a single answer.

## Reset

**Progress options → Reset Unit 1 Progress** removes only Unit 1 history stored in the current browser. A confirmation dialog is required before deletion.

## Testing performed

- JavaScript syntax checks on all modified/new scripts.
- Dynamic question-bank count and per-section ID uniqueness checks.
- Static checks for obsolete 50-question interface text.
- Script/path checks across all eight section pages.
- Headless Chromium DOM interaction tests covering Learn, Practice, Test Mode, persistence, reset confirmation, post-submit explanations, smart-selection behavior, and all section page loads.
- Smart-selection simulations with little history, partial history, and broad history.

The sandbox blocks normal URL navigation in Chromium, so browser interaction tests loaded the repository's actual HTML/CSS/JS into Chromium directly rather than navigating to a local web-server URL. No console/page errors occurred in those tests.

## Assumptions / manual review notes

- Progress is intentionally local to one browser profile/device. It will not sync to another browser or device and can be lost if site/browser storage is cleared.
- The current repository contains 266 Unit 1 multiple-choice questions; coverage reads this dynamically rather than hard-coding it.
- The smart selector is deliberately heuristic and transparent rather than a proprietary mastery/readiness score.
