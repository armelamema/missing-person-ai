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

// Multer setup (memory storage for Render-friendly uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ==============================
// Upload Endpoint
// ==============================
app.post('/upload', upload.single('photo'), async (req, res) => {
  const description = req.body.description || "No description provided";

  try {
    const command = new ConverseCommand({
  modelId: process.env.MODEL_ID,
  messages: [
    {
      role: "user",
      content: [
        {
          text: `You are a professional missing person investigator. 
Provide a detailed, structured plan to help locate the missing person described below.
Include:
- Immediate actions for family or authorities
- Types of documents or records to check (school, hospital, social media)
- Locations to investigate (home, parks, friends or relatives' houses)
- Who to contact (police, NGOs, volunteers)
- Safety tips for searchers
- Any other practical advice

Missing person description: ${description}

Please give your answer in multiple paragraphs, clearly structured and actionable.`
        }
      ]
    }
  ]
});
    const response = await client.send(command);

    // Extract AI text safely
    const text = response?.output?.message?.content?.find(item => item.text)?.text || 
                 "AI could not respond, try again.";

    res.json({
      suggestion: text,
      filename: req.file?.originalname || "No file uploaded"
    });

  } catch (err) {
    console.error("Bedrock error:", err);
    res.json({ suggestion: "AI could not respond. Try again later." });
  }
});

// ==============================
// Follow-up Question Endpoint
// ==============================
app.post('/followup', async (req, res) => {
  const question = req.body.question || "No question provided";

  try {
    const command = new ConverseCommand({
  modelId: process.env.MODEL_ID,
  messages: [
    {
      role: "user",
      content: [
        {
          text: `You are a professional missing person investigator. 
Answer the following question in detail and provide actionable advice, including possible locations, documents, or people to contact:

${question}`
        }
      ]
    }
  ]
});
   

    const response = await client.send(command);

    const text = response?.output?.message?.content?.find(item => item.text)?.text || 
                 "AI could not respond. Try again.";

    res.json({ answer: text });

  } catch (err) {
    console.error("Bedrock error:", err);
    res.json({ answer: "AI could not respond. Try again later." });
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