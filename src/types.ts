export type BookStatus = 'reading' | 'finished' | 'want-to-read';

export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface ReadingSession {
  id: string;
  label: string; // e.g., "第一次阅读", "第二次阅读"
  date: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  status: BookStatus;
  rating: number;
  notes: string;
  excerpts?: string;
  readingDuration?: number; // in minutes
  nextReviewDate?: string;
  reviewStage?: number; // 0, 1, 2, 3, 4, 5...
  mindMapUrl?: string;
  additionalPhotos?: string[];
  chapters?: Chapter[];
  readingSessions?: ReadingSession[];
  startDate?: string;
  endDate?: string;
  keywords?: string[];
  summary?: string;
}

export interface UserStats {
  experience: number;
  level: number;
  rank: string;
  booksCompleted: number;
  readingMinutes: number;
}


export interface Recommendation {
  title: string;
  author: string;
  reason: string;
}
