import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// 상대적 시간 표시 함수
const getTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}일 전`;
  return date.toLocaleDateString();
};

function App() {
  const [posts, setPosts] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('inu_auth_token') === 'true';
  });

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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="app-header">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1 className="header">INU CSE 익명 게시판</h1>
          </Link>
        </header>

        <Routes>
          <Route 
            path="/" 
            element={
              <Home 
                posts={posts} 
                isAuthenticated={isAuthenticated} 
                setIsAuthenticated={setIsAuthenticated} 
              />
            } 
          />
          <Route 
            path="/write" 
            element={<Write fetchPosts={fetchPosts} />} 
          />
          <Route 
            path="/posts/:id" 
            element={<PostDetail posts={posts} fetchPosts={fetchPosts} />} 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// 홈 화면 컴포넌트
function Home({ posts, isAuthenticated, setIsAuthenticated }) {
  const [email, setEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const navigate = useNavigate();

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

  return (
    <>
      {!isAuthenticated ? (
        <div className="card auth-container">
          <h3 className="auth-title">🔒 인천대 학생 인증이 필요합니다</h3>
          <form onSubmit={handleRequestCode} className="form-group">
            <input
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="인천대 이메일 (@inu.ac.kr)" 
              required
              className="input-text"
              disabled={isCodeSent}
            />
            <button type="submit" disabled={isCodeSent} className="btn-primary">
              인증번호 받기
            </button>
          </form>
          {isCodeSent && (
            <form onSubmit={handleVerifyCode} className="form-group">
              <input
                type="text" 
                value={authCode} 
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="6자리 인증번호 입력" 
                required
                className="input-text"
              />
              <button type="submit" className="btn-primary">인증 확인</button>
            </form>
          )}
        </div>
      ) : (
        <div 
          className="card write-trigger-card" 
          onClick={() => navigate('/write')}
          style={{ cursor: 'pointer', textAlign: 'center', color: '#888', border: '1px dashed #1976d2' }}
        >
          새 글을 작성해주세요! ✍️
        </div>
      )}

      <h3 className="post-list-title">게시글 목록</h3>
      {posts.length === 0 ? <p className="empty-posts">아직 작성된 글이 없습니다.</p> : (
        <ul className="post-list">
          {posts.map(post => (
            <li key={post.id} className="card post-item" onClick={() => navigate(`/posts/${post.id}`)} style={{ cursor: 'pointer' }}>
              <div className="post-header">
                <strong className="post-title">{post.title}</strong>
                <span className="post-time" style={{ fontSize: '0.8rem', color: '#999' }}>{getTimeAgo(post.created_at)}</span>
              </div>
              <span className="post-description-preview">
                {post.description}
              </span>
              </li>
          ))}
        </ul>
      )}
    </>
  );
}

// 글쓰기 화면 컴포넌트
function Write({ fetchPosts }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !password) return alert("제목, 내용, 비밀번호를 모두 입력해주세요!");

    try {
      await axios.post('/api/posts', { title, description, password });
      alert("글이 등록되었습니다!");
      fetchPosts();
      navigate('/');
    } catch (error) {
      alert(error.response?.data?.message || "게시글 등록에 실패했습니다.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card post-form">
      <h3>새 글 작성</h3>
      <input
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력하세요 (최대 30자)" 
        className="input-text block-input"
        maxLength={30}
      />
      <div style={{ position: 'relative' }}>
        <textarea
          value={description} 
          onChange={(e) => setDescription(e.target.value)}
          placeholder="내용을 입력하세요 (최대 200자)" 
          className="textarea-field"
          maxLength={200}
        />
        <div style={{ 
          position: 'absolute', 
          right: '10px', 
          bottom: '22px', 
          fontSize: '0.8rem', 
          color: description.length >= 200 ? '#ff4444' : '#999' 
        }}>
          {description.length} / 200
        </div>
      </div>
      <input
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
        placeholder="삭제용 비밀번호 (4자리 이상)" 
        className="input-text block-input"
      />
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" className="btn-primary" style={{ flex: 1 }}>등록하기</button>
        <button type="button" onClick={() => navigate('/')} className="btn-primary" style={{ flex: 1, backgroundColor: '#ccc' }}>취소</button>
      </div>
    </form>
  );
}

// 상세 화면 컴포넌트
function PostDetail({ posts, fetchPosts }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const post = posts.find(p => p.id === parseInt(id));

  if (!post) return <p className="empty-posts">게시글을 찾을 수 없습니다.</p>;

  const handleDelete = async () => {
    const inputPassword = prompt("게시글 삭제를 위해 비밀번호를 입력해주세요.");
    if (!inputPassword) return;

    try {
      const res = await axios.delete(`/api/posts/${post.id}`, {
        data: { password: inputPassword }
      });
      alert(res.data.message);
      fetchPosts();
      navigate('/');
    } catch (error) {
      alert(error.response?.data?.message || "삭제 실패");
    }
  };

  return (
    <div className="card post-detail-container">
      <div className="post-header">
        <h2 className="post-title" style={{ margin: 0 }}>{post.title}</h2>
        <span className="post-time" style={{ fontSize: '0.85rem', color: '#999' }}>{getTimeAgo(post.created_at)}</span>
      </div>
      <div className="post-description-full">
        {post.description}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} className="btn-comment-submit">← 목록으로</button>
        <button onClick={handleDelete} className="btn-delete">🗑️ 삭제하기</button>
      </div>
      <hr className="post-divider" />
      <CommentSection topicId={post.id} />
    </div>
  );
}

// 댓글 컴포넌트
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
    <div className="comment-section-container">
      <div className="comment-count">댓글 {comments.length}개</div>
      <ul className="comment-list">
        {comments.map(c => (
          <li key={c.id} className="comment-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{c.content}</span>
            <span style={{ fontSize: '0.75rem', color: '#bbb' }}>{getTimeAgo(c.created_at)}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={handleCommentSubmit} className="comment-form">
        <input
          value={newComment} 
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="익명 댓글 작성..."
          className="comment-input"
        />
        <button type="submit" className="btn-comment-submit">등록</button>
      </form>
    </div>
  );
}

export default App;
