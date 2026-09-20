import jsPDF from "jspdf";

const getFullCompanyName = (shortForm) => {
  if (shortForm === "STA") return "StarTrack Automation";
  if (shortForm === "STAIPL") return "StarTrack Automation India Pvt Ltd";
  return shortForm || "";
};

/**
 * Builds and downloads the delivery challan PDF.
 * @param {object} challanData - same shape that is POSTed to /save-challan
 */
export async function generateChallanPDF(challanData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // ---- Header ----
  pdf.setFontSize(15);
  pdf.setFont(undefined, "bold");
  pdf.setTextColor(208, 2, 245);
  pdf.text("DELIVERY CHALLAN", margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(20);
  pdf.setFont(undefined, "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(getFullCompanyName(challanData.transportForm), margin, yPosition);

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

  // ---- Challan details ----
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
    `Vehicle No: ${challanData.vehicleNumber || "-"}`,
    margin + 3,
    yPosition + 18,
  );
  pdf.text(
    `Picked By: ${challanData.pickedBy || "-"}`,
    margin + contentWidth / 2,
    yPosition + 18,
  );
  yPosition += 28;

  // ---- Consignor ----
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
  pdf.text(`Name: ${challanData.senderName || ""}`, margin + 2, consignorY);
  consignorY += 5;
  pdf.text(`Email: ${challanData.senderEmail || ""}`, margin + 2, consignorY);
  consignorY += 5;
  pdf.text(
    `Contact: ${challanData.senderContact || ""}`,
    margin + 2,
    consignorY,
  );
  consignorY += 5;

  const consignorAddressLines = pdf.splitTextToSize(
    challanData.senderAddress || "",
    contentWidth / 2 - 10,
  );
  pdf.text("Address:", margin + 2, consignorY);
  consignorY += 4;
  pdf.text(consignorAddressLines, margin + 2, consignorY);

  // ---- Consignee ----
  pdf.setDrawColor(80, 80, 80);
  pdf.rect(
    margin + contentWidth / 2 + 5,
    yPosition,
    contentWidth / 2 - 5,
    infoBoxHeight,
  );
  pdf.setFillColor(79, 70, 229);
  pdf.rect(margin + contentWidth / 2 + 5, yPosition, contentWidth / 2 - 5, 7, "F");

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
    `Name: ${challanData.receiverName || ""}`,
    margin + contentWidth / 2 + 7,
    consigneeY,
  );
  consigneeY += 5;
  pdf.text(
    `Email: ${challanData.receiverEmail || ""}`,
    margin + contentWidth / 2 + 7,
    consigneeY,
  );
  consigneeY += 5;
  pdf.text(
    `Contact: ${challanData.receiverContact || ""}`,
    margin + contentWidth / 2 + 7,
    consigneeY,
  );
  consigneeY += 5;

  const consigneeAddressLines = pdf.splitTextToSize(
    challanData.receiverAddress || "",
    contentWidth / 2 - 10,
  );
  pdf.text("Address:", margin + contentWidth / 2 + 7, consigneeY);
  consigneeY += 4;
  pdf.text(consigneeAddressLines, margin + contentWidth / 2 + 7, consigneeY);

  yPosition += infoBoxHeight + 8;

  // ---- Items table ----
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

  const drawTableHeader = () => {
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
  };

  drawTableHeader();

  pdf.setFont(undefined, "normal");
  pdf.setFontSize(8);
  pdf.setLineWidth(0.3);

  (challanData.items || []).forEach((item, index) => {
    const descLines = pdf.splitTextToSize(item.description || "", col2Width - 4);
    const remarkLines = pdf.splitTextToSize(item.remarks || "", col4Width - 4);
    const lineCount = Math.max(descLines.length, remarkLines.length, 1);
    const rowHeight = lineCount * 4 + 2;

    if (yPosition + rowHeight > pageHeight - 30) {
      pdf.addPage();
      yPosition = margin;
      drawTableHeader();
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(8);
      pdf.setLineWidth(0.3);
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

    pdf.text(String(index + 1), margin + 2, yPosition + 3.5);
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

  // ---- Delivery note ----
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
  }

  // ---- Signatures ----
  yPosition = pageHeight - 20;
  pdf.setDrawColor(0, 0, 0);
  pdf.line(margin, yPosition, margin + 40, yPosition);
  pdf.setFontSize(8);
  pdf.text("Consignor Signature", margin + 2, yPosition + 5);

  const rightSignatureX = margin + contentWidth - 40;
  pdf.line(rightSignatureX, yPosition, rightSignatureX + 40, yPosition);
  pdf.text("Consignee Signature", rightSignatureX + 2, yPosition + 5);

  pdf.save(`Challan_${String(challanData.challanNo).replace(/\//g, "_")}.pdf`);
}

export default generateChallanPDF;
