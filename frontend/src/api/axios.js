import axios from "axios";

const api = axios.create({
<<<<<<< HEAD
  baseURL: import.meta.env.VITE_API_URL,
=======
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",

>>>>>>> e59c53f77c3081fe6746be29489c71b7e23f2b18
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
