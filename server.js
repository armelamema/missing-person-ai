require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Bedrock client
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

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

// ==============================
// Upload Endpoint
// ==============================
app.post('/upload', upload.single('photo'), async (req, res, next) => {
  try {
    const description = req.body.description || "No description provided";

    const command = new ConverseCommand({
      modelId: process.env.MODEL_ID,
      messages: [
        {
          role: "user",
          content: [
            {
              text: `You are an AI assistant helping locate a missing person. 
Provide practical search tips, possible locations to investigate, and next steps authorities or family members should take.

Missing person description: ${description}`
            }
          ]
        }
      ]
    });

    const response = await client.send(command);

    console.log("Bedrock response:", JSON.stringify(response, null, 2));

    const text = response?.output?.message?.content?.find(item => item.text)?.text || "No answer received";

    res.json({
      suggestion: text,
      filename: req.file?.originalname || "No file uploaded"
    });

  } catch (err) {
    console.error(err);
    next(err);
  }
});

// ==============================
// Follow-up Question Endpoint
// ==============================
app.post('/followup', async (req, res, next) => {
  try {
    const question = req.body.question || "No question provided";

    const command = new ConverseCommand({
      modelId: process.env.MODEL_ID,
      messages: [
        {
          role: "user",
          content: [
            {
              text: `You are helping investigators locate a missing person.
Provide helpful guidance and suggestions.

Question: ${question}`
            }
          ]
        }
      ]
    });

    const response = await client.send(command);
    console.log("Bedrock response:", JSON.stringify(response, null, 2));

    const text = response?.output?.message?.content?.find(item => item.text)?.text || "No answer received";

    res.json({ answer: text });

  } catch (err) {
    console.error(err);
    next(err);
  }
});

// ==============================
// Global Error Handler
// ==============================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong", message: err.message });
});

// ==============================
// Start Server
// ==============================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Using model:", process.env.MODEL_ID);
});