// server/test-ocr-direct.js
const { createWorker } = require("tesseract.js");

(async () => {
  const worker = await createWorker("eng");
  const ret = await worker.recognize(
    "https://tesseract.projectnaptha.com/img/eng_bw.png"
  );
  console.log(ret.data.text); // Should print: "The quick brown fox jumps over the lazy dog"
  await worker.terminate();
})();
