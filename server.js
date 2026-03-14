require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Bedrock client using AWS Access Keys
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Upload endpoint
app.post('/upload', upload.single('photo'), async (req, res, next) => {
  try {
    const description = req.body.description;

    const command = new ConverseCommand({
      modelId: process.env.MODEL_ID,
      messages: [{
        role: "user",
        content: [{
          text: `Provide useful search tips, possible locations, and next steps to help find this missing person: ${description}`
        }]
      }]
    });

    const response = await client.send(command);
    const text = response?.output?.message?.content?.[0]?.text || "No answer received";

    res.json({ suggestion: text, filename: req.file ? req.file.originalname : 'No file uploaded' });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// Follow-up endpoint
app.post('/followup', async (req, res, next) => {
  try {
    const { question } = req.body;

    const command = new ConverseCommand({
      modelId: process.env.MODEL_ID,
      messages: [{
        role: "user",
        content: [{ text: `Answer this follow-up question: ${question}` }]
      }]
    });

    const response = await client.send(command);
    const text = response?.output?.message?.content?.[0]?.text || "No answer received";

    res.json({ answer: text });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
