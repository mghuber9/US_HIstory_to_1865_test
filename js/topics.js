(function () {
  "use strict";

  const normalize = value => String(value || "")
    .toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();

  function questionConcept(question) {
    return {
      id: question.id,
      question: question.q,
      answer: question.choices[question.answer]
    };
  }

  function chronologyParagraph(questions) {
    const facts = questions.map(q => q.explanation || q.choices[q.answer]).filter(Boolean);
    return `Chronology questions connect the major events in this section and test which events came first or how they should be ordered. Review the dated sequence in the answers below: ${facts.join(" ")}`;
  }

  function prepareSection(section) {
    if (!section || section.topicEntries) return section;
    const questionsByTopic = new Map();
    (section.questions || []).forEach(question => {
      const key = question.topic || "General Review";
      if (!questionsByTopic.has(key)) questionsByTopic.set(key, []);
      questionsByTopic.get(key).push(question);
    });

    const screens = section.learnScreens || [];
    const screenByQuestion = new Map();
    screens.forEach(screen => (screen.cfu || []).forEach(id => screenByQuestion.set(id, screen)));

    const entries = [];
    questionsByTopic.forEach((questions, topic) => {
      const topicKey = normalize(topic);
      const screen = screens.find(item => normalize(item.title) === topicKey)
        || screenByQuestion.get(questions[0].id)
        || screens.find(item => normalize(item.title).includes(topicKey) || topicKey.includes(normalize(item.title)));
      const concepts = questions.map(questionConcept);
      let paragraph = screen?.body || (topicKey === "chronology"
        ? chronologyParagraph(questions)
        : `This topic is assessed through the question-bank concepts listed below. Study each relationship and correct answer together.`);
      if (topicKey !== "chronology") {
        const paragraphKey = normalize(`${paragraph} ${(screen?.know || []).join(" ")}`);
        const missingAnswers = concepts.map(x => x.answer).filter(answer => !paragraphKey.includes(normalize(answer)));
        if (missingAnswers.length) paragraph += ` The question bank also emphasizes: ${missingAnswers.join("; ")}.`;
      }
      const title = screen?.title || topic;
      entries.push({
        id: `${section.id}-${topic}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
        topic,
        title,
        body: paragraph,
        know: screen?.know || [],
        cfu: screen?.cfu || [],
        concepts,
        searchText: normalize([title, topic, paragraph, ...concepts.flatMap(x => [x.question, x.answer])].join(" "))
      });
    });

    section.topicEntries = entries;
    section.learnScreens = entries;
    return section;
  }

  function prepareAll() {
    const seen = new Set();
    [window.ALL_SECTIONS, window.UNIT1_SECTIONS].filter(Boolean).forEach(collection => {
      Object.values(collection).forEach(section => {
        if (!seen.has(section)) { prepareSection(section); seen.add(section); }
      });
    });
  }

  window.HistTopics = { normalize, prepareSection, prepareAll };
  prepareAll();
})();
