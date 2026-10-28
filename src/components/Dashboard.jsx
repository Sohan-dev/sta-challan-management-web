import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import "../styles/Dashboard.css";
import "../styles/QuotationForm.css";
import QuotationForm from "./QuotationForm";
import { useNavigate } from "react-router-dom";

// Firebase Firestore Imports
import { db } from "../firebase/config";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { analytics } from "../firebase/config";
import { logEvent } from "firebase/analytics";

function Dashboard({ username, onLogout }) {
  const [showNewQuotation, setShowNewQuotation] = useState(false);
  const [showSearchQuotation, setShowSearchQuotation] = useState(false);
  const navigate = useNavigate();

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Recent Challans State
  const [recentChallans, setRecentChallans] = useState([]);
  const [recentChallansLoading, setRecentChallansLoading] = useState(true);

  // Real-time Clock interval
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Firebase Fetch for Recent Created Challans
  useEffect(() => {
    const challansRef = collection(db, "challans");
    const q = query(challansRef, orderBy("createdAt", "desc"));
    // Log custom login event to Firebase Analytics
    if (analytics) {
      logEvent(analytics, "create challan", {
        method: "challan created",
      });
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRecentChallans(fetched);
        setRecentChallansLoading(false);
      },
      (error) => {
        console.error("Error fetching recent challans:", error);
        setRecentChallansLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Greeting helper
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // User avatar helper
  const getUserInitial = () => {
    if (username) return username.charAt(0).toUpperCase();
    return "U";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <div className="dashboard-page">
      {/* Top Navigation Header */}
      <header className="db-top-header">
        <div className="db-header-container">
          <div className="db-brand">
            <span className="db-logo-icon">📋</span>
            <h2>StarTrack Automation Management Portal</h2>
          </div>

          <div className="db-user-section">
            <div className="db-avatar">{getUserInitial()}</div>
            <div className="db-user-info">
              <span className="db-user-name">{username || "User"}</span>
              <span className="db-user-role">Administrator</span>
            </div>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="db-main-container">
        {/* Hero Welcome Card */}
        <motion.div
          className="db-hero-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="db-hero-content">
            <h1>
              {getGreeting()}, {username || "User"}!
            </h1>
            <p>
              Welcome back. Here is what is happening with your operations
              today.
            </p>
          </div>

          <div className="db-clock-card">
            <div className="db-time">
              {currentTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
            <div className="db-date">
              {currentTime.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </motion.div>

        {/* Action Cards Options */}
        <motion.div
          className="dashboard-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="db-section-header">
            <h2>Select an Option</h2>
          </div>

          <motion.div
            className="options-container"
            variants={containerVariants}
          >
            <motion.div
              className="option-card challan"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="option-icon">📋</div>
              <h3>Challan</h3>
              <p>Create, track, and manage delivery challan documents</p>
              <div className="button-group">
                <button
                  className="option-btn"
                  onClick={() => {
                    navigate("/challan/new", {
                      state: { username: username },
                    });
                  }}
                >
                  New
                </button>
                <button
                  className="option-btn"
                  onClick={() => navigate("/challan/list")}
                >
                  See All Challans
                </button>
              </div>
            </motion.div>

            <motion.div
              className="option-card quotation"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="option-icon">💰</div>
              <h3>Quotation</h3>
              <p>Create and manage official client price quotations</p>
              <div className="button-group">
                <button
                  className="option-btn"
                  onClick={() => setShowNewQuotation(true)}
                >
                  New
                </button>
                <button
                  className="option-btn"
                  onClick={() => setShowSearchQuotation(true)}
                >
                  Search
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* RECENT CREATED CHALLANS TABLE SECTION */}
        <motion.div
          className="db-recent-section"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="db-section-header">
            <h2>Recent Created Challans</h2>
          </div>

          <div className="recent-challans-card">
            {recentChallansLoading ? (
              <div className="loading-spinner">Loading recent challans...</div>
            ) : (
              <div className="recent-table-wrapper">
                <table className="recent-challan-table">
                  <thead>
                    <tr>
                      <th>Sl No</th>
                      <th>Challan Number</th>
                      <th>Type</th>
                      <th>Sender Name</th>
                      <th>Receiver Name</th>
                      <th>Created Date &amp; Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentChallans.length > 0 ? (
                      recentChallans.map((challan, index) => (
                        <tr key={challan.id || index}>
                          <td>{index + 1}</td>
                          <td className="challan-no-cell">
                            {challan.challanNumber ||
                              challan.challanNo ||
                              challan.id}
                          </td>
                          <td>
                            <span
                              className={`type-badge ${
                                (challan.type || "")
                                  .toLowerCase()
                                  .includes("non")
                                  ? "non-returnable"
                                  : "returnable"
                              }`}
                            >
                              {challan.type || "N/A"}
                            </span>
                          </td>
                          <td>{challan.senderName || "N/A"}</td>
                          <td>{challan.receiverName || "N/A"}</td>
                          <td>
                            {challan.createdAt?.toDate
                              ? challan.createdAt.toDate().toLocaleString()
                              : challan.challanDate || "N/A"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="no-records">
                          No recent challans found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* New Quotation Modal */}
      {showNewQuotation && (
        <QuotationForm onClose={() => setShowNewQuotation(false)} />
      )}
    </div>
  );
}

export default Dashboard;
