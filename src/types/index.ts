export interface BloggerPost {
  id: string;
  title: string;
  published: string;
  updated: string;
  content: string;
  summary: string;
  categories: string[];
  link: string;
  author: {
    name: string;
    avatar?: string;
  };
  thumbnail?: string;
  isRead?: boolean;
  isFavorite?: boolean;
  isAccadeOggi?: boolean;
}

export type NavItemType = 'filter' | 'rss' | 'link';

export interface NavItem {
  id: string;
  label: string;
  type: NavItemType;
  iconName: string;
  badgeCount?: number;
  targetUrl?: string; // For direct web links (FORMAZIONE, PRESENZA, CONSULENZA, 5LB FRAMEWORK)
  rssCategory?: string; // For RSS filtering (INFORMAZIONE, EZIOLOGIA)
  description?: string;
}

export interface NavSection {
  id: string;
  title: string;
  collapsible: boolean;
  defaultOpen: boolean;
  items: NavItem[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  url?: string;
  postId?: string;
}

export type ActiveFilter =
  | { type: 'quick'; id: 'all' | 'unread' | 'favorites' | 'today' }
  | { type: 'rss'; category: string; label: string };
