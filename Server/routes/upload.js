// server/routes/upload.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
router.use(protect); // Add this after router creation
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const Document = require("../models/Document");
const { processFileForOCR } = require("../utils/ocrUtils");
const { createCanvas } = require("canvas");

// PDF.js setup
let pdfjsLib = null;
async function getPDFJS() {
  if (!pdfjsLib) {
    const module = await import("pdfjs-dist/legacy/build/pdf.js");
    pdfjsLib = module.default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = path.resolve(
      __dirname,
      "..",
      "pdf.worker.min.js"
    );
  }
  return pdfjsLib;
}

async function convertPdfToImages(pdfPath) {
  const pdfjs = await getPDFJS();
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toBuffer("image/png"));
  }
  return pages;
}

// Async job processor
async function processDocumentJob(jobId, document, filePath, isPdf, io, jobs) {
  try {
    const total = isPdf ? (await convertPdfToImages(filePath)).length : 1;
    jobs.set(jobId, {
      status: "processing",
      progress: 0,
      total,
      documentId: document._id,
    });

    if (isPdf) {
      const pageBuffers = await convertPdfToImages(filePath);
      await Document.findByIdAndUpdate(document._id, { status: "processing" });

      for (let i = 0; i < pageBuffers.length; i++) {
        const pagePath = path.join(
          "uploads",
          `page_${document._id}_p${i + 1}.png`
        );
        await fs.writeFile(pagePath, pageBuffers[i]);

        // Emit progress
        io.emit("jobProgress", { jobId, progress: i + 1, total, page: i + 1 });
        jobs.set(jobId, {
          status: "processing",
          progress: i + 1,
          total,
          documentId: document._id,
        });

        await processFileForOCR(document._id, pagePath, "eng", i + 1);
      }
    } else {
      // Single image
      io.emit("jobProgress", { jobId, progress: 1, total: 1, page: 1 });
      await processFileForOCR(document._id, filePath, "eng", 1);
    }

    await Document.findByIdAndUpdate(document._id, { status: "done" });
    jobs.set(jobId, { status: "done", documentId: document._id });
    io.emit("jobComplete", { jobId, documentId: document._id });
  } catch (error) {
    console.error("Job failed:", error);
    await Document.findByIdAndUpdate(document._id, { status: "failed" });
    jobs.set(jobId, {
      status: "failed",
      error: error.message,
      documentId: document._id,
    });
    io.emit("jobError", { jobId, error: error.message });
  }
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // 🔒 Safety check: ensure file and originalname exist
    if (!file || !file.originalname) {
      return cb(new Error("Invalid file"));
    }
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDFs and images allowed"));
    }
  },
});

// Upload route
router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const document = new Document({
      originalName: req.file.originalName,
      filename: req.file.filename,
      ocrLanguage: "eng",
      status: "queued",
      uploader: req.user._id,
    });
    await document.save();

    const jobId = document._id.toString();
    const isPdf = req.file.mimetype === "application/pdf";
    const io = req.app.get("io");
    const jobs = req.app.get("jobs");

    // Respond immediately
    res
      .status(202)
      .json({ jobId, message: "Upload accepted. Processing started." });

    // Start background job
    processDocumentJob(jobId, document, req.file.path, isPdf, io, jobs);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
});

module.exports = router;
