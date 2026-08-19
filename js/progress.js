(() => {
  "use strict";

  const STORAGE_KEY = "hist1301.studyProgress.v1";
  const VERSION = 1;
  const UNIT_ID = "unit1";
  const MAX_TEST_ATTEMPTS = 50;

  function emptyRoot() {
    return { version: VERSION, units: {} };
  }

  function emptyUnit() {
    return { questions: {}, testAttempts: [] };
  }

  function readRoot() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyRoot();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return emptyRoot();
      if (!parsed.units || typeof parsed.units !== "object") parsed.units = {};
      parsed.version = VERSION;
      return parsed;
    } catch (error) {
      console.warn("Unable to read study progress from localStorage.", error);
      return emptyRoot();
    }
  }

  function writeRoot(root) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
      return true;
    } catch (error) {
      console.warn("Unable to save study progress to localStorage.", error);
      return false;
    }
  }

  function getMutableUnit(root, unitId = UNIT_ID) {
    if (!root.units[unitId] || typeof root.units[unitId] !== "object") {
      root.units[unitId] = emptyUnit();
    }
    const unit = root.units[unitId];
    if (!unit.questions || typeof unit.questions !== "object") unit.questions = {};
    if (!Array.isArray(unit.testAttempts)) unit.testAttempts = [];
    return unit;
  }

  function questionKey(sectionId, questionId) {
    return `${sectionId}:${questionId}`;
  }

  function ensureQuestion(unit, sectionId, questionId) {
    const key = questionKey(sectionId, questionId);
    if (!unit.questions[key]) {
      unit.questions[key] = {
        questionId,
        section: sectionId,
        timesSeen: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        lastResult: null,
        lastSeen: null
      };
    }
    return unit.questions[key];
  }

  function recordSeen(sectionId, questionId, unitId = UNIT_ID) {
    const root = readRoot();
    const unit = getMutableUnit(root, unitId);
    const record = ensureQuestion(unit, sectionId, questionId);
    record.timesSeen += 1;
    record.lastSeen = new Date().toISOString();
    writeRoot(root);
    return { ...record };
  }

  function recordAnswer(sectionId, questionId, isCorrect, unitId = UNIT_ID) {
    const root = readRoot();
    const unit = getMutableUnit(root, unitId);
    const record = ensureQuestion(unit, sectionId, questionId);
    if (isCorrect) record.timesCorrect += 1;
    else record.timesIncorrect += 1;
    record.lastResult = isCorrect ? "correct" : "incorrect";
    record.lastSeen = new Date().toISOString();
    writeRoot(root);
    return { ...record };
  }

  function recordTestAttempt(attempt, unitId = UNIT_ID) {
    const root = readRoot();
    const unit = getMutableUnit(root, unitId);
    const total = Number(attempt.total) || 20;
    const score = Number(attempt.score) || 0;
    const saved = {
      timestamp: attempt.timestamp || new Date().toISOString(),
      score,
      total,
      percentage: Number.isFinite(attempt.percentage)
        ? attempt.percentage
        : Math.round((score / total) * 100),
      questionKeys: Array.isArray(attempt.questionKeys) ? [...attempt.questionKeys] : [],
      sectionResults: attempt.sectionResults && typeof attempt.sectionResults === "object"
        ? attempt.sectionResults
        : {}
    };
    unit.testAttempts.push(saved);
    if (unit.testAttempts.length > MAX_TEST_ATTEMPTS) {
      unit.testAttempts = unit.testAttempts.slice(-MAX_TEST_ATTEMPTS);
    }
    writeRoot(root);
    return saved;
  }

  function getUnitData(unitId = UNIT_ID) {
    const root = readRoot();
    const unit = getMutableUnit(root, unitId);
    return JSON.parse(JSON.stringify(unit));
  }

  function getSnapshot(totalQuestions, sectionTitles = {}, unitId = UNIT_ID) {
    const unit = getUnitData(unitId);
    const records = Object.values(unit.questions);
    const answeredRecords = records.filter(r => (r.timesCorrect + r.timesIncorrect) > 0);
    const totalCorrect = answeredRecords.reduce((sum, r) => sum + r.timesCorrect, 0);
    const totalIncorrect = answeredRecords.reduce((sum, r) => sum + r.timesIncorrect, 0);
    const answerCount = totalCorrect + totalIncorrect;
    const accuracy = answerCount ? Math.round((totalCorrect / answerCount) * 100) : null;
    const coverage = records.filter(r => r.timesSeen > 0).length;

    const sectionStats = {};
    Object.entries(sectionTitles).forEach(([id, title]) => {
      sectionStats[id] = { id, title, correct: 0, incorrect: 0, responses: 0 };
    });
    answeredRecords.forEach(r => {
      if (!sectionStats[r.section]) {
        sectionStats[r.section] = { id: r.section, title: r.section, correct: 0, incorrect: 0, responses: 0 };
      }
      sectionStats[r.section].correct += r.timesCorrect;
      sectionStats[r.section].incorrect += r.timesIncorrect;
      sectionStats[r.section].responses += r.timesCorrect + r.timesIncorrect;
    });

    const reviewCandidates = Object.values(sectionStats)
      .filter(s => s.responses >= 3)
      .map(s => ({ ...s, accuracy: Math.round((s.correct / s.responses) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy || b.incorrect - a.incorrect || b.responses - a.responses);

    return {
      recentTests: unit.testAttempts.slice(-5),
      accuracy,
      totalCorrect,
      totalIncorrect,
      answerCount,
      coverage,
      totalQuestions,
      reviewNext: reviewCandidates[0] || null,
      sectionStats
    };
  }

  function resetUnit(unitId = UNIT_ID) {
    const root = readRoot();
    delete root.units[unitId];
    writeRoot(root);
  }

  window.HistProgress = {
    STORAGE_KEY,
    VERSION,
    UNIT_ID,
    questionKey,
    recordSeen,
    recordAnswer,
    recordTestAttempt,
    getUnitData,
    getSnapshot,
    resetUnit
  };
})();
