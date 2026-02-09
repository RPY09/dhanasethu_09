import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import appIcon from "../assets/dhanasethuIconWithName.png";

const formatCurrency = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const user = JSON.parse(localStorage.getItem("user") || "{}");
console.log(user);

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
    watermarkDataUrl = await createWatermarkDataUrl(logoDataUrl, 0.07);
  } catch {
    logoDataUrl = "";
    watermarkDataUrl = "";
  }

  drawWatermark(doc, watermarkDataUrl, pageWidth, pageHeight);

  // --- 1. DARK NAVY HEADER ---
  doc.setFillColor(16, 35, 42); // Navy Blue
  doc.rect(0, 0, pageWidth, 70, "F");

  // Logo Placeholder (Using the text style from image)
  const logoLink = "https://dhanasethu09.vercel.app/"; // put your URL

  const imageheadY = 8;
  if (logoDataUrl) {
    doc.addImage(
      logoDataUrl,
      "PNG",
      pageWidth / 90,
      imageheadY,
      110,
      70,
      undefined,
      "FAST",
    );
  }
  doc.link(pageWidth / 90, imageheadY, 110, 70, { url: logoLink });
  // doc.setTextColor(234, 179, 8); // Golden color
  // doc.setFont("times", "bold");
  // doc.setFontSize(26);
  // doc.text("DhanaSethu", pageWidth / 2, 60, { align: "center" });

  doc.setTextColor(255, 255, 255);
  // doc.setFont("helvetica", "normal");
  // doc.setFontSize(9);
  // doc.text("Your Financial Bridge", pageWidth / 2, 75, { align: "center" });

  doc.setFont("Playfair Display", "bold");
  doc.setFontSize(18);
  const headingY = 30;
  const headingX = pageWidth / 2.2;
  const headingLeft = "Dhana";
  const headingMiddle = "Sethu";
  const headingRight = " Analytics";
  const leftWidth = doc.getTextWidth(headingLeft);
  const middleWidth = doc.getTextWidth(headingMiddle);
  const rightWidth = doc.getTextWidth(headingRight);
  const headingStartX = headingX - (leftWidth + middleWidth + rightWidth) / 2;

  doc.setTextColor(230, 237, 243); // #e6edf3
  doc.text(headingLeft, headingStartX, headingY);
  doc.setTextColor(210, 166, 121); // #d2a679
  doc.text(headingMiddle, headingStartX + leftWidth, headingY);
  doc.setTextColor(255, 255, 255); // white
  doc.text(headingRight, headingStartX + leftWidth + middleWidth, headingY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`REPORT PERIOD: ${periodLabel.toUpperCase()}`, pageWidth / 2.2, 50, {
    align: "center",
  });
  doc.text(
    `GENERATED ON: ${new Date().toLocaleDateString("en-IN").toUpperCase()}`,
    pageWidth / 2.2,
    60,
    { align: "center" },
  );
  doc.setFontSize(8);
  doc.text(`Name: ${user.name}`, pageWidth / 1.1, 40, {
    align: "center",
  });
  doc.setFontSize(8);
  doc.text(`E-Mail: ${user.email}`, pageWidth / 1.18, 55, {
    align: "center",
  });

  // --- 2. SUMMARY CARDS (Cream Background) ---
  let cursorY = 100;
  const cardWidth = (contentWidth - 30) / 4;
  const summaryData = [
    { label: "Total Money Paid", val: totalIncome, color: [34, 197, 94] },
    { label: "Total Money Received", val: totalExpense, color: [239, 68, 68] },
    { label: "Invest", val: totalInvestment, color: [59, 130, 246] },
    { label: "Balance", val: balance, color: [16, 35, 42] },
  ];

  summaryData.forEach((item, i) => {
    const x = margin + i * (cardWidth + 8);
    // Card Box
    doc.setFillColor(248, 245, 242); // Light Cream
    doc.setDrawColor(220, 210, 200);
    doc.roundedRect(x, cursorY, cardWidth, 60, 10, 10, "FD");

    // Label
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    doc.text(item.label, x + cardWidth / 2, cursorY + 20, { align: "center" });

    // Value
    doc.setFontSize(13);
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(
      `${pdfSymbol} ${formatCurrency(convert(item.val))}`,
      x + cardWidth / 2,
      cursorY + 45,
      { align: "center" },
    );
  });

  cursorY += 100;

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
    doc.setDrawColor(220, 210, 200);
    doc.line(
      margin + 10,
      cursorY + 26,
      margin + contentWidth - 10,
      cursorY + 26,
    );
    doc.setFontSize(15);
    doc.setTextColor(16, 35, 42);
    doc.text("Recent Transactions", margin, cursorY);

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
      bodyStyles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const type = data.row.cells[1].raw;
          if (type === "INCOME") data.cell.styles.textColor = [34, 197, 94];
          if (type === "EXPENSE") data.cell.styles.textColor = [239, 68, 68];
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
