// server/test-ocr-download.js
const { createWorker } = require("tesseract.js");

(async () => {
  console.log("⏳ Downloading English language model...");
  const worker = await createWorker("eng");
  console.log("✅ English model downloaded!");
  await worker.terminate();
})();
