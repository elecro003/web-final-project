import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function App() {
  // 게시판 상태
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState(''); // 게시글 비밀번호 상태 추가

  // 이메일 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('inu_auth_token') === 'true';
  });
  const [email, setEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await axios.get('/api/posts');
      if (Array.isArray(response.data)) {
        setPosts(response.data);
      }
    } catch (error) {
      console.error("데이터를 불러오는데 실패했습니다.", error);
    }
  }, []);

  // 1. 화면이 켜질 때 게시글 불러오기
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // 2. 인증번호 전송 요청 API 호출
  const handleRequestCode = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/request-code', { email });
      alert(res.data.message);
      setIsCodeSent(true);
    } catch (error) {
      alert(error.response?.data?.message || "오류가 발생했습니다.");
    }
  };

  // 3. 인증번호 검증 API 호출
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/verify-code', { email, code: authCode });
      alert(res.data.message);
      localStorage.setItem('inu_auth_token', 'true');
      setIsAuthenticated(true);
    } catch (error) {
      alert(error.response?.data?.message || "인증 번호가 틀렸습니다.");
    }
  };

  // 4. 게시글 등록 API 호출
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !password) return alert("제목, 내용, 비밀번호를 모두 입력해주세요!");

    try {
      await axios.post('/api/posts', { title, description, password });
      setTitle('');
      setDescription('');
      setPassword('');
      fetchPosts();
    } catch (error) {
      alert(error.response?.data?.message || "게시글 등록에 실패했습니다.");
    }
  };

  // 5. 게시글 삭제 API 호출
  const handleDelete = async (postId) => {
    const inputPassword = prompt("게시글 삭제를 위해 비밀번호를 입력해주세요.");
    if (!inputPassword) return;

    try {
      const res = await axios.delete(`/api/posts/${postId}`, {
        data: { password: inputPassword }
      });
      alert(res.data.message);
      fetchPosts();
    } catch (error) {
      alert(error.response?.data?.message || "삭제 실패");
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>INU CSE 익명 게시판</h1>

      {!isAuthenticated ? (
        <div style={{ padding: '20px', background: '#ffebee', marginBottom: '20px', borderRadius: '8px' }}>
          <h3>🔒 인천대 학생 인증이 필요합니다</h3>
          <form onSubmit={handleRequestCode} style={{ marginBottom: '10px' }}>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="인천대 이메일 (@inu.ac.kr)" required
              style={{ padding: '8px', width: '70%', marginRight: '5px' }}
              disabled={isCodeSent}
            />
            <button type="submit" disabled={isCodeSent}>인증번호 받기</button>
          </form>
          {isCodeSent && (
            <form onSubmit={handleVerifyCode}>
              <input
                type="text" value={authCode} onChange={(e) => setAuthCode(e.target.value)}
                placeholder="6자리 인증번호 입력" required
                style={{ padding: '8px', width: '70%', marginRight: '5px' }}
              />
              <button type="submit">인증 확인</button>
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
          <h3>글 쓰기</h3>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="제목" style={{ display: 'block', marginBottom: '10px', width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="내용을 입력하세요" style={{ display: 'block', marginBottom: '10px', width: '100%', height: '80px', padding: '8px', boxSizing: 'border-box' }}
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="삭제용 비밀번호 (4자리 이상)" style={{ display: 'block', marginBottom: '10px', width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          <button type="submit" style={{ padding: '10px 20px' }}>등록하기</button>
        </form>
      )}

      <h3>게시글 목록</h3>
      {posts.length === 0 ? <p>아직 작성된 글이 없습니다.</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {posts.map(post => (
            <li key={post.id} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <strong style={{ fontSize: '1.2em' }}>{post.title}</strong>
                <button
                  onClick={() => handleDelete(post.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}
                >
                  🗑️ 삭제
                </button>
              </div>
              <span style={{ color: '#555', display: 'block', marginTop: '8px', marginBottom: '15px' }}>{post.description}</span>
              <hr style={{ border: '0', borderTop: '1px solid #eee', marginBottom: '10px' }} />
              <CommentSection topicId={post.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentSection({ topicId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      const res = await axios.get(`/api/comments/${topicId}`);
      if (Array.isArray(res.data)) {
        setComments(res.data);
      }
    } catch (error) {
      console.error("댓글 로딩 실패", error);
    }
  }, [topicId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await axios.post('/api/comments', { topic_id: topicId, content: newComment });
      setNewComment('');
      fetchComments();
    } catch (error) {
      alert(error.response?.data?.message || "댓글 등록에 실패했습니다.");
    }
  };

  return (
    <div>
      <div style={{ fontSize: '0.9em', color: '#777', marginBottom: '5px' }}>댓글 {comments.length}개</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px 0', fontSize: '0.9em' }}>
        {comments.map(c => (
          <li key={c.id} style={{ background: '#f9f9f9', padding: '5px 10px', borderRadius: '4px', marginBottom: '3px' }}>
            {c.content}
          </li>
        ))}
      </ul>
      <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '5px' }}>
        <input
          value={newComment} onChange={(e) => setNewComment(e.target.value)}
          placeholder="익명 댓글 작성..."
          style={{ flexGrow: 1, padding: '5px', fontSize: '0.85em', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        <button type="submit" style={{ padding: '5px 10px', fontSize: '0.85em', cursor: 'pointer' }}>등록</button>
      </form>
    </div>
  );
}

export default App;
