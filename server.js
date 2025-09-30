const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const { PassThrough } = require("stream");

const app = express();
app.use(cors());
app.use(express.json());

// Root route for status
app.get("/", (req, res) => {
  res.send(`
    <h1>✅ YouTube Audio Server is running</h1>
    <p>Use <code>POST /download-audio</code> with JSON body:</p>
    <pre>{
      "videoUrl": "https://www.youtube.com/watch?v=XXXX"
    }</pre>
  `);
});

// Main route to download audio
app.post("/download-audio", async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: "videoUrl is required" });
    }

    const stream = ytdl(videoUrl, { quality: "highestaudio" });
    const output = new PassThrough();

    ffmpeg(stream)
      .audioBitrate(128)
      .toFormat("mp3")
      .pipe(output);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": "attachment; filename=audio.mp3",
    });

    output.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process audio" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
