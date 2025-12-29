import { useEffect, useMemo, useState } from "react";
import { getTransactions } from "../api/transaction.api";
import { motion } from "framer-motion";
import { useAlert } from "../components/Alert/AlertContext";

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

const formatCurrency = (n) =>
  Number(n || 0).toLocaleString("en-IE", { maximumFractionDigits: 0 });

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

const Analytics = () => {
  const [transactions, setTransactions] = useState([]);
  const [range, setRange] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [paymentFilter, setPaymentFilter] = useState("income");
  const [categoryFilter, setCategoryFilter] = useState("expense");
  const [investPaymentFilter, setInvestPaymentFilter] = useState("all");
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
        .filter((t) => isInvestment(t))
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    [filteredTransactions]
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
    let cash = 0;
    let online = 0;

    filteredTransactions
      .filter((t) => {
        if (paymentFilter === "all") return t.type !== "invest";
        return t.type === paymentFilter;
      })
      .forEach((t) => {
        const mode = (t.paymentMode || "").toLowerCase();
        if (mode === "cash") cash += Number(t.amount || 0);
        else online += Number(t.amount || 0);
      });

    return [
      { name: "Cash", value: cash },
      { name: "Online", value: online },
    ];
  }, [filteredTransactions, paymentFilter]);

  const cashTotal = paymentTypeData.find((d) => d.name === "Cash")?.value || 0;
  const onlineTotal =
    paymentTypeData.find((d) => d.name === "Online")?.value || 0;

  // Expense by category (for second pie)
  const categoryChartData = useMemo(() => {
    const dataByCategory = {};
    filteredTransactions
      .filter((t) => {
        // Filter by the selected type (income or expense)
        const typeMatch = t.type === categoryFilter;
        // Exclude internal loan/borrow transfers from general breakdown
        const notLoan = !["loan", "borrow"].includes(
          (t.paymentMode || "").toLowerCase()
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
          (t.paymentMode || "").toLowerCase() === investPaymentFilter;

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
      {/* LOAN & BORROW ANALYTICS */}
      <div className="analytics-stats-grid">
        <div className="stat-card">
          <span>Loan Principal Received</span>
          <h3>₹{formatCurrency(loanStats.loanPrincipalReceived)}</h3>
        </div>

        <div className="stat-card">
          <span>Loan Interest Earned</span>
          <h3>₹{formatCurrency(loanStats.loanInterestReceived)}</h3>
        </div>

        <div className="stat-card">
          <span>Total Borrow Repaid</span>
          <h3>₹{formatCurrency(loanStats.borrowTotalPaid)}</h3>
        </div>

        <div className="stat-card primary-card">
          <span>Net Loan Gain</span>
          <h3>
            ₹
            {formatCurrency(
              loanStats.loanTotalReceived - loanStats.borrowTotalPaid
            )}
          </h3>
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
                fill="#B58863"
                radius={[4, 4, 0, 0]}
                barSize={30}
                label={{
                  position: "top",
                  fontSize: "10px",
                  fontWeight: "700",
                  fill: "#B58863",
                  fontFamily: "Inter",
                  offset: 5,
                }}
              />
              <Bar
                dataKey="Expense"
                fill="#10232A"
                radius={[4, 4, 0, 0]}
                barSize={30}
                label={{
                  position: "top",
                  fontSize: "10px",
                  fontWeight: "700",
                  fill: "#10232A",
                  fontFamily: "Inter",
                  offset: 5,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* PIE CHARTS SECTION */}
      <div className="pie-section">
        <div className="chart-card">
          <div className="headerselect">
            <h3>Payment Methods</h3>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              {/* <option value="all">All Transactions</option> */}
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
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
                    fill: "#10232A",
                    fontFamily: "Inter",
                  }}
                  labelLine={{ stroke: "#A79E9C", strokeWidth: 1 }}
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
          <div
            className="headerselect"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h3 style={{ margin: 0 }}>Category Breakdown</h3>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "12px" }}
            >
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
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
                    fill: "#10232A",
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
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="chart-card">
          <div
            className="headerselect"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h3 style={{ margin: 0 }}>Investment Breakdown</h3>
            <select
              value={investPaymentFilter}
              onChange={(e) => setInvestPaymentFilter(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "12px" }}
            >
              <option value="all">All Modes</option>
              <option value="online">Online</option>
              <option value="cash">Cash</option>
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
                    fill: "#10232A", // Deep Teal from your palette
                    fontFamily: "Inter",
                  }}
                  labelLine={{ stroke: "#A79E9C", strokeWidth: 1 }}
                >
                  {investmentCategoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="chart-card">
          <div
            className="headerselect"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h3 style={{ margin: 0 }}>Loan Analysis</h3>
            <select
              value={loanViewMode}
              onChange={(e) => setLoanViewMode(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "12px" }}
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
                    fill: "#10232A",
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
                <Legend />
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
              {loanStats.loanInterestReceived >= loanStats.borrowInterestPaid
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
                ₹
                {formatCurrency(
                  Math.abs(
                    loanStats.loanInterestReceived -
                      loanStats.borrowInterestPaid
                  )
                )}
              </span>
            </div>
          )}
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
