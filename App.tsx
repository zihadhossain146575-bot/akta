import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Article, 
  UserPreferences, 
  NotificationItem, 
  LiveWireItem, 
  CategoryType,
  Language 
} from './types';
import { storage } from './services/storageService';
import { notificationService } from './services/notificationService';
import { INITIAL_ARTICLES, INITIAL_LIVE_WIRE } from './data/mockArticles';
import { getLocalizedArticle, getLocalizedLiveWire, getLocalizedCategory } from './data/translations';
import { initFirestoreSync } from './services/firestoreSync';

import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { LiveTicker } from './components/LiveTicker';
import { HeroSlider } from './components/HeroSlider';
import { ArticleCard } from './components/ArticleCard';
import { ArticleReader } from './components/ArticleReader';
import { SavedArticlesPage } from './components/SavedArticlesPage';
import { SocialShareModal } from './components/SocialShareModal';
import { SearchModal } from './components/SearchModal';
import { PreferencesModal } from './components/PreferencesModal';
import { NotificationCenter } from './components/NotificationCenter';
import { BottomNav } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { Footer } from './components/Footer';
import { AboutPage } from './components/AboutPage';
import { PrivacyPage } from './components/PrivacyPage';
import { TermsPage } from './components/TermsPage';
import { ContactPage } from './components/ContactPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLogin } from './components/admin/AdminLogin';
import { getAdminSecretCode, getActiveSecretCodesStrings } from './services/adminAuthService';
import { getAdSettings, applyAdSenseScriptToHead, AdSettingsConfig, DEFAULT_AD_SETTINGS } from './services/adSettingsService';
import { AdUnit } from './components/AdUnit';

import { 
  Sparkles, 
  Flame, 
  Zap, 
  Bookmark, 
  Radio, 
  TrendingUp, 
  Clock, 
  Filter, 
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown
} from 'lucide-react';

export default function App() {
  // Application State
  const [preferences, setPreferences] = useState<UserPreferences>(() => storage.getPreferences());
  const [articles, setArticles] = useState<Article[]>(() => storage.getAllArticles());
  const [liveWire, setLiveWire] = useState<LiveWireItem[]>(INITIAL_LIVE_WIRE);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => storage.getNotifications());
  
  // Navigation & View State
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [shareModalArticle, setShareModalArticle] = useState<Article | null>(null);
  const [shareModalQuote, setShareModalQuote] = useState<string | null>(null);
  const [activeLegalPage, setActiveLegalPage] = useState<'about' | 'privacy' | 'terms' | 'contact' | null>(null);
  
  // Newspaper Admin Portal State
  const [isAdminView, setIsAdminView] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Network status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Lazy Scroll / Infinite Loading state
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // Simulation loading state
  const [isSimulating, setIsSimulating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Google AdSense & Monetization settings
  const [adSettings, setAdSettings] = useState<AdSettingsConfig>(DEFAULT_AD_SETTINGS);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Ad Settings & Sync AdSense Head Script
  useEffect(() => {
    getAdSettings().then((settings) => {
      setAdSettings(settings);
      applyAdSenseScriptToHead(settings);
    }).catch(() => {});

    const handleAdsChanged = (e: any) => {
      if (e.detail) {
        setAdSettings(e.detail);
        applyAdSenseScriptToHead(e.detail);
      }
    };
    window.addEventListener('akta_ad_settings_changed', handleAdsChanged);
    return () => window.removeEventListener('akta_ad_settings_changed', handleAdsChanged);
  }, []);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Network connection restored. Live wire online.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline Mode: Reading cached dispatches.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Synchronize articles state whenever an article is published, edited, or deleted
    const handleArticlesChanged = () => {
      setArticles(storage.getAllArticles());
    };
    window.addEventListener('akta_articles_changed', handleArticlesChanged);
    window.addEventListener('storage', handleArticlesChanged);

    // Initialize Cloud Firestore real-time synchronization
    const unsubscribeFirestore = initFirestoreSync(INITIAL_ARTICLES);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('akta_articles_changed', handleArticlesChanged);
      window.removeEventListener('storage', handleArticlesChanged);
      unsubscribeFirestore();
    };
  }, []);

  // Secret Route Listener: Detects dynamic secret codes from Firestore (e.g. '/*kashmora47' or customized multiple codes)
  useEffect(() => {
    let activeSecretCodes: string[] = ['*kashmora47'];

    const checkSecretRoute = () => {
      if (typeof window === 'undefined') return;
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      const search = (window.location.search || '').toLowerCase();

      // Check against any registered active secret codes
      const matchesAnyRegistered = activeSecretCodes.some((code) => {
        const clean = code.toLowerCase().trim();
        const stripped = clean.replace(/^\*/, '');
        return (
          (clean && (path.includes(clean) || hash.includes(clean) || search.includes(clean))) ||
          (stripped && (path.includes(stripped) || hash.includes(stripped) || search.includes(stripped)))
        );
      });

      const isSecretTriggered = 
        matchesAnyRegistered ||
        // Always support *kashmora47 as default master trigger
        path.includes('*kashmora47') ||
        hash.includes('*kashmora47') ||
        hash.includes('kashmora47') ||
        path.includes('kashmora47') ||
        search.includes('kashmora47');

      if (isSecretTriggered) {
        setIsAdminView(true);
      }
    };

    // Retrieve all active dynamic secret codes from Firebase
    getActiveSecretCodesStrings().then((codes) => {
      if (Array.isArray(codes) && codes.length > 0) {
        activeSecretCodes = codes;
      }
      checkSecretRoute();
    }).catch(() => {});

    // Check immediately on load
    checkSecretRoute();

    window.addEventListener('hashchange', checkSecretRoute);
    window.addEventListener('popstate', checkSecretRoute);

    return () => {
      window.removeEventListener('hashchange', checkSecretRoute);
      window.removeEventListener('popstate', checkSecretRoute);
    };
  }, []);

  const handleExitAdmin = () => {
    // Clear the secret route from browser URL history
    if (typeof window !== 'undefined') {
      try {
        if (window.location.hash) {
          window.location.hash = '';
        }
        window.history.replaceState(null, '', '/');
      } catch {}
    }
    setArticles(storage.getAllArticles());
    setIsAdminView(false);
  };

  // Sync theme with document element & body
  useEffect(() => {
    const isSystemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = preferences.theme === 'dark' || (preferences.theme === 'system' && isSystemDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [preferences.theme]);

  // Helper to dynamically update client-side Open Graph & Twitter meta tags
  const syncDocumentMeta = (article: Article | null) => {
    if (article) {
      document.title = `${article.title} — Akta News`;

      const setMeta = (attr: string, val: string, content: string) => {
        let el = document.querySelector(`meta[${attr}="${val}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attr, val);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };

      setMeta('name', 'description', article.excerpt);
      setMeta('property', 'og:title', `${article.title} — Akta News`);
      setMeta('property', 'og:description', article.excerpt);
      setMeta('property', 'og:image', article.image);
      setMeta('property', 'og:type', 'article');
      setMeta('name', 'twitter:title', `${article.title} — Akta News`);
      setMeta('name', 'twitter:description', article.excerpt);
      setMeta('name', 'twitter:image', article.image);
    } else {
      document.title = 'Akta News - Real-Time Breaking News & Personalized Feeds';
    }
  };

  // URL deep-linking & PopState sync
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const articleIdFromParam = params.get('article');
      let targetId: string | null = null;

      if (articleIdFromParam) {
        targetId = articleIdFromParam;
      } else if (path.startsWith('/article/')) {
        targetId = path.replace('/article/', '');
      }

      if (targetId) {
        const found = articles.find(a => a.id === targetId);
        if (found) {
          setSelectedArticle(found);
          syncDocumentMeta(found);
        }
      } else {
        setSelectedArticle(null);
        syncDocumentMeta(null);
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, [articles]);

  // Subscribe to Notification Service
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((item) => {
      setNotifications(storage.getNotifications());
      showToast(`Alert: ${item.title}`);
    });
    return unsubscribe;
  }, []);

  // Keyboard shortcuts (e.g. Cmd+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save Preferences Handler
  const handleUpdatePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    storage.savePreferences(newPrefs);
  };

  // Toggle Article Offline Bookmark
  const handleToggleSave = (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    const saved = storage.toggleSaveArticle(articleId);
    setPreferences(storage.getPreferences());
    showToast(saved ? 'Article saved for offline reading' : 'Removed from offline library');
  };

  // Remove individual saved article
  const handleRemoveSaved = (articleId: string) => {
    storage.removeSavedArticle(articleId);
    setPreferences(storage.getPreferences());
    showToast('Removed from saved posts');
  };

  // Clear all saved articles
  const handleClearAllSaved = () => {
    storage.clearAllSavedArticles();
    setPreferences(storage.getPreferences());
    showToast('All saved posts deleted');
  };

  // Toggle Article Like
  const handleToggleLike = (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    const liked = storage.toggleLikeArticle(articleId);
    setPreferences(storage.getPreferences());
    
    // update count on article
    const updated = articles.map(a => {
      if (a.id === articleId) {
        return { ...a, likesCount: a.likesCount + (liked ? 1 : -1) };
      }
      return a;
    });
    setArticles(updated);
  };

  // Open Social Share Modal
  const handleOpenShare = (e: React.MouseEvent, article: Article, quote?: string) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setShareModalArticle(article);
    setShareModalQuote(quote || null);
  };

  // Select and view full article
  const handleSelectArticle = (article: Article) => {
    setActiveLegalPage(null);
    setSelectedArticle(article);
    storage.recordArticleRead(article.id);
    setPreferences(storage.getPreferences());
    syncDocumentMeta(article);
    if (window.location.pathname !== `/article/${article.id}`) {
      window.history.pushState({ articleId: article.id }, '', `/article/${article.id}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToFeed = () => {
    setSelectedArticle(null);
    setActiveLegalPage(null);
    syncDocumentMeta(null);
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleSelectArticleById = (articleId: string) => {
    const found = articles.find(a => a.id === articleId);
    if (found) {
      handleSelectArticle(found);
    }
  };

  // Simulate Breaking Wire Dispatch
  const handleSimulateBreaking = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/breaking/simulate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const newArt: Article = data.article;
        
        // Save to dynamic article store
        storage.saveArticle(newArt);
        setArticles(storage.getAllArticles());

        // Prepend to Live Wire
        const newWire: LiveWireItem = {
          id: 'wire-' + Date.now(),
          timestamp: 'JUST NOW',
          headline: data.wireHeadline || newArt.title,
          category: newArt.category,
          isFlash: true,
          articleId: newArt.id,
          source: 'Akta Wire Network'
        };
        setLiveWire(prev => [newWire, ...prev]);

        // Trigger Push notification & chime
        notificationService.notify({
          title: `BREAKING: ${newArt.title}`,
          message: newArt.excerpt,
          type: 'breaking',
          articleId: newArt.id,
          priority: 'urgent',
          onSelect: () => handleSelectArticle(newArt)
        });

        showToast(`Real-time breaking dispatch received: ${newArt.title}`);
      }
    } catch {
      showToast('Simulation broadcast triggered locally.');
    } finally {
      setIsSimulating(false);
    }
  };

  const currentLanguage: Language = preferences.language || 'bn';

  const handleSelectLanguage = (newLang: Language) => {
    const updated = { ...preferences, language: newLang };
    setPreferences(updated);
    storage.savePreferences(updated);
    showToast(newLang === 'bn' ? 'বাংলা ভাষা সক্রিয় করা হয়েছে' : 'English language activated');
  };

  const localizedArticles = useMemo(() => {
    return articles.map(a => getLocalizedArticle(a, currentLanguage));
  }, [articles, currentLanguage]);

  const localizedLiveWire = useMemo(() => {
    return liveWire.map(w => getLocalizedLiveWire(w, currentLanguage));
  }, [liveWire, currentLanguage]);

  // Filter Articles based on category & user preferences
  const displayedArticles = useMemo(() => {
    if (activeCategory === 'Saved Offline') {
      return localizedArticles.filter(a => preferences.savedArticleIds.includes(a.id));
    }

    if (activeCategory === 'Breaking') {
      return localizedArticles.filter(a => a.isBreaking);
    }

    if (activeCategory === 'For You') {
      // Personalized recommendation algorithm:
      // Weight articles based on selected topics + interest weights (1-5)
      return [...localizedArticles].sort((a, b) => {
        const aWeight = preferences.selectedTopics.includes(a.category) 
          ? (preferences.topicWeights[a.category] || 3) 
          : 0;
        const bWeight = preferences.selectedTopics.includes(b.category) 
          ? (preferences.topicWeights[b.category] || 3) 
          : 0;

        const aScore = aWeight * 10 + (a.isTrending ? 5 : 0) + (preferences.readHistoryIds.includes(a.id) ? -2 : 4);
        const bScore = bWeight * 10 + (b.isTrending ? 5 : 0) + (preferences.readHistoryIds.includes(b.id) ? -2 : 4);

        return bScore - aScore;
      });
    }

    if (activeCategory !== 'All') {
      const activeCatLower = activeCategory.toLowerCase();
      const allSavedCategories = storage.getCategories();
      const parentCat = allSavedCategories.find(c => c.name.toLowerCase() === activeCatLower);
      const childCategoryNames = parentCat 
        ? allSavedCategories.filter(c => c.parentId === parentCat.id).map(c => c.name.toLowerCase()) 
        : [];

      return localizedArticles.filter(a => {
        const catLower = (a.category || '').toLowerCase();
        const subCatLower = (a.subCategory || '').toLowerCase();
        const tagLowers = (a.tags || []).map(t => t.toLowerCase());

        // Direct category or subcategory match
        if (catLower === activeCatLower || subCatLower === activeCatLower) {
          return true;
        }

        // Parent category matches child categories
        if (childCategoryNames.includes(catLower) || childCategoryNames.includes(subCatLower)) {
          return true;
        }

        // Fallback to tags
        if (tagLowers.includes(activeCatLower)) {
          return true;
        }

        return false;
      });
    }

    return localizedArticles;
  }, [localizedArticles, activeCategory, preferences]);

  const leadArticle = displayedArticles.length > 0 ? displayedArticles[0] : null;
  const secondaryArticles = displayedArticles.slice(1);
  const visibleSecondaryArticles = secondaryArticles.slice(0, visibleCount);
  const hasMoreArticles = visibleCount < secondaryArticles.length;
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  // Reset pagination whenever category or filters change
  useEffect(() => {
    setVisibleCount(6);
  }, [activeCategory]);

  // Infinite Scroll IntersectionObserver: Automatically loads more articles as the user scrolls
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoadingMore && visibleCount < secondaryArticles.length) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + 6, secondaryArticles.length));
            setIsLoadingMore(false);
          }, 350);
        }
      },
      { rootMargin: '300px 0px', threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, secondaryArticles.length, isLoadingMore]);

  // Render Admin Portal View if active
  if (isAdminView) {
    if (!isAdminAuthenticated) {
      return (
        <AdminLogin
          onLoginSuccess={() => {
            setIsAdminAuthenticated(true);
            showToast(currentLanguage === 'bn' ? 'এডমিন প্যানেলে সফলভাবে লগইন করেছেন' : 'Logged into Admin Portal successfully');
          }}
          onBackToSite={handleExitAdmin}
        />
      );
    }
    return (
      <AdminLayout
        onExitToSite={handleExitAdmin}
        onLogout={() => {
          setIsAdminAuthenticated(false);
          handleExitAdmin();
          showToast(currentLanguage === 'bn' ? 'এডমিন প্যানেল থেকে লগআউট সম্পন্ন হয়েছে' : 'Logged out of Admin Portal');
        }}
        onArticlesChanged={() => {
          setArticles(storage.getAllArticles());
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors selection:bg-amber-500/20">
      {/* Offline Status Banner */}
      <OfflineBanner isOnline={isOnline} savedCount={preferences.savedArticleIds.length} language={currentLanguage} />

      {/* Main Top Header */}
      <Header
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotifCount}
        isOnline={isOnline}
        savedArticlesCount={preferences.savedArticleIds.length}
        onSelectCategory={(cat) => {
          setSelectedArticle(null);
          setActiveLegalPage(null);
          setActiveCategory(cat);
        }}
        onSimulateBreaking={handleSimulateBreaking}
        isSimulating={isSimulating}
        activeCategory={activeCategory}
        language={currentLanguage}
        onSelectLanguage={handleSelectLanguage}
      />

      {/* Live Breaking News Ticker Bar */}
      <LiveTicker 
        items={localizedLiveWire} 
        onSelectArticle={handleSelectArticleById} 
        language={currentLanguage}
      />

      {/* Dynamic Header / Homepage Top Banner Ad (Controlled via Admin Panel) */}
      {adSettings.adsEnabled && adSettings.headerAdCode && !selectedArticle && !activeLegalPage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
          <div className="bg-stone-50/70 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800/60 rounded-xl p-2 text-center">
            <AdUnit code={adSettings.headerAdCode} placementName="শীর্ষ ব্যানার" />
          </div>
        </div>
      )}

      {/* Category Horizontal Navigation Strip */}
      <CategoryNav
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setSelectedArticle(null);
          setActiveLegalPage(null);
          setActiveCategory(cat);
        }}
        savedCount={preferences.savedArticleIds.length}
        language={currentLanguage}
      />

      {/* Content Area */}
      <main className="flex-1 pb-16 md:pb-0">
        {activeLegalPage === 'about' ? (
          <AboutPage 
            onBackToFeed={() => {
              setActiveLegalPage(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigatePage={(page) => {
              setActiveLegalPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeLegalPage === 'privacy' ? (
          <PrivacyPage 
            onBackToFeed={() => {
              setActiveLegalPage(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigatePage={(page) => {
              setActiveLegalPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeLegalPage === 'terms' ? (
          <TermsPage 
            onBackToFeed={() => {
              setActiveLegalPage(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigatePage={(page) => {
              setActiveLegalPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeLegalPage === 'contact' ? (
          <ContactPage 
            onBackToFeed={() => {
              setActiveLegalPage(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigatePage={(page) => {
              setActiveLegalPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onShowToast={showToast}
          />
        ) : selectedArticle ? (
          <ArticleReader
            article={getLocalizedArticle(selectedArticle, currentLanguage)}
            preferences={preferences}
            isSaved={preferences.savedArticleIds.includes(selectedArticle.id)}
            isLiked={preferences.likedArticleIds.includes(selectedArticle.id)}
            onBack={handleBackToFeed}
            onToggleSave={handleToggleSave}
            onToggleLike={handleToggleLike}
            onShare={handleOpenShare}
            allArticles={localizedArticles}
            onSelectArticle={handleSelectArticle}
            onSelectCategory={(cat) => {
              setSelectedArticle(null);
              setActiveCategory(cat);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeCategory === 'Saved Offline' ? (
          <SavedArticlesPage
            savedArticles={localizedArticles.filter(a => preferences.savedArticleIds.includes(a.id))}
            onSelectArticle={handleSelectArticle}
            onRemoveSaved={handleRemoveSaved}
            onClearAllSaved={handleClearAllSaved}
            onBackToFeed={() => {
              setActiveCategory('All');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onShare={handleOpenShare}
            language={currentLanguage}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* View Heading / Sub-header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-stone-200 dark:border-stone-800 gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-stone-900 dark:text-stone-50">
                    {activeCategory === 'All' 
                      ? (currentLanguage === 'bn' ? 'শীর্ষ খবর ও বিশেষ প্রতিবেদন' : 'Top Global Stories') 
                      : getLocalizedCategory(activeCategory, currentLanguage)}
                  </h1>
                  {activeCategory === 'For You' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {currentLanguage === 'bn' ? 'ব্যক্তিগত পছন্দমতো' : 'Personalized Algorithm'}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                  {currentLanguage === 'bn' ? (
                    activeCategory === 'For You'
                      ? 'আপনার পছন্দের বিষয় এবং পড়ার অভ্যাসের ওপর ভিত্তি করে বাছাইকৃত সংবাদ।'
                      : activeCategory === 'Saved Offline'
                      ? 'ইন্টারনেট সংযোগ ছাড়াই পড়ার জন্য ডিভাইসে সংরক্ষিত প্রতিবেদনসমূহ।'
                      : activeCategory === 'Breaking'
                      ? 'বিশ্ব সংবাদ ডেস্ক থেকে রিয়েল-টাইমে ভেরিফায়েড ব্রেকিং আপডেট।'
                      : `${getLocalizedCategory(activeCategory, 'bn')} বিভাগের সর্বশেষ ও তথ্যবহুল সংবাদ।`
                  ) : (
                    activeCategory === 'For You'
                      ? 'Curated dispatches tuned to your priority topics and reading habits.'
                      : activeCategory === 'Saved Offline'
                      ? 'Articles downloaded to device memory for uninterrupted reading anywhere.'
                      : activeCategory === 'Breaking'
                      ? 'Verified urgent dispatches updated real-time from the global wire.'
                      : `In-depth reporting and breaking updates covering ${activeCategory.toLowerCase()}.`
                  )}
                </p>
              </div>

              {/* View options / Actions */}
              <div className="flex items-center space-x-2.5">
                {activeCategory === 'For You' && (
                  <button
                    onClick={() => setIsPreferencesOpen(true)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 transition-colors shadow-xs"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    {currentLanguage === 'bn' ? 'পছন্দ পরিবর্তন' : 'Fine-Tune Interests'}
                  </button>
                )}

                <button
                  onClick={handleSimulateBreaking}
                  disabled={isSimulating}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:bg-amber-700 dark:hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSimulating ? 'animate-spin' : ''}`} />
                  {currentLanguage === 'bn' ? 'সংবাদ রিফ্রেশ' : 'Refresh Wire'}
                </button>
              </div>
            </div>

            {/* Empty State when no articles match */}
            {displayedArticles.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-stone-300 dark:border-stone-800 rounded-2xl p-8 bg-white/50 dark:bg-stone-900/50">
                <Bookmark className="w-12 h-12 mx-auto text-stone-400 mb-3" />
                <h3 className="font-display font-bold text-lg text-stone-800 dark:text-stone-200">
                  {activeCategory === 'Saved Offline' 
                    ? (currentLanguage === 'bn' ? 'এখনো কোনো সংরক্ষিত খবর নেই' : 'No Saved Articles Yet')
                    : (currentLanguage === 'bn' ? 'এই বিভাগে বর্তমানে কোনো সংবাদ নেই' : 'No Dispatches in this Section')}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1 mb-5">
                  {activeCategory === 'Saved Offline'
                    ? (currentLanguage === 'bn' ? 'ইন্টারনেট ছাড়াই পড়তে যেকোনো সংবাদের বুকমার্ক বাটনে ক্লিক করুন।' : 'Click the bookmark icon on any story to save it for offline reading without an internet connection.')
                    : (currentLanguage === 'bn' ? 'শীঘ্রই নতুন সংবাদ আপডেট দেখার জন্য অপেক্ষা করুন।' : 'Check back shortly as our editorial wire streams new breaking updates.')}
                </p>
                <button
                  onClick={() => setActiveCategory('All')}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
                >
                  {currentLanguage === 'bn' ? 'শীর্ষ খবরসমূহ দেখুন' : 'Browse Top Stories'}
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. Hero / Lead Story Slider (Rotates every 10s with text on image overlay & Trending Stories sidebar) */}
                {displayedArticles.length > 0 && (
                  <HeroSlider
                    articles={displayedArticles}
                    trendingArticles={localizedArticles}
                    isSaved={(id) => preferences.savedArticleIds.includes(id)}
                    isLiked={(id) => preferences.likedArticleIds.includes(id)}
                    onSelect={handleSelectArticle}
                    onToggleSave={handleToggleSave}
                    onToggleLike={handleToggleLike}
                    onShare={handleOpenShare}
                    language={currentLanguage}
                  />
                )}

                {/* 2. Secondary Story Grid */}
                {secondaryArticles.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                      <span>{currentLanguage === 'bn' ? 'আরও সংবাদ ও গভীর বিশ্লেষণ' : 'More Dispatches & Analysis'}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                      {visibleSecondaryArticles.map(article => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          variant="standard"
                          isSaved={preferences.savedArticleIds.includes(article.id)}
                          isLiked={preferences.likedArticleIds.includes(article.id)}
                          onSelect={handleSelectArticle}
                          onToggleSave={handleToggleSave}
                          onToggleLike={handleToggleLike}
                          onShare={handleOpenShare}
                          language={currentLanguage}
                        />
                      ))}
                    </div>

                    {/* Sentinel & Infinite Scroll Loader */}
                    {hasMoreArticles && (
                      <div ref={sentinelRef} className="pt-8 pb-4 flex flex-col items-center justify-center">
                        {isLoadingMore ? (
                          <div className="flex items-center space-x-2.5 px-4 py-2.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold shadow-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                            <span>{currentLanguage === 'bn' ? 'আরও সংবাদ লোড হচ্ছে...' : 'Loading more dispatches...'}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsLoadingMore(true);
                              setTimeout(() => {
                                setVisibleCount((prev) => Math.min(prev + 6, secondaryArticles.length));
                                setIsLoadingMore(false);
                              }, 250);
                            }}
                            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:border-amber-600 dark:hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shadow-xs cursor-pointer"
                          >
                            <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>{currentLanguage === 'bn' ? 'আরও সংবাদ দেখুন' : 'Load More Dispatches'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {!hasMoreArticles && secondaryArticles.length > 6 && (
                      <div className="pt-6 pb-2 text-center">
                        <div className="inline-flex items-center space-x-3 text-xs text-stone-400 dark:text-stone-500 font-medium">
                          <span className="w-8 h-px bg-stone-300 dark:bg-stone-700" />
                          <span>{currentLanguage === 'bn' ? '✓ সব সংবাদ প্রদর্শিত হচ্ছে' : '✓ All dispatches loaded'}</span>
                          <span className="w-8 h-px bg-stone-300 dark:bg-stone-700" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Editorial Rich Footer */}
      <Footer
        onSelectCategory={(cat) => {
          setSelectedArticle(null);
          setActiveLegalPage(null);
          setActiveCategory(cat);
        }}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onOpenPage={(pageId) => {
          setSelectedArticle(null);
          if (pageId === 'about' || pageId === 'privacy' || pageId === 'terms' || pageId === 'contact') {
            setActiveLegalPage(pageId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onShowToast={showToast}
        language={currentLanguage}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setSelectedArticle(null);
          setActiveLegalPage(null);
          setActiveCategory(cat);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        savedCount={preferences.savedArticleIds.length}
        unreadNotificationsCount={unreadNotifCount}
        language={currentLanguage}
      />

      {/* Modals & Drawers */}
      <SearchModal
        articles={articles}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectArticle={handleSelectArticle}
        language={currentLanguage}
      />

      <SocialShareModal
        article={shareModalArticle}
        selectedQuote={shareModalQuote}
        onClose={() => {
          setShareModalArticle(null);
          setShareModalQuote(null);
        }}
        language={currentLanguage}
      />

      {isPreferencesOpen && (
        <PreferencesModal
          preferences={preferences}
          onSavePreferences={handleUpdatePreferences}
          onClose={() => setIsPreferencesOpen(false)}
          savedArticlesCount={preferences.savedArticleIds.length}
          onClearSavedArticles={() => {
            handleUpdatePreferences({ ...preferences, savedArticleIds: [] });
            showToast(currentLanguage === 'bn' ? 'অফলাইন ক্যাশ সফলভাবে মোছা হয়েছে' : 'Offline cache cleared');
          }}
        />
      )}

      <NotificationCenter
        notifications={notifications}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectArticle={handleSelectArticleById}
        onMarkAsRead={(id) => {
          storage.markNotificationAsRead(id);
          setNotifications(storage.getNotifications());
        }}
        onMarkAllAsRead={() => {
          storage.markAllNotificationsAsRead();
          setNotifications(storage.getNotifications());
        }}
        onClearAll={() => {
          storage.clearAllNotifications();
          setNotifications([]);
        }}
        onSimulateBreaking={handleSimulateBreaking}
        language={currentLanguage}
      />

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div 
          id="akta-action-toast"
          className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 text-xs font-semibold animate-in slide-in-from-bottom-4 duration-200 border border-stone-800 dark:border-stone-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
