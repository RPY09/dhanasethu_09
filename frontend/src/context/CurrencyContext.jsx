import { createContext, useContext, useEffect, useState } from "react";

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // BASE (identity – from profile / DB)
  const [baseCurrency, setBaseCurrency] = useState(user.baseCurrency || "INR");
  const [baseCountry, setBaseCountry] = useState(user.country || "IN");

  // DISPLAY (UI only)
  const [displayCurrency, setDisplayCurrency] = useState(
    user.baseCurrency || "INR"
  );
  const CURRENCY_SYMBOLS = {
    // Major
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    KRW: "₩",
    AUD: "A$",
    CAD: "C$",
    CHF: "CHF",
    HKD: "HK$",
    SGD: "S$",
    NZD: "NZ$",

    // Middle East
    AED: "د.إ",
    SAR: "﷼",
    QAR: "﷼",
    KWD: "د.ك",
    BHD: "د.ب",
    OMR: "﷼",
    ILS: "₪",
    TRY: "₺",
    IRR: "﷼",
    IQD: "ع.د",

    // South Asia
    PKR: "₨",
    LKR: "Rs",
    BDT: "৳",
    NPR: "रू",
    AFN: "؋",

    // Southeast Asia
    THB: "฿",
    IDR: "Rp",
    MYR: "RM",
    PHP: "₱",
    VND: "₫",
    MMK: "K",
    KHR: "៛",
    LAK: "₭",

    // East Asia
    TWD: "NT$",
    MOP: "MOP$",
    HKD: "HK$",

    // Africa
    ZAR: "R",
    NGN: "₦",
    KES: "KSh",
    GHS: "₵",
    EGP: "£",
    MAD: "د.م.",
    TND: "د.ت",
    DZD: "د.ج",
    ETB: "Br",
    UGX: "USh",
    TZS: "TSh",
    RWF: "FRw",
    BIF: "FBu",
    XOF: "CFA",
    XAF: "CFA",
    SCR: "₨",
    MUR: "₨",

    // Europe (non-EUR)
    NOK: "kr",
    SEK: "kr",
    DKK: "kr",
    PLN: "zł",
    CZK: "Kč",
    HUF: "Ft",
    RON: "lei",
    BGN: "лв",
    HRK: "kn",
    ISK: "kr",
    UAH: "₴",
    RUB: "₽",
    ALL: "L",
    BAM: "KM",
    MKD: "ден",

    // Americas
    BRL: "R$",
    MXN: "$",
    ARS: "$",
    CLP: "$",
    COP: "$",
    PEN: "S/",
    UYU: "$U",
    BOB: "Bs.",
    PYG: "₲",
    DOP: "RD$",
    JMD: "J$",
    TTD: "TT$",

    // Oceania
    FJD: "FJ$",
    PGK: "K",
    SBD: "SI$",
    TOP: "T$",
    WST: "WS$",

    // Central Asia
    KZT: "₸",
    UZS: "soʻm",
    TMT: "T",
    KGS: "лв",
    TJS: "SM",

    // Fallback / special
    XCD: "$",
    XPF: "₣",
    GIP: "£",
    SHP: "£",
  };
  const BASE_CURRENCY_SYMBOLS = {
    // Major
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    KRW: "₩",
    AUD: "A$",
    CAD: "C$",
    CHF: "CHF",
    HKD: "HK$",
    SGD: "S$",
    NZD: "NZ$",

    // Middle East
    AED: "د.إ",
    SAR: "﷼",
    QAR: "﷼",
    KWD: "د.ك",
    BHD: "د.ب",
    OMR: "﷼",
    ILS: "₪",
    TRY: "₺",
    IRR: "﷼",
    IQD: "ع.د",

    // South Asia
    PKR: "₨",
    LKR: "Rs",
    BDT: "৳",
    NPR: "रू",
    AFN: "؋",

    // Southeast Asia
    THB: "฿",
    IDR: "Rp",
    MYR: "RM",
    PHP: "₱",
    VND: "₫",
    MMK: "K",
    KHR: "៛",
    LAK: "₭",

    // East Asia
    TWD: "NT$",
    MOP: "MOP$",
    HKD: "HK$",

    // Africa
    ZAR: "R",
    NGN: "₦",
    KES: "KSh",
    GHS: "₵",
    EGP: "£",
    MAD: "د.م.",
    TND: "د.ت",
    DZD: "د.ج",
    ETB: "Br",
    UGX: "USh",
    TZS: "TSh",
    RWF: "FRw",
    BIF: "FBu",
    XOF: "CFA",
    XAF: "CFA",
    SCR: "₨",
    MUR: "₨",

    // Europe (non-EUR)
    NOK: "kr",
    SEK: "kr",
    DKK: "kr",
    PLN: "zł",
    CZK: "Kč",
    HUF: "Ft",
    RON: "lei",
    BGN: "лв",
    HRK: "kn",
    ISK: "kr",
    UAH: "₴",
    RUB: "₽",
    ALL: "L",
    BAM: "KM",
    MKD: "ден",

    // Americas
    BRL: "R$",
    MXN: "$",
    ARS: "$",
    CLP: "$",
    COP: "$",
    PEN: "S/",
    UYU: "$U",
    BOB: "Bs.",
    PYG: "₲",
    DOP: "RD$",
    JMD: "J$",
    TTD: "TT$",

    // Oceania
    FJD: "FJ$",
    PGK: "K",
    SBD: "SI$",
    TOP: "T$",
    WST: "WS$",

    // Central Asia
    KZT: "₸",
    UZS: "soʻm",
    TMT: "T",
    KGS: "лв",
    TJS: "SM",

    // Fallback / special
    XCD: "$",
    XPF: "₣",
    GIP: "£",
    SHP: "£",
  };

  const baseSymbol = BASE_CURRENCY_SYMBOLS[baseCurrency] || baseCurrency;

  const [displayCountry, setDisplayCountry] = useState(user.country || "IN");
  const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;
  const [rates, setRates] = useState({});

  // Fetch rates relative to BASE currency
  useEffect(() => {
    fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`)
      .then((res) => res.json())
      .then((data) => setRates(data.rates || {}))
      .catch(() => setRates({}));
  }, [baseCurrency]);
  useEffect(() => {
    const syncFromStorage = () => {
      const u = JSON.parse(localStorage.getItem("user") || "{}");

      if (u.baseCurrency) {
        setBaseCurrency(u.baseCurrency);
        setDisplayCurrency(u.baseCurrency); // reset display to base
      }

      if (u.country) {
        setBaseCountry(u.country);
        setDisplayCountry(u.country);
      }
    };

    window.addEventListener("profile:updated", syncFromStorage);
    return () => window.removeEventListener("profile:updated", syncFromStorage);
  }, []);

  const convert = (amount = 0) => {
    if (!rates || displayCurrency === baseCurrency) return amount;
    return amount * (rates[displayCurrency] || 1);
  };

  // 🚫 DO NOT touch DB or base currency here
  const updateCurrency = (country, currency) => {
    setDisplayCountry(country);
    setDisplayCurrency(currency);
  };

  return (
    <CurrencyContext.Provider
      value={{
        baseCurrency,
        baseCountry,
        baseSymbol,
        displayCurrency,
        displayCountry,
        symbol,
        convert,
        updateCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

// ✅ THIS WAS MISSING
export const useCurrency = () => useContext(CurrencyContext);
