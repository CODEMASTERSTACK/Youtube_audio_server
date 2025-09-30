const { spawn } = require("child_process");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ YouTube Audio Server running. Use POST /download-audio with { videoUrl }");
});

app.post("/download-audio", (req, res) => {
  const { videoUrl } = req.body;
  if (!videoUrl) return res.status(400).json({ error: "videoUrl is required" });

  res.set({
    "Content-Type": "audio/mpeg",
    "Content-Disposition": "attachment; filename=audio.mp3",
  });

  // Use full path for yt-dlp
  const ytDlpPath = "/usr/local/bin/yt-dlp"; 
  const ytDlp = spawn(ytDlpPath, ["-f", "bestaudio", "-o", "-", videoUrl]);

  ytDlp.stdout.pipe(res);

  ytDlp.stderr.on("data", (data) => {
    console.error(`yt-dlp error: ${data}`);
  });

  ytDlp.on("close", (code) => {
    if (code !== 0) {
      console.error(`yt-dlp exited with code ${code}`);
      res.end();
    }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
