import React, { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config"; // Adjust import path if needed
import "../styles/ChallanList.css";

const ITEMS_PER_PAGE = 10;

function ChallanList() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  return (
    <div className="cl-page">
      <div className="cl-container">
        {/* Header */}
        <div className="cl-header">
          <div>
            <h1 className="cl-title">All Challans</h1>
            <p className="cl-subtitle">
              Manage and track generated challans in real time
            </p>
          </div>
          <span className="cl-total-badge">
            Total: <strong>{filteredChallans.length}</strong>
          </span>
        </div>

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
    </div>
  );
}

export default ChallanList;
