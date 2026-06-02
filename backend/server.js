const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const supabase = require('./supabase');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 임시로 인증번호를 저장할 서버 메모리 공간
const otpStore = {};

// (Nodemailer) 세팅
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ==========================================
// 🔐 이메일 인증 API 구역
// ==========================================

// 1. 인증번호 요청 API
app.post('/api/auth/request-code', async (req, res) => {
  const { email } = req.body;

  // 인천대 이메일 검증 로직
  if (!email || !email.endsWith('@inu.ac.kr')) {
    return res.status(400).json({ message: "인천대학교 이메일(@inu.ac.kr)만 사용 가능합니다." });
  }

  // 6자리 난수 생성 (예: 482910)
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 서버 메모리에 저장 (3분 후 만료되도록 설정할 수도 있음)
  otpStore[email] = code;

  // 실제 메일 발송
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '[INU CSE] 학교 인증 코드입니다.',
    text: `요청하신 인증 번호는 [ ${code} ] 입니다. 화면에 입력해 주세요!`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`${email} 로 인증번호 ${code} 발송 완료`);
    res.json({ message: "인증 번호가 발송되었습니다. 메일함을 확인해주세요!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "메일 발송에 실패했습니다." });
  }
});

// 2. 인증번호 확인 API
app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body;

  if (otpStore[email] && otpStore[email] === code) {
    // 인증 성공 시 메모리에서 삭제하고 성공 토큰 발급
    delete otpStore[email];
    res.json({ success: true, message: "인증이 완료되었습니다!" });
  } else {
    res.status(400).json({ success: false, message: "인증 번호가 틀렸거나 만료되었습니다." });
  }
});


// ==========================================
// 📝 게시판 CRUD API 구역
// ==========================================

// 게시글 목록 가져오기 (Read)
app.get('/api/posts', async (req, res) => {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 새로운 게시글 작성하기 (Create)
app.post('/api/posts', async (req, res) => {
  const { title, description, password } = req.body;

  const { data, error } = await supabase
    .from('topics')
    .insert([{ title, description, password }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "게시글이 성공적으로 등록되었습니다!", data });
});

// 게시글 삭제하기 (Delete)
app.delete('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  // 1. 해당 게시글의 비밀번호 확인
  const { data: post, error: fetchError } = await supabase
    .from('topics')
    .select('password')
    .eq('id', id)
    .single();

  if (fetchError || !post) {
    return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
  }

  // 2. 비밀번호 비교
  if (post.password !== password) {
    return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
  }

  // 3. 삭제 수행
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

// 특정 게시글의 댓글 목록 가져오기
app.get('/api/comments/:topic_id', async (req, res) => {
  const { topic_id } = req.params;

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('topic_id', topic_id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 새로운 댓글 작성하기
app.post('/api/comments', async (req, res) => {
  const { topic_id, content } = req.body;

  const { data, error } = await supabase
    .from('comments')
    .insert([{ topic_id, content }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "댓글이 등록되었습니다!", data });
});

app.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});