require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");

const app = express();
const PORT = process.env.PORT || 3000;

// Bedrock client
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
const storage = multer.memoryStorage(); // no files saved, easier for Render
const upload = multer({ storage });

// Upload endpoint
app.post('/upload', upload.single('photo'), async (req, res) => {
  const description = req.body.description || "No description";

  try {
    const command = new ConverseCommand({
      modelId: process.env.MODEL_ID,
      messages: [{
        role: "user",
        content: [{ text: `Give detailed steps and tips to find this missing person: ${description}` }]
      }]
    });

    const response = await client.send(command);

    // Extract AI answer safely
    const text = response?.output?.message?.content?.find(c => c.text)?.text ||
                 "AI could not respond, but try again.";

    res.json({ suggestion: text });
  } catch (err) {
    console.error("Bedrock error:", err);
    // Always return something to the user
    res.json({ suggestion: "AI could not respond. Check again later." });
  }
});

// Follow-up endpoint
app.post('/followup', async (req, res) => {
  const question = req.body.question || "No question";

  try {
    const command = new ConverseCommand({
      modelId: process.env.MODEL_ID,
      messages: [{
        role: "user",
        content: [{ text: `Answer this question about finding a missing person: ${question}` }]
      }]
    });

    const response = await client.send(command);
    const text = response?.output?.message?.content?.find(c => c.text)?.text ||
                 "AI could not respond, try again.";
    res.json({ answer: text });
  } catch (err) {
    console.error("Bedrock error:", err);
    res.json({ answer: "AI could not respond. Try again later." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Using model:", process.env.MODEL_ID);
});