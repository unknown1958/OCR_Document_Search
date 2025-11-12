// server/test-ocr-simple.js
const { createWorker } = require("tesseract.js");
const path = require("path");

(async () => {
  const worker = await createWorker({
    langPath: path.resolve(__dirname, "lang-data"),
    cachePath: path.resolve(__dirname, "lang-data"),
  });

  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  const imagePath = path.join(
    __dirname,
    "uploads",
    "176258751423-25830216.png"
  ); // ← REPLACE WITH YOUR FILENAME!
  const result = await worker.recognize(imagePath);
  console.log(result.data.text);

  await worker.terminate();
})();
