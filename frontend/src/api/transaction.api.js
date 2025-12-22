import api from "./axios";

export const addTransaction = (data) => api.post("/transactions", data);

export const getTransactions = () => api.get("/transactions");
export const updateTransaction = (id, data) =>
  api.put(`/transactions/${id}`, data);

export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);
export const getTransactionById = (id) => api.get(`/transactions/${id}`);
