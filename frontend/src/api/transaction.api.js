import api from "./axios";

/**
 * API helpers that consistently return `response.data`.
 * This avoids downstream code needing to check `res` vs `res.data`.
 */

export const addTransaction = async (data) => {
  const res = await api.post("/transactions", data);
  return res.data;
};

export const getTransactions = async (params = {}) => {
  const res = await api.get("/transactions", { params });
  return res.data;
};

export const updateTransaction = async (id, data) => {
  const res = await api.put(`/transactions/${id}`, data);
  return res.data;
};

export const deleteTransaction = async (id) => {
  const res = await api.delete(`/transactions/${id}`);
  return res.data;
};

export const getTransactionById = async (id) => {
  const res = await api.get(`/transactions/${id}`);
  return res.data;
};

export const getTransactionTypes = async () => {
  const res = await api.get("/transactions/types");
  return res.data;
};

export const getCustomCategories = async () => {
  const res = await api.get("/transactions/categories");
  return res.data;
};

export const addCustomCategory = async (payload) => {
  const res = await api.post("/transactions/categories", payload);
  return res.data;
};
