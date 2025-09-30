const express = require("express");
const cors = require("cors");
const youtubedl = require("youtube-dl-exec");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// POST /download-audio with { videoUrl: "https://youtube.com/watch?v=..." }
app.post("/download-audio", async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  try {
    const outputFile = path.join(__dirname, "output.mp3");

    // Run yt-dlp to extract audio
    await youtubedl(videoUrl, {
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: 0, // best
      output: outputFile,
    });

    // Send the file back
    res.download(outputFile, "audio.mp3", (err) => {
      if (err) {
        console.error("Error sending file:", err);
      }
      // Delete after sending
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
    });
  } catch (err) {
    console.error("Error processing video:", err);
    res.status(500).json({ error: "Failed to process YouTube video" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
