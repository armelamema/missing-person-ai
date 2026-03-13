// test-nova.js
require('dotenv').config(); // load .env variables
const fs = require('fs');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// Make sure your .env has:
// AWS_REGION=us-west-2
// AWS_BEARER_TOKEN_BEDROCK=YOUR_API_KEY

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    // API key authentication
    accessKeyId: process.env.AWS_BEARER_TOKEN_BEDROCK,
    secretAccessKey: '' // leave empty for Bedrock token
  }
});

async function testNova() {
  try {
    const description = "6 year old girl, Albania"; // change description here

    // Create the command to invoke the model
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2", // text-only model
      contentType: "application/json",
      body: JSON.stringify({
        input_text: `Find information about a missing person: ${description}`
      })
    });

    // Send command to Bedrock
    const response = await client.send(command);

    // Decode the response
    const text = new TextDecoder().decode(response.body);

    let suggestion = text;
    try {
      const parsed = JSON.parse(text);
      suggestion = parsed.output_text || JSON.stringify(parsed);
    } catch {}

    console.log("Nova response:", suggestion);
  } catch (err) {
    console.error("Error calling Nova:", err);
  }
}

// Run the test
testNova();