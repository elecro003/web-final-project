const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const supabase = require('./supabase');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 도배 방지 (Rate Limit) 세팅
const postLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 2,
  message: { message: "글 작성은 1분에 2번만 가능합니다. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10,
  message: { message: "댓글 작성은 1분에 10번만 가능합니다. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 임시로 인증번호를 저장할 서버 메모리 공간
const otpStore = {};

// (Nodemailer) 세팅 - Render/Production 환경 최적화 (2525 포트 우회 설정)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 2525,
  secure: false, // 2525 포트는 STARTTLS를 사용하므로 false여야 함
  requireTLS: true, // TLS 강제
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000, // 10초 타임아웃 설정 (504 방지)
});

// ==========================================
// 🔐 이메일 인증 API 구역
// ==========================================

app.post('/api/auth/request-code', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.endsWith('@inu.ac.kr')) {
    return res.status(400).json({ message: "인천대학교 이메일(@inu.ac.kr)만 사용 가능합니다." });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = code;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '[INU CSE 익명 커뮤니티] 학교 인증 코드입니다.',
    text: `요청하신 인증 번호는 [${code}] 입니다. 화면에 입력해 주세요.`,
  };

  try {
    // transporter.sendMail은 에러 발생 시 throw하므로 try-catch로 확실히 잡음
    await transporter.sendMail(mailOptions);
    res.json({ message: "인증 번호가 발송되었습니다. 메일함을 확인해주세요!" });
  } catch (error) {
    console.error("📧 메일 발송 에러:", error);
    // 에러 발생 시 서버가 죽지 않고 클라이언트에게 에러 응답 반환
    res.status(500).json({ 
      message: "메일 발송에 실패했습니다. 관리자에게 문의하거나 잠시 후 다시 시도해주세요.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (otpStore[email] && otpStore[email] === code) {
    delete otpStore[email];
    res.json({ success: true, message: "인증이 완료되었습니다!" });
  } else {
    res.status(400).json({ success: false, message: "인증 번호가 틀렸거나 만료되었습니다." });
  }
});


// ==========================================
// 📝 게시판 CRUD API 구역
// ==========================================

app.get('/api/posts', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase client not initialized. Check env vars." });
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/posts', postLimiter, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase client not initialized. Check env vars." });
  const { title, description, password } = req.body;

  const { data, error } = await supabase
    .from('topics')
    .insert([{ title, description, password }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "게시글이 성공적으로 등록되었습니다!", data });
});

app.delete('/api/posts/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase client not initialized. Check env vars." });
  const { id } = req.params;
  const { password } = req.body;

  const { data: post, error: fetchError } = await supabase
    .from('topics')
    .select('password')
    .eq('id', id)
    .single();

  if (fetchError || !post) {
    return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
  }

  if (post.password !== password) {
    return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
  }

  const { error: deleteError } = await supabase
    .from('topics')
    .delete()
    .eq('id', id);

  if (deleteError) return res.status(500).json({ error: deleteError.message });
  res.json({ message: "게시글이 삭제되었습니다." });
});


// ==========================================
// 💬 댓글 API 구역
// ==========================================

app.get('/api/comments/:topic_id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase client not initialized. Check env vars." });
  const { topic_id } = req.params;
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('topic_id', topic_id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/comments', commentLimiter, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase client not initialized. Check env vars." });
  const { topic_id, content } = req.body;

  const { data, error } = await supabase
    .from('comments')
    .insert([{ topic_id, content }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "댓글이 등록되었습니다!", data });
});

// Supabase 연결 상태 확인
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error("❌ 에러: SUPABASE_URL 또는 SUPABASE_KEY가 설정되지 않았습니다. .env 파일이나 환경 변수를 확인하세요.");
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 서버가 ${PORT}번 포트에서 실행 중입니다. (0.0.0.0)`);
});