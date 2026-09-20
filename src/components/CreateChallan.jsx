import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { generateChallanPDF } from "../utils/challanPdf";
import "../styles/CreateChallan.css";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { analytics } from "../firebase/config";
import { logEvent } from "firebase/analytics";

const COMPANY_DATA = {
  STA: {
    fullName: "StarTrack Automation",
    shortName: "STA",
    email: "startrackautomation@gmail.com",
    contact: "+91 8101274497/8334046035",
    addressKey: "headsta",
    addressLabel: "Head STA",
    address:
      "Raghabpur, 608No. Last Plot, GNd FL, PO Nepalgung, PS Bishnupur, Kolkata, West Bengal, 700103.\nGSTIN 19ADYFS9856M1ZI.",
  },
  STAIPL: {
    fullName: "StarTrack Automation India Pvt Ltd",
    shortName: "STAIPL",
    email: "startrackautomation@gmail.com",
    contact: "+91 8101274497/8334046035",
    addressKey: "headstaipl",
    addressLabel: "Head STAIPL",
    address:
      "Raghabpur, 608No. Last Plot, GNd FL, PO Nepalgung, PS Bishnupur, Kolkata, West Bengal, 700103.\nGSTIN 19ABKCS2524B1ZI.",
  },
};

const todayISO = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Returns date string in MMDDYY format
const getFormattedDate = () => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const yy = String(today.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
};

const emptyItem = () => ({ description: "", quantity: "", remarks: "" });

const buildInitialForm = () => {
  const company = COMPANY_DATA.STA;
  return {
    transportForm: "STA",
    type: "Returnable",
    challanNumber: "",
    currentDate: todayISO(),
    senderName: company.fullName,
    senderEmail: company.email,
    senderContact: company.contact,
    senderAddressType: company.addressKey,
    senderAddress: company.address,
    receiverName: "",
    receiverEmail: "",
    receiverContact: "",
    receiverAddress: "",
    items: [emptyItem()],
    vehicleNumber: "",
    pickedBy: "",
    deliveryNote: "",
  };
};

function CreateChallan() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(buildInitialForm);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null); // { type: "success" | "error", text }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMounted = useRef(true);

  const username = location.state?.username;
  console.log(username);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch live preview of upcoming Challan Number from Firestore
  useEffect(() => {
    const fetchNextChallanPreview = async () => {
      try {
        // Log custom login event to Firebase Analytics
        if (analytics) {
          logEvent(analytics, "create challan", {
            method: "challan count fetched",
          });
        }
        const counterDocRef = doc(db, "counters", "challanCounter");
        const docSnap = await getDoc(counterDocRef);
        let nextCount = 1;

        if (docSnap.exists()) {
          nextCount = (docSnap.data().lastCount || 0) + 1;
        }

        const paddedCount = String(nextCount).padStart(2, "0");
        const typeSuffix = form.type === "Returnable" ? "R" : "NR";
        const previewNumber = `${form.transportForm}/${getFormattedDate()}/${paddedCount}/${typeSuffix}`;

        if (isMounted.current) {
          setForm((prev) => ({ ...prev, challanNumber: previewNumber }));
        }
      } catch (err) {
        console.error("Error generating challan preview: ", err);
      }
    };

    fetchNextChallanPreview();
  }, [form.type, form.transportForm]);

  // Keep the date fresh if the page is left open across midnight.
  useEffect(() => {
    const tick = () =>
      setForm((prev) =>
        prev.currentDate === todayISO()
          ? prev
          : { ...prev, currentDate: todayISO() },
      );
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  // Warn before leaving with unsaved data.
  useEffect(() => {
    const handler = (e) => {
      if (isSubmitting) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isSubmitting]);

  const clearError = (field) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const handleTransportChange = (transport) => {
    const company = COMPANY_DATA[transport];
    setForm((prev) => ({
      ...prev,
      transportForm: transport,
      senderName: company.fullName,
      senderEmail: company.email,
      senderContact: company.contact,
      senderAddressType: company.addressKey,
      senderAddress: company.address,
    }));
  };

  const handleSenderAddressType = (addressType) => {
    const company = COMPANY_DATA[form.transportForm];
    setForm((prev) => ({
      ...prev,
      senderAddressType: addressType,
      senderAddress: addressType === "manual" ? "" : company.address,
    }));
    clearError("senderAddress");
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
      return { ...prev, items };
    });
    clearError(`item-${index}-${field}`);
  };

  const addItemRow = () =>
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItemRow = (index) =>
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length > 1
          ? prev.items.filter((_, i) => i !== index)
          : prev.items,
    }));

  const validate = () => {
    const next = {};

    if (!form.senderAddress.trim())
      next.senderAddress = "Sender address is required.";
    if (!form.receiverName.trim())
      next.receiverName = "Receiver name is required.";
    if (
      form.receiverEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.receiverEmail.trim())
    )
      next.receiverEmail = "Enter a valid email address.";
    if (!form.receiverAddress.trim())
      next.receiverAddress = "Receiver address is required.";

    form.items.forEach((item, i) => {
      if (!item.description.trim()) next[`item-${i}-description`] = "Required";
      if (!String(item.quantity).trim())
        next[`item-${i}-quantity`] = "Required";
      else if (
        Number(item.quantity) <= 0 ||
        Number.isNaN(Number(item.quantity))
      )
        next[`item-${i}-quantity`] = "Must be a number > 0";
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      let finalChallanNo = "";

      // Log custom login event to Firebase Analytics
      if (analytics) {
        logEvent(analytics, "create challan", {
          method: "challan created",
        });
      }

      // Atomic transaction: locks the counter, increments it, and writes the document safely
      await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, "counters", "challanCounter");
        const counterDoc = await transaction.get(counterRef);

        let lastCount = 0;
        if (counterDoc.exists()) {
          lastCount = counterDoc.data().lastCount || 0;
        }

        const newCount = lastCount + 1;
        const paddedCount = String(newCount).padStart(2, "0");
        const typeSuffix = form.type === "Returnable" ? "R" : "NR";

        finalChallanNo = `${form.transportForm}/${getFormattedDate()}/${paddedCount}/${typeSuffix}`;

        const payload = {
          challanNo: finalChallanNo,
          transportForm: form.transportForm,
          type: form.type,
          challanDate: form.currentDate,
          senderName: form.senderName,
          senderEmail: form.senderEmail,
          senderContact: form.senderContact,
          senderAddress: form.senderAddress,
          receiverName: form.receiverName,
          receiverEmail: form.receiverEmail,
          receiverContact: form.receiverContact,
          receiverAddress: form.receiverAddress,
          items: form.items,
          vehicleNumber: form.vehicleNumber,
          pickedBy: form.pickedBy,
          deliveryNote: form.deliveryNote,
          createdBy: username || "Unknown",
          createdAt: serverTimestamp(),
        };

        // 1. Create new challan document inside transaction
        const newChallanRef = doc(collection(db, "challans"));
        transaction.set(newChallanRef, payload);

        // 2. Increment global counter inside transaction
        transaction.set(counterRef, { lastCount: newCount }, { merge: true });

        // Update PDF generation payload with actual finalized ID
        await generateChallanPDF(payload);
      });

      if (!isMounted.current) return;

      alert(`Success! Challan generated with No: ${finalChallanNo}`);

      setBanner({
        type: "success",
        text: `Challan ${finalChallanNo} saved. PDF downloaded. Returning to dashboard…`,
      });

      setTimeout(() => {
        if (isMounted.current) navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error creating challan: ", error);
      alert("Failed to create challan. Check the console.");
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    const hasData =
      form.receiverName ||
      form.receiverAddress ||
      form.items.some((i) => i.description || i.quantity || i.remarks);
    if (hasData && !window.confirm("Discard this challan and go back?")) return;
    navigate("/dashboard");
  };

  const company = COMPANY_DATA[form.transportForm];
  const senderReadOnly = form.senderAddressType !== "manual";

  return (
    <div className="cc-page">
      <header className="cc-topbar">
        <div className="cc-topbar-inner">
          <div className="cc-title-group">
            <button
              type="button"
              className="cc-back"
              onClick={handleCancel}
              aria-label="Back to dashboard"
            >
              ←
            </button>
            <div>
              <h1>Create Challan</h1>
              <span className="cc-subtitle">
                {company.fullName} · {form.challanNumber || "Loading..."}
              </span>
            </div>
          </div>
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

        <form id="challan-form" onSubmit={handleSubmit} noValidate>
          {/* Meta row */}
          <section className="cc-card">
            <div className="cc-grid cc-grid-4">
              <div className="cc-field">
                <label htmlFor="transportForm">Transport Form</label>
                <select
                  id="transportForm"
                  name="transportForm"
                  value={form.transportForm}
                  onChange={(e) => handleTransportChange(e.target.value)}
                >
                  <option value="STA">STA</option>
                  <option value="STAIPL">STAIPL</option>
                </select>
              </div>

              <div className="cc-field">
                <label htmlFor="type">Type</label>
                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={handleInputChange}
                >
                  <option value="Returnable">Returnable</option>
                  <option value="Non-Returnable">Non-Returnable</option>
                </select>
              </div>

              <div className="cc-field">
                <label htmlFor="challanNumber">Challan Number</label>
                <input
                  id="challanNumber"
                  type="text"
                  name="challanNumber"
                  value={form.challanNumber}
                  readOnly
                  placeholder="Auto-generated"
                />
              </div>

              <div className="cc-field">
                <label htmlFor="currentDate">Date</label>
                <input
                  id="currentDate"
                  type="date"
                  name="currentDate"
                  value={form.currentDate}
                  readOnly
                />
              </div>
            </div>
          </section>

          {/* Sender / Receiver */}
          <div className="cc-grid cc-grid-2">
            <section className="cc-card">
              <h2 className="cc-section-title">Sender Information</h2>

              <div className="cc-field">
                <label htmlFor="senderName">Name</label>
                <input
                  id="senderName"
                  type="text"
                  name="senderName"
                  value={form.senderName}
                  readOnly
                />
              </div>

              <div className="cc-field">
                <label htmlFor="senderEmail">Email</label>
                <input
                  id="senderEmail"
                  type="email"
                  name="senderEmail"
                  value={form.senderEmail}
                  onChange={handleInputChange}
                  placeholder="Sender email"
                />
              </div>

              <div className="cc-field">
                <label htmlFor="senderContact">Contact No.</label>
                <input
                  id="senderContact"
                  type="text"
                  name="senderContact"
                  value={form.senderContact}
                  readOnly
                />
              </div>

              <div className="cc-field">
                <label htmlFor="senderAddressType">Address</label>
                <select
                  id="senderAddressType"
                  name="senderAddressType"
                  value={form.senderAddressType}
                  onChange={(e) => handleSenderAddressType(e.target.value)}
                >
                  <option value={company.addressKey}>
                    {company.addressLabel}
                  </option>
                  <option value="manual">Enter your address</option>
                </select>
                <textarea
                  name="senderAddress"
                  className={`cc-address ${errors.senderAddress ? "cc-invalid" : ""}`}
                  value={form.senderAddress}
                  onChange={handleInputChange}
                  readOnly={senderReadOnly}
                  rows={3}
                  placeholder="Sender address"
                />
                {errors.senderAddress && (
                  <span className="cc-error">{errors.senderAddress}</span>
                )}
              </div>
            </section>

            <section className="cc-card">
              <h2 className="cc-section-title">Receiver Information</h2>

              <div className="cc-field">
                <label htmlFor="receiverName">
                  Name <span className="cc-req">*</span>
                </label>
                <input
                  id="receiverName"
                  type="text"
                  name="receiverName"
                  className={errors.receiverName ? "cc-invalid" : ""}
                  value={form.receiverName}
                  onChange={handleInputChange}
                  placeholder="Receiver name"
                />
                {errors.receiverName && (
                  <span className="cc-error">{errors.receiverName}</span>
                )}
              </div>

              <div className="cc-field">
                <label htmlFor="receiverEmail">Email</label>
                <input
                  id="receiverEmail"
                  type="email"
                  name="receiverEmail"
                  className={errors.receiverEmail ? "cc-invalid" : ""}
                  value={form.receiverEmail}
                  onChange={handleInputChange}
                  placeholder="Receiver email"
                />
                {errors.receiverEmail && (
                  <span className="cc-error">{errors.receiverEmail}</span>
                )}
              </div>

              <div className="cc-field">
                <label htmlFor="receiverContact">Contact No.</label>
                <input
                  id="receiverContact"
                  type="tel"
                  name="receiverContact"
                  value={form.receiverContact}
                  onChange={handleInputChange}
                  placeholder="Receiver contact"
                />
              </div>

              <div className="cc-field">
                <label htmlFor="receiverAddress">
                  Address <span className="cc-req">*</span>
                </label>
                <textarea
                  id="receiverAddress"
                  name="receiverAddress"
                  className={`cc-address ${errors.receiverAddress ? "cc-invalid" : ""}`}
                  value={form.receiverAddress}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Receiver address"
                />
                {errors.receiverAddress && (
                  <span className="cc-error">{errors.receiverAddress}</span>
                )}
              </div>
            </section>
          </div>

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
                          placeholder="Item description"
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

          {/* Transport details */}
          <section className="cc-card">
            <h2 className="cc-section-title">Transport Details</h2>
            <div className="cc-grid cc-grid-2">
              <div className="cc-field">
                <label htmlFor="vehicleNumber">Vehicle Number</label>
                <input
                  id="vehicleNumber"
                  type="text"
                  name="vehicleNumber"
                  value={form.vehicleNumber}
                  onChange={handleInputChange}
                  placeholder="WB00AA0000"
                />
              </div>
              <div className="cc-field">
                <label htmlFor="pickedBy">Picked By</label>
                <input
                  id="pickedBy"
                  type="text"
                  name="pickedBy"
                  value={form.pickedBy}
                  onChange={handleInputChange}
                  placeholder="Name of person / courier"
                />
              </div>
            </div>
            <div className="cc-field">
              <label htmlFor="deliveryNote">Delivery Note</label>
              <textarea
                id="deliveryNote"
                name="deliveryNote"
                value={form.deliveryNote}
                onChange={handleInputChange}
                rows={3}
                placeholder="Any additional delivery instructions"
              />
            </div>
          </section>

          {/* Footer actions */}
          <div className="cc-footer-actions">
            <button
              type="button"
              className="cc-btn cc-btn-ghost"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cc-btn cc-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting…" : "Submit & Download PDF"}
            </button>
          </div>
        </form>
      </motion.main>
    </div>
  );
}

export default CreateChallan;
