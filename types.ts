export type Language = 'bn' | 'en';

export type CategoryType = 
  | 'All'
  | 'For You'
  | 'Breaking'
  | 'Bangladesh'
  | 'World'
  | 'Technology'
  | 'Politics'
  | 'Business'
  | 'Climate'
  | 'Science'
  | 'Sports'
  | 'Entertainment'
  | 'Opinion'
  | 'Lifestyle'
  | 'Culture'
  | 'Saved Offline'
  | string;

export interface CategoryItem {
  id: string;
  name: string;
  nameBn?: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  order: number;
  showInNavbar: boolean;
  color?: string;
  iconName?: string;
}

export interface Author {
  name: string;
  role: string;
  avatar: string;
}

export interface AISummary {
  takeaways: string[];
  simplifiedExplanation?: string;
  backgroundContext?: string;
  keyEntities?: string[];
  sentiment?: 'neutral' | 'optimistic' | 'critical' | 'cautious';
}

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  content: string;
  category: CategoryType;
  subCategory?: string;
  author: Author;
  publishedAt: string; // ISO string
  updatedAt?: string;
  version?: number;
  readTimeMinutes: number;
  image: string;
  imageCaption?: string;
  isBreaking?: boolean;
  isExclusive?: boolean;
  isTrending?: boolean;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  quotes?: string[];
  aiSummary?: AISummary;
}

export interface Comment {
  id: string;
  articleId: string;
  parentId?: string; // for nested replies
  author: {
    name: string;
    avatar: string;
    badge?: string; // e.g., 'Subscriber', 'Editor', 'Top Contributor'
  };
  content: string;
  createdAt: string; // ISO string
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  replies?: Comment[];
}

export interface NotificationItem {
  id: string;
  type: 'breaking' | 'personalized' | 'discussion' | 'wire';
  title: string;
  message: string;
  articleId?: string;
  timestamp: string;
  read: boolean;
  priority: 'urgent' | 'high' | 'normal';
}

export interface UserPreferences {
  selectedTopics: CategoryType[];
  topicWeights: Record<string, number>; // 1 to 5
  autoPlayTts: boolean;
  readerFontSize: number; // 14 to 24px
  readerFontFamily: 'serif' | 'sans';
  readerLineHeight: 'tight' | 'normal' | 'relaxed';
  notificationsEnabled: boolean;
  breakingAlerts: boolean;
  dailyDigest: boolean;
  audioAlerts: boolean;
  theme: 'light' | 'dark' | 'system';
  language: Language;
  savedArticleIds: string[];
  readHistoryIds: string[];
  likedArticleIds: string[];
}

export interface LiveWireItem {
  id: string;
  timestamp: string;
  headline: string;
  category: CategoryType;
  isFlash: boolean;
  articleId?: string;
  source?: string;
}
