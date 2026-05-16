require("dotenv").config();
const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

async function analyzeReceipt(imagePath) {
  const ext = path.extname(imagePath).slice(1).toLowerCase();
  const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  const data = fs.readFileSync(imagePath).toString("base64");

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data },
          },
          {
            type: "text",
            text: "이 영수증에서 가맹점명, 날짜, 총액, 품목 목록(이름·수량·금액)을 추출해서 JSON으로만 반환해줘.",
          },
        ],
      },
    ],
  });

  console.log(message.content[0].text);
}

const imagePath = process.argv[2];
if (!imagePath) {
  console.error("사용법: node index.js <영수증 이미지 경로>");
  process.exit(1);
}

analyzeReceipt(imagePath).catch((err) => {
  console.error(err);
  process.exit(1);
});
