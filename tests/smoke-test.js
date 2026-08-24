const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("https://script.google.com/**", route => route.abort("failed"));

  for (const section of ["1-1","1-2","2-1","2-2","3-1","3-2","4-1","4-2"]) {
    await page.goto(`http://127.0.0.1:4173/sections/${section}.html`);
    await page.click('[data-mode="learn"]');
    await page.locator("#activityCard h2").waitFor();
    await page.click('[data-choice="0"]');
    await page.click("#learnAction");
  }

  await page.goto("http://127.0.0.1:4173/sections/1-1.html");
  await page.click('[data-mode="practice"]');
  await page.click("#showAnswer");
  await page.click("#gotBtn");
  await page.goto("http://127.0.0.1:4173/sections/1-1.html");
  await page.click('[data-mode="mc"]');
  await page.click('[data-choice="0"]');
  await page.click("#checkMC");

  await page.goto("http://127.0.0.1:4173/test.html");
  await page.click("#startTest");
  const count = await page.evaluate(() => window.Unit1TestSelection.buildSmartTest().length);
  if (count !== 20) throw new Error(`Smart test returned ${count}, not 20`);
  for (let i = 0; i < 20; i++) {
    await page.click('[data-choice="0"]');
    await page.click("#next");
  }
  await page.locator(".result-score").waitFor();

  await page.goto("http://127.0.0.1:4173/timeline.html");
  await page.locator("#timeline-title").waitFor();
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem("hist1301.remoteQueue.v1") || "[]").length);
  if (!queued) throw new Error("Offline remote queue was not preserved");
  if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ sections: 8, testQuestions: count, offlineQueuedEvents: queued, pageErrors: 0 }));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
