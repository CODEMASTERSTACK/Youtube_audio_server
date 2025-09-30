const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/download-audio", async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  const outputFile = path.join(__dirname, "output.mp3");
  const command = `yt-dlp -x --audio-format mp3 -o "${outputFile}" "${videoUrl}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error("yt-dlp error:", error);
      return res.status(500).json({ error: "Failed to download audio" });
    }

    res.download(outputFile, "audio.mp3", (err) => {
      if (err) console.error("Error sending file:", err);
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
