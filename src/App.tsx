import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Star, 
  Share2, 
  MoreVertical,
  Trash2,
  Edit3,
  X,
  Sparkles,
  ArrowRight,
  Quote,
  Timer,
  Bell,
  Calendar,
  Image as ImageIcon,
  Network,
  ChevronRight,
  Library,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Trophy,
  Zap,
  Cloud,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, BookStatus, Recommendation, Chapter, UserStats } from './types';
import { generateBookSummary, getBookRecommendations } from './services/gemini';
import { cn } from './utils';
import { addMonths, addDays, format, isPast, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Markdown from 'react-markdown';
import { toPng } from 'html-to-image';

// --- Constants & Helpers ---

const LEVELS = [
  { min: 0, rank: '初级读者', level: 1 },
  { min: 200, rank: '进阶读者', level: 2 },
  { min: 1000, rank: '资深读者', level: 3 },
  { min: 3000, rank: '博览群书', level: 4 },
  { min: 8000, rank: '阅读大师', level: 5 },
  { min: 15000, rank: '学富五车', level: 6 },
  { min: 30000, rank: '一代宗师', level: 7 },
];

const getLevelInfo = (exp: number) => {
  return LEVELS.reduce((prev, curr) => (exp >= curr.min ? curr : prev));
};

// --- Components ---

const ChapterItem = ({ chapter }: { chapter: Chapter }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="border-b border-black/[0.01] last:border-0">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2.5 flex items-center justify-between text-left hover:bg-black/[0.01] px-4 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-1 rounded-full bg-vermilion/30 group-hover:bg-vermilion/60 transition-colors shadow-sm shadow-vermilion/20" />
          <span className="ancient font-bold text-ink/70 text-base group-hover:text-ink transition-colors tracking-tight">{chapter.title}</span>
        </div>
        <ChevronRight size={12} className={cn("text-stone-300 transition-transform duration-300", isExpanded && "rotate-90")} />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-stone-50/30"
          >
            <div className="px-8 pb-4 pt-1 text-sm text-stone-500 leading-relaxed serif whitespace-pre-wrap italic opacity-80 border-l border-vermilion/10 ml-4.5">
              {chapter.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const isReviewDue = (dateStr?: string) => {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && isPast(date);
  } catch (e) {
    return false;
  }
};

const BookCard = ({ book, onClick, onShare }: { book: Book, onClick: () => void, onShare: (e: React.MouseEvent) => void }) => (
  <motion.div 
    layoutId={book.id}
    onClick={onClick}
    className="group relative bg-white rounded-sm overflow-hidden border border-black/[0.01] book-shadow hover:translate-y-[-2px] transition-all duration-300 cursor-pointer flex flex-col h-full"
  >
    <div className="aspect-[3/4] overflow-hidden bg-stone-50 relative">
      <img 
        src={book.coverUrl || `https://picsum.photos/seed/${book.id}/400/600`} 
        alt={book.title}
        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 grayscale-[0.2] group-hover:grayscale-0 transition-all"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
        <button 
          onClick={onShare}
          className="p-1.5 bg-white/80 backdrop-blur rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-ink hover:text-white"
        >
          <Share2 size={10} />
        </button>
      </div>
      
      {isReviewDue(book.nextReviewDate) && (
        <div className="absolute top-0 left-0 bg-vermilion text-paper text-[7px] font-bold px-2 py-1 uppercase tracking-[0.2em] rounded-br-sm shadow-lg shadow-vermilion/20 ancient z-10">
          待复习
        </div>
      )}

      {/* Status Badge */}
      <div className="absolute bottom-1.5 left-1.5">
        <div className={cn(
          "px-1.5 py-0.5 rounded-full text-[6px] font-bold uppercase tracking-widest ancient backdrop-blur-sm border shadow-sm",
          book.status === 'finished' ? "bg-teal/10 text-teal border-teal/20" : 
          book.status === 'reading' ? "bg-indigo/10 text-indigo border-indigo/20" : 
          "bg-stone-100/50 text-stone-400 border-stone-200/50"
        )}>
          {book.status === 'finished' ? '已读完' : book.status === 'reading' ? '正在读' : '想读'}
        </div>
      </div>
    </div>
    <div className="p-2.5 flex-1 flex flex-col bg-white relative">
      <h3 className="ancient font-bold text-xs leading-tight line-clamp-2 mb-0.5 group-hover:text-ink transition-colors text-ink/90">{book.title}</h3>
      <p className="text-[8px] text-stone-400 font-medium mb-1.5 serif italic opacity-60">{book.author}</p>
      
      <div className="mt-auto pt-1.5 border-t border-black/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              size={7} 
              className={cn(i < book.rating ? "fill-gold text-gold" : "text-stone-100")} 
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {book.reviewHistory && book.reviewHistory.length > 0 && (
            <span className="text-[6px] text-indigo/40 font-bold ancient tracking-tighter">
              复习 {book.reviewHistory.length}
            </span>
          )}
          {book.chapters && book.chapters.length > 0 && (
            <span className="text-[7px] px-1 py-0.5 bg-black/[0.01] rounded-sm text-stone-400 font-bold ancient tracking-wider border border-black/[0.02]">
              {book.chapters.length} 卷
            </span>
          )}
        </div>
      </div>
      {book.reviewHistory && book.reviewHistory.length > 0 && (
        <div className="mt-1 text-[6px] text-stone-300 serif italic opacity-60">
          上次复习: {formatDistanceToNow(new Date(book.reviewHistory[book.reviewHistory.length - 1]), { addSuffix: true, locale: zhCN })}
        </div>
      )}
    </div>
  </motion.div>
);

const Modal = ({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink/20 backdrop-blur-md z-50"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="fixed inset-x-4 top-[8%] bottom-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[580px] bg-paper rounded-3xl z-50 overflow-hidden shadow-deep border border-black/[0.02] flex flex-col"
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// --- Main App ---

export default function App() {
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem('shiori-books');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse books from localStorage', e);
    }
    return [
      {
        id: '1',
        title: '红楼梦',
        author: '曹雪芹',
        coverUrl: 'https://picsum.photos/seed/honglou/400/600',
        status: 'finished',
        rating: 5,
        notes: '满纸荒唐言，一把辛酸泪。都云作者痴，谁解其中味？',
        summary: '中国古典长篇章回体小说，位列中国古典四大名著之首。',
        keywords: ['太虚幻境', '因缘', '悲剧'],
        chapters: [
          { id: 'c1', title: '第一回 甄士隐梦幻识通灵 贾雨村风尘怀闺秀', content: '列位看官：你道此书从何而来？说起根由，虽近荒唐，细按则深有趣味。' }
        ]
      }
    ];
  });

  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem('shiori-stats');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse stats from localStorage', e);
    }
    
    return {
      experience: 150,
      level: 1,
      rank: '初级读者',
      booksCompleted: 1,
      readingMinutes: 300,
      streak: 1
    };
  });

  const [filter, setFilter] = useState<BookStatus | 'all'>('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [draftChapters, setDraftChapters] = useState<{ id: string; title: string; content: string; isCollapsed: boolean }[]>([]);
  const [draftSessions, setDraftSessions] = useState<{ id: string; label: string; date: string }[]>([]);
  const [isSharing, setIsSharing] = useState<Book | null>(null);
  const [showReward, setShowReward] = useState<{ points: number; message: string } | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [activeTab, setActiveTab] = useState<'shelf' | 'review'>('shelf');

  const calculateNextReviewDate = (stage: number) => {
    // Ebbinghaus Forgetting Curve intervals (days)
    const intervals = [1, 2, 4, 7, 15, 30, 60, 120, 240]; 
    const interval = intervals[Math.min(stage, intervals.length - 1)];
    return format(addDays(new Date(), interval), 'yyyy-MM-dd');
  };

  useEffect(() => {
    localStorage.setItem('shiori-books', JSON.stringify(books));
    
    // Update stats whenever books change
    const finished = books.filter(b => b.status === 'finished').length;
    const duration = books.reduce((acc, b) => acc + (b.readingDuration || 0), 0);
    const chapterCount = books.reduce((acc, b) => acc + (b.chapters?.length || 0), 0);
    const reviewCount = books.reduce((acc, b) => acc + (b.reviewHistory?.length || 0), 0);
    
    // XP Calculation:
    // - Finished book: 500 XP
    // - Reading duration: 2 XP per minute
    // - Chapter recorded: 100 XP
    // - Review completed: 150 XP
    // - Streak bonus: streak * 50 XP
    const baseExp = (finished * 500) + (duration * 2) + (chapterCount * 100) + (reviewCount * 150);
    const streakBonus = (stats.streak || 1) * 50;
    const newExp = baseExp + streakBonus;
    
    const levelInfo = getLevelInfo(newExp);
    
    // Streak logic
    let newStreak = stats.streak || 1;
    const today = format(new Date(), 'yyyy-MM-dd');
    if (stats.lastReadingDate && stats.lastReadingDate !== today) {
      const lastDate = new Date(stats.lastReadingDate);
      const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
      if (stats.lastReadingDate === yesterday) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    if (levelInfo.level > stats.level) {
      setShowReward({ points: 0, message: `境界突破！你已晋升为 ${levelInfo.rank}` });
      setTimeout(() => setShowReward(null), 5000);
    }

    const newStats: UserStats = {
      experience: Math.floor(newExp),
      level: levelInfo.level,
      rank: levelInfo.rank,
      booksCompleted: finished,
      readingMinutes: duration,
      streak: newStreak,
      lastReadingDate: today
    };
    setStats(newStats);
    localStorage.setItem('shiori-stats', JSON.stringify(newStats));
  }, [books]);

  const reviewNeededBooks = useMemo(() => {
    return books.filter(b => {
      if (!b.nextReviewDate) return false;
      try {
        const date = new Date(b.nextReviewDate);
        return !isNaN(date.getTime()) && isPast(date);
      } catch (e) {
        return false;
      }
    });
  }, [books]);
  const filteredBooks = filter === 'all' ? books : books.filter(b => b.status === filter);

  const randomExcerpt = useMemo(() => {
    const allExcerpts = books
      .filter(b => b.excerpts && b.excerpts.trim() !== '')
      .map(b => ({ text: b.excerpts, author: b.author, title: b.title }));
    
    if (allExcerpts.length === 0) return null;
    // Use a simple hash of the books length and content to keep it somewhat stable but changing
    const index = Math.floor(Math.random() * allExcerpts.length);
    return allExcerpts[index];
  }, [books]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBook = (newBook: Partial<Book>) => {
    let book: Book = {
      id: Math.random().toString(36).substr(2, 9),
      title: newBook.title || '无题',
      author: newBook.author || '未知作者',
      coverUrl: newBook.coverUrl || `https://picsum.photos/seed/${Math.random()}/400/600`,
      status: newBook.status || 'want-to-read',
      rating: newBook.rating || 0,
      notes: newBook.notes || '',
      ...newBook
    } as Book;
    
    if (book.status === 'finished') {
      setShowReward({ points: 200, message: '录入并读完新卷，获得 200 经验！' });
      setTimeout(() => setShowReward(null), 3000);
      if (!book.nextReviewDate) {
        book.nextReviewDate = calculateNextReviewDate(0);
        book.reviewStage = 0;
      }
    }
    
    setBooks([book, ...books]);
    setIsAdding(false);
    setDraftChapters([]);
    setDraftSessions([]);
  };

  const handleDeleteBook = (id: string) => {
    setBooks(books.filter(b => b.id !== id));
    setSelectedBook(null);
  };

  const handleUpdateBook = (updated: Book) => {
    const oldBook = books.find(b => b.id === updated.id);
    let finalBook = updated;
    if (oldBook?.status !== 'finished' && updated.status === 'finished') {
      setShowReward({ points: 200, message: '恭喜读完此卷，获得 200 经验！' });
      setTimeout(() => setShowReward(null), 3000);
      if (!updated.nextReviewDate) {
        finalBook = {
          ...updated,
          reviewStage: 0,
          nextReviewDate: calculateNextReviewDate(0)
        };
      }
    }
    setBooks(books.map(b => b.id === finalBook.id ? finalBook : b));
    setSelectedBook(finalBook);
  };

  const handleCompleteReview = (book: Book) => {
    const nextStage = (book.reviewStage || 0) + 1;
    const nextDate = calculateNextReviewDate(nextStage);
    const today = format(new Date(), 'yyyy-MM-dd');
    const updated = {
      ...book,
      reviewStage: nextStage,
      nextReviewDate: nextDate,
      reviewHistory: [...(book.reviewHistory || []), today]
    };
    handleUpdateBook(updated);
    setShowReward({ points: 150, message: `复习完成！获得 150 经验，进入第 ${nextStage + 1} 阶段` });
    setTimeout(() => setShowReward(null), 3000);
  };

  const fetchRecommendations = async () => {
    if (books.length === 0) return;
    setIsLoadingRecs(true);
    try {
      const recs = await getBookRecommendations(books.slice(0, 5).map(b => b.title));
      setRecommendations(recs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Reward Notification */}
      <AnimatePresence>
        {showReward && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-[100] bg-ink text-paper px-6 py-3 rounded-full shadow-deep flex items-center gap-4 border border-white/10 backdrop-blur-md"
          >
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border border-white/10">
              <Trophy size={16} className="text-gold" />
            </div>
            <div>
              <p className="text-xs font-bold ancient tracking-wide">{showReward.message}</p>
              <p className="text-[8px] opacity-50 uppercase tracking-[0.2em] serif">Achievement Unlocked</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-black/[0.02] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: -2, scale: 1.02 }}
              className="w-10 h-10 bg-ink rounded-sm flex items-center justify-center text-paper shadow-xl relative group"
            >
              <BookOpen size={20} className="relative z-10" />
              <div className="absolute inset-0 border border-white/5 rounded-sm scale-90 group-hover:scale-100 transition-transform" />
            </motion.div>
            <div>
              <h1 className="ancient font-bold text-2xl tracking-tight text-ink ink-gradient">太虚幻境</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-bold text-vermilion uppercase tracking-[0.3em] serif opacity-60">Sanctuary</span>
                <div className="w-0.5 h-0.5 rounded-full bg-black/5" />
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest ancient">LV.{stats.level} {stats.rank}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-ink/60">
                <Trophy size={12} className="opacity-30" />
                <span className="text-[10px] font-bold tracking-[0.15em] ancient">{stats.experience} XP</span>
              </div>
              <div className="w-24 h-[1px] bg-black/5 rounded-full mt-1 overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.experience % 1000) / 10}%` }}
                  className="h-full bg-indigo/40 relative z-10"
                />
              </div>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-ink text-paper px-4 py-2 rounded-sm font-bold shadow-xl shadow-black/10 hover:bg-ink/90 transition-all active:scale-95 ancient text-base group"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" />
              <span>记录</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {/* Review Banner */}
        {reviewNeededBooks.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-white p-3 rounded-sm border border-vermilion/10 shadow-soft flex items-center justify-between relative overflow-hidden group"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-vermilion/60" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 bg-vermilion/5 text-vermilion rounded-full flex items-center justify-center border border-vermilion/10 shadow-inner">
                <Bell size={14} className="animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-ink text-base ancient tracking-tight">温故知新</h4>
                <p className="text-stone-400 text-[10px] serif italic">你有 {reviewNeededBooks.length} 本书待复习。</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setActiveTab('review');
                setFilter('all');
                setTimeout(() => {
                  document.getElementById('book-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className="relative z-10 text-[9px] font-bold text-paper bg-vermilion px-4 py-2 rounded-sm hover:bg-vermilion/90 transition-all ancient tracking-widest shadow-lg shadow-vermilion/30"
            >
              立即复习
            </button>
          </motion.div>
        )}

        {/* Dashboard Section */}
        <div className="mb-8">
          <div className="bg-white p-6 md:p-8 rounded-sm border border-black/[0.01] shadow-soft relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none group-hover:scale-105 transition-transform duration-2000">
              <Library size={160} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-[1px] w-6 bg-vermilion/30" />
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-vermilion/60 serif">Achievement</span>
              </div>
              <h2 className="ancient text-2xl font-bold mb-3 text-ink ink-gradient">阅读成就</h2>
              <div className="max-w-xl">
                <p className="text-stone-500 text-sm serif italic leading-relaxed opacity-90">
                  {randomExcerpt ? (
                    <span className="relative">
                      “{randomExcerpt.text}” 
                      <span className="block mt-1.5 text-[9px] not-italic font-bold tracking-widest opacity-50 ancient text-indigo">—— {randomExcerpt.author}《{randomExcerpt.title}》</span>
                    </span>
                  ) : (
                    <>“读书百遍，其义自见。” 你已在幻境中积累了深厚的知识底蕴。</>
                  )}
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                <div className="space-y-0.5 group/stat">
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-stone-300 group-hover/stat:text-teal transition-colors">已读完</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-bold ancient text-ink group-hover/stat:text-teal transition-colors">{stats.booksCompleted}</p>
                    <span className="text-[10px] text-stone-300 serif italic">卷</span>
                  </div>
                </div>
                <div className="space-y-0.5 group/stat">
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-stone-300 group-hover/stat:text-indigo transition-colors">累计时长</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-bold ancient text-ink group-hover/stat:text-indigo transition-colors">{stats.readingMinutes}</p>
                    <span className="text-[10px] text-stone-300 serif italic">分</span>
                  </div>
                </div>
                <div className="space-y-0.5 group/stat">
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-stone-300 group-hover/stat:text-vermilion transition-colors">连续读书</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-bold ancient text-ink group-hover/stat:text-vermilion transition-colors">{stats.streak}</p>
                    <span className="text-[10px] text-stone-300 serif italic">天</span>
                  </div>
                </div>
                <div className="space-y-0.5 group/stat">
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-stone-300 group-hover/stat:text-gold transition-colors">当前境界</p>
                  <p className="text-lg font-bold ancient text-indigo/60 mt-0.5 tracking-tight group-hover/stat:text-gold transition-colors">{stats.rank}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation & Filter */}
        <div id="book-grid" className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 border-b border-black/[0.02] pb-2">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setActiveTab('shelf')}
              className={cn(
                "text-sm font-bold transition-all flex items-center gap-2 relative py-1 ancient tracking-widest group",
                activeTab === 'shelf' ? "text-ink" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <Library size={14} className={cn("transition-transform group-hover:scale-110", activeTab === 'shelf' ? "opacity-100" : "opacity-20")} /> 我的书架
              {activeTab === 'shelf' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[1px] bg-ink" />}
            </button>
            <button 
              onClick={() => setActiveTab('review')}
              className={cn(
                "text-sm font-bold transition-all flex items-center gap-2 relative py-1 ancient tracking-widest group",
                activeTab === 'review' ? "text-ink" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <Bookmark size={14} className={cn("transition-transform group-hover:scale-110", activeTab === 'review' ? "opacity-100" : "opacity-20")} /> 复习计划
              {activeTab === 'review' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[1px] bg-ink" />}
            </button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-black/[0.01] p-0.5 rounded-sm border border-black/[0.02]">
            {[
              { id: 'all', label: '全部' },
              { id: 'reading', label: '正在读' },
              { id: 'finished', label: '已读完' },
              { id: 'want-to-read', label: '想读' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={cn(
                  "px-3 py-0.5 rounded-sm text-[9px] font-bold transition-all uppercase tracking-[0.1em] serif",
                  filter === tab.id 
                    ? "bg-ink text-paper shadow-sm" 
                    : "bg-transparent text-stone-400 hover:text-ink"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {activeTab === 'review' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-indigo/[0.02] p-8 rounded-sm border border-indigo/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
              <Timer size={120} />
            </div>
            <div className="relative z-10">
              <h3 className="ancient text-2xl font-bold text-indigo/60 mb-2">温故而知新</h3>
              <p className="text-stone-400 text-sm serif italic max-w-lg leading-relaxed">
                “学而时习之，不亦说乎？” 当前有 {reviewNeededBooks.length} 本书进入了遗忘临界点。
                及时复习不仅能巩固知识，还能获得更丰厚的经验奖励。
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {(activeTab === 'shelf' ? filteredBooks : reviewNeededBooks).map((book) => (
            <BookCard 
              key={book.id} 
              book={book} 
              onClick={() => setSelectedBook(book)}
              onShare={(e) => {
                e.stopPropagation();
                setIsSharing(book);
              }}
            />
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-3xl">
            <BookOpen size={48} className="mx-auto text-stone-300 mb-4" />
            <p className="text-stone-400">这里还没有书，开始你的第一条记录吧。</p>
          </div>
        )}
      </main>

      {/* Book Detail Modal */}
      <Modal isOpen={!!selectedBook} onClose={() => setSelectedBook(null)}>
        {selectedBook && (
          <div className="flex flex-col h-full">
            <div className="relative h-40 bg-stone-100">
              <img 
                src={selectedBook.coverUrl} 
                className="w-full h-full object-cover" 
                alt={selectedBook.title}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-paper via-transparent to-transparent" />
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-2 right-2 p-1 bg-black/10 backdrop-blur rounded-full text-white hover:bg-black/30 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 -mt-6 relative z-10 flex-1 overflow-y-auto pb-5 no-scrollbar">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <h2 className="ancient text-2xl font-bold text-balance ink-gradient">{selectedBook.title}</h2>
                  <p className="text-stone-400 mt-0.5 text-[10px] serif italic opacity-70">by {selectedBook.author}</p>
                </div>
                <div className="flex items-center gap-0.5 bg-white/80 px-2 py-1 rounded-full border border-black/[0.01] shadow-sm backdrop-blur-sm">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={12} 
                      className={cn(i < selectedBook.rating ? "fill-gold text-gold" : "text-stone-100")} 
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-1.5 mb-6 overflow-x-auto no-scrollbar">
                {selectedBook.keywords?.map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 bg-black/[0.02] text-stone-500 text-[9px] font-bold rounded-sm border border-black/[0.03] tracking-wider whitespace-nowrap">#{kw}</span>
                ))}
              </div>

              <div className="space-y-6">
                <section className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-[9px] uppercase font-bold tracking-[0.2em] text-stone-300 serif mb-2">阅读历程</h3>
                    <div className="space-y-1.5">
                      {selectedBook.readingSessions && selectedBook.readingSessions.length > 0 ? (
                        selectedBook.readingSessions.map((session) => (
                          <div key={session.id} className="flex items-center justify-between bg-stone-50/50 p-2 rounded-sm border border-black/[0.01]">
                            <span className="text-[10px] font-bold text-ink/60 ancient tracking-wide">{session.label}</span>
                            <span className="text-[9px] text-stone-400 serif">{session.date}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-stone-300 italic serif">暂无记录</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[9px] uppercase font-bold tracking-[0.2em] text-stone-300 serif mb-2">下次复习</h3>
                    <div className="bg-vermilion/[0.02] p-2 rounded-sm border border-vermilion/[0.05] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-vermilion/30" />
                        <span className="text-[10px] font-bold text-vermilion/60 ancient tracking-widest">{selectedBook.nextReviewDate || '未设置'}</span>
                      </div>
                      {selectedBook.nextReviewDate && isPast(new Date(selectedBook.nextReviewDate)) && (
                        <button 
                          onClick={() => handleCompleteReview(selectedBook)}
                          className="px-1.5 py-0.5 bg-vermilion text-paper text-[8px] font-bold rounded-sm ancient hover:opacity-90 transition-opacity"
                        >
                          完成
                        </button>
                      )}
                    </div>
                    {selectedBook.reviewStage !== undefined && (
                      <p className="text-[7px] text-stone-300 mt-1 serif italic">阶段: {selectedBook.reviewStage + 1}</p>
                    )}
                  </div>
                </section>

                {selectedBook.reviewHistory && selectedBook.reviewHistory.length > 0 && (
                  <section>
                    <h3 className="text-[9px] uppercase font-bold tracking-[0.2em] text-stone-300 serif mb-2">复习记录</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedBook.reviewHistory.map((date, i) => (
                        <div key={i} className="px-2 py-1 bg-indigo/[0.03] border border-indigo/10 rounded-sm text-[8px] text-indigo/60 ancient">
                          第 {i + 1} 次: {date}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] uppercase font-bold tracking-[0.3em] text-stone-300 serif">图书简介</h3>
                    {!selectedBook.summary && (
                      <button 
                        onClick={async () => {
                          const res = await generateBookSummary(selectedBook.title, selectedBook.author);
                          handleUpdateBook({ ...selectedBook, summary: res.summary, keywords: res.keywords });
                        }}
                        className="text-[10px] uppercase font-bold tracking-widest text-ink/30 flex items-center gap-1.5 hover:text-ink transition-colors"
                      >
                        <Sparkles size={12} /> 生成
                      </button>
                    )}
                  </div>
                  <div className="text-stone-500 text-sm leading-relaxed serif italic border-l border-vermilion/10 pl-5 bg-stone-50/20 p-5 rounded-r-lg">
                    {selectedBook.summary || "暂无简介。"}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] uppercase font-bold tracking-[0.3em] text-stone-300 serif mb-3">章节记录</h3>
                  <div className="bg-white rounded-lg border border-black/[0.02] overflow-hidden shadow-sm">
                    {selectedBook.chapters && selectedBook.chapters.length > 0 ? (
                      selectedBook.chapters.map((chapter) => (
                        <ChapterItem key={chapter.id} chapter={chapter} />
                      ))
                    ) : (
                      <div className="p-8 text-center text-stone-300 italic text-sm">
                        尚未添加章节记录...
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] uppercase font-bold tracking-[0.3em] text-stone-300 serif mb-3">阅读体会</h3>
                  <div className="bg-white p-5 rounded-lg border border-black/[0.01] min-h-[100px] whitespace-pre-wrap text-stone-600 text-sm serif leading-relaxed shadow-sm italic">
                    {selectedBook.notes || "尚未留下感悟..."}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] uppercase font-bold tracking-[0.3em] text-stone-300 serif mb-3">精彩摘录</h3>
                  <div className="bg-stone-50/20 p-5 rounded-lg border-l-2 border-vermilion/10 italic text-stone-500 text-sm">
                    <Quote size={14} className="text-vermilion/5 mb-2" />
                    {selectedBook.excerpts || "暂无摘录。"}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-3 flex items-center gap-2">
                    <Network size={12} /> 思维导图
                  </h3>
                  {selectedBook.mindMapUrl ? (
                    <div className="rounded-2xl overflow-hidden border border-black/5 bg-stone-50 group relative">
                      <img src={selectedBook.mindMapUrl} className="w-full h-auto" alt="Mind Map" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="bg-white text-accent px-4 py-2 rounded-full text-xs font-bold">查看大图</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center text-stone-400">
                      <Network size={24} className="mb-2 opacity-40" />
                      <p className="text-xs">暂无思维导图</p>
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-3 flex items-center gap-2">
                    <ImageIcon size={12} /> 书本照片
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedBook.additionalPhotos?.map((photo, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden border border-black/5">
                        <img src={photo} className="w-full h-full object-cover" alt="" />
                      </div>
                    ))}
                    <div className="aspect-square rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-400 hover:border-accent/40 hover:text-accent cursor-pointer transition-all">
                      <Plus size={20} />
                    </div>
                  </div>
                </section>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-black/5 pt-4">
                <button 
                  onClick={() => handleDeleteBook(selectedBook.id)}
                  className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold hover:text-red-500 transition-colors uppercase tracking-widest ancient"
                >
                  <Trash2 size={12} />
                  删除
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsSharing(selectedBook)}
                    className="flex items-center gap-1.5 bg-stone-100 text-stone-600 px-4 py-1.5 rounded-sm text-[10px] font-bold hover:bg-stone-200 transition-colors uppercase tracking-widest ancient"
                  >
                    <Share2 size={12} />
                    分享
                  </button>
                  <button 
                    onClick={() => {
                      setEditingBook(selectedBook);
                      setDraftChapters(selectedBook.chapters?.map(c => ({ ...c, isCollapsed: true })) || []);
                      setDraftSessions(selectedBook.readingSessions || []);
                      setSelectedBook(null);
                    }}
                    className="flex items-center gap-2 bg-ink text-paper px-6 py-2 rounded-sm text-[11px] font-bold hover:bg-ink/90 transition-colors uppercase tracking-widest ancient"
                  >
                    <Edit3 size={14} />
                    编辑
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Book Modal */}
      <Modal isOpen={isAdding || !!editingBook} onClose={() => {
        setIsAdding(false);
        setEditingBook(null);
        setDraftChapters([]);
        setDraftSessions([]);
      }}>
        <div className="p-6 md:p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="ancient text-2xl font-bold">{editingBook ? '编辑卷轴' : '记录新书'}</h2>
            <button onClick={() => {
              setIsAdding(false);
              setEditingBook(null);
            }} className="p-1.5 hover:bg-stone-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <form 
            className="space-y-4 flex-1 overflow-y-auto pr-2 no-scrollbar"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              const chapters = draftChapters.map(c => ({
                id: c.id,
                title: c.title,
                content: c.content
              })).filter(c => c.title);

              const bookData = {
                title: formData.get('title') as string,
                author: formData.get('author') as string,
                status: formData.get('status') as BookStatus,
                rating: Number(formData.get('rating')),
                notes: formData.get('notes') as string,
                excerpts: formData.get('excerpts') as string,
                readingDuration: Number(formData.get('readingDuration')),
                nextReviewDate: formData.get('nextReviewDate') as string || (editingBook?.nextReviewDate ? editingBook.nextReviewDate : (formData.get('status') === 'finished' ? calculateNextReviewDate(0) : undefined)),
                reviewStage: editingBook?.reviewStage ?? 0,
                coverUrl: formData.get('coverUrl') as string,
                mindMapUrl: formData.get('mindMapUrl') as string,
                chapters,
                readingSessions: draftSessions
              };

              if (editingBook) {
                handleUpdateBook({ ...editingBook, ...bookData });
                setEditingBook(null);
              } else {
                handleAddBook(bookData);
              }
            }}
          >
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-1">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-stone-300 mb-3 block ancient">封面图片</label>
                <div className="aspect-[3/4] bg-stone-50/50 rounded-sm border border-dashed border-black/[0.05] flex flex-col items-center justify-center text-stone-400 relative overflow-hidden group hover:border-ink/20 transition-all shadow-inner">
                  <input 
                    type="file" 
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => handleFileUpload(e, (url) => {
                      const input = document.getElementById('coverUrlInput') as HTMLInputElement;
                      if (input) input.value = url;
                      const preview = document.getElementById('coverPreview') as HTMLImageElement;
                      if (preview) {
                        preview.src = url;
                        preview.classList.remove('hidden');
                      }
                    })}
                  />
                  <ImageIcon size={28} className="mb-2 opacity-20" />
                  <span className="text-[9px] font-bold uppercase tracking-widest ancient">上传封面</span>
                  <img 
                    id="coverPreview" 
                    src={editingBook?.coverUrl}
                    className={cn("absolute inset-0 w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700", !editingBook?.coverUrl && "hidden")} 
                    alt="" 
                  />
                  <input type="hidden" name="coverUrl" id="coverUrlInput" defaultValue={editingBook?.coverUrl} />
                </div>
              </div>
              <div className="col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-stone-300 ancient">书籍名称</label>
                  <input 
                    name="title" 
                    required 
                    defaultValue={editingBook?.title}
                    placeholder="例如：红楼梦"
                    className="w-full bg-stone-50/50 border border-black/[0.02] rounded-sm px-4 py-2.5 focus:outline-none focus:border-ink/10 transition-all text-ink ancient text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-stone-300 ancient">作者</label>
                  <input 
                    name="author" 
                    required 
                    defaultValue={editingBook?.author}
                    placeholder="例如：曹雪芹"
                    className="w-full bg-stone-50/50 border border-black/[0.02] rounded-sm px-4 py-2.5 focus:outline-none focus:border-ink/10 transition-all text-ink ancient text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-stone-300 ancient">阅读状态</label>
                    <select name="status" defaultValue={editingBook?.status || 'reading'} className="w-full bg-stone-50/50 border border-black/[0.02] rounded-sm px-4 py-2.5 focus:outline-none text-ink serif text-xs">
                      <option value="reading">正在读</option>
                      <option value="finished">已读完</option>
                      <option value="want-to-read">想读</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-stone-300 ancient">评分</label>
                    <select name="rating" defaultValue={editingBook?.rating || 5} className="w-full bg-stone-50/50 border border-black/[0.02] rounded-sm px-4 py-2.5 focus:outline-none text-ink serif text-xs">
                      {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} 星</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-stone-300 ancient">复习日期</label>
                  <input 
                    type="date"
                    name="nextReviewDate"
                    defaultValue={editingBook?.nextReviewDate || format(addMonths(new Date(), 1), 'yyyy-MM-dd')}
                    className="w-full bg-stone-50/50 border border-black/[0.02] rounded-sm px-4 py-2.5 focus:outline-none focus:border-ink/10 transition-all text-ink serif text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase font-bold tracking-widest text-accent ancient">阅读时间/轮次</label>
                <button 
                  type="button"
                  onClick={() => {
                    const sessionCount = draftSessions.length + 1;
                    const labels = ['第一次阅读', '第二次阅读', '第三次阅读', '第四次阅读', '第五次阅读'];
                    setDraftSessions([...draftSessions, { 
                      id: Math.random().toString(36).substr(2, 9), 
                      label: labels[sessionCount - 1] || `第${sessionCount}次阅读`, 
                      date: format(new Date(), 'yyyy-MM-dd')
                    }]);
                  }}
                  className="text-[11px] font-bold text-accent flex items-center gap-1 hover:opacity-70 ancient"
                >
                  <Plus size={12} /> 添加时间
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {draftSessions.map((session, index) => (
                  <div key={session.id} className="bg-stone-50 rounded-xl border border-black/[0.05] p-3 flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <input 
                        value={session.label}
                        onChange={(e) => {
                          const newSessions = [...draftSessions];
                          newSessions[index].label = e.target.value;
                          setDraftSessions(newSessions);
                        }}
                        className="bg-transparent text-[10px] font-bold text-ink focus:outline-none w-full ancient"
                        placeholder="阅读轮次"
                      />
                      <input 
                        type="date"
                        value={session.date}
                        onChange={(e) => {
                          const newSessions = [...draftSessions];
                          newSessions[index].date = e.target.value;
                          setDraftSessions(newSessions);
                        }}
                        className="bg-transparent text-[10px] text-stone-400 focus:outline-none w-full serif"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => setDraftSessions(draftSessions.filter((_, i) => i !== index))}
                      className="p-1 text-stone-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase font-bold tracking-widest text-accent ancient">章节记录</label>
                <button 
                  type="button"
                  onClick={() => {
                    setDraftChapters([...draftChapters, { 
                      id: Math.random().toString(36).substr(2, 9), 
                      title: '', 
                      content: '', 
                      isCollapsed: false 
                    }]);
                  }}
                  className="text-[11px] font-bold text-accent flex items-center gap-1 hover:opacity-70 ancient"
                >
                  <Plus size={12} /> 添加章节
                </button>
              </div>
              <div className="space-y-3">
                {draftChapters.map((chapter, index) => (
                  <div key={chapter.id} className="bg-stone-50 rounded-xl border border-black/[0.05] overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/[0.02]"
                      onClick={() => {
                        const newChapters = [...draftChapters];
                        newChapters[index].isCollapsed = !newChapters[index].isCollapsed;
                        setDraftChapters(newChapters);
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">#{index + 1}</span>
                        <input 
                          placeholder="章节标题" 
                          value={chapter.title}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const newChapters = [...draftChapters];
                            newChapters[index].title = e.target.value;
                            setDraftChapters(newChapters);
                          }}
                          className="bg-transparent text-sm font-bold text-ink focus:outline-none flex-1 ancient" 
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDraftChapters(draftChapters.filter((_, i) => i !== index));
                          }}
                          className="p-1 text-stone-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        {chapter.isCollapsed ? <ChevronDown size={16} className="text-stone-300" /> : <ChevronUp size={16} className="text-stone-300" />}
                      </div>
                    </div>
                    <AnimatePresence>
                      {!chapter.isCollapsed && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4">
                            <textarea 
                              placeholder="章节要点..." 
                              value={chapter.content}
                              onChange={(e) => {
                                const newChapters = [...draftChapters];
                                newChapters[index].content = e.target.value;
                                setDraftChapters(newChapters);
                              }}
                              className="w-full bg-white/50 border border-black/[0.03] rounded-lg p-3 text-xs text-stone-500 focus:outline-none resize-none serif min-h-[80px]"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[12px] uppercase font-bold tracking-[0.2em] text-stone-300 ancient">心得体会</label>
              <textarea 
                name="notes" 
                rows={4}
                defaultValue={editingBook?.notes}
                placeholder="写下你的感悟..."
                className="w-full bg-white border border-black/[0.03] rounded-sm px-5 py-4 focus:outline-none focus:ring-1 focus:ring-black/5 transition-all resize-none serif text-base"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[12px] uppercase font-bold tracking-[0.2em] text-stone-300 ancient">精彩摘录</label>
              <textarea 
                name="excerpts" 
                rows={4}
                defaultValue={editingBook?.excerpts}
                placeholder="摘录书中的金句..."
                className="w-full bg-white border border-black/[0.03] rounded-sm px-5 py-4 focus:outline-none focus:ring-1 focus:ring-black/5 transition-all resize-none serif text-base"
              />
            </div>
            
            <div className="pt-4">
              <button 
                type="submit"
                className="w-full bg-accent text-paper py-4 rounded-2xl font-bold shadow-lg shadow-accent/20 hover:opacity-90 transition-all"
              >
                保存记录
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Share Card Modal */}
      <AnimatePresence>
        {isSharing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-paper rounded-sm overflow-hidden shadow-deep border border-black/[0.02]"
            >
              <div id="share-card" className="p-10 bg-paper relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                  <BookOpen size={120} />
                </div>
                
                <div className="flex gap-6 mb-8 relative z-10">
                  <div className="w-24 aspect-[3/4] bg-stone-50 rounded-sm overflow-hidden shadow-lg border-l-2 border-vermilion/20 relative">
                    <img 
                      src={isSharing.coverUrl || `https://picsum.photos/seed/${isSharing.id}/400/600`} 
                      className="w-full h-full object-cover grayscale-[0.2]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1 right-1 w-6 h-6 border border-vermilion/40 flex items-center justify-center rotate-12">
                      <span className="text-[6px] text-vermilion/60 font-bold ancient leading-none text-center">太虚<br/>幻境</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="ancient text-2xl font-bold text-ink mb-1 ink-gradient">{isSharing.title}</h2>
                    <p className="text-xs text-stone-400 serif mb-4 italic">{isSharing.author}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={cn(i < isSharing.rating ? "fill-gold text-gold" : "text-stone-100")} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="bg-stone-50/30 p-6 rounded-sm border-l border-vermilion/10">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-stone-300 mb-3 serif">读书心得</p>
                    <p className="text-sm text-ink/70 serif leading-relaxed italic">
                      {isSharing.notes || "暂无心得体会。"}
                    </p>
                  </div>

                  {isSharing.excerpts && (
                    <div className="bg-vermilion/[0.02] p-6 rounded-sm border-r border-vermilion/10 text-right">
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-vermilion/30 mb-3 serif">精彩摘录</p>
                      <p className="text-sm text-ink/60 serif leading-relaxed italic">
                        “{isSharing.excerpts}”
                      </p>
                    </div>
                  )}

                  {isSharing.chapters && isSharing.chapters.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-stone-300 mb-3 serif">阅读记录</p>
                      <div className="space-y-2">
                        {isSharing.chapters.slice(0, 3).map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-stone-500 serif italic">
                            <div className="w-1 h-1 rounded-full bg-vermilion/20" />
                            <span className="font-bold text-stone-600">{c.title}</span>
                          </div>
                        ))}
                        {isSharing.chapters.length > 3 && (
                          <p className="text-[9px] text-stone-300 italic serif">... 及其他 {isSharing.chapters.length - 3} 个章节</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-12 pt-8 border-t border-black/[0.03] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-ink rounded-sm flex items-center justify-center text-paper shadow-md rotate-[-2deg] border border-white/10">
                      <BookOpen size={16} />
                    </div>
                    <span className="ancient text-sm font-bold text-ink tracking-widest">太虚幻境</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] uppercase tracking-[0.3em] text-stone-300 font-bold serif">Digital Reading Space</p>
                    {isSharing.readingDuration && (
                      <p className="text-[8px] text-stone-400 ancient mt-1">累计阅读 {isSharing.readingDuration} 分钟</p>
                    )}
                    {isSharing.reviewHistory && isSharing.reviewHistory.length > 0 && (
                      <p className="text-[8px] text-indigo/40 ancient mt-0.5">已完成 {isSharing.reviewHistory.length} 次复习</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-stone-50/50 p-4 border-t border-black/[0.02] flex justify-end gap-3">
                <button 
                  onClick={() => setIsSharing(null)}
                  className="px-6 py-2 text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors ancient tracking-widest"
                >
                  取消
                </button>
                <button 
                  onClick={async () => {
                    const node = document.getElementById('share-card');
                    if (node) {
                      try {
                        const dataUrl = await toPng(node, { quality: 0.95, pixelRatio: 2 });
                        const link = document.createElement('a');
                        link.download = `太虚幻境-${isSharing.title}.png`;
                        link.href = dataUrl;
                        link.click();
                        setShowReward({ points: 0, message: '分享卡片已保存至相册' });
                        setTimeout(() => setShowReward(null), 3000);
                        setIsSharing(null);
                      } catch (err) {
                        console.error('oops, something went wrong!', err);
                        alert('生成图片失败，请重试');
                      }
                    }
                  }}
                  className="bg-ink text-paper px-8 py-2 rounded-sm text-xs font-bold shadow-lg shadow-ink/10 hover:translate-y-[-1px] transition-all ancient tracking-widest"
                >
                  保存图片
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
