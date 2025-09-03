// Test script to send latest token report to Make.com webhook
const latestTokenReport = {
  "id": "23d54bab-f930-4d5a-8132-3091ce190ee9",
  "token_name": "Aerodrome",
  "token_symbol": "AERO", 
  "token_address": "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
  "chain_id": "0x2105",
  "report_content": {
    "metadata": {
      "chainId": "0x2105",
      "currentPrice": 1.3626847604723464,
      "generatedAt": "2025-08-26T20:15:35.821Z",
      "generatedBy": "ai",
      "marketCap": 1207106846.38,
      "overallScore": 68,
      "scores": {
        "community": 70,
        "development": 65,
        "liquidity": 55,
        "security": 69,
        "tokenomics": 81
      },
      "tokenAddress": "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
      "tokenName": "Aerodrome",
      "tokenSymbol": "AERO"
    },
    "communityAnalysis": {
      "summary": "Community analysis shows a moderately engaged user base across social media platforms, indicating potential for growth.",
      "keyPoints": [
        "Twitter Followers: AERO has over 111,000 followers on Twitter, suggesting strong community interest.",
        "Discord Members: With 12,353 members on Discord, the community engagement is relatively healthy.",
        "Growth Potential: The active social media presence may aid in attracting new users and investors."
      ]
    },
    "securityAnalysis": {
      "summary": "The security analysis shows that the AERO token has a verified smart contract, indicating a level of trust in its code integrity.",
      "keyPoints": [
        "Contract Verified: The AERO smart contract is verified, which is crucial for trustworthiness.",
        "No Freeze Authority: The absence of freeze authority implies that no individual can halt token transactions, which is generally favorable.",
        "Can Mint: The ability to mint new tokens could lead to inflationary pressures if not managed properly."
      ]
    }
  },
  "generated_by": "a97608f8-5df3-4780-9832-d15cbe8414ac",
  "created_at": "2025-08-26T20:15:36.229447+00:00",
  "updated_at": null
};

async function sendToMakeWebhook() {
  try {
    const response = await fetch('https://hook.us2.make.com/6agypb495rymylvki6b0iw9iofu6pkds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...latestTokenReport,
        webhook_triggered_at: new Date().toISOString(),
        source: 'manual_test'
      })
    });
    
    console.log('Response status:', response.status);
    const result = await response.text();
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Successfully sent to Make.com webhook!');
    } else {
      console.error('❌ Webhook failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Send the test request
sendToMakeWebhook();