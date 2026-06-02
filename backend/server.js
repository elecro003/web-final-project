const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API 잘 작동하는지 테스트하는 경로
app.get('/api/health', (req, res) => {
  res.json({ message: "INU CSE 익명 커뮤니티 백엔드 서버가 정상 작동 중입니다." });
});

app.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});