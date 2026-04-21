import {
  listFinances,
  createFinance,
  updateFinance,
  deleteFinance,
} from "../api/finance";

export async function fetchFinances() {
  const res = await listFinances();
  return res.data;
}

export async function addFinance(data) {
  const res = await createFinance(data);
  return res.data;
}

export async function removeFinance(id) {
  await deleteFinance(id);
}
