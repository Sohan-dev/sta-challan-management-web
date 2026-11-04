import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
// Shared page / header / button styles (same look as Create Challan)
import "../styles/CreateChallan.css";
import "../styles/AssetList.css";

const COLLECTION = "employeeAssets";
const ITEMS_PER_PAGE = 10;

const PERMISSION_MSG =
  "Permission denied. Check your Firestore rules for the employeeAssets collection.";

// "2026-11-02" -> "02 Nov 2026" (parsed by hand so timezones can't shift the day)
const formatDate = (isoDate) => {
  if (!isoDate || typeof isoDate !== "string") return "N/A";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function AssetList() {
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Live data from Firestore
  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRecords(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadError("");
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching employee assets:", error);
        setLoadError(
          error.code === "permission-denied"
            ? PERMISSION_MSG
            : "Failed to load records. Check your connection and try again.",
        );
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedDate("");
    setCurrentPage(1);
  };

  // Search matches the employee name or any item description / remark
  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return records.filter((record) => {
      const items = Array.isArray(record.items) ? record.items : [];
      const matchesSearch =
        !term ||
        (record.employeeName || "").toLowerCase().includes(term) ||
        items.some(
          (item) =>
            (item.description || "").toLowerCase().includes(term) ||
            (item.remarks || "").toLowerCase().includes(term),
        );
      const matchesDate = !selectedDate || record.assignedDate === selectedDate;
      return matchesSearch && matchesDate;
    });
  }, [records, searchTerm, selectedDate]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  // Show a window of page numbers instead of every page
  const pageNumbers = useMemo(() => {
    const first = Math.max(1, currentPage - 2);
    const last = Math.min(totalPages, currentPage + 2);
    const pages = [];
    for (let p = first; p <= last; p++) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  // If the last row on the last page is deleted, step back to a valid page
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError("");
  };

  // Close the delete dialog with Escape (unless a delete is in flight)
  useEffect(() => {
    if (!deleteTarget) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !isDeleting) closeDeleteModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget, isDeleting]);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate("/dashboard");
  };

  const handleAdd = () => navigate("/assets/new", { state: { username } });

  const handleEdit = (record) =>
    navigate(`/assets/edit/${record.id}`, { state: { username } });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteDoc(doc(db, COLLECTION, deleteTarget.id));
      // onSnapshot removes the row automatically
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting employee assets:", error);
      setDeleteError(
        error.code === "permission-denied"
          ? PERMISSION_MSG
          : "Could not delete this record. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const hasFilters = Boolean(searchTerm || selectedDate);

  return (
    <div className="cc-page">
      <header className="cc-topbar">
        <div className="cc-topbar-inner">
          <div className="cc-title-group">
            <button
              type="button"
              className="cc-back"
              onClick={handleBack}
              aria-label="Go back"
            >
              ←
            </button>
            <div>
              <h1>Employee Assets</h1>
              <span className="cc-subtitle">
                See what each employee is currently using
              </span>
            </div>
          </div>
          <div className="al-header-right">
            <span className="al-total-badge">
              Total: <strong>{filteredRecords.length}</strong>
            </span>
            <button
              type="button"
              className="cc-btn cc-btn-primary"
              onClick={handleAdd}
            >
              + Add Employee Assets
            </button>
          </div>
        </div>
      </header>

      <motion.main
        className="cc-container"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Filters */}
        <section className="cc-card al-controls">
          <div className="al-search-wrap">
            <svg
              className="al-search-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path
                fill="#64748b"
                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
            <input
              type="text"
              className="al-search-input"
              placeholder="Search by employee name or item..."
              value={searchTerm}
              onChange={handleSearchChange}
              aria-label="Search employee assets"
            />
          </div>

          <div className="al-filter">
            <label htmlFor="assetDateFilter">Date:</label>
            <input
              id="assetDateFilter"
              type="date"
              className="al-date-input"
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              className="cc-btn cc-btn-ghost cc-btn-sm"
              onClick={handleResetFilters}
            >
              Reset
            </button>
          )}
        </section>

        {/* Table */}
        <section className="cc-card al-table-card">
          {loading ? (
            <div className="al-state-box">
              <div className="al-spinner" />
              <p>Loading records…</p>
            </div>
          ) : loadError ? (
            <div className="al-state-box">
              <div className="cc-banner cc-banner-error" role="alert">
                {loadError}
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="al-state-box">
              <p>
                {records.length === 0
                  ? "No employee assets recorded yet. Click “Add Employee Assets” to create the first record."
                  : "No records match your search or filter."}
              </p>
            </div>
          ) : (
            <>
              <div className="al-table-wrap">
                <table className="al-table">
                  <thead>
                    <tr>
                      <th className="al-col-sl">Sl No</th>
                      <th>Employee Name</th>
                      <th className="al-col-date">Date</th>
                      <th className="al-col-items">Items</th>
                      <th className="al-col-user">Created By</th>
                      <th className="al-col-actions">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((record, index) => {
                      const serialNo =
                        (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                      const items = Array.isArray(record.items)
                        ? record.items
                        : [];
                      const isOpen = expandedId === record.id;

                      return (
                        <tr key={record.id}>
                          <td className="al-col-sl">{serialNo}</td>
                          <td className="al-col-name">
                            {record.employeeName || "-"}
                          </td>
                          <td className="al-col-date">
                            {formatDate(record.assignedDate)}
                          </td>
                          <td className="al-col-items">
                            <button
                              type="button"
                              className="al-items-toggle"
                              aria-expanded={isOpen}
                              onClick={() =>
                                setExpandedId(isOpen ? null : record.id)
                              }
                            >
                              {items.length}{" "}
                              {items.length === 1 ? "item" : "items"}
                              <span
                                className={`al-chevron ${isOpen ? "open" : ""}`}
                                aria-hidden="true"
                              >
                                ▾
                              </span>
                            </button>

                            {isOpen ? (
                              <ul className="al-items-list">
                                {items.map((item, i) => (
                                  <li key={i}>
                                    <span className="al-item-name">
                                      {item.description}
                                    </span>
                                    <span className="al-item-qty">
                                      × {item.quantity}
                                    </span>
                                    {item.remarks && (
                                      <span className="al-item-remarks">
                                        {item.remarks}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              items.length > 0 && (
                                <span className="al-items-preview">
                                  {items[0].description}
                                  {items.length > 1
                                    ? ` +${items.length - 1} more`
                                    : ""}
                                </span>
                              )
                            )}
                          </td>
                          <td className="al-col-user">
                            {record.createdBy || "System"}
                          </td>
                          <td className="al-col-actions">
                            <div className="al-actions">
                              <button
                                type="button"
                                className="al-action-btn al-edit-btn"
                                title="Edit"
                                aria-label={`Edit assets for ${record.employeeName}`}
                                onClick={() => handleEdit(record)}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="16"
                                  height="16"
                                  aria-hidden="true"
                                >
                                  <path
                                    fill="currentColor"
                                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                                  />
                                </svg>
                              </button>
                              {/* <button
                                type="button"
                                className="al-action-btn al-delete-btn"
                                title="Delete"
                                aria-label={`Delete assets for ${record.employeeName}`}
                                onClick={() => setDeleteTarget(record)}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="16"
                                  height="16"
                                  aria-hidden="true"
                                >
                                  <path
                                    fill="currentColor"
                                    d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                                  />
                                </svg>
                              </button> */}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="al-pagination">
                <span className="al-pagination-info">
                  Showing{" "}
                  <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{" "}
                  <strong>
                    {Math.min(
                      currentPage * ITEMS_PER_PAGE,
                      filteredRecords.length,
                    )}
                  </strong>{" "}
                  of <strong>{filteredRecords.length}</strong> entries
                </span>

                <div className="al-pagination-controls">
                  <button
                    type="button"
                    className="al-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    &laquo; Prev
                  </button>

                  {pageNumbers.map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      className={`al-page-num ${
                        currentPage === pageNum ? "active" : ""
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="al-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next &raquo;
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </motion.main>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="al-modal-overlay"
          role="presentation"
          onClick={() => {
            if (!isDeleting) closeDeleteModal();
          }}
        >
          <div
            className="al-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="al-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="al-delete-title" className="al-modal-title">
              Delete this record?
            </h2>
            <p className="al-modal-text">
              You are about to permanently delete the assets recorded for{" "}
              <strong>{deleteTarget.employeeName || "this employee"}</strong>
              {deleteTarget.assignedDate
                ? ` on ${formatDate(deleteTarget.assignedDate)}`
                : ""}
              . This cannot be undone.
            </p>
            {deleteError && (
              <p className="al-modal-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="al-modal-actions">
              <button
                type="button"
                className="al-modal-btn al-modal-cancel"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="al-modal-btn al-modal-confirm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetList;
