import { useEffect, useMemo, useState } from "react";
import { getTransactions } from "../api/transaction.api";
import { motion } from "framer-motion";
import { useAlert } from "../components/Alert/AlertContext";
import { useCurrency } from "../context/CurrencyContext";
import { generateAnalyticsPdf } from "../utils/analyticsPdf";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./Analytics.css";

const COLORS = [
  "#10232A",
  "#B58863",
  "#3D4D55",
  "#A79E9C",
  "#D3C3B9",
  "#1B1B1B",
];
const CATEGORY_BREAKDOWN_TYPES = ["expense", "income"];
const PAYMENT_METHOD_TYPES = ["income", "expense"];

const formatCurrency = (n) =>
  Number(n || 0).toLocaleString("en-IE", { maximumFractionDigits: 0 });
const normalizeType = (value = "") => String(value).trim().toLowerCase();
const normalizePaymentMode = (value = "") => {
  const mode = String(value).trim().toLowerCase();
  if (!mode) return "unknown";
  if (mode === "online" || mode === "upi") return "upi";
  return mode;
};
const formatLabel = (value = "") =>
  String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const getWeeksInMonth = (year, month) => {
  const weeks = [];
  let current = new Date(year, month, 1);

  while (current.getMonth() === month) {
    const weekStart = new Date(current);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(current);
    weekEnd.setDate(current.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    weeks.push({ start: weekStart, end: weekEnd });

    current.setDate(current.getDate() + 7);
  }

  return weeks;
};

const isInvestment = (t) => {
  const type = (t.type || "").toLowerCase();
  return type === "investment" || type === "invest";
};
const getThemeColor = (variable) => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
};

const scrollableLegendStyle = {
  width: "100%",
  maxHeight: 60,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: 6,
};

const Analytics = () => {
  const [transactions, setTransactions] = useState([]);
  const [range, setRange] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [paymentFilter, setPaymentFilter] = useState("income");
  const [categoryFilter, setCategoryFilter] = useState("expense");
  const [investPaymentFilter, setInvestPaymentFilter] = useState("all");
  const { symbol, convert, displayCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const rangeOptions = ["week", "month", "year"];
  const activeRangeIndex = Math.max(rangeOptions.indexOf(range), 0);
  const [currentTheme, setCurrentTheme] = useState(
    document.documentElement.getAttribute("data-theme") || "light",
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentTheme(
        document.documentElement.getAttribute("data-theme") || "light",
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  // Use dynamic theme colors that pull from CSS variables
  const themeColors = useMemo(
    () => [
      getThemeColor("--primary") || "#10232A",
      getThemeColor("--accent") || "#B58863",
      getThemeColor("--text-muted") || "#A79E9C",
      "#3D4D55",
      "#D3C3B9",
    ],
    [currentTheme],
  );
  const barColors = useMemo(
    () => ({
      income: getThemeColor("--accent") || "#B58863",
      expense: getThemeColor("--text-main") || "#10232A",
    }),
    [currentTheme],
  );
  const { showAlert } = useAlert();

  const [loanViewMode, setLoanViewMode] = useState("principal"); // "principal" | "interest"

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await getTransactions();
      const cleanedData = (Array.isArray(res) ? res : []).map((t) => ({
        ...t,
        amount: Number(t.amount) || 0,
      }));
      setTransactions(cleanedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const y = d.getFullYear();
      if (!Number.isNaN(y)) yearsSet.add(y);
    });
    const yearsArray = Array.from(yearsSet).sort((a, b) => b - a);
    if (yearsArray.length > 0) {
      const current = new Date().getFullYear();
      if (!yearsArray.includes(current)) yearsArray.unshift(current);
      return Array.from(new Set(yearsArray));
    }
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }).map((_, i) => current - i);
  }, [transactions]);

  useEffect(() => {
    if (availableYears.length && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (range === "month" || range === "week") {
        return (
          d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
        );
      }
      if (range === "year") {
        return d.getFullYear() === selectedYear;
      }
      return true;
    });
  }, [transactions, range, selectedMonth, selectedYear]);
  const availableTypeFilters = useMemo(() => {
    const types = new Set();
    filteredTransactions.forEach((t) => {
      const type = normalizeType(t.type);
      if (!type || type === "transfer") return;
      types.add(type);
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [filteredTransactions]);

  const investPaymentModes = useMemo(() => {
    const modes = new Set();
    filteredTransactions
      .filter((t) => isInvestment(t))
      .forEach((t) => {
        const mode = normalizePaymentMode(t.paymentMode);
        if (!mode || mode === "unknown") return;
        modes.add(mode);
      });
    return Array.from(modes).sort((a, b) => a.localeCompare(b));
  }, [filteredTransactions]);

  useEffect(() => {
    if (!PAYMENT_METHOD_TYPES.includes(paymentFilter)) {
      setPaymentFilter("income");
    }
  }, [paymentFilter]);

  useEffect(() => {
    if (!CATEGORY_BREAKDOWN_TYPES.includes(categoryFilter)) {
      setCategoryFilter("expense");
    }
  }, [categoryFilter]);

  useEffect(() => {
    if (
      investPaymentFilter !== "all" &&
      !investPaymentModes.includes(investPaymentFilter)
    ) {
      setInvestPaymentFilter("all");
    }
  }, [investPaymentModes, investPaymentFilter]);

  const totalIncome = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    [filteredTransactions],
  );

  const totalExpense = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    [filteredTransactions],
  );

  const totalInvestment = useMemo(
    () =>
      filteredTransactions
        .filter((t) => isInvestment(t))
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    [filteredTransactions],
  );

  const balance = totalIncome - totalExpense - totalInvestment;
  const loanStats = useMemo(() => {
    let loanPrincipalReceived = 0;
    let loanInterestReceived = 0;
    let borrowPrincipalPaid = 0;
    let borrowInterestPaid = 0;

    filteredTransactions.forEach((t) => {
      const mode = (t.paymentMode || "").toLowerCase();
      const note = (t.note || "").toLowerCase();
      const amt = Number(t.amount || 0);

      // LENT MONEY (Income coming back to you)
      if (mode === "loan" && t.type === "income") {
        if (note.includes("interest")) loanInterestReceived += amt;
        else loanPrincipalReceived += amt;
      }

      // BORROWED MONEY (Expense you are paying back)
      if (mode === "borrow" && t.type === "expense") {
        if (note.includes("interest")) borrowInterestPaid += amt;
        else borrowPrincipalPaid += amt;
      }
    });

    return {
      loanPrincipalReceived,
      loanInterestReceived,
      borrowPrincipalPaid,
      borrowInterestPaid,
      loanTotalReceived: loanPrincipalReceived + loanInterestReceived,
      borrowTotalPaid: borrowPrincipalPaid + borrowInterestPaid,
    };
  }, [filteredTransactions]);

  const loanPieData = useMemo(() => {
    if (loanViewMode === "interest") {
      return [
        { name: "Interest Profit", value: loanStats.loanInterestReceived },
        { name: "Interest Loss", value: loanStats.borrowInterestPaid },
      ];
    }
    return [
      { name: "Principal Received", value: loanStats.loanPrincipalReceived },
      { name: "Principal Paid", value: loanStats.borrowPrincipalPaid },
    ];
  }, [loanStats, loanViewMode]);
  const loanBorrowPieData = [
    { name: "Loan Received", value: loanStats.loanTotalReceived },
    { name: "Borrow Paid", value: loanStats.borrowTotalPaid },
  ];

  // Payment type (Cash vs Online) — only expenses
  const paymentTypeData = useMemo(() => {
    const byMode = {};

    filteredTransactions
      .filter((t) => {
        const type = normalizeType(t.type);
        if (!PAYMENT_METHOD_TYPES.includes(type)) return false;
        return type === paymentFilter;
      })
      .forEach((t) => {
        const mode = normalizePaymentMode(t.paymentMode);
        if (!mode || mode === "unknown") return;
        byMode[mode] = (byMode[mode] || 0) + Number(t.amount || 0);
      });

    return Object.keys(byMode).map((mode) => ({
      name: formatLabel(mode),
      value: byMode[mode],
    }));
  }, [filteredTransactions, paymentFilter]);

  // Expense by category (for second pie)
  const categoryChartData = useMemo(() => {
    const dataByCategory = {};
    filteredTransactions
      .filter((t) => {
        // Filter by the selected type (income or expense)
        const typeMatch = normalizeType(t.type) === categoryFilter;
        // Exclude internal loan/borrow transfers from general breakdown
        const notLoan = !["loan", "borrow"].includes(
          normalizePaymentMode(t.paymentMode),
        );
        return typeMatch && notLoan;
      })
      .forEach((t) => {
        // Capitalize the category name
        const cat = t.category
          ? t.category.charAt(0).toUpperCase() +
            t.category.slice(1).toLowerCase()
          : "Uncategorized";

        dataByCategory[cat] =
          (dataByCategory[cat] || 0) + Number(t.amount || 0);
      });

    return Object.keys(dataByCategory).map((cat) => ({
      name: cat,
      value: dataByCategory[cat],
    }));
  }, [filteredTransactions, categoryFilter]);

  const investmentCategoryData = useMemo(() => {
    const investByCategory = {};
    filteredTransactions
      .filter((t) => {
        const isInvestType = isInvestment(t);
        // Filter by payment mode if not set to "all"
        const matchesMode =
          investPaymentFilter === "all" ||
          normalizePaymentMode(t.paymentMode) === investPaymentFilter;

        return isInvestType && matchesMode;
      })
      .forEach((t) => {
        // Capitalize the category name
        const cat = t.category
          ? t.category.charAt(0).toUpperCase() +
            t.category.slice(1).toLowerCase()
          : "Uncategorized";

        investByCategory[cat] =
          (investByCategory[cat] || 0) + Number(t.amount || 0);
      });

    return Object.keys(investByCategory).map((cat) => ({
      name: cat,
      value: investByCategory[cat],
    }));
  }, [filteredTransactions, investPaymentFilter]);

  const loanProfitLossData = useMemo(() => {
    if (loanViewMode === "interest") {
      return [
        { name: "Profit (Earned)", value: loanStats.loanInterestReceived },
        { name: "Loss (Paid)", value: loanStats.borrowInterestPaid },
      ];
    }
    return [
      { name: "Principal Lent", value: loanStats.loanPrincipalReceived },
      { name: "Principal Borrowed", value: loanStats.borrowPrincipalPaid },
    ];
  }, [loanStats, loanViewMode]);

  // YEAR VIEW: monthly summaries (compute investments per month)
  const monthlySummaries = useMemo(() => {
    // we compute months regardless, but we will only render them when range === 'year'
    return Array.from({ length: 12 }).map((_, i) => {
      const monthTx = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === i && d.getFullYear() === selectedYear;
      });
      const income = monthTx
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const expense = monthTx
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const investment = monthTx
        .filter((t) => isInvestment(t))
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      return {
        monthIndex: i,
        monthName: new Date(0, i).toLocaleString("default", { month: "short" }),
        income,
        expense,
        investment,
        balance: income - expense - investment,
      };
    });
  }, [transactions, selectedYear]);

  // WEEK VIEW: weekly summaries for the selected month (compute investments per week)
  const weeklySummaries = useMemo(() => {
    if (range !== "week") return [];
    const weeks = getWeeksInMonth(selectedYear, selectedMonth);
    return weeks.map((w, idx) => {
      const weekTx = filteredTransactions.filter((t) => {
        const d = new Date(t.date);
        return d >= w.start && d <= w.end;
      });
      const income = weekTx
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const expense = weekTx
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const investment = weekTx
        .filter((t) => isInvestment(t))
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const startLabel = w.start.getDate();
      const endLabel = w.end.getDate();
      const monthName = w.start.toLocaleString("default", { month: "short" });
      return {
        weekIndex: idx,
        label: `${startLabel}-${endLabel} ${monthName}`,
        start: w.start,
        end: w.end,
        income,
        expense,
        investment,
        balance: income - expense - investment,
      };
    });
  }, [filteredTransactions, range, selectedMonth, selectedYear]);

  const monthsBarData = useMemo(() => {
    if (range !== "year") return [];
    return monthlySummaries.map((m) => ({
      name: m.monthName,
      Income: m.income,
      Expense: m.expense,
      Investment: m.investment,
    }));
  }, [monthlySummaries, range]);

  const weeksBarData = useMemo(() => {
    if (range !== "week") return [];
    return weeklySummaries.map((w) => ({
      name: w.label,
      Income: w.income,
      Expense: w.expense,
      Investment: w.investment,
    }));
  }, [weeklySummaries, range]);

  // bar chart data depending on range
  const barData = useMemo(() => {
    if (range === "year") return monthsBarData;
    if (range === "week") return weeksBarData;
    // month
    return [{ name: "Totals", Income: totalIncome, Expense: totalExpense }];
  }, [range, monthsBarData, weeksBarData, totalIncome, totalExpense]);

  const pieCellsPayment = paymentTypeData.map((_, i) => (
    <Cell key={`p-cell-${i}`} fill={COLORS[i % COLORS.length]} />
  ));
  const pieCellsCategory = categoryChartData.map((_, i) => (
    <Cell key={`c-cell-${i}`} fill={COLORS[(i + 2) % COLORS.length]} />
  ));

  // Helper to check if monthlySummaries has any meaningful data for the selected year
  const hasMonthlyData = useMemo(
    () => monthlySummaries.some((m) => m.income || m.expense || m.investment),
    [monthlySummaries],
  );

  const SkeletonStats = () => (
    <div className="analytics-stats-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stat-card">
          <div className="skeleton skeleton-text"></div>
          <div
            className="skeleton skeleton-stat"
            style={{ marginTop: 8 }}
          ></div>
        </div>
      ))}
    </div>
  );

  const SkeletonChart = () => (
    <div className="chart-card">
      <div
        className="skeleton skeleton-text"
        style={{ marginBottom: 16 }}
      ></div>
      <div className="skeleton skeleton-chart"></div>
    </div>
  );

  const renderScrollableLegend = (props) => (
    <div className="analytics-legend-scroll">
      {props.payload?.map((entry, i) => {
        const amount = Number(entry?.payload?.value || 0);
        return (
          <div key={i} className="analytics-legend-item">
            <div className="analytics-legend-left">
              <span
                className="analytics-legend-dot"
                style={{ backgroundColor: entry.color }}
              />
              <span className="analytics-legend-text">{entry.value}</span>
            </div>
            <span className="analytics-legend-amount">
              {symbol} {formatCurrency(convert(amount))}
            </span>
          </div>
        );
      })}
    </div>
  );

  const handleDownloadPdf = async () => {
    if (loading || exporting) return;

    setExporting(true);
    try {
      await generateAnalyticsPdf({
        range,
        selectedMonth,
        selectedYear,
        symbol,
        displayCurrency,
        convert,
        totalIncome,
        totalExpense,
        totalInvestment,
        balance,
        filteredTransactions,
      });
      showAlert("Analytics PDF downloaded", "success");
    } catch (error) {
      console.error(error);
      showAlert("Failed to generate analytics PDF", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.div
      className="analytics-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="analytics-header">
        <div className="header-download">
          <div>
            <h1>Statistics</h1>
            <p className="subtitle">Visualizing your financial flow</p>
          </div>
          <button
            className="tx-add-fab"
            onClick={handleDownloadPdf}
            disabled={loading || exporting}
            title={
              exporting
                ? "Generating PDF..."
                : "Download analytics and transactions as PDF"
            }
          >
            <i
              className={`bi ${
                exporting ? "bi-hourglass-split" : "bi-file-earmark-arrow-down"
              }`}
            ></i>
          </button>{" "}
        </div>
        {loading ? (
          <>
            <div className="skeleton skeleton-title"></div>
            <div className="filter-bar">
              <div className="slect">
                <div className="skeleton skeleton-select"></div>
                <div className="skeleton skeleton-select"></div>
              </div>
              <div className="skeleton skeleton-select"></div>
            </div>
          </>
        ) : (
          <>
            <div className="filter-bar">
              <div className="slect">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                {(range === "month" || range === "week") && (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={i}>
                        {new Date(0, i).toLocaleString("default", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div
                className="range-toggle"
                style={{
                  "--active-index": activeRangeIndex,
                  "--option-count": rangeOptions.length,
                }}
              >
                <span className="range-toggle-slider" aria-hidden="true" />
                {rangeOptions.map((r) => (
                  <button
                    key={r}
                    className={range === r ? "active" : ""}
                    onClick={() => setRange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </header>

      {/* OVERVIEW CARDS */}
      <div className="analytics-stats-grid">
        {loading ? (
          <SkeletonStats />
        ) : (
          <>
            <div className="stat-card">
              <span>Total Income</span>
              <h3 className="income-text">
                {symbol} {formatCurrency(convert(totalIncome))}
              </h3>
            </div>
            <div className="stat-card">
              <span>Total Expense</span>
              <h3 className="expense-text">
                {symbol} {formatCurrency(convert(totalExpense))}
              </h3>
            </div>
            <div className="stat-card">
              <span>Investments</span>
              <h3 className="investment-text">
                {symbol} {formatCurrency(convert(totalInvestment))}
              </h3>
            </div>
            <div className="stat-card primary-card">
              <span>Net Balance</span>
              <h3>
                {symbol} {formatCurrency(convert(balance))}
              </h3>
            </div>
          </>
        )}
      </div>
      {/* LOAN & BORROW ANALYTICS */}
      <div className="analytics-stats-grid">
        {loading ? (
          <SkeletonStats />
        ) : (
          <>
            <div className="stat-card">
              <span>Loan Principal Received</span>
              <h3>
                {symbol}{" "}
                {formatCurrency(convert(loanStats.loanPrincipalReceived))}
              </h3>
            </div>

            <div className="stat-card">
              <span>Loan Interest Earned</span>
              <h3>
                {symbol}{" "}
                {formatCurrency(convert(loanStats.loanInterestReceived))}
              </h3>
            </div>

            <div className="stat-card">
              <span>Total Borrow Repaid</span>
              <h3>
                {symbol} {formatCurrency(convert(loanStats.borrowTotalPaid))}
              </h3>
            </div>

            <div className="stat-card primary-card">
              <span>Net Loan Gain</span>
              <h3>
                {symbol}
                {formatCurrency(
                  convert(
                    loanStats.loanTotalReceived - loanStats.borrowTotalPaid,
                  ),
                )}
              </h3>
            </div>
          </>
        )}
      </div>

      {/* MAIN BAR CHART */}
      {loading ? (
        <SkeletonChart />
      ) : (
        <motion.div
          className="chart-card main-chart"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h3>Income vs Expense</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#a79e9c",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#f0f0f0" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend verticalAlign="top" align="right" height={36} />
                <Bar
                  dataKey="Income"
                  fill={barColors.income}
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                  label={{
                    position: "top",
                    fontSize: "10px",
                    fontWeight: "700",
                    fill: barColors.income,
                    fontFamily: "Inter",
                    offset: 5,
                  }}
                />
                <Bar
                  dataKey="Expense"
                  fill={barColors.expense}
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                  label={{
                    position: "top",
                    fontSize: "10px",
                    fontWeight: "700",
                    fill: barColors.expense,
                    fontFamily: "Inter",
                    offset: 5,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* PIE CHARTS SECTION */}
      <div className="pie-section">
        {loading ? (
          <>
            <SkeletonChart />
            <SkeletonChart />
          </>
        ) : (
          <>
            <div className="chart-card">
              <div className="headerselect">
                <h3>Payment Methods</h3>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  {PAYMENT_METHOD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)} Only
                    </option>
                  ))}
                </select>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={paymentTypeData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={{
                        fontSize: "10px",
                        fontWeight: "700",
                        fill: "var(--text-main)",
                        fontFamily: "Inter",
                      }}
                      labelLine={{ stroke: "#A79E9C", strokeWidth: 1 }}
                    >
                      {paymentTypeData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      layout="vertical"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={scrollableLegendStyle}
                      content={renderScrollableLegend}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <div className="headerselect">
                <h3>Category Breakdown</h3>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {CATEGORY_BREAKDOWN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)} Only
                    </option>
                  ))}
                </select>
              </div>

              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      // innerRadius={45}
                      outerRadius={65}
                      // outerRadius={80}
                      dataKey="value"
                      label={{
                        fontSize: "10px",
                        fontWeight: "700",
                        fill: "var(--text-main)",
                        fontFamily: "Inter",
                      }}
                      labelLine={{ stroke: "#A79E9C", strokeWidth: 1 }}
                      // label={({ name }) => name}
                    >
                      {categoryChartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      layout="vertical"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={scrollableLegendStyle}
                      content={renderScrollableLegend}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="chart-card">
              <div className="headerselect">
                <h3>Investment Breakdown</h3>
                <select
                  value={investPaymentFilter}
                  onChange={(e) => setInvestPaymentFilter(e.target.value)}
                >
                  <option value="all">All Modes</option>
                  {investPaymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {formatLabel(mode)} Only
                    </option>
                  ))}
                </select>
              </div>

              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={investmentCategoryData}
                      outerRadius={65}
                      dataKey="value"
                      label={{
                        fontSize: "10px",
                        fontWeight: "700",
                        fill: "var(--text-main)",
                        fontFamily: "Inter",
                      }}
                      labelLine={{ stroke: "#A79E9C", strokeWidth: 1 }}
                    >
                      {investmentCategoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      layout="vertical"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={scrollableLegendStyle}
                      content={renderScrollableLegend}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="chart-card">
              <div className="headerselect">
                <h3>Loan Analysis</h3>
                <select
                  value={loanViewMode}
                  onChange={(e) => setLoanViewMode(e.target.value)}
                >
                  <option value="principal">Principal Flow</option>
                  <option value="interest">Profit & Loss (Interest)</option>
                </select>
              </div>

              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={loanPieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={{
                        fontSize: "10px",
                        fontWeight: "700",
                        fill: "var(--text-main)",
                        fontFamily: "Inter",
                      }}
                      labelLine={{ stroke: "#A79E9C", strokeWidth: 1 }}
                    >
                      {loanPieData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            loanViewMode === "interest" &&
                            entry.name === "Interest Loss"
                              ? "#F87171"
                              : COLORS[i % COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      layout="vertical"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={scrollableLegendStyle}
                      content={renderScrollableLegend}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Dynamic Summary Text */}
              {loanViewMode === "interest" && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "10px",
                    fontWeight: "800",
                  }}
                >
                  Net{" "}
                  {loanStats.loanInterestReceived >=
                  loanStats.borrowInterestPaid
                    ? "Profit"
                    : "Loss"}
                  :
                  <span
                    style={{
                      color:
                        loanStats.loanInterestReceived >=
                        loanStats.borrowInterestPaid
                          ? "#10B981"
                          : "#EF4444",
                    }}
                  >
                    {symbol}
                    {formatCurrency(
                      convert(
                        Math.abs(
                          loanStats.loanInterestReceived -
                            loanStats.borrowInterestPaid,
                        ),
                      ),
                    )}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton skeleton-text"></div>
              <div
                className="skeleton skeleton-stat"
                style={{ marginTop: 8 }}
              ></div>
            </div>
          ))}
        </div>
      )}

      {/* MONTHLY CARDS: render only when range === "year" AND we have monthly data */}
      {range === "year" && hasMonthlyData && (
        <>
          <h3 style={{ marginTop: 18, color: "var(--text-main)" }}>
            Monthly Summaries ({selectedYear})
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {monthlySummaries.map((m, i) => (
              <div key={i} className="stat-card" style={{ padding: 10 }}>
                <strong>{m.monthName}</strong>
                <div>
                  Income: {symbol}
                  {formatCurrency(convert(m.income))}
                </div>
                <div>
                  Expense: {symbol}
                  {formatCurrency(convert(m.expense))}
                </div>
                <div>
                  Investment: {symbol}
                  {formatCurrency(convert(m.investment))}
                </div>
                <div>
                  Balance: {symbol}
                  {formatCurrency(convert(m.balance))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* WEEKLY CARDS: render only when range === "week" */}
      {range === "week" && weeklySummaries.length > 0 && (
        <>
          <h3 style={{ marginTop: 18, color: "var(--text-main)" }}>
            Weekly Summaries for{" "}
            {new Date(0, selectedMonth).toLocaleString("default", {
              month: "long",
            })}{" "}
            {selectedYear}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {weeklySummaries.map((w, i) => (
              <div key={i} className="stat-card" style={{ padding: 10 }}>
                <strong>{w.label}</strong>
                <div>
                  Income: {symbol}
                  {formatCurrency(convert(w.income))}
                </div>
                <div>
                  Expense: {symbol}
                  {formatCurrency(convert(w.expense))}
                </div>
                <div>
                  Investment: {symbol}
                  {formatCurrency(convert(w.investment))}
                </div>
                <div>
                  Balance: {symbol}
                  {formatCurrency(convert(w.balance))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Analytics;
