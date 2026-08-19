(() => {
  "use strict";

  const data = window.SECTION_DATA;
  if (!data) return;

  const tracker = window.HistProgress || null;
  const sectionHome = document.getElementById("sectionHome");
  const activity = document.getElementById("activity");
  const activityCard = document.getElementById("activityCard");
  const activityTitle = document.getElementById("activityTitle");
  const activityProgress = document.getElementById("activityProgress");
  const exitBtn = document.getElementById("exitActivity");

  const questionMap = new Map(data.questions.map(q => [q.id, q]));
  let mode = null;
  let state = {};

  document.querySelectorAll("[data-mode]").forEach(btn => {
    btn.addEventListener("click", () => startMode(btn.dataset.mode));
  });
  exitBtn.addEventListener("click", exitActivity);

  function startMode(nextMode) {
    mode = nextMode;
    sectionHome.classList.add("hidden");
    activity.classList.remove("hidden");

    if (mode === "learn") {
      state = { index: 0, cfuIndex: 0, selected: null, checked: false, seenKeys: new Set() };
      renderLearn();
    } else if (mode === "practice") {
      const queue = shuffle(data.practice.map((p, i) => ({ ...p, original: i })));
      state = { queue, current: 0, reveal: false, firstPass: queue.length, needsAgain: 0 };
      renderPractice();
    } else if (mode === "mc") {
      const pool = shuffle(data.questions)
        .slice(0, Math.min(10, data.questions.length))
        .map(shuffleQuestion);
      state = { questions: pool, index: 0, score: 0, selected: null, checked: false, seenKeys: new Set() };
      renderMC();
    }
  }

  function exitActivity() {
    activity.classList.add("hidden");
    sectionHome.classList.remove("hidden");
    activityCard.innerHTML = "";
  }

  function renderLearn() {
    const screen = data.learnScreens[state.index];
    activityTitle.textContent = `${data.id} ${data.title} — Learn`;
    activityProgress.textContent = `${state.index + 1} of ${data.learnScreens.length}`;

    const qid = screen.cfu?.[state.cfuIndex];
    const q = qid ? questionMap.get(qid) : null;
    if (q) trackSeenOnce(q);

    const firstInstruction = state.index === 0 && state.cfuIndex === 0
      ? `<div class="learn-instruction" role="note"><strong>How Checks work:</strong> Select an answer, then choose <strong>Check Answer</strong>. Review the feedback before using the same button area to continue.</div>`
      : "";

    activityCard.innerHTML = `
      <h2>${screen.title}</h2>
      <p class="lead">${screen.body}</p>
      ${firstInstruction}
      <div class="know-box">
        <strong>Know This</strong>
        <ul>${screen.know.map(x => `<li>${x}</li>`).join("")}</ul>
      </div>
      ${q ? renderQuestion(q, "cfu") : ""}
      <div class="actions">
        <button class="secondary" id="learnBack" ${state.index === 0 ? "disabled" : ""}>← Back</button>
        <button class="primary" id="learnAction" ${learnActionDisabled(q) ? "disabled" : ""}>${learnActionLabel(screen, q)}</button>
      </div>
    `;

    wireQuestion(q, "cfu");

    document.getElementById("learnBack").addEventListener("click", () => {
      if (state.index > 0) {
        state.index--;
        state.cfuIndex = 0;
        resetSelection();
        renderLearn();
      }
    });

    document.getElementById("learnAction").addEventListener("click", () => {
      if (q && !state.checked) {
        const correct = state.selected === q.answer;
        state.checked = true;
        if (tracker) tracker.recordAnswer(data.id, q.id, correct);
        renderLearn();
        return;
      }
      advanceLearn(screen);
    });
  }

  function learnActionDisabled(q) {
    return Boolean(q && !state.checked && state.selected === null);
  }

  function learnActionLabel(screen, q) {
    if (q && !state.checked) return "Check Answer";
    if (screen.cfu && state.cfuIndex < screen.cfu.length - 1) return "Next Check →";
    if (state.index < data.learnScreens.length - 1) return "Next →";
    return "Finish Learn →";
  }

  function advanceLearn(screen) {
    if (screen.cfu && state.cfuIndex < screen.cfu.length - 1) {
      state.cfuIndex++;
      resetSelection();
      renderLearn();
    } else if (state.index < data.learnScreens.length - 1) {
      state.index++;
      state.cfuIndex = 0;
      resetSelection();
      renderLearn();
    } else {
      renderLearnComplete();
    }
  }

  function renderLearnComplete() {
    activityProgress.textContent = `${data.learnScreens.length} of ${data.learnScreens.length}`;
    activityCard.innerHTML = `
      <div class="result-hero">
        <p class="eyebrow">LEARN COMPLETE</p>
        <div class="result-score">✓</div>
        <h2>You've finished ${data.id} Learn.</h2>
        <p class="result-sub">Next, try recalling the material without answer choices or test yourself with multiple choice.</p>
        <div class="actions" style="justify-content:center; flex-wrap:wrap;">
          <button class="secondary" id="goPractice">🧠 Practice ${data.id}</button>
          <button class="primary" id="goMC">✅ Multiple Choice</button>
        </div>
      </div>`;
    document.getElementById("goPractice").onclick = () => startMode("practice");
    document.getElementById("goMC").onclick = () => startMode("mc");
  }

  function renderPractice() {
    if (state.current >= state.queue.length) return renderPracticeComplete();
    const p = state.queue[state.current];
    activityTitle.textContent = `${data.id} ${data.title} — Practice`;
    activityProgress.textContent = `${state.current + 1} of ${state.queue.length}`;

    activityCard.innerHTML = `
      <div class="practice-prompt">
        <span class="term">Active Recall</span>
        <h2>${p.prompt}</h2>
        <p>Say the answer aloud or think it through before revealing it.</p>
        ${state.reveal ? `<div class="answer-reveal"><strong>Answer</strong><br>${p.answer}</div>` : ""}
      </div>
      ${state.reveal ? `
        <div class="actions">
          <button class="self-rating again" id="againBtn">↻ Need More Practice</button>
          <button class="self-rating got" id="gotBtn">✓ Got It</button>
        </div>` : `
        <div class="actions right">
          <button class="primary" id="showAnswer">Show Answer</button>
        </div>`}
    `;

    if (!state.reveal) {
      document.getElementById("showAnswer").onclick = () => {
        state.reveal = true;
        renderPractice();
      };
    } else {
      document.getElementById("gotBtn").onclick = () => {
        state.current++;
        state.reveal = false;
        renderPractice();
      };
      document.getElementById("againBtn").onclick = () => {
        state.queue.push({ ...p });
        state.needsAgain++;
        state.current++;
        state.reveal = false;
        renderPractice();
      };
    }
  }

  function renderPracticeComplete() {
    activityProgress.textContent = "Complete";
    activityCard.innerHTML = `
      <div class="result-hero">
        <p class="eyebrow">PRACTICE COMPLETE</p>
        <div class="result-score">✓</div>
        <h2>All prompts completed.</h2>
        <p class="result-sub">First-pass prompts: ${state.firstPass}<br>Extra reviews added: ${state.needsAgain}</p>
        <div class="actions" style="justify-content:center;">
          <button class="secondary" id="againPractice">Practice Again</button>
          <button class="primary" id="practiceToMC">Multiple Choice →</button>
        </div>
      </div>`;
    document.getElementById("againPractice").onclick = () => startMode("practice");
    document.getElementById("practiceToMC").onclick = () => startMode("mc");
  }

  function renderMC() {
    const q = state.questions[state.index];
    trackSeenOnce(q);
    activityTitle.textContent = `${data.id} ${data.title} — Multiple Choice`;
    activityProgress.textContent = `${state.index + 1} of ${state.questions.length}`;

    activityCard.innerHTML = `
      <p class="eyebrow">QUESTION ${state.index + 1}</p>
      <h2>${q.q}</h2>
      ${renderQuestion(q, "mc")}
      <div class="actions">
        <span></span>
        ${state.checked
          ? `<button class="primary" id="nextMC">${state.index === state.questions.length - 1 ? "See Results →" : "Next Question →"}</button>`
          : `<button class="primary" id="checkMC" ${state.selected === null ? "disabled" : ""}>Check Answer</button>`}
      </div>
    `;

    wireQuestion(q, "mc");

    if (state.checked) {
      document.getElementById("nextMC").onclick = () => {
        if (state.index === state.questions.length - 1) renderMCResults();
        else {
          state.index++;
          resetSelection();
          renderMC();
        }
      };
    }
  }

  function renderQuestion(q, context) {
    const choices = q.choices.map((choice, index) => {
      let cls = "choice";
      if (state.selected === index) cls += " selected";
      if (state.checked) {
        if (index === q.answer) cls += " correct";
        else if (index === state.selected) cls += " incorrect";
      }

      let marker = "";
      if (!state.checked && state.selected === index) {
        marker = `<span class="choice-marker selected-marker">Selected</span>`;
      } else if (state.checked && index === q.answer) {
        marker = `<span class="choice-marker correct-marker">✓ Correct answer</span>`;
      } else if (state.checked && index === state.selected && index !== q.answer) {
        marker = `<span class="choice-marker incorrect-marker">✗ Your answer</span>`;
      }

      return `<button class="${cls}" data-choice="${index}" aria-pressed="${state.selected === index}" ${state.checked ? "disabled" : ""}>${escapeHtml(choice)} ${marker}</button>`;
    }).join("");

    return `
      <div class="${context === "cfu" ? "cfu-box" : ""}">
        ${context === "cfu" ? `<div class="cfu-label">Check Your Understanding</div><div class="question-text">${q.q}</div>` : ""}
        <div class="choices">${choices}</div>
        ${state.checked ? feedbackHtml(q) : ""}
      </div>`;
  }

  function wireQuestion(q, context) {
    if (!q) return;

    activityCard.querySelectorAll("[data-choice]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.selected = Number(btn.dataset.choice);
        if (context === "mc") renderMC();
        else renderLearn();
      });
    });

    if (context === "mc" && !state.checked) {
      const check = document.getElementById("checkMC");
      if (check) {
        check.onclick = () => {
          const correct = state.selected === q.answer;
          state.checked = true;
          if (correct) state.score++;
          if (tracker) tracker.recordAnswer(data.id, q.id, correct);
          renderMC();
        };
      }
    }
  }

  function feedbackHtml(q) {
    const correct = state.selected === q.answer;
    return `<div class="feedback ${correct ? "good" : "bad"}" role="status" aria-live="polite">
      <strong>${correct ? "✓ Correct!" : `✗ Not quite. The correct answer is ${String.fromCharCode(65 + q.answer)}.`}</strong>
      ${q.explanation}
    </div>`;
  }

  function renderMCResults() {
    const total = state.questions.length;
    const pct = Math.round((state.score / total) * 100);
    activityProgress.textContent = "Complete";
    activityCard.innerHTML = `
      <div class="result-hero">
        <p class="eyebrow">${data.id} RESULTS</p>
        <div class="result-score">${state.score}/${total}</div>
        <h2>${pct}%</h2>
        <p class="result-sub">${resultMessage(pct)}</p>
        <div class="actions" style="justify-content:center; flex-wrap:wrap;">
          <button class="secondary" id="retryMC">Try Another 10</button>
          <button class="secondary" id="toPractice">Practice ${data.id}</button>
          <button class="primary" id="toHome">Section Home</button>
        </div>
      </div>`;
    document.getElementById("retryMC").onclick = () => startMode("mc");
    document.getElementById("toPractice").onclick = () => startMode("practice");
    document.getElementById("toHome").onclick = exitActivity;
  }

  function resultMessage(pct) {
    if (pct >= 90) return "Strong result. Try another randomized set to confirm it sticks.";
    if (pct >= 75) return "Good progress. Review any ideas that felt uncertain, then try again.";
    return "This section needs another pass. Practice active recall, then return for another set.";
  }

  function trackSeenOnce(q) {
    if (!tracker || !q || !state.seenKeys) return;
    const key = tracker.questionKey(data.id, q.id);
    if (state.seenKeys.has(key)) return;
    state.seenKeys.add(key);
    tracker.recordSeen(data.id, q.id);
  }

  function resetSelection() {
    state.selected = null;
    state.checked = false;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function shuffleQuestion(q) {
    const tagged = q.choices.map((text, index) => ({ text, correct: index === q.answer }));
    const choices = shuffle(tagged);
    return { ...q, choices: choices.map(x => x.text), answer: choices.findIndex(x => x.correct) };
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }
})();
