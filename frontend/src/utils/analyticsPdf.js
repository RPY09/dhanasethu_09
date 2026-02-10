import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import appIcon from "../assets/dhanasethuIconWithName.png";

const formatCurrency = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const user = JSON.parse(localStorage.getItem("user") || "{}");
// console.log(user);

const COLORS = {
  PRIMARY: "#10232A", // Dark Navy
  ACCENT: "#B58863", // Tan/Gold
  TEXT_MAIN: "#10232A", // Dark Navy
  TEXT_MUTED: "#A79E9C", // Greyish Muted
  BG_SOFT: "#F4F1EE", // Light Cream
  INCOME: "#22C55E", // Green
  EXPENSE: "#EF4444", // Red
  WHITE: "#FFFFFF",
};

const normalizeBrokenCurrencySymbol = (value = "") => {
  const map = {
    "â‚¹": "₹",
    "â‚¬": "€",
    "Â£": "£",
    "Â¥": "¥",
    "â‚©": "₩",
    "â‚ª": "₪",
    "â‚º": "₺",
    "â‚¨": "₨",
    "â‚±": "₱",
    "â‚«": "₫",
    "â‚¦": "₦",
    "â‚µ": "₵",
    "â‚½": "₽",
    "â‚´": "₴",
    "â‚¸": "₸",
    "â‚­": "₭",
    "â‚²": "₲",
  };
  return map[value] || value;
};

const PDF_SAFE_CURRENCY_TOKENS = {
  INR: "Rs",
  USD: "$",
  EUR: "EUR",
  GBP: "GBP",
  JPY: "JPY",
  CNY: "CNY",
  KRW: "KRW",
  RUB: "RUB",
  TRY: "TRY",
  ILS: "ILS",
  UAH: "UAH",
  THB: "THB",
  VND: "VND",
  PHP: "PHP",
  NGN: "NGN",
  AED: "AED",
  SAR: "SAR",
  QAR: "QAR",
  KWD: "KWD",
  BHD: "BHD",
  OMR: "OMR",
};

const toPdfSafeCurrencyToken = (displayCurrency, resolvedSymbol) => {
  const normalized = normalizeBrokenCurrencySymbol(resolvedSymbol || "");
  const isAscii = /^[\x20-\x7E]+$/.test(normalized);
  if (isAscii && normalized) return normalized;
  if (displayCurrency && PDF_SAFE_CURRENCY_TOKENS[displayCurrency]) {
    return PDF_SAFE_CURRENCY_TOKENS[displayCurrency];
  }
  if (displayCurrency) return displayCurrency;
  return normalized || "CUR";
};

const resolvePdfSymbol = (displayCurrency, fallbackSymbol) => {
  try {
    if (displayCurrency) {
      const parts = new Intl.NumberFormat("en", {
        style: "currency",
        currency: displayCurrency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).formatToParts(0);
      const symbolPart = parts.find((p) => p.type === "currency")?.value;
      if (symbolPart) {
        return toPdfSafeCurrencyToken(displayCurrency, symbolPart);
      }
    }
  } catch {
    // fall back to provided symbol
  }
  return toPdfSafeCurrencyToken(displayCurrency, fallbackSymbol || "");
};

const getPeriodLabel = (range, selectedMonth, selectedYear) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (range === "year") return `${selectedYear}`;
  return `${months[selectedMonth]} ${selectedYear}${range === "week" ? " (Weekly)" : ""}`;
};

const imageUrlToDataUrl = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Unable to load logo image"));
    img.src = src;
  });

const createWatermarkDataUrl = (baseDataUrl, alpha = 0.07) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () =>
      reject(new Error("Unable to build watermark from logo image"));
    img.src = baseDataUrl;
  });

const drawWatermark = (doc, watermarkDataUrl, pageWidth, pageHeight) => {
  if (!watermarkDataUrl) return;
  const size = Math.min(pageWidth, pageHeight) * 0.55;
  const x = (pageWidth - size) / 2;
  const y = (pageHeight - size) / 2;
  doc.addImage(watermarkDataUrl, "PNG", x, y, size, size, undefined, "FAST");
};

export const generateAnalyticsPdf = async ({
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
}) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const periodLabel = getPeriodLabel(range, selectedMonth, selectedYear);
  const pdfSymbol = resolvePdfSymbol(displayCurrency, symbol);
  let logoDataUrl = "";
  let watermarkDataUrl = "";

  try {
    logoDataUrl = await imageUrlToDataUrl(appIcon);
    watermarkDataUrl = await createWatermarkDataUrl(logoDataUrl, 0.09);
  } catch {
    logoDataUrl = "";
    watermarkDataUrl = "";
  }

  drawWatermark(doc, watermarkDataUrl, pageWidth, pageHeight);

  // --- 1. HEADER  ---
  doc.setFillColor(16, 35, 42); // #10232A
  doc.rect(0, 0, pageWidth, 75, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", margin, 12, 100, 70, undefined, "FAST");
  }

  // Header Titles
  doc.setFont("times", "bold"); // Closest to Playfair Display in standard jsPDF
  doc.setFontSize(20);

  const headingX = pageWidth / 2;
  doc.setTextColor(230, 237, 243); // Dhana
  doc.text("Dhana", headingX - 45, 35);

  doc.setTextColor(181, 136, 99); // #B58863 - Sethu (Accent)
  doc.text("Sethu", headingX + 13, 35);

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255); // Statements
  doc.text(" Statements", headingX - 35, 55);

  // Meta Info (Right Side)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(167, 158, 156); // #A79E9C (Muted)
  doc.text(
    `USER: ${user.name?.toUpperCase() || "GUEST"}`,
    pageWidth - margin,
    30,
    { align: "right" },
  );
  doc.text(`PERIOD: ${periodLabel.toUpperCase()}`, pageWidth - margin, 42, {
    align: "right",
  });
  doc.text(
    `DATE: ${new Date().toLocaleDateString("en-IN")}`,
    pageWidth - margin,
    54,
    { align: "right" },
  );

  // --- 2. SUMMARY BACKDROP ---
  // doc.setFillColor(24, 41, 48);
  // doc.rect(0, 75, pageWidth, 4, "F");
  // doc.setFillColor(48, 66, 72);
  // doc.rect(0, 79, pageWidth, 6, "F");
  // doc.setFillColor(96, 102, 100);
  // doc.rect(0, 85, pageWidth, 8, "F");
  // doc.setFillColor(181, 136, 99); // accent section
  // doc.rect(0, 93, pageWidth, 243, "F");
  let cursorY = 110;
  const cardWidth = (contentWidth - 24) / 4;
  const summaryData = [
    { label: "TOTAL RECEIVED", val: totalIncome, color: COLORS.INCOME },
    { label: "TOTAL PAID", val: totalExpense, color: COLORS.EXPENSE },
    { label: "INVESTMENT", val: totalInvestment, color: COLORS.ACCENT },
    { label: "NET BALANCE", val: COLORS.PRIMARY, isBalance: true },
  ];

  summaryData.forEach((item, i) => {
    const x = margin + i * (cardWidth + 8);

    // Card Box (lighter)
    doc.setFillColor(252, 248, 242);
    doc.setDrawColor(228, 214, 196);
    doc.roundedRect(x, cursorY, cardWidth, 65, 8, 8, "FD");

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(167, 158, 156); // Muted
    doc.text(item.label, x + cardWidth / 2, cursorY + 22, { align: "center" });

    // Value
    doc.setFontSize(11);
    const valColor = item.isBalance ? [16, 35, 42] : hexToRgb(item.color);
    doc.setTextColor(valColor[0], valColor[1], valColor[2]);

    const displayVal = item.isBalance ? balance : item.val;
    doc.text(
      `${pdfSymbol} ${formatCurrency(convert(displayVal))}`,
      x + cardWidth / 2,
      cursorY + 45,
      { align: "center" },
    );
  });

  cursorY += 95;

  // --- 2.1 ACCOUNT-WISE PAYMENT CARD ---
  const accountTotals = filteredTransactions.reduce(
    (acc, t) => {
      const amount = Number(t.amount) || 0;
      const type = (t.type || "").toLowerCase();
      const mode = (t.paymentMode || "").toLowerCase();
      const key = mode === "cash" ? "cash" : "online";

      if (type === "expense") {
        acc[key].made += amount;
        acc[key].madeCount += 1;
      }
      if (type === "income") {
        acc[key].received += amount;
        acc[key].receivedCount += 1;
      }

      return acc;
    },
    {
      cash: { made: 0, received: 0, madeCount: 0, receivedCount: 0 },
      online: { made: 0, received: 0, madeCount: 0, receivedCount: 0 },
    },
  );

  const accountCardHeight = 128;
  if (cursorY + accountCardHeight > 760) {
    doc.addPage();
    drawWatermark(doc, watermarkDataUrl, pageWidth, pageHeight);
    cursorY = 50;
  }

  doc.setFillColor(248, 245, 242);
  doc.setDrawColor(220, 210, 200);
  doc.roundedRect(
    margin,
    cursorY,
    contentWidth,
    accountCardHeight,
    10,
    10,
    "FD",
  );

  doc.setFillColor(11, 20, 24); // #0b1418
  doc.roundedRect(margin, cursorY, contentWidth, 28, 10, 10, "F");
  doc.rect(margin, cursorY + 18, contentWidth, 10, "F");

  const accountColX = margin + 14;
  const madeColX = margin + contentWidth * 0.56;
  const receivedColX = margin + contentWidth * 0.8;
  const headerY = cursorY + 18;
  const row1Y = cursorY + 52;
  const row1CountY = row1Y + 12;
  const row2Y = cursorY + 88;
  const row2CountY = row2Y + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Accounts", accountColX, headerY);
  doc.text("Payment Made", madeColX, headerY, { align: "center" });
  doc.text("Payment Received", receivedColX, headerY, { align: "center" });

  doc.setDrawColor(220, 210, 200);
  doc.line(margin + 10, cursorY + 70, margin + contentWidth - 10, cursorY + 70);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text("Cash", accountColX, row1Y);
  doc.text("Online", accountColX, row2Y);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(239, 68, 68);
  doc.text(
    `${pdfSymbol} ${formatCurrency(convert(accountTotals.cash.made))}`,
    madeColX,
    row1Y,
    { align: "center" },
  );
  doc.text(
    `${pdfSymbol} ${formatCurrency(convert(accountTotals.online.made))}`,
    madeColX,
    row2Y,
    { align: "center" },
  );

  doc.setTextColor(34, 197, 94);
  doc.text(
    `${pdfSymbol} ${formatCurrency(convert(accountTotals.cash.received))}`,
    receivedColX,
    row1Y,
    { align: "center" },
  );
  doc.text(
    `${pdfSymbol} ${formatCurrency(convert(accountTotals.online.received))}`,
    receivedColX,
    row2Y,
    { align: "center" },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(`(${accountTotals.cash.madeCount} payments)`, madeColX, row1CountY, {
    align: "center",
  });
  doc.text(
    `(${accountTotals.cash.receivedCount} payments)`,
    receivedColX,
    row1CountY,
    { align: "center" },
  );
  doc.text(
    `(${accountTotals.online.madeCount} payments)`,
    madeColX,
    row2CountY,
    {
      align: "center",
    },
  );
  doc.text(
    `(${accountTotals.online.receivedCount} payments)`,
    receivedColX,
    row2CountY,
    { align: "center" },
  );

  cursorY += accountCardHeight + 18;

  // --- 4. TRANSACTIONS TABLE (Themed) ---
  const rows = filteredTransactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((t) => [
      new Date(t.date).toLocaleDateString("en-IN"),
      t.type.toUpperCase(),
      t.category || "General",
      t.paymentMode?.toUpperCase() || "CASH",
      t.note || "-",
      `${pdfSymbol} ${formatCurrency(convert(t.amount))}`,
    ]);

  if (rows.length > 0) {
    if (cursorY > 600) {
      doc.addPage();
      drawWatermark(doc, watermarkDataUrl, pageWidth, pageHeight);
      cursorY = 50;
    }

    // Add breathing space + thick two-tone divider before transactions table
    const dividerY = cursorY + 12;
    doc.setLineWidth(4);
    doc.setDrawColor(16, 35, 42); // primary
    doc.line(margin, dividerY, margin + contentWidth, dividerY);
    doc.setDrawColor(181, 136, 99); // accent
    doc.line(margin, dividerY + 5, margin + contentWidth, dividerY + 5);
    doc.setLineWidth(1);
    cursorY = dividerY + 28;

    doc.setFontSize(15);
    doc.setTextColor(16, 35, 42);
    doc.text(`Transactions (${periodLabel.toUpperCase()})`, margin, cursorY);

    autoTable(doc, {
      startY: cursorY + 10,
      margin: { left: margin, right: margin },
      head: [["Date", "Type", "Category", "Mode", "Notes", "Amount"]],
      body: rows,
      theme: "striped",
      headStyles: {
        fillColor: [16, 35, 42],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [244, 241, 238],
      },
      bodyStyles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const type = data.row.cells[1].raw;
          if (type === "INCOME") data.cell.styles.textColor = [34, 197, 94];
          if (type === "EXPENSE") data.cell.styles.textColor = [239, 68, 68];
          if (type === "INVEST") data.cell.styles.textColor = [181, 136, 99];

          data.cell.styles.fontStyle = "bold";
        }
      },
      willDrawPage: () => {
        drawWatermark(doc, watermarkDataUrl, pageWidth, pageHeight);
      },
    });
  }
  const fileName = `DhanaSethu_Statement_${periodLabel.replace(" ", "_")}.pdf`;
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");

  // Keep save commented while using preview mode.
  doc.save(fileName);
  // return { fileName, url };
};
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}
