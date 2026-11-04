import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
// Shared page / header / card / table / button styles (same look as Create Challan)
import "../styles/CreateChallan.css";
import "../styles/AssetList.css";
import { analytics } from "../firebase/config";
import { logEvent } from "firebase/analytics";

const COLLECTION = "employeeAssets";

const PERMISSION_MSG =
  "Permission denied. Check your Firestore rules for the employeeAssets collection.";

const todayISO = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// "  Asha   ROY " and "asha roy" count as the same employee
const normalizeName = (name) =>
  String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const emptyItem = () => ({ description: "", quantity: "1", remarks: "" });

const buildInitialForm = () => ({
  employeeName: "",
  assignedDate: todayISO(),
  items: [emptyItem()],
});

/**
 * One page for both flows:
 *   /assets/new        -> add a new record
 *   /assets/edit/:id   -> edit an existing record (prefilled)
 */
function AssetFormInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);
  const username = location.state?.username;

  const [form, setForm] = useState(buildInitialForm);
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(buildInitialForm()),
  ); // the form as loaded / last saved, to detect unsaved changes
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null); // { type: "success" | "error", text }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const isMounted = useRef(true);
  const [existing, setExisting] = useState(null); // { id, name }: another record for this employee
  const [originalName, setOriginalName] = useState(""); // name as loaded (edit mode)
  const checkSeq = useRef(0); // ignores out-of-date duplicate checks

  const busy = isSubmitting || isSaved;
  const isDirty = JSON.stringify(form) !== baseline;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Edit mode: load the record and prefill the form
  useEffect(() => {
    if (!isEditMode) return undefined;
    let cancelled = false;

    const loadRecord = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const snap = await getDoc(doc(db, COLLECTION, editId));
        if (cancelled) return;

        if (!snap.exists()) {
          setLoadError(
            "This record no longer exists. It may have been deleted.",
          );
          return;
        }

        const data = snap.data();
        const loaded = {
          employeeName: data.employeeName ?? "",
          assignedDate: data.assignedDate || todayISO(),
          items:
            Array.isArray(data.items) && data.items.length > 0
              ? data.items.map((item) => ({
                  description: item.description ?? "",
                  quantity: String(item.quantity ?? ""),
                  remarks: item.remarks ?? "",
                }))
              : [emptyItem()],
        };
        setForm(loaded);
        setBaseline(JSON.stringify(loaded));
        setOriginalName(loaded.employeeName);
      } catch (err) {
        console.error("Error loading employee assets:", err);
        if (!cancelled)
          setLoadError(
            err.code === "permission-denied"
              ? PERMISSION_MSG
              : "Failed to load this record. Check your connection and try again.",
          );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadRecord();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, editId]);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (busy || !isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy, isDirty]);

  const clearError = (field) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    clearError(name);
    if (name === "employeeName") {
      checkSeq.current += 1; // drop any check still in flight for the old text
      setExisting(null);
    }
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
    clearError(`item-${index}-${field}`);
  };

  const addItemRow = () =>
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItemRow = (index) => {
    setForm((prev) =>
      prev.items.length > 1
        ? { ...prev, items: prev.items.filter((_, i) => i !== index) }
        : prev,
    );
    // Row numbers shift after a removal, so stale row errors would mislead
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith("item-")) delete next[key];
      });
      return next;
    });
  };

  const validate = () => {
    const next = {};

    if (!form.employeeName.trim())
      next.employeeName = "Employee name is required.";
    if (!form.assignedDate) next.assignedDate = "Date is required.";

    form.items.forEach((item, i) => {
      if (!item.description.trim()) next[`item-${i}-description`] = "Required";

      const rawQty = String(item.quantity).trim();
      const qty = Number(rawQty);
      if (rawQty === "") next[`item-${i}-quantity`] = "Required";
      else if (!Number.isInteger(qty) || qty <= 0)
        next[`item-${i}-quantity`] = "Whole number > 0";
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Return to wherever the user came from; fall back sensibly
  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else
      navigate(isEditMode ? "/assets" : "/dashboard", { state: { username } });
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("Discard your changes and go back?")) return;
    goBack();
  };

  // One assets list per employee. Looks at the live collection so it also
  // catches records created earlier or by someone else.
  const findExistingRecord = async (rawName) => {
    const key = normalizeName(rawName);
    if (!key) return null;
    // Editing: only check when the name really changed, so a record whose
    // name is already shared (older data) can still be edited.
    if (isEditMode && key === normalizeName(originalName)) return null;

    const snap = await getDocs(collection(db, COLLECTION));
    const match = snap.docs.find(
      (d) => d.id !== editId && normalizeName(d.data().employeeName) === key,
    );
    return match ? { id: match.id, name: match.data().employeeName } : null;
  };

  // Early warning, before the user fills in the whole item list
  const handleNameBlur = async () => {
    const seq = ++checkSeq.current;
    try {
      const found = await findExistingRecord(form.employeeName);
      if (seq === checkSeq.current && isMounted.current) setExisting(found);
    } catch (err) {
      console.error("Duplicate employee check failed:", err); // submit re-checks
    }
  };

  const handleOpenExisting = () => {
    if (!existing) return;
    const hasEnteredItems = form.items.some(
      (item) => item.description.trim() || item.remarks.trim(),
    );
    if (
      hasEnteredItems &&
      !window.confirm(
        "Open the existing list? The items you entered here will be discarded.",
      )
    )
      return;
    navigate(`/assets/edit/${existing.id}`, {
      replace: true,
      state: { username },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setBanner(null);
    if (!validate()) {
      setBanner({
        type: "error",
        text: "Please fix the highlighted fields before saving.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      employeeName: form.employeeName.trim(),
      assignedDate: form.assignedDate,
      items: form.items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        remarks: item.remarks.trim(),
      })),
    };

    try {
      const found = await findExistingRecord(payload.employeeName);
      // Log custom login event to Firebase Analytics
      if (analytics) {
        logEvent(analytics, "asset form", { method: "Create asset list" });
      }
      if (found) {
        if (isMounted.current) {
          setExisting(found);
          setBanner({
            type: "error",
            text: `${found.name} already has an assets list. Open it to add or change items.`,
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      if (isEditMode) {
        await updateDoc(doc(db, COLLECTION, editId), {
          ...payload,
          updatedBy: username || "Unknown",
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, COLLECTION), {
          ...payload,
          createdBy: username || "Unknown",
          createdAt: serverTimestamp(),
        });
      }

      if (!isMounted.current) return;

      setIsSaved(true); // locks the buttons so a double click can't save twice
      setBaseline(JSON.stringify(form));
      setBanner({
        type: "success",
        text: isEditMode
          ? "Record updated. Returning…"
          : "Employee assets saved. Returning to the list…",
      });

      setTimeout(() => {
        if (!isMounted.current) return;
        if (isEditMode) goBack();
        else navigate("/assets", { replace: true, state: { username } });
      }, 1200);
    } catch (error) {
      console.error("Error saving employee assets:", error);
      if (!isMounted.current) return;
      setBanner({
        type: "error",
        text:
          error.code === "permission-denied"
            ? PERMISSION_MSG
            : "Failed to save. Check your connection and try again.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  const title = isEditMode ? "Edit Employee Assets" : "Add Employee Assets";

  // Edit mode: loading / not-found / error screen
  if (isEditMode && (isLoading || loadError)) {
    return (
      <div className="cc-page">
        <header className="cc-topbar">
          <div className="cc-topbar-inner">
            <div className="cc-title-group">
              <button
                type="button"
                className="cc-back"
                onClick={goBack}
                aria-label="Go back"
              >
                ←
              </button>
              <div>
                <h1>{title}</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="cc-container">
          <section className="cc-card">
            {loadError ? (
              <>
                <div className="cc-banner cc-banner-error" role="alert">
                  {loadError}
                </div>
                <button
                  type="button"
                  className="cc-btn cc-btn-ghost"
                  onClick={goBack}
                >
                  Go back
                </button>
              </>
            ) : (
              <p>Loading record…</p>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="cc-page">
      <header className="cc-topbar">
        <div className="cc-topbar-inner">
          <div className="cc-title-group">
            <button
              type="button"
              className="cc-back"
              onClick={handleCancel}
              aria-label="Go back"
            >
              ←
            </button>
            <div>
              <h1>{title}</h1>
              <span className="cc-subtitle">
                Record the items an employee is currently using
              </span>
            </div>
          </div>
          {/* <div className="cc-topbar-actions">
            <button
              type="button"
              className="cc-btn cc-btn-ghost"
              onClick={handleCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="asset-form"
              className="cc-btn cc-btn-primary"
              disabled={busy}
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating…"
                  : "Submitting…"
                : isEditMode
                  ? "Update"
                  : "Submit"}
            </button>
          </div> */}
        </div>
      </header>

      <motion.main
        className="cc-container"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {banner && (
          <div className={`cc-banner cc-banner-${banner.type}`} role="status">
            {banner.text}
          </div>
        )}

        <form id="asset-form" onSubmit={handleSubmit} noValidate>
          {/* Employee details */}
          <section className="cc-card">
            <h2 className="cc-section-title">Employee Information</h2>
            <div className="cc-grid cc-grid-2">
              <div className="cc-field">
                <label htmlFor="employeeName">
                  Employee Name <span className="cc-req">*</span>
                </label>
                <input
                  id="employeeName"
                  type="text"
                  name="employeeName"
                  className={
                    errors.employeeName || existing ? "cc-invalid" : ""
                  }
                  value={form.employeeName}
                  onChange={handleFieldChange}
                  onBlur={handleNameBlur}
                  placeholder="Enter employee name"
                  autoComplete="off"
                />
                {errors.employeeName && (
                  <span className="cc-error">{errors.employeeName}</span>
                )}
                {existing && (
                  <div className="al-existing" role="alert">
                    <span className="cc-error">
                      {existing.name} already has an assets list. Only one list
                      is allowed per employee.
                    </span>
                    <button
                      type="button"
                      className="cc-btn cc-btn-ghost cc-btn-sm"
                      onClick={handleOpenExisting}
                    >
                      Open existing list
                    </button>
                  </div>
                )}
              </div>

              <div className="cc-field">
                <label htmlFor="assignedDate">
                  Date <span className="cc-req">*</span>
                </label>
                <input
                  id="assignedDate"
                  type="date"
                  name="assignedDate"
                  className={errors.assignedDate ? "cc-invalid" : ""}
                  value={form.assignedDate}
                  onChange={handleFieldChange}
                />
                {errors.assignedDate && (
                  <span className="cc-error">{errors.assignedDate}</span>
                )}
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="cc-card">
            <h2 className="cc-section-title">Item List</h2>

            <div className="cc-table-wrap">
              <table className="cc-table">
                <thead>
                  <tr>
                    <th className="col-sl">Sl No</th>
                    <th className="col-desc">Description</th>
                    <th className="col-qty">Quantity</th>
                    <th className="col-remarks">Remarks</th>
                    <th className="col-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={index}>
                      <td className="col-sl">{index + 1}</td>
                      <td>
                        <textarea
                          rows={2}
                          aria-label={`Item ${index + 1} description`}
                          className={
                            errors[`item-${index}-description`]
                              ? "cc-invalid"
                              : ""
                          }
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder="Item description (e.g. Laptop, S/N 1234)"
                        />
                        {errors[`item-${index}-description`] && (
                          <span className="cc-error">
                            {errors[`item-${index}-description`]}
                          </span>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          aria-label={`Item ${index + 1} quantity`}
                          className={
                            errors[`item-${index}-quantity`] ? "cc-invalid" : ""
                          }
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          placeholder="Qty"
                        />
                        {errors[`item-${index}-quantity`] && (
                          <span className="cc-error">
                            {errors[`item-${index}-quantity`]}
                          </span>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          aria-label={`Item ${index + 1} remarks`}
                          value={item.remarks}
                          onChange={(e) =>
                            handleItemChange(index, "remarks", e.target.value)
                          }
                          placeholder="Remarks"
                        />
                      </td>
                      <td className="col-action">
                        <button
                          type="button"
                          className="cc-btn cc-btn-danger cc-btn-sm"
                          onClick={() => removeItemRow(index)}
                          disabled={form.items.length === 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="cc-btn cc-btn-add"
              onClick={addItemRow}
            >
              + Add Item
            </button>
          </section>

          {/* Footer actions (used on small screens where the header buttons hide) */}
          <div className="cc-footer-actions">
            <button
              type="button"
              className="cc-btn cc-btn-ghost"
              onClick={handleCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cc-btn cc-btn-primary"
              disabled={busy}
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating…"
                  : "Submitting…"
                : isEditMode
                  ? "Update"
                  : "Submit"}
            </button>
          </div>
        </form>
      </motion.main>
    </div>
  );
}

// Remount the form whenever the record changes (for example when jumping from
// the "new" page to an employee's existing list) so no stale state carries over.
function AssetForm() {
  const { id } = useParams();
  return <AssetFormInner key={id || "new"} />;
}

export default AssetForm;
