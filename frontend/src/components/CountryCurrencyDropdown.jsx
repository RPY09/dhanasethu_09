import { useEffect, useState } from "react";
import { useCurrency } from "../context/CurrencyContext";

const CountryCurrencyDropdown = ({ onClose }) => {
  const { updateCurrency } = useCurrency();
  const [countries, setCountries] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest(".currency-dropdown")) {
        onClose();
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);

  useEffect(() => {
    fetch("https://restcountries.com/v3.1/all?fields=name,cca2,currencies,flag")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data
          .filter((c) => c.currencies && c.cca2)
          .map((c) => ({
            name: c.name.common,
            code: c.cca2,
            currency: Object.keys(c.currencies)[0],
            flag: c.flag,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setCountries(formatted);
      });
  }, []);

  const filtered = countries.filter((c) =>
    `${c.name} ${c.currency}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="currency-dropdown">
      <input
        placeholder="Search country or currency"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      <div className="currency-list">
        {filtered.map((c) => (
          <div
            key={c.code}
            className="currency-item"
            onClick={() => {
              updateCurrency(c.code, c.currency);
              onClose();
            }}
          >
            <span>{c.flag}</span>
            <span>{c.name}</span>
            <span style={{ marginLeft: "auto", opacity: 0.6 }}>
              {c.currency}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CountryCurrencyDropdown;
