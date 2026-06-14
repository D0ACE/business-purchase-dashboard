import { useState, useMemo, useEffect } from 'react';
import { 
  getParsedRecords, 
  computeSummary, 
  PurchaseRecord 
} from './data/parsedData';
import {
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  Award,
  Search,
  RotateCcw,
  Download,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Star,
  LineChart as LineIcon,
  HelpCircle,
  AlertCircle,
  TrendingDown,
  Layers,
  MapPin,
  Calendar,
  CheckCircle,
  Maximize2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  Legend,
  PieChart,
  Pie
} from 'recharts';

export default function App() {
  // Store full dataset once parsed
  const dataset = useMemo(() => getParsedRecords(), []);

  // Filter States
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [selectedSub, setSelectedSubscription] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Table Pagination & Sorting
  const [recordsPage, setRecordsPage] = useState<number>(0);
  const rowsPerPage = 10;
  const [sortField, setSortField] = useState<keyof PurchaseRecord | ''>('customerId');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // AI Assistant States
  const [aiApiKeyConfigured, setAiApiKeyConfigured] = useState<boolean>(true);
  const [aiQuery, setAiQuery] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiLoadingMessage, setAiLoadingLoadingMessage] = useState<string>('');

  // Get categories, seasons, and regions available in data for filter dropdowns dynamically
  const uniqueSeasons = useMemo(() => ['All', ...Array.from(new Set(dataset.map((r) => r.season)))], [dataset]);
  const uniqueCategories = useMemo(() => ['All', ...Array.from(new Set(dataset.map((r) => r.category)))], [dataset]);
  const uniqueGenders = useMemo(() => ['All', ...Array.from(new Set(dataset.map((r) => r.gender)))], [dataset]);

  // Reset page when any filter config changes
  useEffect(() => {
    setRecordsPage(0);
  }, [selectedSeason, selectedCategory, selectedGender, selectedSub, searchTerm]);

  // Check backend server status & API Key presence on load
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setAiApiKeyConfigured(data.hasKey);
      })
      .catch((err) => {
        console.warn('API Status error:', err);
        setAiApiKeyConfigured(false);
      });
  }, []);

  // Filter dataset dynamically in real-time
  const filteredRecords = useMemo(() => {
    return dataset.filter((record) => {
      const matchSeason = selectedSeason === 'All' || record.season === selectedSeason;
      const matchCategory = selectedCategory === 'All' || record.category === selectedCategory;
      const matchGender = selectedGender === 'All' || record.gender === selectedGender;
      const matchSub = selectedSub === 'All' || 
        (selectedSub === 'Yes' && record.subscriptionStatus.toLowerCase() === 'yes') ||
        (selectedSub === 'No' && record.subscriptionStatus.toLowerCase() === 'no');

      // Search match (Customer ID, Item Name, Location)
      const t = searchTerm.trim().toLowerCase();
      const matchSearch = t === '' || 
        record.customerId.toString().includes(t) ||
        record.itemPurchased.toLowerCase().includes(t) ||
        record.location.toLowerCase().includes(t) ||
        record.color.toLowerCase().includes(t);

      return matchSeason && matchCategory && matchGender && matchSub && matchSearch;
    });
  }, [dataset, selectedSeason, selectedCategory, selectedGender, selectedSub, searchTerm]);

  // Metric summaries for the current filtered pool
  const summaryMetrics = useMemo(() => {
    return computeSummary(filteredRecords);
  }, [filteredRecords]);

  // Handle Dynamic sorting
  const sortedRecords = useMemo(() => {
    if (!sortField) return filteredRecords;
    const sorted = [...filteredRecords];
    sorted.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc 
        ? valA.toString().localeCompare(valB.toString()) 
        : valB.toString().localeCompare(valA.toString());
    });
    return sorted;
  }, [filteredRecords, sortField, sortAsc]);

  // Paginated chunk
  const paginatedRecords = useMemo(() => {
    const start = recordsPage * rowsPerPage;
    return sortedRecords.slice(start, start + rowsPerPage);
  }, [sortedRecords, recordsPage]);

  const maxPages = Math.ceil(sortedRecords.length / rowsPerPage);

  // Grouped Chart Data: Sales per Season
  const seasonChartData = useMemo(() => {
    const map: Record<string, { season: string; revenue: number; orders: number }> = {};
    uniqueSeasons.filter(s => s !== 'All').forEach(s => {
      map[s] = { season: s, revenue: 0, orders: 0 };
    });

    filteredRecords.forEach((r) => {
      if (map[r.season]) {
        map[r.season].revenue += r.purchaseAmount;
        map[r.season].orders += 1;
      }
    });

    return Object.values(map).map(item => ({
      ...item,
      revenue: Math.round(item.revenue),
    }));
  }, [filteredRecords, uniqueSeasons]);

  // Grouped Chart Data: Categories Breakdowns
  const categoryChartData = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};
    filteredRecords.forEach((r) => {
      if (!map[r.category]) {
        map[r.category] = { name: r.category, value: 0 };
      }
      map[r.category].value += r.purchaseAmount;
    });
    return Object.values(map).map(item => ({
      ...item,
      value: Math.round(item.value)
    }));
  }, [filteredRecords]);

  // Top color choices bar data
  const colorChartData = useMemo(() => {
    const map: Record<string, { color: string; amount: number; count: number }> = {};
    filteredRecords.forEach((r) => {
      if (!map[r.color]) {
        map[r.color] = { color: r.color, amount: 0, count: 0 };
      }
      map[r.color].amount += r.purchaseAmount;
      map[r.color].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(item => ({
        ...item,
        amount: Math.round(item.amount)
      }));
  }, [filteredRecords]);

  // Grouped Chart Data: Category and Average Review Score
  const ratingChartData = useMemo(() => {
    const sumMap: Record<string, number> = {};
    const countMap: Record<string, number> = {};
    
    filteredRecords.forEach((r) => {
      if (r.reviewRating !== null && !isNaN(r.reviewRating)) {
        sumMap[r.category] = (sumMap[r.category] || 0) + r.reviewRating;
        countMap[r.category] = (countMap[r.category] || 0) + 1;
      }
    });

    return Object.keys(countMap).map((cat) => ({
      category: cat,
      rating: Math.round((sumMap[cat] / countMap[cat]) * 100) / 100,
    }));
  }, [filteredRecords]);

  // Monochrome palette matching the CRED aesthetic
  const MONOCHROME_COLORS = ['#ffffff', '#e4e4e7', '#a1a1aa', '#71717a', '#3f3f46', '#27272a'];

  // Strategic Advisor Prompt Helpers
  const prepackagedPrompts = [
    "Identify which categories provide the highest value per purchase and why",
    "Analyze the behavior of Subscribed versus Non-Subscribed shoppers",
    "Highlight seasonal changes in customer volume and spend intensity",
    "List the top locations we should target for a targeted apparel campaign"
  ];

  // Call the server-side Gemini custom endpoint safely or simulate if key is dummy
  const handleQueryAdvisor = async (promptText: string) => {
    const finalPrompt = promptText || aiQuery;
    if (!finalPrompt.trim()) return;

    setAiLoading(true);
    setAiResponse('');

    // Stagger loading messages for an amazing CRED look
    const loadingStatements = [
      "Accessing neural bi models...",
      "Generating diagnostic statistics...",
      "Correlating categorical variances...",
      "Formatting strategic insight matrices..."
    ];
    let msgIndex = 0;
    setAiLoadingLoadingMessage(loadingStatements[0]);
    const timer = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingStatements.length;
      setAiLoadingLoadingMessage(loadingStatements[msgIndex]);
    }, 1200);

    try {
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          analysisContext: {
            filtersApplied: {
              season: selectedSeason,
              category: selectedCategory,
              gender: selectedGender,
              subscription: selectedSub,
              searchKeyword: searchTerm
            },
            summaryMetrics,
            categoriesBreakdown: categoryChartData,
            seasonBreakdown: seasonChartData,
            colorPopularity: colorChartData
          }
        })
      });

      const data = await response.json();
      clearInterval(timer);
      
      if (data.error) {
        setAiResponse(`❌ Service error: ${data.error}`);
      } else {
        setAiResponse(data.text);
      }
    } catch (err: any) {
      clearInterval(timer);
      setAiResponse(`❌ Network error: Could not reach server-side advisor AI API.`);
    } finally {
      setAiLoading(false);
    }
  };

  // Export current filtered table view to CSV instantaneously
  const handleCSVExport = () => {
    if (filteredRecords.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    // Header
    const headers = [
      "Customer ID", "Age", "Gender", "Item Purchased", "Category", 
      "Purchase Amount", "Location", "Size", "Color", "Season", 
      "Review Rating", "Subscription Status", "Shipping Type", 
      "Discount Applied", "Previous Purchases", "Payment Method", "Purchase Frequency"
    ];
    csvContent += headers.join(",") + "\n";

    // Rows
    filteredRecords.forEach((r) => {
      const row = [
        r.customerId, r.age, r.gender, `"${r.itemPurchased.replace(/"/g, '""')}"`, r.category,
        r.purchaseAmount ?? '0', `"${r.location.replace(/"/g, '""')}"`, r.size, r.color, r.season,
        r.reviewRating ?? 'N/A', r.subscriptionStatus, `"${r.shippingType.replace(/"/g, '""')}"`,
        r.discountApplied, r.previousPurchases, r.paymentMethod, `"${r.frequency.replace(/"/g, '""')}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `monochrome_purchase_dump_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setSelectedSeason('All');
    setSelectedCategory('All');
    setSelectedGender('All');
    setSelectedSubscription('All');
    setSearchTerm('');
  };

  const handleSort = (field: keyof PurchaseRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black antialiased">
      
      {/* Top Banner Navigation inspired by high-end minimal cred app header */}
      <header className="border-b border-zinc-900 bg-[#070708] px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-4 relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 bg-white rounded-none flex items-center justify-center border border-zinc-800 shadow-[0_0_15px_rgba(255,255,255,0.06)] relative group">
            <span className="font-mono text-base font-extrabold text-black tracking-tighter">BI</span>
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-neutral-100 border border-black rounded-full" />
          </div>
          <div>
            <h1 className="text-xl font-display font-extrabold text-white tracking-tight uppercase flex items-center gap-2">
              MONOCHROME METRICS <span className="font-mono font-light text-zinc-500 text-xs tracking-widest normal-case">&middot; DECK 1.0</span>
            </h1>
            <p className="text-[10px] font-mono text-zinc-400 tracking-wider uppercase">
              RETAIL SHOPPER PERFORMANCE &amp; INTELLIGENCE GRID
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Global Search and Reset Option */}
          <div className="relative flex-1 sm:w-64">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
              <Search size={14} className="stroke-zinc-400" />
            </span>
            <input
              type="text"
              className="w-full bg-[#0a0a0c] border border-zinc-800 focus:border-zinc-300 rounded-none py-1.5 pl-9 pr-4 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
              placeholder="FILTER BY SKU, CITY, COLOR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={handleResetFilters}
            className="flex items-center justify-center p-2 bg-[#0a0a0c] border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all rounded-none"
            title="Reset filters"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 space-y-8 max-w-7xl mx-auto w-full">

        {/* Filters Slicers Section */}
        <section className="bg-zinc-950 border border-zinc-800/80 p-6 relative">
          <div className="absolute top-0 left-12 transform -translate-y-1/2 bg-black px-3 font-mono text-[9px] text-zinc-500 tracking-widest uppercase">
            DIMENSIONAL RANGE FILTERS
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Season Slicer */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                <Calendar size={12} className="text-zinc-500" /> Period / Season
              </label>
              <select
                className="w-full bg-[#070708] border border-zinc-800 focus:border-zinc-400 text-xs font-semibold px-3 py-2 text-zinc-200 focus:outline-none rounded-none transition-colors appearance-none cursor-pointer"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
              >
                {uniqueSeasons.map((s) => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Category Slicer */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                <Layers size={12} className="text-zinc-500" /> Product Family
              </label>
              <select
                className="w-full bg-[#070708] border border-zinc-800 focus:border-zinc-400 text-xs font-semibold px-3 py-2 text-zinc-200 focus:outline-none rounded-none transition-colors appearance-none cursor-pointer"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Gender Slicer */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                <Users size={12} className="text-zinc-500" /> Demographic Cohort
              </label>
              <select
                className="w-full bg-[#070708] border border-zinc-800 focus:border-zinc-400 text-xs font-semibold px-3 py-2 text-zinc-200 focus:outline-none rounded-none transition-colors appearance-none cursor-pointer"
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
              >
                {uniqueGenders.map((g) => (
                  <option key={g} value={g}>{g.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Membership Loyatly */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                <Award size={12} className="text-zinc-500" /> Membership status
              </label>
              <select
                className="w-full bg-[#070708] border border-zinc-800 focus:border-zinc-400 text-xs font-semibold px-3 py-2 text-zinc-200 focus:outline-none rounded-none transition-colors appearance-none cursor-pointer"
                value={selectedSub}
                onChange={(e) => setSelectedSubscription(e.target.value)}
              >
                <option value="All">ALL CUSTOMERS</option>
                <option value="Yes">LOYALTY SUBSCRIBERS</option>
                <option value="No">REGULAR GUESTS</option>
              </select>
            </div>
          </div>
        </section>

        {/* Dynamic Metric Summaries (KPI Blocks) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-[#0a0a0c] border border-zinc-800 p-6 relative group">
            <div className="absolute top-0 right-0 h-8 w-8 border-t border-r border-transparent group-hover:border-zinc-500 transition-all duration-300" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase">Gross revenue</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-display font-light text-white leading-none tracking-tight">
                ${summaryMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs font-mono text-zinc-500">USD</span>
            </div>
            <p className="text-[9px] font-mono text-zinc-400 mt-2">Cumulative purchase values</p>
          </div>

          <div className="bg-[#0a0a0c] border border-zinc-800 p-6 relative group">
            <div className="absolute top-0 right-0 h-8 w-8 border-t border-r border-transparent group-hover:border-zinc-500 transition-all duration-300" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase">Ticket average</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-display font-light text-white leading-none tracking-tight">
                ${summaryMetrics.averageAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-mono text-zinc-500">USD</span>
            </div>
            <p className="text-[9px] font-mono text-zinc-400 mt-2">Value variance per customer ticket</p>
          </div>

          <div className="bg-[#0a0a0c] border border-zinc-800 p-6 relative group">
            <div className="absolute top-0 right-0 h-8 w-8 border-t border-r border-transparent group-hover:border-zinc-500 transition-all duration-300" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase">Matched checkouts</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-display font-light text-white leading-none tracking-tight">
                {summaryMetrics.totalTransactions.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-zinc-500">TXS</span>
            </div>
            <p className="text-[9px] font-mono text-zinc-400 mt-2"> shopper transactions matching slice</p>
          </div>

          <div className="bg-[#0a0a0c] border border-zinc-800 p-6 relative group">
            <div className="absolute top-0 right-0 h-8 w-8 border-t border-r border-transparent group-hover:border-zinc-500 transition-all duration-300" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase">Loyalty status rate</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-display font-light text-white leading-none tracking-tight">
                {summaryMetrics.subscriberRate}%
              </span>
              <span className="text-xs font-mono text-zinc-500">RATE</span>
            </div>
            <p className="text-[9px] font-mono text-zinc-400 mt-2">{summaryMetrics.subscriberCount} active subscribed loyalty members</p>
          </div>

        </section>

        {/* Charts Deck Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Chart 1: Seasonal Distribution */}
          <div className="bg-[#070708] border border-zinc-900 p-6 space-y-4">
            <div>
              <span className="text-xs font-mono text-zinc-400 tracking-wider uppercase block">Metric Analysis / Seasonality</span>
              <h3 className="text-base font-display font-bold text-white uppercase tracking-tight">Period spend velocity</h3>
            </div>
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seasonChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="monochromeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.08}/>
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1c1c1f" />
                  <XAxis dataKey="season" stroke="#52525b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0' }}
                    labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#fff', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="revenue" name="Sales ($)" stroke="#ffffff" strokeWidth={1} fillOpacity={1} fill="url(#monochromeGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Category share matrix */}
          <div className="bg-[#070708] border border-zinc-900 p-6 space-y-4">
            <div>
              <span className="text-xs font-mono text-zinc-400 tracking-wider uppercase block">Metric Analysis / Share</span>
              <h3 className="text-base font-display font-bold text-white uppercase tracking-tight">Category Volume Allocation</h3>
            </div>
            <div className="h-64 mt-2 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex-1 w-full h-full min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={MONOCHROME_COLORS[index % MONOCHROME_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0' }}
                      itemStyle={{ color: '#fff', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-44 text-xs space-y-2 select-text font-mono">
                {categoryChartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-none shrink-0" style={{ backgroundColor: MONOCHROME_COLORS[index % MONOCHROME_COLORS.length] }} />
                      <span className="text-zinc-400 text-[11px] uppercase">{entry.name}</span>
                    </div>
                    <span className="text-white font-bold">${entry.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 3: Color Palette demand */}
          <div className="bg-[#070708] border border-zinc-900 p-6 space-y-4">
            <div>
              <span className="text-xs font-mono text-zinc-400 tracking-wider uppercase block">Metric Analysis / Popularity (Top 5)</span>
              <h3 className="text-base font-display font-bold text-white uppercase tracking-tight">Shopper Color Preference Value</h3>
            </div>
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={colorChartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#1c1c1f" />
                  <XAxis type="number" stroke="#52525b" fontSize={10} tickLine={false} />
                  <YAxis dataKey="color" type="category" stroke="#52525b" fontSize={10} tickLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0' }}
                    labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="amount" name="Value Sum ($)" fill="#ffffff" radius={[0, 4, 4, 0]}>
                    {colorChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#ffffff' : '#71717a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Group Review ratings index */}
          <div className="bg-[#070708] border border-zinc-900 p-6 space-y-4">
            <div>
              <span className="text-xs font-mono text-zinc-400 tracking-wider uppercase block">Metric Analysis / Satisfaction Index</span>
              <h3 className="text-base font-display font-bold text-white uppercase tracking-tight">Average Category Verified Rating</h3>
            </div>
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1c1c1f" />
                  <XAxis dataKey="category" stroke="#52525b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} domain={[0, 5]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0' }}
                    labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="rating" name="Rating Index" fill="#e4e4e7" radius={[4, 4, 0, 0]}>
                    {ratingChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={MONOCHROME_COLORS[(index + 1) % MONOCHROME_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </section>

        {/* AI Business Assistant / Strategist Panel */}
        <section className="bg-gradient-to-b from-[#0a0a0c] to-[#040405] border border-zinc-800 p-8 shadow-2xl relative">
          <div className="absolute top-0 right-0 h-px w-full bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
          
          <div className="space-y-6 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border border-zinc-700 rounded-full flex items-center justify-center bg-zinc-900/40">
                  <Sparkles className="text-white" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-display font-extrabold text-white uppercase tracking-tight flex items-center gap-1.5">
                    Strategic Business Assistant Proxy
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Linked to server-side Gemini 3.5. Click below to analyze currently filtered metrics.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#040405] border border-zinc-800 px-3 py-1.5 text-[10px] font-mono tracking-wider font-semibold uppercase text-zinc-300">
                <span className={`h-2 w-2 rounded-full ${aiApiKeyConfigured ? 'bg-white shadow-[0_0_10px_white]' : 'bg-zinc-700 animate-pulse'}`} />
                {aiApiKeyConfigured ? 'Gemini 3.5 Live' : 'Limited Mode'}
              </div>
            </div>

            {/* Prompt Helper Chips */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">SELECT STRATEGIC DIAGNOSTIC PRESET</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {prepackagedPrompts.map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => {
                      setAiQuery(promptText);
                      handleQueryAdvisor(promptText);
                    }}
                    disabled={aiLoading}
                    className="text-left text-xs bg-[#060607]/80 hover:bg-zinc-900 text-zinc-300 font-medium px-4 py-3 rounded-none border border-zinc-800/80 transition-all focus:outline-none focus:border-zinc-400 disabled:opacity-50 flex items-start gap-2.5"
                  >
                    <span className="font-mono text-zinc-500 font-bold shrink-0">ANALYZE &middot;</span>
                    <span>{promptText}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Query input */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch gap-3 pt-2">
              <input
                type="text"
                className="flex-1 bg-black border border-zinc-800 focus:border-zinc-400 px-4 py-3 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none rounded-none"
                placeholder="PROMPT ASSISTANT FOR A CUSTOM QUERY ON CURRENT STATE..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQueryAdvisor(aiQuery)}
              />
              <button
                onClick={() => handleQueryAdvisor(aiQuery)}
                disabled={aiLoading || !aiQuery.trim()}
                className="bg-white hover:bg-zinc-200 text-black font-extrabold py-3 px-6 rounded-none text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Sparkles size={14} className={aiLoading ? 'animate-spin' : ''} />
                Generate Insights
              </button>
            </div>

            {/* Response Area */}
            {aiLoading ? (
              <div className="bg-[#050506]/90 border border-zinc-800 px-8 py-8 rounded-none flex flex-col items-center justify-center space-y-4 min-h-[160px]">
                <Sparkles className="text-white animate-spin" size={24} />
                <div className="text-center space-y-1">
                  <span className="text-xs font-mono tracking-widest text-zinc-200 uppercase block">{aiLoadingMessage}</span>
                  <span className="text-[10px] text-zinc-500 font-mono block">Querying transactional vectors</span>
                </div>
              </div>
            ) : aiResponse ? (
              <div className="bg-[#070708] border border-zinc-800 p-6 rounded-none text-xs text-zinc-200 leading-relaxed font-sans select-text relative space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                  <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                    🤖 MODEL DECISION REPORT:
                  </span>
                  <button 
                    onClick={() => { setAiResponse('') }}
                    className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest hover:text-white"
                  >
                    [ CLEAR LOG ]
                  </button>
                </div>
                
                <div className="overflow-auto max-h-[350px] pr-2 space-y-3 whitespace-pre-wrap select-text font-mono text-zinc-300">
                  {aiResponse}
                </div>
              </div>
            ) : null}

          </div>
        </section>

        {/* Detailed Transactions Grid (Table) */}
        <section className="bg-zinc-950 border border-zinc-800 p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-5">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase">Transactional Registry</span>
              <h3 className="text-base font-display font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                Verified Shoppers Dataset Ledger
              </h3>
              <p className="text-xs text-zinc-400">
                Matches {filteredRecords.length} records.
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto self-end">
              <button
                onClick={handleCSVExport}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-zinc-800 bg-[#08080a] hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-none text-xs uppercase tracking-wider font-mono font-bold transition-all w-full md:w-auto"
                disabled={filteredRecords.length === 0}
              >
                <Download size={13} />
                Export Ledger CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto select-text">
            <table className="w-full text-xs text-left border-collapse select-text">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-mono tracking-wider text-[10px] uppercase select-none">
                  <th 
                    onClick={() => handleSort('customerId')}
                    className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                  >
                    CID {sortField === 'customerId' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th 
                    onClick={() => handleSort('age')}
                    className="py-3 px-2 cursor-pointer hover:text-white transition-colors"
                  >
                    Age {sortField === 'age' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-3 px-2">Sex</th>
                  <th className="py-3 px-3">Item Name</th>
                  <th className="py-3 px-2">Category</th>
                  <th 
                    onClick={() => handleSort('purchaseAmount')}
                    className="py-3 px-3 cursor-pointer hover:text-white text-right"
                  >
                    Price (USD) {sortField === 'purchaseAmount' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-3 px-3">Size & Color</th>
                  <th className="py-3 px-2">Season</th>
                  <th 
                    onClick={() => handleSort('reviewRating')}
                    className="py-3 px-2 cursor-pointer hover:text-white transition-colors"
                  >
                    Score {sortField === 'reviewRating' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-3 px-2">Membership</th>
                  <th className="py-3 px-2 text-right">Payment</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((r) => (
                  <tr 
                    key={`${r.id}-${r.customerId}`}
                    className="border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors select-text"
                  >
                    <td className="py-3.5 px-3 font-mono font-bold text-zinc-500">
                      ID-{r.customerId}
                    </td>
                    <td className="py-3.5 px-2 text-zinc-300 font-mono">{r.age}</td>
                    <td className="py-3.5 px-2 text-zinc-400">{r.gender}</td>
                    <td className="py-3.5 px-3 font-semibold text-white tracking-tight">
                      {r.itemPurchased}
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="inline-block px-2 py-0.5 rounded-none border border-zinc-800 bg-[#070708] text-zinc-400 text-[10px] font-mono tracking-wider uppercase">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-zinc-200 text-right">
                      ${r.purchaseAmount?.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-zinc-400 text-[11px] font-mono">
                      <span>{r.size}</span> &middot; <span>{r.color.toUpperCase()}</span>
                    </td>
                    <td className="py-3.5 px-2 text-zinc-300 font-mono tracking-tight">{r.season.toUpperCase()}</td>
                    <td className="py-3.5 px-2 font-mono">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-white fill-white shrink-0" />
                        <span className="font-bold text-white text-[11px]">{r.reviewRating !== null ? r.reviewRating.toFixed(1) : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className={`inline-block font-mono text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-none border ${r.subscriptionStatus?.toLowerCase() === 'yes' ? 'bg-white text-black font-extrabold border-white' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>
                        {r.subscriptionStatus?.toLowerCase() === 'yes' ? 'LEAGUE' : 'GUEST'}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-zinc-400 text-right font-mono text-[11px]">{r.paymentMethod.toUpperCase()}</td>
                  </tr>
                ))}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-zinc-500 font-mono">
                      <AlertCircle className="mx-auto mb-2 text-zinc-700" size={24} />
                      Zero shoppers matching the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {filteredRecords.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-zinc-900 pt-5 font-mono text-[11px] text-zinc-400 select-none">
              <span>
                Showing entries <span className="text-white font-bold">{recordsPage * rowsPerPage + 1}</span> to <span className="text-white font-bold">{Math.min((recordsPage + 1) * rowsPerPage, filteredRecords.length)}</span> of <span className="text-white font-bold">{filteredRecords.length}</span> shopper transactions
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRecordsPage(p => Math.max(0, p - 1))}
                  disabled={recordsPage === 0}
                  className="flex items-center justify-center p-2 border border-zinc-800 bg-[#08080a] hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                
                <span className="px-3.5 py-1.5 bg-[#08080a] border border-zinc-805 text-zinc-300 font-bold">
                  PAGE {recordsPage + 1} OF {maxPages || 1}
                </span>

                <button
                  onClick={() => setRecordsPage(p => Math.min(maxPages - 1, p + 1))}
                  disabled={recordsPage >= maxPages - 1}
                  className="flex items-center justify-center p-2 border border-zinc-800 bg-[#08080a] hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Footer credits matches branding guidelines exactly */}
      <footer className="border-t border-zinc-900 bg-[#070708] py-6 px-6 text-center select-none text-[9px] font-mono text-zinc-500 tracking-wider uppercase space-y-1">
        <div>
          Interactive Monochrome Business Slicing Dashboard &middot; Verified Datasets Logged
        </div>
        <div className="opacity-60">
          Powered securely via Node dist/server.cjs &middot; HMR Bypass Mode Active
        </div>
      </footer>
    </div>
  );
}
