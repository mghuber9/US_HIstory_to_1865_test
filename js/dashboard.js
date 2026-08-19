(() => {
  "use strict";

  const progress = window.HistProgress;
  const sections = Object.values(window.UNIT1_SECTIONS || {}).sort((a, b) => a.id.localeCompare(b.id));
  const panel = document.getElementById("progressPanel");
  if (!progress || !panel || !sections.length) return;

  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const sectionTitles = Object.fromEntries(sections.map(section => [section.id, section.title]));

  function render() {
    const snapshot = progress.getSnapshot(totalQuestions, sectionTitles);
    const recentScores = snapshot.recentTests.length
      ? snapshot.recentTests.map(test => `<span class="score-pill" title="${formatDate(test.timestamp)}">${test.score}/${test.total}</span>`).join('<span class="score-arrow" aria-hidden="true">→</span>')
      : '<span class="progress-empty">No completed tests yet</span>';

    const review = snapshot.reviewNext
      ? `<strong>${escapeHtml(snapshot.reviewNext.id)} ${escapeHtml(snapshot.reviewNext.title)}</strong><span>${snapshot.reviewNext.accuracy}% accuracy across ${snapshot.reviewNext.responses} graded responses</span>`
      : '<strong>Not enough data yet</strong><span>Complete a few graded questions to identify a review area.</span>';

    panel.innerHTML = `
      <div class="progress-heading">
        <div>
          <p class="eyebrow">LOCAL PROGRESS</p>
          <h2>Your Unit 1 Progress</h2>
        </div>
        <span class="local-note">Saved only in this browser</span>
      </div>
      <div class="progress-grid">
        <div class="progress-stat recent-tests">
          <span class="progress-label">Recent Test Scores</span>
          <div class="score-history" aria-label="Recent test scores">${recentScores}</div>
        </div>
        <div class="progress-stat">
          <span class="progress-label">Overall Accuracy</span>
          <strong>${snapshot.accuracy === null ? '—' : `${snapshot.accuracy}%`}</strong>
          <span>${snapshot.answerCount ? `${snapshot.totalCorrect} correct of ${snapshot.answerCount} graded responses` : 'No graded responses yet'}</span>
        </div>
        <div class="progress-stat">
          <span class="progress-label">Coverage</span>
          <strong>${snapshot.coverage} / ${snapshot.totalQuestions}</strong>
          <span>unique Unit 1 questions encountered</span>
        </div>
        <div class="progress-stat review-stat">
          <span class="progress-label">Review Next</span>
          ${review}
        </div>
      </div>
      <details class="progress-reset">
        <summary>Progress options</summary>
        <p>Resetting removes Unit 1 question history and test scores stored in this browser.</p>
        <button class="secondary reset-button" id="resetProgress">Reset Unit 1 Progress</button>
      </details>
    `;

    document.getElementById("resetProgress").addEventListener("click", () => {
      const confirmed = window.confirm("Reset all Unit 1 progress in this browser? This will permanently erase question history and test scores.");
      if (!confirmed) return;
      progress.resetUnit();
      render();
    });
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Completed test";
    return date.toLocaleString();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  render();
})();
