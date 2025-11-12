// server/test-ocr-manual.js
const { createWorker } = require("tesseract.js");
const path = require("path");

(async () => {
  try {
    // 👇 Use local lang data path
    const worker = await createWorker("eng", {
      cachePath: path.join(__dirname, "lang-data"),
    });

    // 👇 Point to an image you uploaded (replace with actual filename)
    const imagePath = path.join(
      __dirname,
      "uploads",
      "176258751423-25830216.png"
    ); // ← CHANGE THIS TO YOUR FILENAME!

    console.log(`⏳ Running OCR on: ${imagePath}`);

    const result = await worker.recognize(imagePath);
    const { text, confidence } = result.data;

    console.log("✅ OCR Result:");
    console.log(text);
    console.log(`Confidence: ${confidence}%`);

    await worker.terminate();
  } catch (error) {
    console.error("❌ OCR Failed:", error.message);
  }
})();
