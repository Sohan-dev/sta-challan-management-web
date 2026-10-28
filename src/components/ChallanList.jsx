import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/config"; // Adjust import path if needed
import "../styles/ChallanList.css";
import "../styles/ChallanListActions.css";

const ITEMS_PER_PAGE = 10;

function ChallanList() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // --- Edit / delete / back additions ---
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username;
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const challansRef = collection(db, "challans");
    const q = query(challansRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedChallans = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setChallans(fetchedChallans);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching challans:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Format Firestore Timestamp or ISO Date string
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Convert timestamp to YYYY-MM-DD format for date filter comparison
  const getDateString = (timestamp) => {
    if (!timestamp) return "";
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Reset to page 1 whenever filters change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
    setCurrentPage(1);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedType("ALL");
    setSelectedDate("");
    setCurrentPage(1);
  };

  // Filtered dataset memoized
  const filteredChallans = useMemo(() => {
    return challans.filter((challan) => {
      // Fix: priority given to challanNo, then fallbacks
      const cNo = (
        challan.challanNo ||
        challan.challanNumber ||
        ""
      ).toLowerCase();
      const sender = (challan.senderName || "").toLowerCase();
      const receiver = (challan.receiverName || "").toLowerCase();
      const createdBy = (challan.createdBy || "").toLowerCase();
      const term = searchTerm.toLowerCase();

      // Search term match
      const matchesSearch =
        cNo.includes(term) ||
        sender.includes(term) ||
        receiver.includes(term) ||
        createdBy.includes(term);

      // Type match
      const challanType = (challan.type || "").toUpperCase();
      const matchesType =
        selectedType === "ALL" || challanType === selectedType.toUpperCase();

      // Date match
      const challanDateStr = getDateString(
        challan.createdAt || challan.challanDate,
      );
      const matchesDate = !selectedDate || challanDateStr === selectedDate;

      return matchesSearch && matchesType && matchesDate;
    });
  }, [challans, searchTerm, selectedType, selectedDate]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredChallans.length / ITEMS_PER_PAGE) || 1;
  const paginatedChallans = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredChallans.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredChallans, currentPage]);

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

  // Go back to wherever the user came from; fall back to the dashboard
  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate("/dashboard");
  };

  // Opens the Create Challan page in edit mode (it loads the doc by id)
  const handleEdit = (item) => {
    navigate(`/challan/edit/${item.id}`, { state: { username } });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteDoc(doc(db, "challans", deleteTarget.id));
      // onSnapshot above removes the row from the list automatically
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting challan:", error);
      setDeleteError(
        "Could not delete this challan. Check your permissions and try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="cl-page">
      {/* Separate white header: back button, title, total */}
      <header className="cl-topbar">
        <div className="cl-topbar-inner">
          <div className="cl-topbar-left">
            <button
              type="button"
              className="cl-back-btn"
              onClick={handleBack}
              aria-label="Go back"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                />
              </svg>
            </button>
            <div className="cl-topbar-text">
              <h1 className="cl-title">All Challans</h1>
              <p className="cl-subtitle">
                Manage and track generated challans in real time
              </p>
            </div>
          </div>
          <span className="cl-total-badge">
            Total: <strong>{filteredChallans.length}</strong>
          </span>
        </div>
      </header>

      <div className="cl-container">
        {/* Filter Controls */}
        <div className="cl-controls-card">
          <div className="cl-search-wrapper">
            <svg
              className="cl-search-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
            >
              <path
                fill="#64748b"
                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
            <input
              type="text"
              className="cl-input cl-search-input"
              placeholder="Search by Challan No, Sender, Receiver, Created By..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          <div className="cl-filters-group">
            <div className="cl-filter-item">
              <label htmlFor="typeFilter">Type:</label>
              <select
                id="typeFilter"
                className="cl-select"
                value={selectedType}
                onChange={handleTypeChange}
              >
                <option value="ALL">All Types</option>
                <option value="RETURNABLE">Returnable</option>
                <option value="NON-RETURNABLE">Non-Returnable</option>
              </select>
            </div>

            <div className="cl-filter-item">
              <label htmlFor="dateFilter">Date:</label>
              <input
                id="dateFilter"
                type="date"
                className="cl-input cl-date-input"
                value={selectedDate}
                onChange={handleDateChange}
              />
            </div>

            {(searchTerm || selectedType !== "ALL" || selectedDate) && (
              <button
                type="button"
                className="cl-reset-btn"
                onClick={handleResetFilters}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="cl-table-card">
          {loading ? (
            <div className="cl-state-box">
              <div className="cl-spinner"></div>
              <p>Loading Challans...</p>
            </div>
          ) : filteredChallans.length === 0 ? (
            <div className="cl-state-box">
              <p>No challans found matching your search or filter criteria.</p>
            </div>
          ) : (
            <>
              <div className="cl-table-wrapper">
                <table className="cl-table">
                  <thead>
                    <tr>
                      <th>Sl No</th>
                      <th>Challan Number</th>
                      <th>Type</th>
                      <th>Sender Name</th>
                      <th>Receiver Name</th>
                      <th>Created Date &amp; Time</th>
                      <th>Created By</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedChallans.map((item, index) => {
                      const serialNo =
                        (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                      const displayChallanNo =
                        item.challanNo || item.challanNumber || item.id;
                      const isReturnable =
                        (item.type || "").toLowerCase() === "returnable";

                      return (
                        <tr key={item.id}>
                          <td className="cl-col-sl">{serialNo}</td>
                          <td className="cl-col-no">{displayChallanNo}</td>
                          <td>
                            <span
                              className={`cl-badge ${
                                isReturnable ? "returnable" : "non-returnable"
                              }`}
                            >
                              {item.type || "N/A"}
                            </span>
                          </td>
                          <td className="cl-text-truncate">
                            {item.senderName || "-"}
                          </td>
                          <td className="cl-text-truncate">
                            {item.receiverName || "-"}
                          </td>
                          <td className="cl-col-date">
                            {formatDate(item.createdAt || item.challanDate)}
                          </td>
                          <td className="cl-col-user">
                            {item.createdBy || "System"}
                          </td>
                          <td className="cl-col-actions">
                            <div className="cl-actions">
                              <button
                                type="button"
                                className="cl-action-btn cl-edit-btn"
                                title="Edit challan"
                                aria-label={`Edit challan ${displayChallanNo}`}
                                onClick={() => handleEdit(item)}
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
                              <button
                                type="button"
                                className="cl-action-btn cl-delete-btn"
                                title="Delete challan"
                                aria-label={`Delete challan ${displayChallanNo}`}
                                onClick={() => setDeleteTarget(item)}
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
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="cl-pagination-bar">
                <span className="cl-pagination-info">
                  Showing{" "}
                  <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{" "}
                  <strong>
                    {Math.min(
                      currentPage * ITEMS_PER_PAGE,
                      filteredChallans.length,
                    )}
                  </strong>{" "}
                  of <strong>{filteredChallans.length}</strong> entries
                </span>

                <div className="cl-pagination-controls">
                  <button
                    type="button"
                    className="cl-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    &laquo; Prev
                  </button>

                  <div className="cl-page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          className={`cl-page-num ${
                            currentPage === pageNum ? "active" : ""
                          }`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    className="cl-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Next &raquo;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="cl-modal-overlay"
          role="presentation"
          onClick={() => {
            if (!isDeleting) closeDeleteModal();
          }}
        >
          <div
            className="cl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cl-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cl-delete-title" className="cl-modal-title">
              Delete this challan?
            </h2>
            <p className="cl-modal-text">
              You are about to permanently delete{" "}
              <strong>
                {deleteTarget.challanNo ||
                  deleteTarget.challanNumber ||
                  deleteTarget.id}
              </strong>
              {deleteTarget.receiverName
                ? ` issued to ${deleteTarget.receiverName}`
                : ""}
              . This cannot be undone.
            </p>
            {deleteError && (
              <p className="cl-modal-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="cl-modal-actions">
              <button
                type="button"
                className="cl-modal-btn cl-modal-cancel"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cl-modal-btn cl-modal-confirm"
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

export default ChallanList;
