import api from "./axios";

export const addLoan = async (data) => {
  const res = await api.post("/loans", data);
  return res.data;
};

export const getLoans = async () => {
  const res = await api.get("/loans");
  return res.data;
};

export const settleLoan = async (id, data) => {
  const res = await api.put(`/loans/${id}/settle`, data);
  return res.data;
};

export const updateLoan = (id, data) => api.put(`/loans/${id}`, data);

export const deleteLoan = (id) => api.delete(`/loans/${id}`);

export const getLoanSummary = async () => {
  const res = await api.get("/loans/summary");
  return res.data;
};
