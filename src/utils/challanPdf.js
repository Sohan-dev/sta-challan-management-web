import jsPDF from "jspdf";

const getFullCompanyName = (shortForm) => {
  if (shortForm === "STA") return "StarTrack Automation";
  if (shortForm === "STAIPL") return "StarTrack Automation India Pvt Ltd";
  return shortForm || "";
};

const safeText = (value, fallback = "-") => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return fallback;
  }
  return String(value);
};

export async function generateChallanPDF(challanData = {}) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // ----------------------------------------------------
  // PAGE LAYOUT
  // ----------------------------------------------------
  const margin = 12;
  const footerReserved = 18;
  const signatureReserved = 34;
  const contentWidth = pageWidth - margin * 2;
  const bottomContentY = pageHeight - footerReserved - signatureReserved;

  let yPosition = margin;

  // ----------------------------------------------------
  // COLORS
  // ----------------------------------------------------
  const primaryColor = [79, 70, 229];
  const darkTextColor = [30, 41, 59];
  const mutedTextColor = [100, 116, 139];
  const lightBgColor = [248, 250, 252];
  const borderColor = [203, 213, 225];
  const white = [255, 255, 255];

  // ----------------------------------------------------
  // HELPER UTILS
  // ----------------------------------------------------
  const setBodyFont = () => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...darkTextColor);
  };

  const checkPageBreak = (neededHeight) => {
    if (yPosition + neededHeight <= bottomContentY) {
      return false;
    }
    pdf.addPage();
    yPosition = margin;
    return true;
  };

  const drawSectionTitle = (title) => {
    checkPageBreak(10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...primaryColor);
    pdf.text(title, margin, yPosition + 4);
    yPosition += 8;
  };

  // ====================================================
  // HEADER
  // ====================================================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...primaryColor);
  pdf.text("DELIVERY CHALLAN", margin, yPosition + 6);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...darkTextColor);
  pdf.text(
    getFullCompanyName(challanData.transportForm),
    margin,
    yPosition + 13,
  );

  // Logo
  const isSTAlogo = challanData.transportForm === "STA";
  const logoWidth = isSTAlogo ? 24 : 30;
  const logoHeight = 18;
  const logoX = pageWidth - margin - logoWidth;
  const logoY = yPosition;

  try {
    const logoPath = isSTAlogo
      ? "/sta-logo/sta-logo.png"
      : "/sta-logo/staipl-logo.png";
    pdf.addImage(logoPath, "PNG", logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.warn("Logo load error:", error);
  }

  yPosition += 18;

  // Header Divider
  pdf.setDrawColor(...primaryColor);
  pdf.setLineWidth(0.8);
  pdf.line(margin, yPosition, margin + contentWidth, yPosition);
  yPosition += 5;

  // ====================================================
  // CHALLAN DETAILS
  // ====================================================
  const detailsHeight = 23;
  pdf.setDrawColor(...borderColor);
  pdf.setFillColor(...lightBgColor);
  pdf.roundedRect(margin, yPosition, contentWidth, detailsHeight, 2, 2, "FD");

  const detailsMidX = margin + contentWidth / 2;
  const detailsLabelWidth = 29;
  const leftValueX = margin + 4 + detailsLabelWidth;
  const rightValueX = detailsMidX + 4 + detailsLabelWidth;

  const drawDetail = (label, value, x, y, valueX, maxValueWidth) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...darkTextColor);
    pdf.text(label, x, y);

    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(safeText(value), maxValueWidth);
    pdf.text(lines.slice(0, 2), valueX, y);
  };

  // Row 1
  drawDetail(
    "Challan No:",
    challanData.challanNo,
    margin + 4,
    yPosition + 6,
    leftValueX,
    detailsMidX - leftValueX - 4,
  );
  drawDetail(
    "Date:",
    challanData.challanDate,
    detailsMidX + 4,
    yPosition + 6,
    rightValueX,
    pageWidth - margin - rightValueX - 4,
  );

  // Row 2
  drawDetail(
    "Transport From:",
    getFullCompanyName(challanData.transportForm),
    margin + 4,
    yPosition + 12,
    leftValueX,
    detailsMidX - leftValueX - 4,
  );
  drawDetail(
    "Challan Type:",
    challanData.type,
    detailsMidX + 4,
    yPosition + 12,
    rightValueX,
    pageWidth - margin - rightValueX - 4,
  );

  // Row 3
  drawDetail(
    "Vehicle No:",
    challanData.vehicleNumber,
    margin + 4,
    yPosition + 18,
    leftValueX,
    detailsMidX - leftValueX - 4,
  );
  drawDetail(
    "Picked By:",
    challanData.pickedBy,
    detailsMidX + 4,
    yPosition + 18,
    rightValueX,
    pageWidth - margin - rightValueX - 4,
  );

  yPosition += detailsHeight + 7;

  // ====================================================
  // CONSIGNOR / CONSIGNEE CARDS
  // ====================================================
  const cardGap = 6;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardTitleHeight = 8;
  const cardPadding = 4;

  const labelWidth = 30; // Increased width for labels to prevent overlap
  const valueXOffset = cardPadding + labelWidth;
  const valueWidth = cardWidth - valueXOffset - cardPadding;
  const lineHeight = 4.2;
  const fieldGap = 1.5;

  const makeField = (label, value) => {
    const lines = pdf.splitTextToSize(safeText(value), valueWidth);
    return {
      label,
      lines: lines.length ? lines : ["-"],
    };
  };

  // Sender Fields
  const senderFields = [
    makeField("Name:", challanData.senderName),
    makeField("Contact:", challanData.senderContact),
    makeField("Email:", challanData.senderEmail),
    makeField("Address:", challanData.senderAddress),
    ...(challanData.senderGSTIN || challanData.senderGstin
      ? [
          makeField(
            "GSTIN:",
            challanData.senderGSTIN || challanData.senderGstin,
          ),
        ]
      : []),
  ];

  // Receiver Fields
  const receiverFields = [
    makeField(
      "Party Name:",
      challanData.partyName || challanData.receiverPartyName,
    ),
    makeField("Receiver Name:", challanData.receiverName),
    makeField("Contact Number:", challanData.receiverContact),
    makeField("Email:", challanData.receiverEmail),
    makeField("Address:", challanData.receiverAddress),
    ...(challanData.receiverGSTIN || challanData.receiverGstin
      ? [
          makeField(
            "GSTIN:",
            challanData.receiverGSTIN || challanData.receiverGstin,
          ),
        ]
      : []),
  ];

  // Calculate Card Height accurately
  const calculateCardHeight = (fields) => {
    const bodyHeight = fields.reduce(
      (total, field) =>
        total + Math.max(field.lines.length, 1) * lineHeight + fieldGap,
      0,
    );
    return Math.max(
      48,
      cardTitleHeight + cardPadding + bodyHeight + cardPadding,
    );
  };

  const senderCardHeight = calculateCardHeight(senderFields);
  const receiverCardHeight = calculateCardHeight(receiverFields);
  const cardHeight = Math.max(senderCardHeight, receiverCardHeight);

  // Draw Info Card without overlapping text
  const drawInfoCard = (x, title, fields) => {
    // Card Border
    pdf.setDrawColor(...borderColor);
    pdf.setFillColor(...white);
    pdf.roundedRect(x, yPosition, cardWidth, cardHeight, 2, 2, "D");

    // Header Box
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(x, yPosition, cardWidth, cardTitleHeight, 2, 2, "F");
    pdf.rect(x, yPosition + 5, cardWidth, 3, "F");

    // Header Title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...white);
    pdf.text(title, x + cardPadding, yPosition + 5.5);

    // Initial Start Position inside Card Body
    let fieldY = yPosition + cardTitleHeight + cardPadding + 3;

    fields.forEach((field) => {
      // Draw Field Label
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.8);
      pdf.setTextColor(...darkTextColor);
      pdf.text(field.label, x + cardPadding, fieldY);

      // Draw Wrapped Values line by line
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.8);

      field.lines.forEach((line, lineIndex) => {
        pdf.text(line, x + valueXOffset, fieldY + lineIndex * lineHeight);
      });

      // Shift dynamic field Y position by total height of all wrapped value lines
      fieldY += Math.max(field.lines.length, 1) * lineHeight + fieldGap;
    });
  };

  // Render both Cards
  drawInfoCard(margin, "CONSIGNOR (SENDER)", senderFields);
  drawInfoCard(
    margin + cardWidth + cardGap,
    "CONSIGNEE (RECEIVER)",
    receiverFields,
  );

  yPosition += cardHeight + 8;

  // ====================================================
  // ITEMS TABLE
  // ====================================================
  drawSectionTitle("ITEM DETAILS");

  const col1Width = 14;
  const col2Width = 94;
  const col3Width = 20;
  const col4Width = contentWidth - col1Width - col2Width - col3Width;

  const tableX = margin;
  const tableHeaderHeight = 8;
  const cellPadding = 2.5;
  const tableLineHeight = 4;

  const columns = {
    sl: tableX,
    description: tableX + col1Width,
    qty: tableX + col1Width + col2Width,
    remarks: tableX + col1Width + col2Width + col3Width,
    end: tableX + contentWidth,
  };

  const drawTableHeader = () => {
    pdf.setFillColor(...lightBgColor);
    pdf.setDrawColor(...borderColor);
    pdf.rect(tableX, yPosition, contentWidth, tableHeaderHeight, "FD");

    pdf.line(
      columns.description,
      yPosition,
      columns.description,
      yPosition + tableHeaderHeight,
    );
    pdf.line(
      columns.qty,
      yPosition,
      columns.qty,
      yPosition + tableHeaderHeight,
    );
    pdf.line(
      columns.remarks,
      yPosition,
      columns.remarks,
      yPosition + tableHeaderHeight,
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.8);
    pdf.setTextColor(...darkTextColor);

    pdf.text("Sl. No", columns.sl + col1Width / 2, yPosition + 5.1, {
      align: "center",
    });
    pdf.text("Description", columns.description + cellPadding, yPosition + 5.1);
    pdf.text("Qty", columns.qty + col3Width / 2, yPosition + 5.1, {
      align: "center",
    });
    pdf.text("Remarks", columns.remarks + cellPadding, yPosition + 5.1);

    yPosition += tableHeaderHeight;
  };

  const drawRowCells = (
    descLines,
    remarkLines,
    index,
    quantity,
    rowHeight,
    showRowNumber = true,
  ) => {
    pdf.setDrawColor(...borderColor);

    pdf.rect(columns.sl, yPosition, col1Width, rowHeight);
    pdf.rect(columns.description, yPosition, col2Width, rowHeight);
    pdf.rect(columns.qty, yPosition, col3Width, rowHeight);
    pdf.rect(columns.remarks, yPosition, col4Width, rowHeight);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...darkTextColor);

    if (showRowNumber) {
      pdf.text(String(index + 1), columns.sl + col1Width / 2, yPosition + 5, {
        align: "center",
      });
    }

    pdf.text(descLines, columns.description + cellPadding, yPosition + 5);
    pdf.text(
      safeText(quantity, "0"),
      columns.qty + col3Width / 2,
      yPosition + 5,
      {
        align: "center",
      },
    );
    pdf.text(remarkLines, columns.remarks + cellPadding, yPosition + 5);

    yPosition += rowHeight;
  };

  const drawTableRow = (item, index) => {
    const descLines = pdf.splitTextToSize(
      safeText(item.description),
      col2Width - cellPadding * 2,
    );
    const remarkLines = pdf.splitTextToSize(
      safeText(item.remarks),
      col4Width - cellPadding * 2,
    );

    const lineCount = Math.max(descLines.length, remarkLines.length, 1);
    const rowHeight = Math.max(8, lineCount * tableLineHeight + 4);
    const availableHeight = bottomContentY - yPosition;

    if (rowHeight <= availableHeight) {
      drawRowCells(descLines, remarkLines, index, item.quantity, rowHeight);
      return;
    }

    if (availableHeight < 12) {
      pdf.addPage();
      yPosition = margin;
      drawTableHeader();
    }

    let descIndex = 0;
    let remarkIndex = 0;
    let firstChunk = true;

    while (
      descIndex < descLines.length ||
      remarkIndex < remarkLines.length ||
      firstChunk
    ) {
      const maxLines = Math.max(
        1,
        Math.floor((bottomContentY - yPosition - 4) / tableLineHeight),
      );

      const descChunk = descLines.slice(descIndex, descIndex + maxLines);
      const remarkChunk = remarkLines.slice(
        remarkIndex,
        remarkIndex + maxLines,
      );

      const chunkLines = Math.max(descChunk.length, remarkChunk.length, 1);
      const chunkHeight = Math.max(8, chunkLines * tableLineHeight + 4);

      if (yPosition + chunkHeight > bottomContentY) {
        pdf.addPage();
        yPosition = margin;
        drawTableHeader();
        continue;
      }

      drawRowCells(
        descChunk,
        remarkChunk,
        index,
        item.quantity,
        chunkHeight,
        firstChunk,
      );

      descIndex += descChunk.length;
      remarkIndex += remarkChunk.length;
      firstChunk = false;

      if (descIndex < descLines.length || remarkIndex < remarkLines.length) {
        pdf.addPage();
        yPosition = margin;
        drawTableHeader();
      }
    }
  };

  const items = Array.isArray(challanData.items) ? challanData.items : [];

  drawTableHeader();

  if (items.length === 0) {
    drawRowCells(["-"], ["-"], 0, "0", 9);
  } else {
    items.forEach((item, index) => {
      drawTableRow(item || {}, index);
    });
  }

  // ====================================================
  // DELIVERY NOTES
  // ====================================================
  if (challanData.deliveryNote) {
    yPosition += 7;
    drawSectionTitle("DELIVERY NOTES");

    const noteLines = pdf.splitTextToSize(
      safeText(challanData.deliveryNote),
      contentWidth,
    );

    setBodyFont();

    noteLines.forEach((line) => {
      if (yPosition + 5 > bottomContentY) {
        pdf.addPage();
        yPosition = margin;
        setBodyFont();
      }
      pdf.text(line, margin, yPosition + 3.5);
      yPosition += 4.5;
    });
  }

  // ====================================================
  // SIGNATURES
  // ====================================================
  if (yPosition > pageHeight - footerReserved - 42) {
    pdf.addPage();
  }

  const sigY = pageHeight - footerReserved - 10;
  const sigWidth = 45;

  pdf.setDrawColor(...darkTextColor);
  pdf.setLineWidth(0.4);

  // Consignor
  pdf.line(margin, sigY, margin + sigWidth, sigY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...darkTextColor);
  pdf.text("Authorized Signatory", margin + sigWidth / 2, sigY + 4, {
    align: "center",
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("(Consignor)", margin + sigWidth / 2, sigY + 8, {
    align: "center",
  });

  // Consignee
  const rightSigX = margin + contentWidth - sigWidth;
  pdf.line(rightSigX, sigY, rightSigX + sigWidth, sigY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("Receiver Signature", rightSigX + sigWidth / 2, sigY + 4, {
    align: "center",
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("(Consignee)", rightSigX + sigWidth / 2, sigY + 8, {
    align: "center",
  });

  // ====================================================
  // FOOTER ON EVERY PAGE
  // ====================================================
  const totalPages = pdf.getNumberOfPages();
  const companyName = getFullCompanyName(challanData.transportForm);

  for (let i = 1; i <= totalPages; i += 1) {
    pdf.setPage(i);
    const footerY = pageHeight - 8;

    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY - 4, margin + contentWidth, footerY - 4);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...mutedTextColor);
    pdf.text(`${companyName} — Delivery Challan`, margin, footerY);
    pdf.text(`Page ${i} of ${totalPages}`, margin + contentWidth, footerY, {
      align: "right",
    });
  }

  // ====================================================
  // DOWNLOAD PDF
  // ====================================================
  const filename = `Challan_${safeText(challanData.challanNo, "doc")
    .replace(/\//g, "_")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")}.pdf`;

  pdf.save(filename);
}

export default generateChallanPDF;
