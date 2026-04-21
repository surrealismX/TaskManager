import { useEffect, useState } from "react";
import { fetchFinances, addFinance, removeFinance } from "../repo/finance";
import { useToast } from "../ui/Toast";

export default function Finance() {
  const toast = useToast();

  const [finances, setFinances] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    type: "",
    description: "",
  });

  // Load on mount
  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchFinances();
      setFinances(data || []);
    } catch (e) {
      toast.push({
        title: "Error",
        desc: e?.response?.data?.detail || "Failed to load finance entries.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!form.amount || isNaN(Number(form.amount))) {
      toast.push({ title: "Error", desc: "Enter a valid amount." });
      return;
    }

    if (!form.type || !["income", "expense"].includes(form.type)) {
      toast.push({ title: "Error", desc: "Type must be income or expense." });
      return;
    }

    try {
      const payload = {
        amount: Number(form.amount),
        type: form.type,
        description: form.description.trim(),
      };

      const item = await addFinance(payload);
      setFinances((prev) => [...prev, item]);

      toast.push({
        title: "Added",
        desc: "Finance entry saved successfully.",
      });

      setShowForm(false);
      setForm({ amount: "", type: "", description: "" });
    } catch (e) {
      toast.push({
        title: "Error",
        desc: e?.response?.data?.detail || "Failed to save entry.",
      });
    }
  }

  async function del(id) {
    try {
      await removeFinance(id);
      setFinances((prev) => prev.filter((f) => f.id !== id));

      toast.push({
        title: "Deleted",
        desc: "Finance entry removed.",
      });
    } catch (e) {
      toast.push({
        title: "Error",
        desc: e?.response?.data?.detail || "Failed to delete entry.",
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* ---------------------------------------------------------
         HEADER (glass)
      --------------------------------------------------------- */}
      <div
        className="
          p-6 rounded-2xl mb-6
          backdrop-blur-xl
          bg-[rgba(255,255,255,0.08)]
          border border-[rgba(255,255,255,0.15)]
          shadow-xl
        "
      >
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Finance</h1>

          <div className="flex-1" />

          <button className="btn primary" onClick={() => setShowForm(true)}>
            + New
          </button>

          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------
         MODAL (glass)
      --------------------------------------------------------- */}
      {showForm && (
        <div
          className="
            fixed inset-0 flex items-center justify-center
            bg-black/40 backdrop-blur-sm
            z-50
          "
        >
          <div
            className="
              p-8 rounded-2xl w-full max-w-md
              backdrop-blur-xl
              bg-[rgba(255,255,255,0.1)]
              border border-[rgba(255,255,255,0.2)]
              shadow-2xl
            "
          >
            <h2 className="text-xl font-semibold mb-4">
              New Finance Entry
            </h2>

            <label className="label">Amount</label>
            <input
              type="number"
              className="input mb-3"
              value={form.amount}
              onChange={(e) =>
                setForm({ ...form, amount: e.target.value })
              }
            />

            <label className="label">Type</label>
            <select
              className="select mb-3"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value })
              }
            >
              <option value="">Select type</option>
              <option value="income">income</option>
              <option value="expense">expense</option>
            </select>

            <label className="label">Description</label>
            <textarea
              className="textarea mb-4"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

            <div className="flex justify-end gap-2">
              <button className="btn primary" onClick={save}>
                Save
              </button>
              <button className="btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
         LIST (glass items)
      --------------------------------------------------------- */}
      {loading ? (
        <p className="text-[var(--muted)]">Loading…</p>
      ) : finances.length === 0 ? (
        <p className="text-[var(--muted)]">No data.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {finances.map((f) => (
            <div
              key={f.id}
              className="
                p-5 rounded-2xl
                backdrop-blur-xl
                bg-[rgba(255,255,255,0.06)]
                border border-[rgba(255,255,255,0.12)]
                shadow-lg
                hover:bg-[rgba(255,255,255,0.1)]
                transition
                flex justify-between items-start
              "
            >
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={`
                      px-3 py-1 rounded-full text-sm font-semibold
                      ${f.type === "income"
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"}
                    `}
                  >
                    {f.type}
                  </span>

                  <strong className="text-lg">{f.amount} zł</strong>
                </div>

                <p className="text-sm text-[var(--muted)] mt-1">
                  {f.description}
                </p>
              </div>

              <button className="btn danger" onClick={() => del(f.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
