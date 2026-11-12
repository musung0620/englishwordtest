import React, { useState, useEffect, useMemo } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Volume2,
  Trash2,
  Edit3,
  X,
  Sparkles,
  BarChart3,
  Smile,
  AlertCircle
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  subscribeUserWords,
  addWord,
  updateWord,
  toggleWordMemorized,
  deleteWord
} from './services/wordService';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'memorized' | 'learning'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState(null); // null if adding new word

  // Form states
  const [formData, setFormData] = useState({
    word: '',
    meaning: '',
    example: '',
    isMemorized: false
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setErrorMessage('');
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to user words when user logs in
  useEffect(() => {
    if (!user) {
      setWords([]);
      setWordsLoading(false);
      return;
    }

    setWordsLoading(true);
    const unsubscribe = subscribeUserWords(
      user.uid,
      (fetchedWords) => {
        setWords(fetchedWords);
        setWordsLoading(false);
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        setErrorMessage('단어 데이터를 불러오는 중 오류가 발생했습니다: ' + error.message);
        setWordsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      setErrorMessage('');
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
        setErrorMessage('Firebase 콘솔의 Authentication에서 Google 로그인을 활성화해주세요.');
      } else {
        setErrorMessage('로그인 중 오류가 발생했습니다: ' + error.message);
      }
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Open modal for Adding
  const handleOpenAddModal = () => {
    setEditingWord(null);
    setFormData({
      word: '',
      meaning: '',
      example: '',
      isMemorized: false
    });
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEditModal = (wordItem) => {
    setEditingWord(wordItem);
    setFormData({
      word: wordItem.word,
      meaning: wordItem.meaning,
      example: wordItem.example || '',
      isMemorized: Boolean(wordItem.isMemorized)
    });
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWord(null);
  };

  // Save (Add or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.word.trim()) {
      alert('영어 단어를 입력해주세요.');
      return;
    }
    if (!formData.meaning.trim()) {
      alert('뜻을 입력해주세요.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingWord) {
        await updateWord(user.uid, editingWord.id, formData);
      } else {
        await addWord(user.uid, formData);
        // If created as already memorized, show subtle confetti
        if (formData.isMemorized) {
          triggerConfetti();
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving word:', error);
      alert('단어 저장에 실패했습니다: ' + error.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle memorized status
  const handleToggleMemorized = async (wordItem) => {
    try {
      const willBeMemorized = !wordItem.isMemorized;
      await toggleWordMemorized(user.uid, wordItem.id, wordItem.isMemorized);

      if (willBeMemorized) {
        triggerConfetti();
      }
    } catch (error) {
      console.error('Error toggling memorized:', error);
      alert('상태 변경에 실패했습니다: ' + error.message);
    }
  };

  // Delete word
  const handleDeleteWord = async (wordItem) => {
    if (!window.confirm(`'${wordItem.word}' 단어를 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await deleteWord(user.uid, wordItem.id);
    } catch (error) {
      console.error('Error deleting word:', error);
      alert('삭제에 실패했습니다: ' + error.message);
    }
  };

  // Pronounce English word with Speech Synthesis
  const handleSpeak = (text) => {
    if (!window.speechSynthesis) {
      alert('이 브라우저는 음성 재생을 지원하지 않습니다.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Confetti effect
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      // Ignore if confetti fails
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = words.length;
    const memorized = words.filter((w) => w.isMemorized).length;
    const learning = total - memorized;
    const percentage = total > 0 ? Math.round((memorized / total) * 100) : 0;
    return { total, memorized, learning, percentage };
  }, [words]);

  // Filtered words
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      // Search filter
      const matchesSearch =
        w.word.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        w.meaning.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (w.example && w.example.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      if (!matchesSearch) return false;

      // Status filter
      if (filterStatus === 'memorized') return w.isMemorized;
      if (filterStatus === 'learning') return !w.isMemorized;
      return true;
    });
  }, [words, searchQuery, filterStatus]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📖</div>
          <p style={{ fontWeight: 500 }}>로딩 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            paddingBottom: '16px'
          }}
        >
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)'
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                나만의 영어 단어장
              </h1>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                My Vocabulary Notebook
              </span>
            </div>
          </div>

          {/* User Section */}
          <div>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        border: '2px solid #e2e8f0'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: '#e0e7ff',
                        color: '#4338ca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}
                    >
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div style={{ display: 'none', lineHeight: 1.2 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      {user.displayName || '사용자'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '8px'
                  }}
                  title="로그아웃"
                >
                  <LogOut size={15} />
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#1e293b',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Google 계정으로 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1, width: '100%' }}>
        {/* Error notification */}
        {errorMessage && (
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
            <button onClick={() => setErrorMessage('')} style={{ color: '#b91c1c' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {!user ? (
          /* Logged-Out Hero State */
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              maxWidth: '640px',
              margin: '40px auto',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}
            >
              <Sparkles size={36} />
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              나만의 영어 단어장을 시작해보세요
            </h2>
            <p style={{ color: '#64748b', fontSize: '16px', lineHeight: 1.7, marginBottom: '32px' }}>
              기억하고 싶은 영어 단어, 뜻, 예문을 저장하고 외움 여부를 체크하세요.
              <br />
              Google 로그인으로 언제 어디서든 나만의 안전한 단어장에 접속할 수 있습니다.
            </p>
            <button
              onClick={handleGoogleLogin}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 28px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
              }}
            >
              Google 계정으로 시작하기
            </button>
            <div
              style={{
                marginTop: '40px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                textAlign: 'center'
              }}
            >
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔒</div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>나만의 데이터 보호</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>내 계정 전용 Firestore</div>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔊</div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>원어민 발음 듣기</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>클릭 한 번으로 재생</div>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>✨</div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>학습 진도 관리</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>외움 여부 즉시 체크</div>
              </div>
            </div>
          </div>
        ) : (
          /* Logged-In User Interface */
          <div>
            {/* Header Greeting & Action */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '24px'
              }}
            >
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                  {user.displayName || '회원'}님의 단어장 📖
                </h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
                  오늘도 새로운 영어 단어를 완벽하게 외워보세요!
                </p>
              </div>

              <button
                onClick={handleOpenAddModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 20px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)'
                }}
              >
                <Plus size={18} />
                새 단어 추가
              </button>
            </div>

            {/* Statistics Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '20px 24px',
                border: '1px solid #e2e8f0',
                marginBottom: '24px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '20px',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>전체 단어</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
                    {stats.total}개
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 500 }}>다 외움 ✅</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }}>
                    {stats.memorized}개
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 500 }}>외우는 중 📝</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b' }}>
                    {stats.learning}개
                  </div>
                </div>
                <div style={{ minWidth: '180px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      color: '#475569',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}
                  >
                    <span>학습 진행률</span>
                    <span style={{ color: '#4f46e5' }}>{stats.percentage}%</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '999px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${stats.percentage}%`,
                        height: '100%',
                        backgroundColor: '#4f46e5',
                        borderRadius: '999px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}
            >
              {/* Filter Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  padding: '4px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <button
                  onClick={() => setFilterStatus('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: filterStatus === 'all' ? '#4f46e5' : 'transparent',
                    color: filterStatus === 'all' ? '#ffffff' : '#64748b'
                  }}
                >
                  전체 ({stats.total})
                </button>
                <button
                  onClick={() => setFilterStatus('learning')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: filterStatus === 'learning' ? '#4f46e5' : 'transparent',
                    color: filterStatus === 'learning' ? '#ffffff' : '#64748b'
                  }}
                >
                  외우는 중 ({stats.learning})
                </button>
                <button
                  onClick={() => setFilterStatus('memorized')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: filterStatus === 'memorized' ? '#4f46e5' : 'transparent',
                    color: filterStatus === 'memorized' ? '#ffffff' : '#64748b'
                  }}
                >
                  다 외움 ({stats.memorized})
                </button>
              </div>

              {/* Search Box */}
              <div
                style={{
                  position: 'relative',
                  width: '280px',
                  maxWidth: '100%'
                }}
              >
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8'
                  }}
                />
                <input
                  type="text"
                  placeholder="단어 또는 뜻 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '13px',
                    outline: 'none',
                    color: '#0f172a'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      display: 'flex'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Word List Container */}
            {wordsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                단어 목록을 불러오는 중...
              </div>
            ) : filteredWords.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b'
                }}
              >
                {searchQuery ? (
                  <>
                    <Search size={32} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 600, color: '#1e293b' }}>
                      '{searchQuery}'에 대한 검색 결과가 없습니다.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        marginTop: '12px',
                        color: '#4f46e5',
                        fontWeight: 600,
                        fontSize: '13px'
                      }}
                    >
                      검색어 지우기
                    </button>
                  </>
                ) : filterStatus !== 'all' ? (
                  <>
                    <Smile size={32} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 600, color: '#1e293b' }}>
                      해당 조건의 단어가 없습니다.
                    </p>
                    <button
                      onClick={() => setFilterStatus('all')}
                      style={{
                        marginTop: '12px',
                        color: '#4f46e5',
                        fontWeight: 600,
                        fontSize: '13px'
                      }}
                    >
                      전체 단어 보기
                    </button>
                  </>
                ) : (
                  <>
                    <BookOpen size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>
                      아직 등록된 단어가 없습니다!
                    </p>
                    <p style={{ fontSize: '14px', marginTop: '4px', marginBottom: '20px' }}>
                      외우고 싶은 영어 단어를 첫 번째로 추가해보세요.
                    </p>
                    <button
                      onClick={handleOpenAddModal}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#4f46e5',
                        color: '#ffffff',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}
                    >
                      첫 단어 추가하기
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: '16px'
                }}
              >
                {filteredWords.map((item) => (
                  <div
                    key={item.id}
                    className="animate-fade-in"
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: item.isMemorized ? '1px solid #d1fae5' : '1px solid #e2e8f0',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      position: 'relative'
                    }}
                  >
                    <div>
                      {/* Top Bar: Word + Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '20px',
                              fontWeight: 700,
                              color: item.isMemorized ? '#059669' : '#0f172a',
                              letterSpacing: '-0.01em'
                            }}
                          >
                            {item.word}
                          </span>
                          {/* Speak Button */}
                          <button
                            onClick={() => handleSpeak(item.word)}
                            title="발음 듣기"
                            style={{
                              padding: '4px',
                              borderRadius: '6px',
                              color: '#64748b',
                              backgroundColor: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title="수정"
                            style={{
                              padding: '5px',
                              color: '#64748b',
                              borderRadius: '6px'
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteWord(item)}
                            title="삭제"
                            style={{
                              padding: '5px',
                              color: '#ef4444',
                              borderRadius: '6px'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Meaning */}
                      <p
                        style={{
                          fontSize: '15px',
                          color: '#334155',
                          marginTop: '10px',
                          fontWeight: 500,
                          lineHeight: 1.5
                        }}
                      >
                        {item.meaning}
                      </p>

                      {/* Example sentence */}
                      {item.example && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '10px 12px',
                            backgroundColor: '#f8fafc',
                            borderLeft: '3px solid #cbd5e1',
                            borderRadius: '0 8px 8px 0',
                            fontSize: '13px',
                            color: '#475569',
                            fontStyle: 'italic',
                            lineHeight: 1.5
                          }}
                        >
                          "{item.example}"
                        </div>
                      )}
                    </div>

                    {/* Bottom Status Toggle */}
                    <div
                      style={{
                        marginTop: '18px',
                        paddingTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <button
                        onClick={() => handleToggleMemorized(item)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: item.isMemorized ? '#ecfdf5' : '#fffbeb',
                          color: item.isMemorized ? '#059669' : '#d97706',
                          border: item.isMemorized
                            ? '1px solid #a7f3d0'
                            : '1px solid #fde68a'
                        }}
                      >
                        {item.isMemorized ? (
                          <>
                            <CheckCircle2 size={14} />
                            다 외움!
                          </>
                        ) : (
                          <>
                            <Circle size={14} />
                            외우는 중
                          </>
                        )}
                      </button>

                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        클릭하여 외움 표시
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {editingWord ? '단어 수정하기' : '새 단어 추가하기'}
              </h3>
              <button onClick={handleCloseModal} style={{ color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              {/* English Word */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px'
                  }}
                >
                  영어 단어 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: persistent"
                  value={formData.word}
                  onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              {/* Meaning */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px'
                  }}
                >
                  뜻 (한글 의미) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 끈기 있는, 지속적인"
                  value={formData.meaning}
                  onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Example sentence */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px'
                  }}
                >
                  예문 (선택 사항)
                </label>
                <textarea
                  rows="3"
                  placeholder="예: She was persistent in pursuing her goals."
                  value={formData.example}
                  onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Memorized checkbox */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#334155',
                    fontWeight: 500
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.isMemorized}
                    onChange={(e) =>
                      setFormData({ ...formData, isMemorized: e.target.checked })
                    }
                    style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
                  />
                  <span>이미 다 외운 단어로 등록</span>
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#64748b',
                    backgroundColor: '#f1f5f9'
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#ffffff',
                    backgroundColor: '#4f46e5',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
                    opacity: formSubmitting ? 0.7 : 1
                  }}
                >
                  {formSubmitting
                    ? '저장 중...'
                    : editingWord
                    ? '수정 완료'
                    : '단어 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #e2e8f0',
          padding: '24px 16px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#94a3b8',
          backgroundColor: '#ffffff',
          marginTop: '40px'
        }}
      >
        <p>
          나만의 영어 단어장 &bull; Powered by Firebase Authentication & Cloud Firestore
        </p>
      </footer>
    </div>
  );
}
