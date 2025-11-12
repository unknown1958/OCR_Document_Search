// server/utils/ocrUtils.js
const { createWorker } = require("tesseract.js");
const Document = require("../models/Document");

// Accept pageNumber as 4th arg
// Add a new param: isUpdate
async function processFileForOCR(
  docId,
  filePath,
  lang = "eng",
  pageNumber = 1,
  isUpdate = false
) {
  try {
    const worker = await createWorker();
    const result = await worker.recognize(filePath, lang);
    const { text, confidence } = result.data;
    await worker.terminate();

    if (isUpdate) {
      // Update existing page
      await Document.updateOne(
        { _id: docId, "pages.pageNumber": pageNumber },
        {
          $set: {
            "pages.$.text": text,
            "pages.$.confidence": confidence,
            "pages.$.ocrLanguage": lang,
          },
        }
      );
    } else {
      // Push new page (original upload flow)
      await Document.findByIdAndUpdate(docId, {
        $push: {
          pages: {
            pageNumber,
            text,
            confidence,
            imageUrl: filePath.replace(/\\/g, "/"),
          },
        },
      });
    }

    console.log(
      `✅ OCR ${
        isUpdate ? "updated" : "added"
      } for page ${pageNumber}. Confidence: ${confidence?.toFixed(2)}%`
    );
  } catch (err) {
    console.error(`❌ OCR failed for page ${pageNumber}:`, err.message);
    throw err;
  }
}

module.exports = { processFileForOCR };
