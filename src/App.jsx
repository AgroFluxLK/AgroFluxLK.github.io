import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Landmark,
  ShoppingCart,
  Carrot,
  Scale,
  Leaf,
  Sprout,
  ChevronsRight,
  FileText,
  Clock,
  Loader,
  Calendar,
  Droplets,
} from "lucide-react";

// --- HELPER FUNCTIONS ---

const parseCSV = (csvText) => {
  if (!csvText) return [];
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const data = lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce((obj, header, index) => {
      const value = values[index];
      obj[header] = isNaN(value) ? value.trim() : parseFloat(value);
      return obj;
    }, {});
  });
  return data;
};

const monthMap = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

const getWeek = (d) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
};

const getAggregationKey = (date, level) => {
  const year = date.getFullYear();
  if (level === "weekly") {
    const week = getWeek(date);
    return `${year}-W${week}`;
  }
  if (level === "monthly") {
    const month = date.getMonth() + 1;
    return `${year}-${month < 10 ? "0" : ""}${month}`;
  }
  return date.toISOString().split("T")[0];
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({
    vegetable: "All",
    market: "All",
    sales_type: "All",
    timeRange: "30D",
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/vegetable_price.csv");
        if (!response.ok)
          throw new Error(
            `HTTP error! status: ${response.status}. Check 'public' folder.`
          );
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        const dataWithDate = parsedData
          .filter((d) => d.year && d.month && d.day && monthMap[d.month])
          .map((d) => ({
            ...d,
            date: new Date(d.year, monthMap[d.month] - 1, d.day),
          }))
          .sort((a, b) => a.date - b.date);
        setAllData(dataWithDate);
      } catch (e) {
        console.error("Failed to fetch/parse CSV:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filterOptions = useMemo(() => {
    const vegetables = [
      "All",
      ...new Set(allData.map((item) => item.vegetable)),
    ];
    const markets = ["All", ...new Set(allData.map((item) => item.market))];
    const sales_types = [
      "All",
      ...new Set(allData.map((item) => item.sales_type)),
    ];
    return { vegetables, markets, sales_types };
  }, [allData]);

  // This callback now only filters, it does not aggregate.
  const applyFilters = useCallback(() => {
    if (isLoading || allData.length === 0) return;

    const now = new Date();
    let startDate = new Date();

    switch (filters.timeRange) {
      case "7D":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30D":
        startDate.setDate(now.getDate() - 30);
        break;
      case "1Y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "All":
        startDate = allData.length > 0 ? new Date(allData[0].date) : new Date();
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    let tempData = allData.filter((d) => d.date >= startDate && d.date <= now);

    if (filters.vegetable !== "All")
      tempData = tempData.filter((d) => d.vegetable === filters.vegetable);
    if (filters.market !== "All")
      tempData = tempData.filter((d) => d.market === filters.market);
    if (filters.sales_type !== "All")
      tempData = tempData.filter((d) => d.sales_type === filters.sales_type);

    setFilteredData(tempData);
  }, [allData, filters, isLoading]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const renderContent = () => {
    if (isLoading) return <LoadingState />;
    if (error) return <ErrorState message={error} />;
    return (
      <DashboardContent data={filteredData} timeRange={filters.timeRange} />
    );
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans text-gray-800 dark:text-gray-200 flex">
      <aside
        className={`bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-72" : "w-20"
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div
            className={`flex items-center gap-2 ${!isSidebarOpen && "hidden"}`}
          >
            <img src="/logo-trans.png" alt="Agro Flux Logo" width={40} />
            <h1 className="text-xl font-bold ml-4">Agro Flux</h1>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronsRight
              className={`transform transition-transform duration-300 ${
                isSidebarOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>
        </div>
        <nav className="p-4 overflow-y-auto h-[calc(100vh-65px)]">
          <div className="space-y-4">
            <TimeRangeSelector
              filters={filters}
              onChange={handleFilterChange}
              isSidebarOpen={isSidebarOpen}
            />
            <hr className="border-gray-200 dark:border-gray-700" />
            <FilterControl
              label="Vegetable"
              icon={<Carrot size={20} />}
              options={filterOptions.vegetables}
              value={filters.vegetable}
              onChange={(e) => handleFilterChange("vegetable", e.target.value)}
              isSidebarOpen={isSidebarOpen}
            />
            <FilterControl
              label="Market"
              icon={<Landmark size={20} />}
              options={filterOptions.markets}
              value={filters.market}
              onChange={(e) => handleFilterChange("market", e.target.value)}
              isSidebarOpen={isSidebarOpen}
            />
            <FilterControl
              label="Sale Type"
              icon={<ShoppingCart size={20} />}
              options={filterOptions.sales_types}
              value={filters.sales_type}
              onChange={(e) => handleFilterChange("sales_type", e.target.value)}
              isSidebarOpen={isSidebarOpen}
            />
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <DashboardHeader filters={filters} />
        {renderContent()}
      </main>
    </div>
  );
}

// --- UI COMPONENTS ---

const DashboardContent = ({ data, timeRange }) => {
  // Memoized calculation for statistics. Uses the raw filtered data.
  const stats = useMemo(() => {
    if (data.length === 0) return { avg: 0, high: 0, low: 0, count: 0 };
    const prices = data
      .map((d) => d.price)
      .filter((p) => typeof p === "number");
    if (prices.length === 0) return { avg: 0, high: 0, low: 0, count: 0 };
    return {
      avg: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2),
      high: Math.max(...prices).toFixed(2),
      low: Math.min(...prices).toFixed(2),
      count: data.length,
    };
  }, [data]);

  // Memoized and AGGREGATED data for the line chart.
  const priceTrendData = useMemo(() => {
    let aggregationLevel = "daily";
    let formatOptions = { month: "short", day: "numeric" };

    if (timeRange === "1Y") {
      aggregationLevel = "weekly";
      formatOptions = { year: "2-digit", month: "short", day: "numeric" };
    } else if (timeRange === "All") {
      aggregationLevel = "monthly";
      formatOptions = { year: "numeric", month: "short" };
    }

    if (aggregationLevel === "daily") {
      return data.map((d) => ({
        ...d,
        displayDate: d.date.toLocaleDateString("en-US", formatOptions),
      }));
    }

    const aggregated = data.reduce((acc, curr) => {
      const key = getAggregationKey(curr.date, aggregationLevel);
      if (!acc[key]) acc[key] = { prices: [], date: curr.date };
      acc[key].prices.push(curr.price);
      return acc;
    }, {});

    return Object.values(aggregated)
      .map((group) => ({
        date: group.date,
        price: group.prices.reduce((a, b) => a + b, 0) / group.prices.length,
        displayDate: group.date.toLocaleDateString("en-US", formatOptions),
      }))
      .sort((a, b) => a.date - b.date);
  }, [data, timeRange]);

  // Memoized and GROUPED data for the bar chart. This uses the raw filtered data.
  const marketComparisonData = useMemo(() => {
    const marketPrices = data.reduce((acc, curr) => {
      // This check is important to avoid 'undefined' keys
      if (curr.market) {
        if (!acc[curr.market]) acc[curr.market] = { prices: [] };
        acc[curr.market].prices.push(curr.price);
      }
      return acc;
    }, {});
    return Object.entries(marketPrices)
      .map(([market, { prices }]) => ({
        market,
        avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice);
  }, [data]);

  if (data.length === 0) return <NoDataState />;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Scale className="text-blue-500" />}
          title="Avg Price"
          value={`Rs. ${stats.avg}`}
        />
        <StatCard
          icon={<Sprout className="text-green-500" />}
          title="Highest Price"
          value={`Rs. ${stats.high}`}
        />
        <StatCard
          icon={<Droplets className="text-red-500" />}
          title="Lowest Price"
          value={`Rs. ${stats.low}`}
        />
        <StatCard
          icon={<Calendar className="text-purple-500" />}
          title="Data Points"
          value={stats.count}
        />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <ChartContainer title="Price Trend Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceTrendData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis
                dataKey="displayDate"
                angle={-10}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis domain={["dataMin - 10", "dataMax + 10"]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#8884d8"
                strokeWidth={2}
                activeDot={{ r: 8 }}
                name="Avg. Price"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        <ChartContainer title="Average Price by Market">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={marketComparisonData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="market" />
              <YAxis />
              <Tooltip
                cursor={{ fill: "rgba(136, 132, 216, 0.1)" }}
                content={<CustomTooltip />}
              />
              <Legend />
              <Bar dataKey="avgPrice" fill="#82ca9d" name="Average Price" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

const TimeRangeSelector = ({ filters, onChange, isSidebarOpen }) => {
  const ranges = [
    { key: "7D", label: "7 Days" },
    { key: "30D", label: "30 Days" },
    { key: "1Y", label: "1 Year" },
    { key: "All", label: "All Time" },
  ];
  return (
    <div>
      <label
        className={`flex items-center gap-3 mb-2 font-semibold text-sm ${
          !isSidebarOpen && "justify-center"
        }`}
      >
        <Clock size={20} />
        {isSidebarOpen && <span>Time Range</span>}
      </label>
      {isSidebarOpen && (
        <div className="grid grid-cols-2 gap-2">
          {ranges.map((range) => (
            <button
              key={range.key}
              onClick={() => onChange("timeRange", range.key)}
              className={`p-2 text-sm rounded-md transition-colors ${
                filters.timeRange === range.key
                  ? "bg-green-500 text-white font-bold"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FilterControl = ({
  label,
  icon,
  options,
  value,
  onChange,
  isSidebarOpen,
}) => (
  <div>
    <label
      className={`flex items-center gap-3 mb-2 font-semibold text-sm ${
        !isSidebarOpen && "justify-center"
      }`}
    >
      {icon}
      {isSidebarOpen && <span>{label}</span>}
    </label>
    {isSidebarOpen && (
      <select
        value={value}
        onChange={onChange}
        className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )}
  </div>
);

const DashboardHeader = ({ filters }) => {
  const getFilterText = (value) =>
    !value || value === "All" ? (
      "All"
    ) : (
      <span className="font-semibold text-green-500">{value}</span>
    );
  return (
    <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-2">Price Analysis Dashboard</h2>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Carrot size={16} className="text-green-500" />
          Vegetable: {getFilterText(filters.vegetable)}
        </div>
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-green-500" />
          Market: {getFilterText(filters.market)}
        </div>
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-green-500" />
          Sale Type: {getFilterText(filters.sales_type)}
        </div>
      </div>
    </div>
  );
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
    <Loader size={48} className="text-green-500 animate-spin mb-4" />
    <h3 className="text-xl font-semibold">Loading Data...</h3>
    <p className="text-gray-500 dark:text-gray-400 mt-2">
      Please wait while we process the dataset.
    </p>
  </div>
);
const ErrorState = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-full text-center bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg shadow-md p-8">
    <FileText size={48} className="mb-4" />
    <h3 className="text-xl font-semibold">Error Loading Data</h3>
    <p className="mt-2 text-sm">{message}</p>
  </div>
);
const NoDataState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
    <FileText size={48} className="text-gray-400 dark:text-gray-500 mb-4" />
    <h3 className="text-xl font-semibold">No Data to Display</h3>
    <p className="text-gray-500 dark:text-gray-400 mt-2">
      Try expanding the time range or changing filters.
    </p>
  </div>
);
const StatCard = ({ icon, title, value }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center gap-4">
    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">{icon}</div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  </div>
);
const ChartContainer = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
    <h3 className="font-semibold mb-4 text-center">{title}</h3>
    {children}
  </div>
);
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-sm">
        <p className="label font-bold">{data.displayDate || label}</p>
        {data.price !== undefined && (
          <p className="intro text-indigo-500">{`Avg. Price : Rs. ${data.price.toFixed(
            2
          )}`}</p>
        )}
        {data.avgPrice !== undefined && (
          <p className="intro text-green-500">{`Avg. Price : Rs. ${data.avgPrice.toFixed(
            2
          )}`}</p>
        )}
      </div>
    );
  }
  return null;
};
