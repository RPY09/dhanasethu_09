import { useEffect, useMemo, useState } from "react";
import { getTransactions } from "../api/transaction.api";
import { motion } from "framer-motion";
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

// Uniform Color Palette from your image
const COLORS = [
  "#10232A",
  "#B58863",
  "#3D4D55",
  "#A79E9C",
  "#D3C3B9",
  "#1B1B1B",
];

const formatCurrency = (n) =>
  Number(n || 0).toLocaleString("en-IE", { maximumFractionDigits: 0 });

const getWeeksInMonth = (year, month) => {
  const weeks = [];
  let start = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  while (start <= monthEnd) {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    if (end > monthEnd) end.setTime(monthEnd.getTime());
    weeks.push({ start: new Date(start), end: new Date(end) });
    start = new Date(end);
    start.setDate(end.getDate() + 1);
  }
  return weeks;
};

const Analytics = () => {
  const [transactions, setTransactions] = useState([]);
  const [range, setRange] = useState("month"); // "week" | "month" | "year"
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await getTransactions();
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
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

  const totalIncome = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    [filteredTransactions]
  );

  const totalExpense = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    [filteredTransactions]
  );

  const totalInvestment = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "investment")
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    [filteredTransactions]
  );

  const balance = totalIncome - totalExpense - totalInvestment;

  // Payment type (Cash vs Online) — only expenses
  const paymentTypeData = useMemo(() => {
    let cash = 0;
    let online = 0;
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const mode = (t.paymentMode || "").toLowerCase();
        if (mode === "cash") cash += Number(t.amount || 0);
        else online += Number(t.amount || 0);
      });
    return [
      { name: "Cash", value: cash },
      { name: "Online", value: online },
    ];
  }, [filteredTransactions]);

  const cashTotal = paymentTypeData.find((d) => d.name === "Cash")?.value || 0;
  const onlineTotal =
    paymentTypeData.find((d) => d.name === "Online")?.value || 0;

  // Expense by category (for second pie)
  const categoryChartData = useMemo(() => {
    const expenseByCategory = {};
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = t.category || "Uncategorized";
        expenseByCategory[cat] =
          (expenseByCategory[cat] || 0) + Number(t.amount || 0);
      });
    return Object.keys(expenseByCategory).map((cat) => ({
      name: cat,
      value: expenseByCategory[cat],
    }));
  }, [filteredTransactions]);

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
        .filter((t) => t.type === "investment")
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
        .filter((t) => t.type === "investment")
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
    }));
  }, [monthlySummaries, range]);

  const weeksBarData = useMemo(() => {
    if (range !== "week") return [];
    return weeklySummaries.map((w) => ({
      name: w.label,
      Income: w.income,
      Expense: w.expense,
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
    [monthlySummaries]
  );

  return (
    <motion.div
      className="analytics-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="analytics-header">
        <div>
          <h1>Analytics</h1>
          <p className="subtitle">Visualizing your financial flow</p>
        </div>

        <div className="filter-bar">
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
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          )}

          <div className="range-toggle">
            {["week", "month", "year"].map((r) => (
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
      </header>

      {/* OVERVIEW CARDS */}
      <div className="analytics-stats-grid">
        <div className="stat-card">
          <span>Total Income</span>
          <h3 className="income-text">₹{formatCurrency(totalIncome)}</h3>
        </div>
        <div className="stat-card">
          <span>Total Expense</span>
          <h3 className="expense-text">₹{formatCurrency(totalExpense)}</h3>
        </div>
        <div className="stat-card">
          <span>Investments</span>
          <h3 className="investment-text">
            ₹{formatCurrency(totalInvestment)}
          </h3>
        </div>
        <div className="stat-card primary-card">
          <span>Net Balance</span>
          <h3>₹{formatCurrency(balance)}</h3>
        </div>
      </div>

      {/* MAIN BAR CHART */}
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
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
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
                fill="#B58863"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
              <Bar
                dataKey="Expense"
                fill="#10232A"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* PIE CHARTS SECTION */}
      <div className="pie-section">
        <div className="chart-card">
          <h3>Payment Methods</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentTypeData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentTypeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Category Breakdown</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryChartData} outerRadius={80} dataKey="value">
                  {categoryChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MONTHLY CARDS: render only when range === "year" AND we have monthly data */}
      {range === "year" && hasMonthlyData && (
        <>
          <h3 style={{ marginTop: 18 }}>Monthly Summaries ({selectedYear})</h3>
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
                <div>Income: ₹{formatCurrency(m.income)}</div>
                <div>Expense: ₹{formatCurrency(m.expense)}</div>
                <div>Investment: ₹{formatCurrency(m.investment)}</div>
                <div>Balance: ₹{formatCurrency(m.balance)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* WEEKLY CARDS: render only when range === "week" */}
      {range === "week" && weeklySummaries.length > 0 && (
        <>
          <h3 style={{ marginTop: 18 }}>
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
                <div>Income: ₹{formatCurrency(w.income)}</div>
                <div>Expense: ₹{formatCurrency(w.expense)}</div>
                <div>Investment: ₹{formatCurrency(w.investment)}</div>
                <div>Balance: ₹{formatCurrency(w.balance)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Analytics;
