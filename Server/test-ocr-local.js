// server/test-ocr-local.js
const { createWorker } = require("tesseract.js");
const path = require("path");

(async () => {
  const worker = await createWorker("eng", {
    cachePath: path.join(__dirname, "lang-data"),
  });

  const ret = await worker.recognize(
    "https://tesseract.projectnaptha.com/img/eng_bw.png"
  );
  console.log(ret.data.text); // Should print: "The quick brown fox jumps over the lazy dog"
  await worker.terminate();
})();
