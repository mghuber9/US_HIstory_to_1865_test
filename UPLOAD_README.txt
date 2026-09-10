HIST 1301 review/tracking patch — 2026-09-10

Only TWO website files changed:
  css/styles.css
  js/test.js

Fix 1: Stage 2 test review uses a wide desktop layout with two independently scrolling panes (test questions on the left, Learn material on the right). It collapses to one column only on narrow/mobile screens.

Fix 2: The Score_Log test_completed row is now Activity_Mode = test and its Correct/Total/Percentage remain the ORIGINAL test score. Retry diagnostics remain in Details (retry_attempted, retry_correct, retry_remaining_incorrect). Review/retry activity still appears in Event_Log as test_review.

No Google Apps Script or Google Sheet changes are required.
