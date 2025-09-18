// Lightweight Express proxy to stream YouTube audio as MP3
// Requires: express, play-dl, ytdl-core, fluent-ffmpeg, ffmpeg-static, cors
// Install: npm i express play-dl ytdl-core fluent-ffmpeg ffmpeg-static cors

const express = require('express');
const playdl = require('play-dl');
const ytdl = require('ytdl-core');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Point fluent-ffmpeg to the static ffmpeg binary
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const app = express();
app.use(cors());

// Simple health check
app.get('/', (_req, res) => {
  res.type('text/plain').send('YouTube audio downloader is running');
});

// GET /download?url=<YouTube URL>
app.get('/download', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing required query parameter: url' });
    }

    // Validate URL by trying to parse video ID
    const id = playdl.extractID(url);
    if (!id) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Normalize to a clean watch URL
    const cleanUrl = `https://www.youtube.com/watch?v=${id}`;

    // Fetch basic info for filename (try play-dl, fallback to ytdl)
    let rawTitle = 'youtube-audio';
    try {
      const info = await playdl.video_basic_info(cleanUrl);
      rawTitle = info?.video_details?.title || rawTitle;
    } catch (_) {
      try {
        const info2 = await ytdl.getInfo(cleanUrl);
        rawTitle = info2?.videoDetails?.title || rawTitle;
      } catch (_) {}
    }
    const safeTitle = rawTitle.replace(/[^a-z0-9\- _\.]/gi, '_').slice(0, 80);
    const filename = `${safeTitle}.mp3`;

    // Prepare response headers for streaming/downloading
    res.setHeader('Content-Type', 'audio/mpeg');
    // Use inline so clients can stream, use attachment if you want forced download
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Allow range requests for better streaming support
    res.setHeader('Accept-Ranges', 'bytes');

    // Get an actual audio stream
    let audioStream;
    try {
      const source = await playdl.stream(cleanUrl, { quality: 2 });
      audioStream = source.stream;
    } catch (e) {
      // Fallback to ytdl-core
      audioStream = ytdl(cleanUrl, {
        quality: 'highestaudio',
        filter: 'audioonly',
        highWaterMark: 1 << 25,
      });
    }

    // Transcode to mp3 on-the-fly using ffmpeg
    const command = ffmpeg()
      .input(audioStream)
      .audioBitrate(192)
      .format('mp3')
      .on('error', (err) => {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Transcoding error', details: String(err && err.message || err) });
        }
      })
      .on('start', () => {
        // noop; headers already set
      })
      .on('end', () => {
        // stream finished
      });

    // Pipe transcoded MP3 to client
    command.pipe(res, { end: true });
  } catch (err) {
    const msg = (err && err.message) || String(err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process request', details: msg });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`YouTube audio server listening on http://localhost:${PORT}`);
});


