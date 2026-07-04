// 设计方案
export interface NailDesign {
  id: string;
  name: string;
  theme: string;
  refImage?: string;
  characters: string;
  signatureSymbol: string;
  colorPalette: string[];
  styleTags: string[];
  techniques: string[];
  styleDNA: StyleDNA | null;
  nails: NailArt[];
  handImage?: string;
  compatibilityScore: number;
  difficulty: number;
  materials: Material[];
  prompt: string;
  createdAt: string;
  resonanceTheme: string;
}

export interface StyleDNA {
  mood: string;
  material: string;
  palette: string[];
  vibe: string;
}

export interface NailArt {
  position: string;
  image: string;
  label: string;
}

export interface Material {
  name: string;
  quantity: string;
}

// 社区帖子
export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  images: string[];
  title: string;
  description: string;
  tags: string[];
  likes: number;
  liked: boolean;          // 当前登录用户是否已点赞
  favorited?: boolean;     // 当前登录用户是否已收藏
  isOwn?: boolean;         // 是否是当前登录用户自己的帖子
  comments: Comment[];
  createdAt: string;
  designId?: string;
  category?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  likes: number;
}

// 用户
export interface User {
  id: string;
  email?: string;          // 社交账号登录后才有
  name: string;
  avatar: string;
  bio?: string;            // 个性签名
  designs: string[];
  favorites: string[];
  communityPosts: string[];
  following: string[];
  followers: number;
}

// Resonance UI主题
export interface ResonanceTheme {
  id: string;
  name: string;
  primary: string;
  gold: string;
  aurora: string;
  deco: string;
  icon: string;
}
