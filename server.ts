import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { INITIAL_ARTICLES } from './src/data/mockArticles';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// API Routes
app.get('/api', (req, res) => {
  res.json({
    name: 'Akta News REST API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      articles: '/api/articles?category=&limit=10&page=1&q=',
      articleDetail: '/api/articles/:id',
      breaking: '/api/breaking',
      categories: '/api/categories',
      search: '/api/search?q=keyword',
      newsletterSubscribe: 'POST /api/subscribe',
      stats: '/api/stats',
      aiSummarize: 'POST /api/ai/summarize',
      aiDiscussionStarter: 'POST /api/ai/discussion-starter',
      aiAskArticle: 'POST /api/ai/ask-article',
      simulateBreaking: 'POST /api/breaking/simulate'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Akta News API Engine',
    time: new Date().toISOString(), 
    aiEnabled: Boolean(process.env.GEMINI_API_KEY) 
  });
});

const CATEGORIES_LIST = [
  { id: 'all', nameBn: 'শীর্ষ সংবাদ', nameEn: 'All Dispatches' },
  { id: 'bangladesh', nameBn: 'বাংলাদেশ', nameEn: 'Bangladesh' },
  { id: 'politics', nameBn: 'রাজনীতি', nameEn: 'Politics' },
  { id: 'economy', nameBn: 'অর্থনীতি ও বাণিজ্য', nameEn: 'Economy & Business' },
  { id: 'international', nameBn: 'আন্তর্জাতিক', nameEn: 'International' },
  { id: 'technology', nameBn: 'প্রযুক্তি ও গ্যাজেট', nameEn: 'Technology' },
  { id: 'climate', nameBn: 'পরিবেশ ও জলবায়ু', nameEn: 'Climate & Earth' },
  { id: 'science', nameBn: 'বিজ্ঞান ও মহাকাশ', nameEn: 'Science & Deep Space' },
  { id: 'sports', nameBn: 'খেলাধুলা', nameEn: 'Sports' },
  { id: 'lifestyle', nameBn: 'জীবনযাত্রা ও বিনোদন', nameEn: 'Lifestyle & Culture' },
];

// GET /api/categories
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    total: CATEGORIES_LIST.length,
    data: CATEGORIES_LIST
  });
});

// GET /api/articles
app.get('/api/articles', (req, res) => {
  const { category, q, breaking, limit = 10, page = 1 } = req.query;

  let results = [...INITIAL_ARTICLES];

  // Category filter
  if (category && category !== 'all') {
    const targetCat = String(category).toLowerCase();
    results = results.filter(a => a.category.toLowerCase() === targetCat);
  }

  // Breaking filter
  if (breaking === 'true') {
    results = results.filter(a => a.isBreaking);
  }

  // Search filter
  if (q) {
    const query = String(q).toLowerCase();
    results = results.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.excerpt.toLowerCase().includes(query) ||
      a.content.toLowerCase().includes(query) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(query)))
    );
  }

  const parsedLimit = Math.max(1, Math.min(50, parseInt(String(limit), 10) || 10));
  const parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
  const total = results.length;
  const totalPages = Math.ceil(total / parsedLimit);
  const startIndex = (parsedPage - 1) * parsedLimit;
  const paginated = results.slice(startIndex, startIndex + parsedLimit);

  res.json({
    success: true,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,
      hasNext: parsedPage < totalPages,
      hasPrev: parsedPage > 1
    },
    data: paginated
  });
});

// GET /api/articles/:id
app.get('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  const article = INITIAL_ARTICLES.find(a => a.id === id);

  if (!article) {
    return res.status(404).json({
      success: false,
      error: 'Article not found'
    });
  }

  res.json({
    success: true,
    data: article
  });
});

// GET /api/breaking
app.get('/api/breaking', (req, res) => {
  const breakingList = INITIAL_ARTICLES.filter(a => a.isBreaking);
  res.json({
    success: true,
    total: breakingList.length,
    data: breakingList
  });
});

// GET /api/search
app.get('/api/search', (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  if (!query) {
    return res.json({
      success: true,
      query: '',
      total: 0,
      data: []
    });
  }

  const matches = INITIAL_ARTICLES.filter(a =>
    a.title.toLowerCase().includes(query) ||
    a.excerpt.toLowerCase().includes(query) ||
    a.content.toLowerCase().includes(query) ||
    (a.tags && a.tags.some(t => t.toLowerCase().includes(query)))
  );

  res.json({
    success: true,
    query,
    total: matches.length,
    data: matches
  });
});

// POST /api/subscribe
app.post('/api/subscribe', (req, res) => {
  const { email } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'অনুগ্রহ করে সঠিক ইমেইল অ্যাড্রেস দিন'
    });
  }

  res.json({
    success: true,
    message: 'নিউজলেটার সফলভাবে সাবস্ক্রাইব করা হয়েছে!',
    email
  });
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    totalArticles: INITIAL_ARTICLES.length,
    breakingCount: INITIAL_ARTICLES.filter(a => a.isBreaking).length,
    totalCategories: CATEGORIES_LIST.length,
    serverUptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Gemini AI Article Summarization & Key Takeaways
app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const ai = getAi();
    if (!ai) {
      // Fallback if API key not configured yet
      return res.json({
        takeaways: [
          `Key developments reported regarding "${title}".`,
          `Analysis highlights immediate strategic impacts for the ${category || 'general'} sector.`,
          'Multilateral observers expect follow-up policy and market disclosures in coming cycles.'
        ],
        simplifiedExplanation: `This report details recent developments in ${category || 'news'} concerning ${title}, outlining core milestones and what it means for everyday citizens.`,
        backgroundContext: `Contextualized within global ${category || 'industry'} benchmarks and international standards established throughout 2026.`,
        sentiment: 'neutral'
      });
    }

    const prompt = `You are a world-class senior investigative news editor at Akta News.
Analyze this news article and return a JSON object with:
1. "takeaways": An array of 3-4 concise, high-impact bullet points capturing key facts and verifiable outcomes.
2. "simplifiedExplanation": A 2-sentence plain English "Explain Like I'm 5 / Quick Read" summary accessible to anyone.
3. "backgroundContext": A brief 1-2 sentence historical or scientific context explaining why this matters.
4. "sentiment": One of "optimistic", "critical", "cautious", "neutral".

Article Title: ${title}
Category: ${category}
Article Content:
${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text?.trim() || '{}';
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = {
        takeaways: [
          `Major announcement regarding ${title}.`,
          `Experts assess high impact across the ${category} landscape.`,
          'Continued updates will follow as more data becomes verified.'
        ],
        simplifiedExplanation: `A major update on ${title} with significant consequences for the industry.`,
        backgroundContext: 'Part of an ongoing sequence of sector developments.',
        sentiment: 'neutral'
      };
    }

    res.json(parsed);
  } catch (error) {
    console.error('Error in /api/ai/summarize:', error);
    res.status(500).json({
      error: 'Failed to generate AI summary',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Gemini AI Discussion Starter Generator
app.post('/api/ai/discussion-starter', async (req, res) => {
  try {
    const { title, content } = req.body;
    const ai = getAi();
    if (!ai) {
      return res.json({
        questions: [
          'What do you foresee as the most immediate ethical or practical consequence of this development?',
          'How should regulatory bodies balance rapid innovation against public safety in this domain?',
          'Will this shift accelerate global adoption or create a deeper divide between early adopters and legacy systems?'
        ]
      });
    }

    const prompt = `Generate 3 thought-provoking, nuanced discussion starter questions for our community comment section based on this news article. Keep them objective, engaging, and designed to foster respectful debate. Return a JSON array of 3 strings in a "questions" property.

Article Title: ${title}
Content: ${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{"questions":[]}');
    res.json(parsed);
  } catch (error) {
    res.json({
      questions: [
        'How do you anticipate this will influence industry standards over the next 12 months?',
        'What are the primary hurdles to widespread implementation?',
        'What aspect of this report did you find most surprising or significant?'
      ]
    });
  }
});

// Gemini AI Reader Q&A
app.post('/api/ai/ask-article', async (req, res) => {
  try {
    const { articleTitle, articleContent, userQuestion } = req.body;
    if (!userQuestion) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const ai = getAi();
    if (!ai) {
      return res.json({
        answer: `According to the article "${articleTitle}", the core focus is on the documented events and verified findings reported by the Akta News editorial desk.`
      });
    }

    const prompt = `You are Akta News AI Assistant. A reader is asking a question about the following news article. Provide a concise, highly accurate, and helpful 2-3 sentence answer strictly grounded in the article's facts and broader verified context.

Article Title: ${articleTitle}
Article Text: ${articleContent}

Reader Question: ${userQuestion}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt
    });

    res.json({ answer: response.text?.trim() || 'No answer generated.' });
  } catch (error) {
    console.error('Error in /api/ai/ask-article:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

// Live Wire & Breaking Simulation
const SIMULATED_BREAKING_POOL = [
  {
    title: 'Orbital Solar Array Powers Entire Terrestrial Research Station for 24 Straight Hours',
    category: 'Science',
    excerpt: 'Space-based wireless microwave energy transmission demonstrates 88% terrestrial rectenna capture efficiency in landmark test.',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    readTimeMinutes: 3,
    tags: ['Space Energy', 'Clean Tech', 'Innovation', 'Orbit']
  },
  {
    title: 'Global Cyber Coalition Neutralizes Multi-Terabit Botnet Targeting Critical Infrastructure',
    category: 'Technology',
    excerpt: 'Coordinated takedown across 32 jurisdictions dismantles malicious decentralized command-and-control mesh without service disruption.',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
    readTimeMinutes: 4,
    tags: ['Cybersecurity', 'Defense', 'Global Law', 'Tech']
  },
  {
    title: 'Breakthrough Solid-State Battery Attains 1,000-Mile Range in Cold Weather Trials',
    category: 'Climate',
    excerpt: 'Anode-less silicon-lithium chemistry maintains 96% capacity retention at -20°C with 8-minute ultra-fast recharge capability.',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&auto=format&fit=crop&q=80',
    readTimeMinutes: 3,
    tags: ['Electric Vehicles', 'Batteries', 'Clean Mobility', 'Energy']
  }
];

let breakingIndex = 0;
app.post('/api/breaking/simulate', (req, res) => {
  const item = SIMULATED_BREAKING_POOL[breakingIndex % SIMULATED_BREAKING_POOL.length];
  breakingIndex++;

  const newArticle = {
    id: 'akta-breaking-' + Date.now(),
    title: item.title,
    subtitle: 'URGENT DISPATCH • Real-time wire update verified by Akta Newsroom.',
    excerpt: item.excerpt,
    content: `${item.title.toUpperCase()} — Akta Newsroom Flash Report.

${item.excerpt}

Editorial correspondents on the ground confirm active coordination between regulatory authorities and key stakeholders. Continuous updates are streaming directly into the Akta Live Wire as verified dispatches arrive.

> "This development reflects an unprecedented acceleration in cross-sector modernization." — Akta News Special Dispatch`,
    category: item.category,
    author: {
      name: 'Akta Wire Desk',
      role: 'Breaking News Bureau',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    publishedAt: new Date().toISOString(),
    readTimeMinutes: item.readTimeMinutes,
    image: item.image,
    imageCaption: 'Live imagery captured via the Akta News Global Wire Network.',
    isBreaking: true,
    isExclusive: true,
    isTrending: true,
    tags: item.tags,
    likesCount: 12,
    commentsCount: 3,
    sharesCount: 8,
    quotes: [
      'This development reflects an unprecedented acceleration in cross-sector modernization.'
    ],
    aiSummary: {
      takeaways: [
        item.excerpt,
        'Live verification underway across international bureaus.',
        'Continuous monitoring active on the Akta Live Wire.'
      ],
      simplifiedExplanation: `Breaking event: ${item.title}`,
      sentiment: 'optimistic'
    }
  };

  res.json({
    article: newArticle,
    wireHeadline: `FLASH: ${item.title}`
  });
});

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function injectArticleMetadata(html: string, article: any, fullUrl: string): string {
  if (!article) return html;

  const pageTitle = `${article.title} — Akta News`;
  const desc = article.excerpt || article.subtitle || 'Read the full verified report on Akta News.';
  const image = article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&auto=format&fit=crop&q=80';
  const category = article.category || 'News';
  const publishedAt = article.publishedAt || new Date().toISOString();

  // Replace existing title
  let modified = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

  // Replace default descriptions and OG tags if present
  modified = modified.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, '');
  modified = modified.replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, '');

  const dynamicTags = `
    <meta name="description" content="${escapeHtml(desc)}" />
    
    <!-- Open Graph (Facebook, WhatsApp, LinkedIn, Discord, Telegram, Apple Messages) -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Akta News" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(desc)}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(article.title)}" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="article:published_time" content="${publishedAt}" />
    <meta property="article:section" content="${escapeHtml(category)}" />

    <!-- Twitter / X Cards with Large Featured Image -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@AktaNews" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(desc)}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:alt" content="${escapeHtml(article.title)}" />
  `;

  return modified.replace('</head>', `${dynamicTags}\n  </head>`);
}

// Vite Middleware for Dev and Static Serving for Prod
async function startServer() {
  let vite: any = null;

  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
  }

  // Handle article and root routes with Dynamic Open Graph preview
  app.get(['/article/:id', '/article', '/'], async (req, res, next) => {
    try {
      const articleId = req.params.id || (req.query.article as string);
      let article: any = null;
      if (articleId) {
        article = INITIAL_ARTICLES.find(a => a.id === articleId) || 
          SIMULATED_BREAKING_POOL.find(a => ('akta-breaking-' + a.title) === articleId);
      }

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;

      let html = '';
      if (process.env.NODE_ENV !== 'production') {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        html = fs.readFileSync(indexPath, 'utf-8');
        if (vite) {
          html = await vite.transformIndexHtml(req.originalUrl, html);
        }
      } else {
        const indexPath = path.resolve(process.cwd(), 'dist', 'index.html');
        html = fs.readFileSync(indexPath, 'utf-8');
      }

      if (article) {
        html = injectArticleMetadata(html, article, fullUrl);
      }

      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    } catch (e) {
      next(e);
    }
  });

  // Fallback for any other SPA routes
  app.get('*', async (req, res, next) => {
    try {
      let html = '';
      if (process.env.NODE_ENV !== 'production') {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        html = fs.readFileSync(indexPath, 'utf-8');
        if (vite) {
          html = await vite.transformIndexHtml(req.originalUrl, html);
        }
      } else {
        const indexPath = path.resolve(process.cwd(), 'dist', 'index.html');
        html = fs.readFileSync(indexPath, 'utf-8');
      }
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    } catch (e) {
      next(e);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Akta News Server running on http://localhost:${PORT}`);
  });
}

startServer();
