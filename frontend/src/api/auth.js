import api from "./client";

export async function login(email, password) {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);

  const res = await api.post("/users/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });


  localStorage.setItem("access_token", res.data.access_token);

  // Optionally return the token and type
  return res.data; // { access_token, token_type }
}

export async function register(email, password) {
  const res = await api.post("/users/register", { email, password });

  // After registration, optionally auto-login
  if (res?.id) {
    const tokenData = await login(email, password); // get token after register
    return { user: res, ...tokenData };
  }

  return res;
}