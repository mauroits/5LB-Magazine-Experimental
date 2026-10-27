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

export type BannerIconType =
  | 'bell'
  | 'info'
  | 'alert'
  | 'sparkles'
  | 'download'
  | 'book'
  | 'heart'
  | 'compass'
  | 'star'
  | 'smartphone'
  | 'newspaper';

export type BannerThemeColor = 'blue' | 'amber' | 'emerald' | 'purple' | 'orange';

export interface RemoteBannerAction {
  label: string;
  type?: 'link' | 'pwa_install' | 'article';
  url?: string;
  openIn?: 'internal' | 'external';
}

export interface RemoteBannerConfig {
  enabled: boolean;
  id: string;
  title: string;
  message: string;
  icon?: BannerIconType;
  theme?: BannerThemeColor;
  action?: RemoteBannerAction;
  canDismiss?: boolean;
}
