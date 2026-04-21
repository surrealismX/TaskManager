import client from "./client";

export function listFinances() {
  return client.get("/finance/");
}

export function createFinance(data) {
  return client.post("/finance/", data);
}

export function updateFinance(id, data) {
  return client.put(`/finance/${id}`, data);
}

export function deleteFinance(id) {
  return client.delete(`/finance/${id}`);
}
