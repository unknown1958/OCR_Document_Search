// server/routes/reocr.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
router.use(protect); // Add this after router creation
const Document = require("../models/Document");
const { processFileForOCR } = require("../utils/ocrUtils");
const path = require("path");

// POST /api/reocr
router.post("/", async (req, res) => {
  const { documentId, pageNumber, language = "eng" } = req.body;

  if (!documentId || !pageNumber) {
    return res
      .status(400)
      .json({ error: "documentId and pageNumber required" });
  }

  try {
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const page = doc.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const imagePath = path.join(__dirname, "..", "..", page.imageUrl);
    await processFileForOCR(documentId, imagePath, language, pageNumber, true); // true = update mode

    res.json({ message: "Re-OCR successful", documentId, pageNumber });
  } catch (error) {
    console.error("Re-OCR error:", error);
    res.status(500).json({ error: "Re-OCR failed" });
  }
});

module.exports = router;
