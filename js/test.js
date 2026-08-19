(() => {
  "use strict";

  const TEST_SIZE = 20;
  const PER_CHAPTER = 5;
  const tracker = window.HistProgress || null;
  const sections = Object.values(window.UNIT1_SECTIONS || {}).sort((a, b) => a.id.localeCompare(b.id));
  const start = document.getElementById("testStart");
  const activity = document.getElementById("testActivity");
  const card = document.getElementById("testCard");
  const progress = document.getElementById("testProgress");
  let state = {};

  function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function prepareQuestion(question, section) {
    const tagged = question.choices.map((text, index) => ({ text, correct: index === question.answer }));
    const choices = shuffle(tagged);
    return {
      ...question,
      section: section.id,
      sectionTitle: section.title,
      trackingKey: tracker ? tracker.questionKey(section.id, question.id) : `${section.id}:${question.id}`,
      choices: choices.map(item => item.text),
      answer: choices.findIndex(item => item.correct)
    };
  }

  function buildSmartTest() {
    const unitData = tracker ? tracker.getUnitData() : { questions: {}, testAttempts: [] };
    const recentKeys = new Set(
      (unitData.testAttempts || [])
        .slice(-2)
        .flatMap(attempt => attempt.questionKeys || [])
    );
    const now = Date.now();
    const chapterGroups = groupSectionsByChapter(sections);
    const picked = [];

    ["1", "2", "3", "4"].forEach(chapter => {
      const chapterSections = chapterGroups[chapter] || [];
      picked.push(...selectChapterQuestions(chapterSections, PER_CHAPTER, unitData.questions || {}, recentKeys, now));
    });

    if (picked.length < TEST_SIZE) {
      const pickedKeys = new Set(picked.map(item => `${item.section.id}:${item.question.id}`));
      const remaining = sections.flatMap(section => section.questions
        .filter(question => !pickedKeys.has(`${section.id}:${question.id}`))
        .map(question => ({ section, question })));
      remaining.sort((a, b) => candidateScore(b, unitData.questions || {}, recentKeys, now) - candidateScore(a, unitData.questions || {}, recentKeys, now));
      picked.push(...remaining.slice(0, TEST_SIZE - picked.length));
    }

    return shuffle(picked.slice(0, TEST_SIZE).map(item => prepareQuestion(item.question, item.section)));
  }

  function groupSectionsByChapter(allSections) {
    return allSections.reduce((groups, section) => {
      const chapter = String(section.id).split(".")[0];
      if (!groups[chapter]) groups[chapter] = [];
      groups[chapter].push(section);
      return groups;
    }, {});
  }

  function selectChapterQuestions(chapterSections, count, history, recentKeys, now) {
    if (!chapterSections.length) return [];

    const candidates = chapterSections.flatMap(section =>
      section.questions.map(question => ({ section, question }))
    );
    const chosen = [];
    const chosenKeys = new Set();
    const sectionCounts = Object.fromEntries(chapterSections.map(section => [section.id, 0]));

    // Keep both sections represented before filling the remaining chapter slots.
    chapterSections.forEach(section => {
      if (chosen.length >= count || !section.questions.length) return;
      const sectionCandidates = section.questions.map(question => ({ section, question }));
      const best = chooseCandidate(sectionCandidates, history, recentKeys, now, () => 0);
      if (best) addChoice(best);
    });

    while (chosen.length < count) {
      const available = candidates.filter(item => !chosenKeys.has(`${item.section.id}:${item.question.id}`));
      if (!available.length) break;
      const best = chooseCandidate(available, history, recentKeys, now, balanceAdjustment);
      if (!best) break;
      addChoice(best);
    }

    return chosen;

    function addChoice(item) {
      const key = `${item.section.id}:${item.question.id}`;
      chosen.push(item);
      chosenKeys.add(key);
      sectionCounts[item.section.id] = (sectionCounts[item.section.id] || 0) + 1;
    }

    function balanceAdjustment(item) {
      const thisCount = sectionCounts[item.section.id] || 0;
      const otherCounts = Object.entries(sectionCounts)
        .filter(([id]) => id !== item.section.id)
        .map(([, value]) => value);
      const lowestOther = otherCounts.length ? Math.min(...otherCounts) : 0;
      const imbalance = thisCount - lowestOther;
      let adjustment = 0;

      // Usually produces a 3/2 chapter split, while still allowing a 4/1 split
      // when tracking gives a meaningful reason to revisit one section more heavily.
      if (imbalance >= 1) adjustment -= imbalance * 8;
      if (thisCount >= 3) adjustment -= 18;
      return adjustment;
    }
  }

  function chooseCandidate(candidates, history, recentKeys, now, adjustmentFor) {
    if (!candidates.length) return null;
    const category = chooseCategory(candidates, history);
    const pool = candidates.filter(item => candidateCategory(item, history) === category);
    const rankedPool = pool.length ? pool : candidates;

    return rankedPool
      .map(item => ({
        item,
        score: candidateScore(item, history, recentKeys, now) + adjustmentFor(item)
      }))
      .sort((a, b) => b.score - a.score)[0]?.item || null;
  }

  function chooseCategory(candidates, history) {
    const weights = { unseen: 60, weak: 25, correct: 15 };
    const available = new Set(candidates.map(item => candidateCategory(item, history)));
    const options = Object.entries(weights).filter(([category]) => available.has(category));
    const totalWeight = options.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * totalWeight;

    for (const [category, weight] of options) {
      roll -= weight;
      if (roll <= 0) return category;
    }
    return options[options.length - 1][0];
  }

  function candidateCategory(item, history) {
    const key = `${item.section.id}:${item.question.id}`;
    const record = history[key];
    if (!record || !record.timesSeen) return "unseen";

    const correct = Number(record.timesCorrect) || 0;
    const incorrect = Number(record.timesIncorrect) || 0;
    const responses = correct + incorrect;
    const accuracy = responses ? correct / responses : 1;

    if (record.lastResult === "incorrect" || (incorrect > 0 && accuracy < 0.8)) return "weak";
    return "correct";
  }

  function candidateScore(item, history, recentKeys, now) {
    const key = `${item.section.id}:${item.question.id}`;
    const record = history[key];
    const category = candidateCategory(item, history);
    let score = Math.random() * 16;

    if (record && record.timesSeen) {
      const correct = Number(record.timesCorrect) || 0;
      const incorrect = Number(record.timesIncorrect) || 0;
      const responses = correct + incorrect;
      const missRate = responses ? incorrect / responses : 0;

      if (category === "weak") {
        score += 50 + (missRate * 28);
        if (record.lastResult === "incorrect") score += 14;
      } else {
        score += 35;
      }

      if (record.lastSeen) {
        const lastSeen = new Date(record.lastSeen).getTime();
        if (Number.isFinite(lastSeen)) {
          const ageDays = Math.max(0, (now - lastSeen) / 86400000);
          score += Math.min(category === "correct" ? 34 : 22, ageDays * 1.5);
          if (now - lastSeen < 10 * 60 * 1000) score -= 22;
        }
      }
    }

    if (recentKeys.has(key)) score -= 34;
    return score;
  }

  function begin() {
    const questions = buildSmartTest();
    state = {
      questions,
      index: 0,
      answers: Array(questions.length).fill(null),
      seenKeys: new Set(),
      submitted: false,
      notice: ""
    };
    start.classList.add("hidden");
    activity.classList.remove("hidden");
    render();
  }

  function render() {
    const q = state.questions[state.index];
    if (!q) return;
    trackSeenOnce(q);

    const answered = state.answers.filter(answer => answer !== null).length;
    progress.textContent = `${state.index + 1} of ${state.questions.length} • ${answered} answered`;

    card.innerHTML = `
      <p class="eyebrow">${escapeHtml(q.section)} • ${escapeHtml(q.topic || q.sectionTitle)}</p>
      <h2>${escapeHtml(q.q)}</h2>
      ${state.notice ? `<div class="test-notice" role="status">${escapeHtml(state.notice)}</div>` : ""}
      <div class="choices">
        ${q.choices.map((choice, index) => `
          <button class="choice ${state.answers[state.index] === index ? "selected" : ""}" data-choice="${index}" aria-pressed="${state.answers[state.index] === index}">
            ${escapeHtml(choice)}
            ${state.answers[state.index] === index ? '<span class="choice-marker selected-marker">Selected</span>' : ""}
          </button>`).join("")}
      </div>
      <div class="actions">
        <button class="secondary" id="prev" ${state.index === 0 ? "disabled" : ""}>← Previous</button>
        <button class="primary" id="next">${nextLabel()}</button>
      </div>`;

    card.querySelectorAll("[data-choice]").forEach(button => {
      button.onclick = () => {
        state.answers[state.index] = Number(button.dataset.choice);
        state.notice = "";
        render();
      };
    });

    document.getElementById("prev").onclick = () => {
      state.index--;
      state.notice = "";
      render();
    };

    document.getElementById("next").onclick = () => {
      if (state.index < state.questions.length - 1) {
        state.index++;
        state.notice = "";
        render();
        return;
      }

      const firstUnanswered = state.answers.findIndex(answer => answer === null);
      if (firstUnanswered !== -1) {
        const remaining = state.answers.filter(answer => answer === null).length;
        state.index = firstUnanswered;
        state.notice = `Answer the remaining ${remaining} question${remaining === 1 ? "" : "s"} before submitting.`;
        render();
        return;
      }

      results();
    };
  }

  function nextLabel() {
    if (state.index < state.questions.length - 1) return "Next →";
    return state.answers.every(answer => answer !== null) ? "Submit Test" : "Review Unanswered →";
  }

  function results() {
    if (state.submitted) return;
    state.submitted = true;

    const stats = {};
    sections.forEach(section => {
      stats[section.id] = { title: section.title, correct: 0, total: 0 };
    });

    state.questions.forEach((q, index) => {
      const correct = state.answers[index] === q.answer;
      stats[q.section].total++;
      if (correct) stats[q.section].correct++;
      if (tracker) tracker.recordAnswer(q.section, q.id, correct);
    });

    const totalCorrect = Object.values(stats).reduce((sum, section) => sum + section.correct, 0);
    const pct = Math.round((totalCorrect / state.questions.length) * 100);

    if (tracker) {
      tracker.recordTestAttempt({
        timestamp: new Date().toISOString(),
        score: totalCorrect,
        total: state.questions.length,
        percentage: pct,
        questionKeys: state.questions.map(q => q.trackingKey),
        sectionResults: stats
      });
    }

    progress.textContent = "Complete";
    card.innerHTML = `
      <div class="result-hero">
        <p class="eyebrow">UNIT 1 RESULTS</p>
        <div class="result-score">${totalCorrect}/${state.questions.length}</div>
        <h2>${pct}%</h2>
        <div class="section-results">
          ${Object.entries(stats).map(([id, section]) => `
            <div>
              <strong>${escapeHtml(id)} ${escapeHtml(section.title)}</strong>
              <span>${section.correct}/${section.total} — ${section.total ? Math.round((section.correct / section.total) * 100) : 0}%</span>
            </div>`).join("")}
        </div>
        <details class="test-review">
          <summary>Review answers and explanations</summary>
          <div class="test-review-list">
            ${state.questions.map((q, index) => {
              const correct = state.answers[index] === q.answer;
              return `
                <article class="test-review-item">
                  <p class="eyebrow">QUESTION ${index + 1} • ${escapeHtml(q.section)}</p>
                  <h3>${escapeHtml(q.q)}</h3>
                  <p class="review-status ${correct ? "good-text" : "bad-text"}">${correct ? "✓ Correct" : "✗ Needs review"}</p>
                  <p><strong>Your answer:</strong> ${escapeHtml(q.choices[state.answers[index]])}</p>
                  ${correct ? "" : `<p><strong>Correct answer:</strong> ${escapeHtml(q.choices[q.answer])}</p>`}
                  <p class="review-explanation"><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</p>
                </article>`;
            }).join("")}
          </div>
        </details>
        <div class="actions" style="justify-content:center; flex-wrap:wrap;">
          <button class="secondary" id="retry">Try Another 20</button>
          <a class="primary button-link" href="index.html">Return to Unit 1</a>
        </div>
      </div>`;

    document.getElementById("retry").onclick = begin;
  }

  function trackSeenOnce(q) {
    if (!tracker || !state.seenKeys) return;
    if (state.seenKeys.has(q.trackingKey)) return;
    state.seenKeys.add(q.trackingKey);
    tracker.recordSeen(q.section, q.id);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  window.Unit1TestSelection = { buildSmartTest, candidateScore };

  document.getElementById("startTest").onclick = begin;
  document.getElementById("exitTest").onclick = () => {
    if (confirm("Exit this test? Your current answers will be cleared.")) location.href = "index.html";
  };
})();
