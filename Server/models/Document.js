const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema({
  pageNumber: Number,
  text: String,
  confidence: Number,
  imageUrl: String,
});

const documentSchema = new mongoose.Schema({
  originalName: String,
  filename: String,
  ocrLanguage: { type: String, default: "eng" },
  status: {
    type: String,
    enum: ["queued", "processing", "done", "failed"],
    default: "queued",
  },
  pages: [pageSchema],
  createdAt: { type: Date, default: Date.now },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

// ✅ Fix MongoDB text index
documentSchema.index({ "pages.text": "text" }, { default_language: "english" });

module.exports = mongoose.model("Document", documentSchema);
