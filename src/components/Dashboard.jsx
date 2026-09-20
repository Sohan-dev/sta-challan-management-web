/* eslint-disable react-hooks/immutability */
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import "../styles/Dashboard.css";
import "../styles/QuotationForm.css";
import QuotationForm from "./QuotationForm";
import {
  incrementChallanCounter,
  generateChallanNumber as utilGenerateChallan,
} from "../utils/challanUtils";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

// Firebase Firestore Imports
import { db } from "../firebase/config";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { analytics } from "../firebase/config";
import { logEvent } from "firebase/analytics";

function Dashboard({ username, onLogout }) {
  const [showNewChallan, setShowNewChallan] = useState(false);
  const [showSearchChallan, setShowSearchChallan] = useState(false);
  const [showNewQuotation, setShowNewQuotation] = useState(false);
  const [showSearchQuotation, setShowSearchQuotation] = useState(false);
  const [isSubmittingChallan, setIsSubmittingChallan] = useState(false);
  const challanPdfRef = useRef(null);
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

  // Search form state
  const [searchForm, setSearchForm] = useState({
    challanNumber: "",
    searchResults: null,
    isLoading: false,
    error: null,
  });

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // STA and STAIPL Data
  const companyData = {
    STA: {
      fullName: "StarTrack Automation",
      shortName: "STA",
      email: "startrackautomation@gmail.com",
      contact: "+91 8101274497/8334046035",
      addresses: {
        headsta:
          "Raghabpur, 608No. Last Plot, GNd FL, PO Nepalgung, PS Bishnupur, Kolkata, West Bengal, 700103.\nGSTIN 19ADYFS9856M1ZI.",
      },
    },
    STAIPL: {
      fullName: "StarTrack Automation India Pvt Ltd",
      shortName: "STAIPL",
      email: "startrackautomation@gmail.com",
      contact: "+91 8101274497/8334046035",
      addresses: {
        headstaipl:
          "Raghabpur, 608No. Last Plot, GNd FL, PO Nepalgung, PS Bishnupur, Kolkata, West Bengal, 700103.\nGSTIN 19ABKCS2524B1ZI.",
      },
    },
  };

  // Form states
  const [challanForm, setChallanForm] = useState({
    transportForm: "STA",
    type: "Returnable",
    challanNumber: "",
    currentDate: new Date().toISOString().split("T")[0],
    senderName: "",
    senderEmail: "startrackautomation@gmail.com",
    senderContact: "+91 8101274497/8334046035",
    senderAddressType: "headsta",
    senderAddress: companyData.STA.addresses.headsta,
    receiverName: "",
    receiverEmail: "",
    receiverContact: "",
    receiverAddress: "",
    items: [{ description: "", quantity: "", remarks: "" }],
    vehicleNumber: "",
    pickedBy: "",
    deliveryNote: "",
  });

  // Initialize challan data on component mount
  useEffect(() => {
    generateChallanNumber("Returnable");
    updateSenderInfo("STA");
  }, []);

  // Update current date daily
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const today = `${yyyy}-${mm}-${dd}`;

      setChallanForm((prev) => ({
        ...prev,
        currentDate: today,
      }));
    };

    updateDate();

    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  // Regenerate challan number when type changes
  useEffect(() => {
    if (challanForm.type) {
      generateChallanNumber(challanForm.type);
    }
  }, [challanForm.type]);

  // Regenerate challan number when form modal opens
  useEffect(() => {
    if (showNewChallan) {
      generateChallanNumber(challanForm.type);
    }
  }, [showNewChallan]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setChallanForm({ ...challanForm, [name]: value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...challanForm.items];
    newItems[index][field] = value;
    setChallanForm({ ...challanForm, items: newItems });
  };

  const addItemRow = () => {
    setChallanForm({
      ...challanForm,
      items: [
        ...challanForm.items,
        { description: "", quantity: "", remarks: "" },
      ],
    });
  };

  const removeItemRow = (index) => {
    const newItems = challanForm.items.filter((_, i) => i !== index);
    setChallanForm({ ...challanForm, items: newItems });
  };

  const generateChallanNumber = (challanType = null) => {
    const type = challanType || challanForm.type;
    const challanNum = utilGenerateChallan(type);
    setChallanForm((prevForm) => ({ ...prevForm, challanNumber: challanNum }));
  };

  const updateSenderInfo = (transportValue = null) => {
    const transport = transportValue || challanForm.transportForm;
    const company = companyData[transport];

    let addressType = "headsta";
    let address = company.addresses.headsta || "";

    if (transport === "STAIPL") {
      addressType = "headstaipl";
      address = company.addresses.headstaipl || "";
    }

    setChallanForm({
      ...challanForm,
      transportForm: transport,
      senderName: company.fullName,
      senderEmail: company.email,
      senderContact: company.contact,
      senderAddressType: addressType,
      senderAddress: address,
    });
  };

  const updateSenderAddress = (addressType) => {
    const transport = challanForm.transportForm;
    const company = companyData[transport];

    let address = "";
    let isReadOnly = true;

    if (addressType === "manual") {
      address = "";
      isReadOnly = false;
    } else {
      address = company.addresses[addressType] || "";
      isReadOnly = true;
    }

    setChallanForm({
      ...challanForm,
      senderAddressType: addressType,
      senderAddress: address,
    });
  };

  const handleSubmitChallan = async (e) => {
    e.preventDefault();

    if (isSubmittingChallan) {
      alert("Submission in progress. Please wait...");
      return;
    }

    setIsSubmittingChallan(true);

    try {
      const data = {
        challanNo: challanForm.challanNumber,
        transportForm: challanForm.transportForm,
        type: challanForm.type,
        challanDate: challanForm.currentDate,
        senderName: challanForm.senderName,
        senderEmail: challanForm.senderEmail,
        senderContact: challanForm.senderContact,
        senderAddress: challanForm.senderAddress,
        receiverName: challanForm.receiverName,
        receiverEmail: challanForm.receiverEmail,
        receiverContact: challanForm.receiverContact,
        receiverAddress: challanForm.receiverAddress,
        items: challanForm.items,
        vehicleNumber: challanForm.vehicleNumber,
        pickedBy: challanForm.pickedBy,
        deliveryNote: challanForm.deliveryNote,
      };

      const response = await fetch("http://localhost:3002/save-challan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        await generateChallanPDF(data);

        alert(`Challan ${challanForm.challanNumber} saved successfully!`);

        const newType = challanForm.type;
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");

        const newChallanNumber = utilGenerateChallan(newType);

        setChallanForm({
          transportForm: challanForm.transportForm,
          type: newType,
          challanNumber: newChallanNumber,
          currentDate: `${yyyy}-${mm}-${dd}`,
          senderName: challanForm.senderName,
          senderEmail: challanForm.senderEmail,
          senderContact: challanForm.senderContact,
          senderAddressType: challanForm.senderAddressType,
          senderAddress: challanForm.senderAddress,
          receiverName: "",
          receiverEmail: "",
          receiverContact: "",
          receiverAddress: "",
          items: [{ description: "", quantity: "", remarks: "" }],
          vehicleNumber: "",
          pickedBy: "",
          deliveryNote: "",
        });

        setTimeout(() => {
          setIsSubmittingChallan(false);
          setShowNewChallan(false);
        }, 100);
      } else {
        setIsSubmittingChallan(false);
        alert(`Error: ${result.error || "Failed to save challan"}`);
      }
    } catch (error) {
      setIsSubmittingChallan(false);
      console.error("Error saving challan:", error);
      alert(
        `Connection error: ${error.message}. Make sure backend server is running on http://localhost:3002`,
      );
    }
  };

  const generateChallanPDF = async (challanData) => {
    const getFullCompanyName = (shortForm) => {
      if (shortForm === "STA") return "StarTrack Automation";
      if (shortForm === "STAIPL") return "StarTrack Automation India Pvt Ltd";
      return shortForm;
    };

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let yPosition = margin;

    pdf.setFontSize(15);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(208, 2, 245);
    pdf.text("DELIVERY CHALLAN", margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(20);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(0, 0, 0);
    const companyData = getFullCompanyName(challanData.transportForm);
    pdf.text(companyData, margin, yPosition);

    const isSTAlogo = challanData.transportForm === "STA";
    const logoSize = isSTAlogo ? 26 : 33;
    const logoHeight = isSTAlogo ? 21 : 20;
    const logoX = pageWidth - margin - logoSize;
    const logoY = yPosition - 17;

    try {
      const logoPath = isSTAlogo
        ? "/sta-logo/sta-logo.png"
        : "/sta-logo/staipl-logo.png";
      pdf.addImage(logoPath, "PNG", logoX, logoY, logoSize, logoHeight);
    } catch (error) {
      console.log("Logo not added to PDF:", error);
    }

    yPosition += 8;

    pdf.setDrawColor(79, 70, 229);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, margin + contentWidth, yPosition);
    yPosition += 10;

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(79, 70, 229);
    pdf.text("CHALLAN DETAILS:", margin, yPosition);
    yPosition += 7;

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);

    pdf.setDrawColor(80, 80, 80);
    pdf.rect(margin, yPosition, contentWidth, 24);

    pdf.text(`Challan No: ${challanData.challanNo}`, margin + 3, yPosition + 6);
    pdf.text(
      `Date: ${challanData.challanDate}`,
      margin + contentWidth / 2,
      yPosition + 6,
    );

    pdf.text(
      `Transport From: ${getFullCompanyName(challanData.transportForm)}`,
      margin + 3,
      yPosition + 12,
    );
    pdf.text(
      `Type: ${challanData.type}`,
      margin + contentWidth / 2,
      yPosition + 12,
    );

    pdf.text(
      `Vehicle No: ${challanData.vehicleNumber}`,
      margin + 3,
      yPosition + 18,
    );
    pdf.text(
      `Picked By: ${challanData.pickedBy}`,
      margin + contentWidth / 2,
      yPosition + 18,
    );
    yPosition += 28;

    const infoBoxHeight = 45;
    pdf.setDrawColor(80, 80, 80);
    pdf.rect(margin, yPosition, contentWidth / 2 - 5, infoBoxHeight);

    pdf.setFillColor(79, 70, 229);
    pdf.rect(margin, yPosition, contentWidth / 2 - 5, 7, "F");

    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("Consignor Information:", margin + 2, yPosition + 5);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(8);

    let consignorY = yPosition + 12;
    pdf.text(`Name: ${challanData.senderName}`, margin + 2, consignorY);
    consignorY += 5;
    pdf.text(`Email: ${challanData.senderEmail}`, margin + 2, consignorY);
    consignorY += 5;
    pdf.text(`Contact: ${challanData.senderContact}`, margin + 2, consignorY);
    consignorY += 5;

    const consignorAddressLines = pdf.splitTextToSize(
      challanData.senderAddress,
      contentWidth / 2 - 10,
    );
    pdf.text("Address:", margin + 2, consignorY);
    consignorY += 4;
    pdf.text(consignorAddressLines, margin + 2, consignorY);

    pdf.setDrawColor(80, 80, 80);
    pdf.rect(
      margin + contentWidth / 2 + 5,
      yPosition,
      contentWidth / 2 - 5,
      infoBoxHeight,
    );

    pdf.setFillColor(79, 70, 229);
    pdf.rect(
      margin + contentWidth / 2 + 5,
      yPosition,
      contentWidth / 2 - 5,
      7,
      "F",
    );

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(
      "Consignee Information:",
      margin + contentWidth / 2 + 7,
      yPosition + 5,
    );
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(8);

    let consigneeY = yPosition + 12;
    pdf.text(
      `Name: ${challanData.receiverName}`,
      margin + contentWidth / 2 + 7,
      consigneeY,
    );
    consigneeY += 5;
    pdf.text(
      `Email: ${challanData.receiverEmail}`,
      margin + contentWidth / 2 + 7,
      consigneeY,
    );
    consigneeY += 5;
    pdf.text(
      `Contact: ${challanData.receiverContact}`,
      margin + contentWidth / 2 + 7,
      consigneeY,
    );
    consigneeY += 5;

    const consigneeAddressLines = pdf.splitTextToSize(
      challanData.receiverAddress,
      contentWidth / 2 - 10,
    );
    pdf.text("Address:", margin + contentWidth / 2 + 7, consigneeY);
    consigneeY += 4;
    pdf.text(consigneeAddressLines, margin + contentWidth / 2 + 7, consigneeY);

    yPosition += infoBoxHeight + 8;

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(79, 70, 229);
    pdf.text("ITEMS:", margin, yPosition);
    yPosition += 5;

    const col1Width = 15;
    const col2Width = contentWidth - 65;
    const col3Width = 20;
    const col4Width = 30;

    const headerHeight = 6;
    pdf.setDrawColor(80, 80, 80);
    pdf.setFillColor(220, 215, 255);
    pdf.rect(margin, yPosition, col1Width, headerHeight, "F");
    pdf.rect(margin + col1Width, yPosition, col2Width, headerHeight, "F");
    pdf.rect(
      margin + col1Width + col2Width,
      yPosition,
      col3Width,
      headerHeight,
      "F",
    );
    pdf.rect(
      margin + col1Width + col2Width + col3Width,
      yPosition,
      col4Width,
      headerHeight,
      "F",
    );

    pdf.setLineWidth(0.5);
    pdf.rect(
      margin,
      yPosition,
      col1Width + col2Width + col3Width + col4Width,
      headerHeight,
    );
    pdf.line(
      margin + col1Width,
      yPosition,
      margin + col1Width,
      yPosition + headerHeight,
    );
    pdf.line(
      margin + col1Width + col2Width,
      yPosition,
      margin + col1Width + col2Width,
      yPosition + headerHeight,
    );
    pdf.line(
      margin + col1Width + col2Width + col3Width,
      yPosition,
      margin + col1Width + col2Width + col3Width,
      yPosition + headerHeight,
    );

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(8);
    pdf.setFont(undefined, "bold");
    pdf.text("Sl.No", margin + 2, yPosition + 3.5);
    pdf.text("Description", margin + col1Width + 2, yPosition + 3.5);
    pdf.text("Qty", margin + col1Width + col2Width + 2, yPosition + 3.5);
    pdf.text(
      "Remarks",
      margin + col1Width + col2Width + col3Width + 2,
      yPosition + 3.5,
    );

    yPosition += headerHeight;

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(8);
    pdf.setLineWidth(0.3);

    challanData.items.forEach((item, index) => {
      const descLines = pdf.splitTextToSize(
        item.description || "",
        col2Width - 4,
      );
      const remarkLines = pdf.splitTextToSize(
        item.remarks || "",
        col4Width - 4,
      );
      const lineCount = Math.max(descLines.length, remarkLines.length, 1);
      const rowHeight = lineCount * 4 + 2;

      if (yPosition + rowHeight > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.rect(margin, yPosition, col1Width, rowHeight);
      pdf.rect(margin + col1Width, yPosition, col2Width, rowHeight);
      pdf.rect(margin + col1Width + col2Width, yPosition, col3Width, rowHeight);
      pdf.rect(
        margin + col1Width + col2Width + col3Width,
        yPosition,
        col4Width,
        rowHeight,
      );

      pdf.line(
        margin + col1Width,
        yPosition,
        margin + col1Width,
        yPosition + rowHeight,
      );
      pdf.line(
        margin + col1Width + col2Width,
        yPosition,
        margin + col1Width + col2Width,
        yPosition + rowHeight,
      );
      pdf.line(
        margin + col1Width + col2Width + col3Width,
        yPosition,
        margin + col1Width + col2Width + col3Width,
        yPosition + rowHeight,
      );

      pdf.text((index + 1).toString(), margin + 2, yPosition + 3.5);
      pdf.text(descLines, margin + col1Width + 2, yPosition + 3.5);
      pdf.text(
        item.quantity?.toString() || "",
        margin + col1Width + col2Width + 2,
        yPosition + 3.5,
      );
      pdf.text(
        remarkLines,
        margin + col1Width + col2Width + col3Width + 2,
        yPosition + 3.5,
      );

      yPosition += rowHeight;
    });

    yPosition += 8;

    if (challanData.deliveryNote) {
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(79, 70, 229);
      pdf.text("Delivery Notes:", margin, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 5;
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(8);
      const splitNotes = pdf.splitTextToSize(
        challanData.deliveryNote,
        contentWidth,
      );
      pdf.text(splitNotes, margin, yPosition);
      yPosition += splitNotes.length * 4;
    }

    yPosition += 6;

    yPosition = pageHeight - 20;
    pdf.setDrawColor(0, 0, 0);

    pdf.line(margin, yPosition, margin + 40, yPosition);
    pdf.setFontSize(8);
    pdf.text("Consignor Signature", margin + 2, yPosition + 5);

    const rightSignatureX = margin + contentWidth - 40;
    pdf.line(rightSignatureX, yPosition, rightSignatureX + 40, yPosition);
    pdf.text("Consignee Signature", rightSignatureX + 2, yPosition + 5);

    pdf.save(`Challan_${challanData.challanNo.replace(/\//g, "_")}.pdf`);
  };

  const handleSearchInputChange = (e) => {
    const { name, value } = e.target;
    setSearchForm({ ...searchForm, [name]: value });
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();

    if (!searchForm.challanNumber.trim()) {
      setSearchForm({ ...searchForm, error: "Please enter a challan number" });
      return;
    }

    setSearchForm({ ...searchForm, isLoading: true, error: null });

    try {
      const encodedChallanNo = encodeURIComponent(searchForm.challanNumber);
      const response = await fetch(
        `http://localhost:3002/search-challan/${encodedChallanNo}`,
      );
      const data = await response.json();

      if (response.ok && data.success && data.data && data.data.length > 0) {
        const firstRow = data.data[0];

        const items = data.data.map((row) => ({
          description: row.description || "",
          quantity: row.quantity || "",
          remarks: row.remarks || "",
        }));

        const formattedData = {
          challanNo: firstRow.challanNo,
          transportForm: firstRow.transportForm,
          type: firstRow.type,
          challanDate: firstRow.challanDate,
          senderName: firstRow.senderName,
          senderEmail: firstRow.senderEmail,
          senderContact: firstRow.senderContact,
          senderAddress: firstRow.senderAddress,
          receiverName: firstRow.receiverName,
          receiverEmail: firstRow.receiverEmail,
          receiverContact: firstRow.receiverContact,
          receiverAddress: firstRow.receiverAddress,
          items: items,
          vehicleNumber: firstRow.vehicleNumber,
          pickedBy: firstRow.pickedBy,
          deliveryNote: firstRow.deliveryNote,
        };

        setSearchForm({
          ...searchForm,
          searchResults: formattedData,
          isLoading: false,
        });
      } else {
        setSearchForm({
          ...searchForm,
          error: "Challan not found. Please check the challan number.",
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Error searching challan:", error);
      setSearchForm({
        ...searchForm,
        error: `Error: ${error.message}. Make sure backend server is running on http://localhost:3002`,
        isLoading: false,
      });
    }
  };

  const resetSearch = () => {
    setSearchForm({
      challanNumber: "",
      searchResults: null,
      isLoading: false,
      error: null,
    });
  };

  const handleEditClick = () => {
    if (searchForm.searchResults) {
      setEditForm({ ...searchForm.searchResults });
      setEditMode(true);
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  const handleEditItemChange = (index, field, value) => {
    const updatedItems = [...editForm.items];
    updatedItems[index][field] = value;
    setEditForm({ ...editForm, items: updatedItems });
  };

  const handleAddEditItemRow = () => {
    setEditForm({
      ...editForm,
      items: [
        ...editForm.items,
        { description: "", quantity: "", remarks: "" },
      ],
    });
  };

  const handleRemoveEditItemRow = (index) => {
    if (editForm.items.length > 1) {
      const updatedItems = editForm.items.filter((_, i) => i !== index);
      setEditForm({ ...editForm, items: updatedItems });
    }
  };

  const handleSaveEditedChallan = async () => {
    try {
      let formattedDate = editForm.challanDate;
      if (editForm.challanDate && editForm.challanDate.includes("T")) {
        formattedDate = editForm.challanDate.split("T")[0];
      }

      const data = {
        transportForm: editForm.transportForm,
        type: editForm.type,
        challanDate: formattedDate,
        senderName: editForm.senderName,
        senderEmail: editForm.senderEmail,
        senderContact: editForm.senderContact,
        senderAddress: editForm.senderAddress,
        receiverName: editForm.receiverName,
        receiverEmail: editForm.receiverEmail,
        receiverContact: editForm.receiverContact,
        receiverAddress: editForm.receiverAddress,
        items: editForm.items,
        vehicleNumber: editForm.vehicleNumber,
        pickedBy: editForm.pickedBy,
        deliveryNote: editForm.deliveryNote,
      };

      const encodedChallanNo = encodeURIComponent(editForm.challanNo);

      const response = await fetch(
        `http://localhost:3002/update-challan/${encodedChallanNo}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      const result = await response.json();

      if (result.success) {
        alert(`Challan ${editForm.challanNo} updated successfully!`);
        setSearchForm({ ...searchForm, searchResults: editForm });
        setEditMode(false);
        setEditForm(null);
      } else {
        alert(`Error: ${result.error || "Failed to update challan"}`);
      }
    } catch (error) {
      console.error("Error updating challan:", error);
      alert(`Connection error: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditForm(null);
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

      {/* New Challan Modal */}
      {showNewChallan && (
        <div className="modal-overlay" onClick={() => setShowNewChallan(false)}>
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Create Challan</h2>
              <div className="header-buttons">
                <button
                  type="submit"
                  form="challan-form"
                  className="btn-submit"
                  disabled={isSubmittingChallan}
                >
                  {isSubmittingChallan ? "Submitting..." : "Submit"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowNewChallan(false)}
                  disabled={isSubmittingChallan}
                >
                  Cancel
                </button>
                <button
                  className="close-btn"
                  onClick={() => setShowNewChallan(false)}
                  disabled={isSubmittingChallan}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="modal-body">
              <form id="challan-form" onSubmit={handleSubmitChallan}>
                <div className="form-row">
                  <div className="form-col">
                    <label>Transport Form</label>
                    <select
                      name="transportForm"
                      value={challanForm.transportForm}
                      onChange={(e) => updateSenderInfo(e.target.value)}
                      title="Transport Form"
                    >
                      <option value="STA">STA</option>
                      <option value="STAIPL">STAIPL</option>
                    </select>
                  </div>
                  <div className="form-col">
                    <label>Type</label>
                    <select
                      name="type"
                      value={challanForm.type}
                      onChange={(e) => {
                        setChallanForm({
                          ...challanForm,
                          type: e.target.value,
                        });
                        generateChallanNumber(e.target.value);
                      }}
                      title="Challan Type"
                    >
                      <option value="Returnable">Returnable</option>
                      <option value="Non-Returnable">Non-Returnable</option>
                    </select>
                  </div>
                  <div className="form-col">
                    <label>Challan Number</label>
                    <input
                      type="text"
                      name="challanNumber"
                      value={challanForm.challanNumber}
                      readOnly
                      title="Challan Number"
                      placeholder="Auto-generated"
                    />
                  </div>
                  <div className="form-col">
                    <label>Date</label>
                    <input
                      type="text"
                      name="currentDate"
                      value={challanForm.currentDate}
                      readOnly
                      title="Current Date"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-col-half">
                    <div className="form-box">
                      <div className="section-title">Sender Information</div>
                      <label>Name</label>
                      <input
                        type="text"
                        name="senderName"
                        value={challanForm.senderName}
                        readOnly
                        title="Sender Name"
                        placeholder="Sender Name"
                      />
                      <label>Email</label>
                      <input
                        type="email"
                        name="senderEmail"
                        value={challanForm.senderEmail}
                        onChange={handleInputChange}
                        title="Sender Email"
                        placeholder="Sender Email"
                      />
                      <label>Contact No.</label>
                      <input
                        type="text"
                        name="senderContact"
                        value={challanForm.senderContact}
                        readOnly
                        title="Sender Contact"
                        placeholder="Sender Contact"
                      />
                      <label>Address</label>
                      <select
                        name="senderAddressType"
                        value={challanForm.senderAddressType}
                        onChange={(e) => updateSenderAddress(e.target.value)}
                        title="Sender Address Type"
                      >
                        <option value="manual">Enter your address</option>
                        {challanForm.transportForm === "STA" && (
                          <option value="headsta">Head STA</option>
                        )}
                        {challanForm.transportForm === "STAIPL" && (
                          <option value="headstaipl">Head STAIPL</option>
                        )}
                      </select>
                      <textarea
                        name="senderAddress"
                        value={challanForm.senderAddress}
                        onChange={handleInputChange}
                        rows="2"
                        readOnly={challanForm.senderAddressType !== "manual"}
                        title="Sender Address"
                        placeholder="Sender Address"
                      />
                    </div>
                  </div>
                  <div className="form-col-half">
                    <div className="form-box">
                      <div className="section-title">Receiver Information</div>
                      <label>Name</label>
                      <input
                        type="text"
                        name="receiverName"
                        value={challanForm.receiverName}
                        onChange={handleInputChange}
                        title="Receiver Name"
                        placeholder="Receiver Name"
                      />
                      <label>Email</label>
                      <input
                        type="email"
                        name="receiverEmail"
                        value={challanForm.receiverEmail}
                        onChange={handleInputChange}
                        title="Receiver Email"
                        placeholder="Receiver Email"
                      />
                      <label>Contact No.</label>
                      <input
                        type="text"
                        name="receiverContact"
                        value={challanForm.receiverContact}
                        onChange={handleInputChange}
                        title="Receiver Contact"
                        placeholder="Receiver Contact"
                      />
                      <label>Address</label>
                      <textarea
                        name="receiverAddress"
                        value={challanForm.receiverAddress}
                        onChange={handleInputChange}
                        rows="2"
                        title="Receiver Address"
                        placeholder="Receiver Address"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-box">
                  <div className="section-title">Item List</div>
                  <table className="item-table">
                    <thead>
                      <tr>
                        <th className="item-serial">Sl No</th>
                        <th className="item-desc">Description</th>
                        <th className="item-small">Quantity</th>
                        <th className="item-small">Remarks</th>
                        <th className="item-action">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {challanForm.items.map((item, index) => (
                        <tr key={index}>
                          <td className="item-serial">{index + 1}</td>
                          <td>
                            <textarea
                              className="item-desc"
                              value={item.description}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "description",
                                  e.target.value,
                                )
                              }
                              required
                              title="Description"
                              placeholder="Description"
                              rows="1"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="item-small"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                              required
                              title="Quantity"
                              placeholder="Quantity"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="item-small"
                              value={item.remarks}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "remarks",
                                  e.target.value,
                                )
                              }
                              title="Remarks"
                              placeholder="Remarks"
                            />
                          </td>
                          <td className="item-action">
                            {challanForm.items.length > 1 && (
                              <button
                                type="button"
                                className="btn-remove"
                                onClick={() => removeItemRow(index)}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    className="btn btn-add"
                    onClick={addItemRow}
                  >
                    + Add Item
                  </button>
                </div>

                <div className="form-row">
                  <div className="form-col-half">
                    <div className="form-box">
                      <label>Vehicle Number</label>
                      <input
                        type="text"
                        name="vehicleNumber"
                        value={challanForm.vehicleNumber}
                        onChange={handleInputChange}
                        placeholder="Vehicle Number"
                      />
                    </div>
                  </div>
                  <div className="form-col-half">
                    <div className="form-box">
                      <label>Picked By</label>
                      <input
                        type="text"
                        name="pickedBy"
                        value={challanForm.pickedBy}
                        onChange={handleInputChange}
                        placeholder="Picked By"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-box">
                  <label>Delivery Note</label>
                  <textarea
                    name="deliveryNote"
                    value={challanForm.deliveryNote}
                    onChange={handleInputChange}
                    rows="2"
                    title="Delivery Note"
                    placeholder="Delivery Note"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Search Challan Modal */}
      {showSearchChallan && (
        <div
          className="modal-overlay"
          onClick={() => setShowSearchChallan(false)}
        >
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Search Challan</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowSearchChallan(false);
                  resetSearch();
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSearchSubmit}>
                <div className="form-box">
                  <label>Challan Number</label>
                  <input
                    type="text"
                    name="challanNumber"
                    value={searchForm.challanNumber}
                    onChange={handleSearchInputChange}
                    placeholder="Enter challan number (e.g., STAI/122225/01/RR)"
                    title="Challan Number"
                  />
                </div>

                {searchForm.error && (
                  <div className="error-message">{searchForm.error}</div>
                )}

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={searchForm.isLoading}
                  >
                    {searchForm.isLoading ? "Searching..." : "Search"}
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowSearchChallan(false);
                      resetSearch();
                    }}
                  >
                    Close
                  </button>
                </div>

                {searchForm.searchResults && (
                  <div className="search-results-container">
                    <h3>Search Results</h3>

                    <div className="result-section">
                      <div className="result-row">
                        <div className="result-col">
                          <strong>Challan Number:</strong>{" "}
                          {searchForm.searchResults.challanNo}
                        </div>
                        <div className="result-col">
                          <strong>Date:</strong>{" "}
                          {searchForm.searchResults.challanDate}
                        </div>
                      </div>
                      <div className="result-row">
                        <div className="result-col">
                          <strong>Type:</strong> {searchForm.searchResults.type}
                        </div>
                        <div className="result-col">
                          <strong>Transport:</strong>{" "}
                          {searchForm.searchResults.transportForm}
                        </div>
                      </div>
                    </div>

                    <div className="result-section">
                      <h4>Sender Information</h4>
                      <div className="result-row">
                        <div className="result-col">
                          <strong>Name:</strong>{" "}
                          {searchForm.searchResults.senderName}
                        </div>
                        <div className="result-col">
                          <strong>Email:</strong>{" "}
                          {searchForm.searchResults.senderEmail}
                        </div>
                      </div>
                      <div className="result-row">
                        <div className="result-col">
                          <strong>Contact:</strong>{" "}
                          {searchForm.searchResults.senderContact}
                        </div>
                      </div>
                    </div>

                    <div className="result-section">
                      <h4>Receiver Information</h4>
                      <div className="result-row">
                        <div className="result-col">
                          <strong>Name:</strong>{" "}
                          {searchForm.searchResults.receiverName}
                        </div>
                        <div className="result-col">
                          <strong>Email:</strong>{" "}
                          {searchForm.searchResults.receiverEmail}
                        </div>
                      </div>
                      <div className="result-row">
                        <div className="result-col">
                          <strong>Contact:</strong>{" "}
                          {searchForm.searchResults.receiverContact}
                        </div>
                      </div>
                      <div className="result-row">
                        <div className="result-col full-width">
                          <strong>Address:</strong>
                          <p>{searchForm.searchResults.receiverAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className="result-section">
                      <h4>Items</h4>
                      <table className="item-table">
                        <thead>
                          <tr>
                            <th className="item-serial">S.No</th>
                            <th className="item-desc">Description</th>
                            <th className="item-small">Quantity</th>
                            <th className="item-small">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchForm.searchResults.items.map((item, index) => (
                            <tr key={index}>
                              <td className="item-serial">{index + 1}</td>
                              <td>{item.description}</td>
                              <td>{item.quantity}</td>
                              <td>{item.remarks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="result-section">
                      <div className="result-row">
                        <div className="result-col">
                          <strong>Vehicle Number:</strong>{" "}
                          {searchForm.searchResults.vehicleNumber}
                        </div>
                        <div className="result-col">
                          <strong>Picked By:</strong>{" "}
                          {searchForm.searchResults.pickedBy}
                        </div>
                      </div>
                      <div className="result-row">
                        <div className="result-col full-width">
                          <strong>Delivery Note:</strong>
                          <p>{searchForm.searchResults.deliveryNote}</p>
                        </div>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn-submit"
                        onClick={() =>
                          generateChallanPDF(searchForm.searchResults)
                        }
                      >
                        Download PDF
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleEditClick}
                      >
                        ✏️ Edit Challan
                      </button>
                    </div>
                  </div>
                )}

                {!searchForm.searchResults &&
                  !searchForm.isLoading &&
                  !searchForm.error && (
                    <div className="no-results">
                      <p>
                        Enter a challan number and click Search to view details
                      </p>
                    </div>
                  )}
              </form>

              {editMode && editForm && (
                <div className="modal-overlay" onClick={handleCancelEdit}>
                  <div
                    className="modal-content modal-large"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="modal-header">
                      <h2>Edit Challan - {editForm.challanNo}</h2>
                      <button className="close-btn" onClick={handleCancelEdit}>
                        ✕
                      </button>
                    </div>
                    <div className="modal-body">
                      <form>
                        <div className="form-row">
                          <div className="form-col-half">
                            <div className="form-box">
                              <div className="section-title">
                                Sender Information
                              </div>
                              <label>Name</label>
                              <input
                                type="text"
                                name="senderName"
                                value={editForm.senderName}
                                onChange={handleEditInputChange}
                                placeholder="Sender Name"
                              />
                              <label>Email</label>
                              <input
                                type="email"
                                name="senderEmail"
                                value={editForm.senderEmail}
                                onChange={handleEditInputChange}
                                placeholder="Sender Email"
                              />
                              <label>Contact No.</label>
                              <input
                                type="text"
                                name="senderContact"
                                value={editForm.senderContact}
                                onChange={handleEditInputChange}
                                placeholder="Sender Contact"
                              />
                              <label>Address</label>
                              <textarea
                                name="senderAddress"
                                value={editForm.senderAddress}
                                onChange={handleEditInputChange}
                                rows="2"
                                placeholder="Sender Address"
                              />
                            </div>
                          </div>
                          <div className="form-col-half">
                            <div className="form-box">
                              <div className="section-title">
                                Receiver Information
                              </div>
                              <label>Name</label>
                              <input
                                type="text"
                                name="receiverName"
                                value={editForm.receiverName}
                                onChange={handleEditInputChange}
                                placeholder="Receiver Name"
                              />
                              <label>Email</label>
                              <input
                                type="email"
                                name="receiverEmail"
                                value={editForm.receiverEmail}
                                onChange={handleEditInputChange}
                                placeholder="Receiver Email"
                              />
                              <label>Contact No.</label>
                              <input
                                type="text"
                                name="receiverContact"
                                value={editForm.receiverContact}
                                onChange={handleEditInputChange}
                                placeholder="Receiver Contact"
                              />
                              <label>Address</label>
                              <textarea
                                name="receiverAddress"
                                value={editForm.receiverAddress}
                                onChange={handleEditInputChange}
                                rows="2"
                                placeholder="Receiver Address"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="form-box">
                          <div className="section-title">Item List</div>
                          <table className="item-table">
                            <thead>
                              <tr>
                                <th className="item-serial">Sl No</th>
                                <th className="item-desc">Description</th>
                                <th className="item-small">Quantity</th>
                                <th className="item-small">Remarks</th>
                                <th className="item-action">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {editForm.items.map((item, index) => (
                                <tr key={index}>
                                  <td className="item-serial">{index + 1}</td>
                                  <td>
                                    <textarea
                                      className="item-desc"
                                      value={item.description}
                                      onChange={(e) =>
                                        handleEditItemChange(
                                          index,
                                          "description",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Description"
                                      rows="1"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="item-small"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        handleEditItemChange(
                                          index,
                                          "quantity",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Quantity"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="item-small"
                                      value={item.remarks}
                                      onChange={(e) =>
                                        handleEditItemChange(
                                          index,
                                          "remarks",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Remarks"
                                    />
                                  </td>
                                  <td className="item-action">
                                    {editForm.items.length > 1 && (
                                      <button
                                        type="button"
                                        className="btn-remove"
                                        onClick={() =>
                                          handleRemoveEditItemRow(index)
                                        }
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button
                            type="button"
                            className="btn btn-add"
                            onClick={handleAddEditItemRow}
                          >
                            + Add Item
                          </button>
                        </div>

                        <div className="form-row">
                          <div className="form-col-half">
                            <div className="form-box">
                              <label>Vehicle Number</label>
                              <input
                                type="text"
                                name="vehicleNumber"
                                value={editForm.vehicleNumber}
                                onChange={handleEditInputChange}
                                placeholder="Vehicle Number"
                              />
                            </div>
                          </div>
                          <div className="form-col-half">
                            <div className="form-box">
                              <label>Picked By</label>
                              <input
                                type="text"
                                name="pickedBy"
                                value={editForm.pickedBy}
                                onChange={handleEditInputChange}
                                placeholder="Picked By"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="form-box">
                          <label>Delivery Note</label>
                          <textarea
                            name="deliveryNote"
                            value={editForm.deliveryNote}
                            onChange={handleEditInputChange}
                            rows="2"
                            placeholder="Delivery Note"
                          />
                        </div>

                        <div className="form-actions">
                          <button
                            type="button"
                            className="btn-submit"
                            onClick={handleSaveEditedChallan}
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Quotation Modal */}
      {showNewQuotation && (
        <QuotationForm onClose={() => setShowNewQuotation(false)} />
      )}

      {/* Search Quotation Modal */}
      {showSearchQuotation && (
        <div
          className="modal-overlay"
          onClick={() => setShowSearchQuotation(false)}
        >
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Search Quotation</h2>
              <button
                className="close-btn"
                onClick={() => setShowSearchQuotation(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Search quotation feature coming soon...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
