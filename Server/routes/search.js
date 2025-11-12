// server/routes/search.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
router.use(protect); // Add this after router creation
const Document = require("../models/Document");

// GET /api/search?q=hello&page=1
router.get("/", async (req, res) => {
  const { q = "", page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  if (!q.trim()) {
    return res.status(400).json({ error: 'Search query "q" is required' });
  }

  try {
    const total = await Document.countDocuments({ $text: { $search: q } });

    const results = await Document.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // lean() for faster JSON output

    const highlight = (text, query) => {
      if (!text || !query.trim()) return "";

      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(.{0,50})(${escapedQuery})(.{0,50})`, "gi");

      let highlighted = "";
      let match;
      let lastIndex = 0;

      while ((match = regex.exec(text)) !== null) {
        const before = match[1];
        const found = match[2];
        const after = match[3];

        highlighted += `${before}<mark>${found}</mark>${after}... `;
        lastIndex = regex.lastIndex;
      }

      if (!highlighted) {
        // If no match, show first 100 chars
        highlighted = text.substring(0, 100) + "...";
      }

      return highlighted;
    };

    const formattedResults = results.map((doc) => ({
      _id: doc._id,
      originalName: doc.originalName,
      pages: doc.pages.map((page) => ({
        pageNumber: page.pageNumber,
        highlightedText: highlight(page.text, q),
        confidence: page.confidence,
      })),
    }));

    res.json({
      query: q,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      results: formattedResults,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;
