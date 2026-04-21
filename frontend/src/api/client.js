import axios from "axios";

const client = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// Attach token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Do NOT auto-logout on 401
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.warn("Unauthorized request to:", err.config.url);
      // Do NOT redirect or remove token here
    }

    return Promise.reject(err);
  }
);

export default client;
