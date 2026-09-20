import { useState } from 'react'
import { motion } from 'framer-motion'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import html2canvas from 'html2canvas'

// Ensure autoTable is available on jsPDF instance
if (!jsPDF.prototype.autoTable) {
  console.warn('autoTable not available, attempting to initialize')
}

export default function QuotationForm({ onClose }) {
  const [quotationData, setQuotationData] = useState({
    companyLogo: '',
    offerType: '',
    offerDescription: '',
    offerDescriptionDetail: '',
    offerFor: 'For',
    companyName: '',
    companyAddress: '',
    selectedVendor: '',
    offerReference: '',
    revNo: '',
    offerDate: new Date().toISOString().split('T')[0],
    revisedDates: [],
    preparedBy: '',
    bomItems: [{ slNo: 1, model: '', description: '', hsn: '', qty: '', uom: '', listPrice: '', maxDiscount: '', unitPrice: '', discount: '', total: '' }],
    gstRate: 18,
    isInterState: false,
    companyInfo: {
      companyName: 'STARTRACK AUTOMATION INDIA PRIVATE LIMITED',
      cin: 'U72900WB2023PTC260080',
      gstin: '19ABKCS2524B1ZI',
      pan: 'ABKCS2524B',
      msme: 'UDYAM-WB-18-0082645',
      bankName: 'ICICI BANK LIMITED',
      branchIfsc: 'ICIC0002665',
      accountNo: '266505000614',
    },
    projectDetails: {
      ref: '',
      endUser: '',
      purchaser: '',
      contractor: '',
      consultant: '',
      contactPerson: '',
    },
    priceSchedule: [
      { sn: '1', item: 'Quote', value: 'INR:', isHeader: true, subRows: [] },
      { sn: '2', item: 'P&F', value: 'Included with Normal Packing, Wooden Packing Extra.' },
      { sn: '3', item: 'Freight', value: 'Extra At Actuals.' },
      { sn: '4', item: 'Boarding & Lodging & Local Conveyance', value: "At Customer's Scope." },
      { sn: '5', item: 'GST', value: '18% Extra as applicable.' },
      { sn: '6', item: 'Payment', value: '100% advance against Proforma Invoice.' },
      { sn: '7', item: 'Delivery', value: 'Fill it as per conditions.' },
      { sn: '8', item: 'Our Scope', value: 'As per BOM.' },
      { sn: '9', item: 'Client Scope', value: 'As per Client side scope.' },
      { sn: '10', item: 'Validity', value: '30 days from the date of quotation.' },
      { sn: '11', item: 'Warranty', value: '12 months from the date of supply.' },
      { sn: '12', item: 'Inspection/Testing', value: 'At our site after receipt of material. Test Certificate & your internal inspection report will be furnished as applicable.' },
      { sn: '13', item: 'LD Clause', value: 'Not applicable.' },
      { sn: '14', item: 'Price', value: 'For Kolkata.' },
      { sn: '15', item: 'Liability', value: 'Liability of the supplier, under various clauses of the contract, shall be limited to the contract value or the amount paid by the customer or whichever is lower.' },
      { sn: '16', item: 'Indemnity', value: 'In no event shall any party (STA & ACPL) hereto be liable to the other by way of indemnity or by reasons of any breach of the contract or otherwise for any loss of profit, loss of use, loss of contracts, idle labor or for any indirect, incidental or consequential damages whatsoever that may be suffered by the other.' },
    ],
  })

  const [projectImages, setProjectImages] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [offerTypeText, setOfferTypeText] = useState('')
  const [brandLogos, setBrandLogos] = useState([])
  const [currentBrandLogoIndex, setCurrentBrandLogoIndex] = useState(0)
  const [includeBrandLogoInForm, setIncludeBrandLogoInForm] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pasteBomData, setPasteBomData] = useState('')
  const [showBomPreview, setShowBomPreview] = useState(false)
  const [parsedBomData, setParsedBomData] = useState([])
  const [bomTableColumns, setBomTableColumns] = useState(['slNo', 'description', 'make', 'qty', 'uom']) // Default

  const handleOfferChange = (field, value) => {
    setQuotationData({ ...quotationData, [field]: value })
  }

  const handleProjectDetailChange = (field, value) => {
    setQuotationData({
      ...quotationData,
      projectDetails: { ...quotationData.projectDetails, [field]: value },
    })
  }

  const handleCompanyInfoChange = (field, value) => {
    setQuotationData({
      ...quotationData,
      companyInfo: { ...quotationData.companyInfo, [field]: value },
    })
  }

  const handleBomItemChange = (index, field, value) => {
    const newItems = [...quotationData.bomItems]
    newItems[index][field] = value
    setQuotationData({ ...quotationData, bomItems: newItems })
  }

  const handlePriceScheduleChange = (index, field, value) => {
    const newSchedule = [...quotationData.priceSchedule]
    newSchedule[index][field] = value
    setQuotationData({ ...quotationData, priceSchedule: newSchedule })
  }

  const addSubRow = (mainRowIndex) => {
    const newSchedule = [...quotationData.priceSchedule]
    const subRowCount = newSchedule[mainRowIndex].subRows.length + 1
    const subRowLabel = String.fromCharCode(64 + subRowCount) // A, B, C, etc.
    newSchedule[mainRowIndex].subRows.push({ sn: `${newSchedule[mainRowIndex].sn}${subRowLabel}`, item: '', value: '' })
    setQuotationData({ ...quotationData, priceSchedule: newSchedule })
  }

  const deleteSubRow = (mainRowIndex, subRowIndex) => {
    const newSchedule = [...quotationData.priceSchedule]
    newSchedule[mainRowIndex].subRows.splice(subRowIndex, 1)
    setQuotationData({ ...quotationData, priceSchedule: newSchedule })
  }

  const handleSubRowChange = (mainRowIndex, subRowIndex, field, value) => {
    const newSchedule = [...quotationData.priceSchedule]
    newSchedule[mainRowIndex].subRows[subRowIndex][field] = value
    setQuotationData({ ...quotationData, priceSchedule: newSchedule })
  }

  const handleMultilineKeydown = (e) => {
    // Allow Ctrl+Enter or Shift+Enter to add new line, plain Enter also adds new line
    if (e.key === 'Enter') {
      // Don't prevent default - allow newline in textarea
      return
    }
  }

  const addBomItem = () => {
    const newItem = {
      slNo: quotationData.bomItems.length + 1,
      model: '',
      description: '',
      hsn: '',
      qty: '',
      uom: '',
      listPrice: '',
      maxDiscount: '',
      unitPrice: '',
      discount: '',
      total: '',
    }
    setQuotationData({
      ...quotationData,
      bomItems: [...quotationData.bomItems, newItem],
    })
  }

  const removeBomItem = (index) => {
    const newItems = quotationData.bomItems.filter((_, i) => i !== index)
    setQuotationData({ ...quotationData, bomItems: newItems })
  }

  const parseBomData = (text) => {
    const lines = text.trim().split('\n')
    const parsedItems = []
    
    // Detect header row and column positions
    let startIndex = 0
    let columnMap = {} // Maps detected column position to field name
    
    if (lines.length > 0) {
      const headerCells = lines[0].toLowerCase().split('\t').map(cell => cell.trim())
      
      // Check if first row is a header
      const isHeaderRow = headerCells.some(cell => 
        cell.includes('sl') || 
        cell.includes('description') || 
        cell.includes('model') ||
        cell.includes('make') ||
        cell.includes('qty') ||
        cell.includes('uom') ||
        cell.includes('price') ||
        cell.includes('manufacturer')
      )
      
      if (isHeaderRow) {
        startIndex = 1
        
        // Map each column position to its field type
        headerCells.forEach((cell, idx) => {
          if (cell.includes('sl') || cell.includes('no')) {
            columnMap[idx] = 'slNo'
          } else if (cell.includes('model') || cell.includes('description') || cell.includes('desc')) {
            columnMap[idx] = 'description'
          } else if (cell.includes('make') || cell.includes('manufacturer') || cell.includes('maker')) {
            columnMap[idx] = 'make'
          } else if (cell.includes('qty') || cell.includes('quantity')) {
            columnMap[idx] = 'qty'
          } else if (cell.includes('uom') || cell.includes('unit')) {
            columnMap[idx] = 'uom'
          } else if (cell.includes('price')) {
            columnMap[idx] = 'price'
          }
        })
        
        // Update bomTableColumns based on detected columns
        const detectedColumns = []
        if (columnMap[Object.keys(columnMap).find(k => columnMap[k] === 'slNo')]) detectedColumns.push('slNo')
        if (columnMap[Object.keys(columnMap).find(k => columnMap[k] === 'description')]) detectedColumns.push('description')
        if (columnMap[Object.keys(columnMap).find(k => columnMap[k] === 'make')]) detectedColumns.push('make')
        if (columnMap[Object.keys(columnMap).find(k => columnMap[k] === 'qty')]) detectedColumns.push('qty')
        if (columnMap[Object.keys(columnMap).find(k => columnMap[k] === 'uom')]) detectedColumns.push('uom')
        if (columnMap[Object.keys(columnMap).find(k => columnMap[k] === 'price')]) detectedColumns.push('price')
        
        if (detectedColumns.length > 0) {
          setBomTableColumns(detectedColumns)
        }
      }
    }
    
    let currentRow = null
    
    for (let i = startIndex; i < lines.length; i++) {
      const cells = lines[i].split('\t')
      
      if (cells.length > 0) {
        const firstCell = cells[0]?.trim() || ''
        const secondCell = cells[1]?.trim() || ''
        
        // Check if this is a category header (single text value, usually in first cell)
        const isLikelyCategory = !firstCell.match(/^\d+$/) && 
                                firstCell && 
                                cells.slice(1).every(c => !c?.trim())
        
        if (isLikelyCategory) {
          // It's a category header
          if (currentRow) {
            parsedItems.push(currentRow)
            currentRow = null
          }
          parsedItems.push({
            slNo: '',
            description: firstCell,
            make: '',
            qty: '',
            uom: '',
            price: '',
            isHeader: true
          })
        }
        // Check if this is a data row (has Sl. No. or is a continuation)
        else if (firstCell.match(/^\d+$/) || (currentRow && cells.some(c => c?.trim()))) {
          // If starting new row
          if (firstCell.match(/^\d+$/)) {
            if (currentRow) {
              parsedItems.push(currentRow)
            }
            
            // Extract data based on column map
            currentRow = {
              slNo: firstCell,
              description: '',
              make: '',
              qty: '',
              uom: '',
              price: '',
              isHeader: false
            }
            
            // Populate fields based on detected column positions
            Object.entries(columnMap).forEach(([colIndex, fieldName]) => {
              const value = cells[parseInt(colIndex)]?.trim() || ''
              if (value && fieldName !== 'slNo') { // slNo already set
                currentRow[fieldName] = value
              }
            })
          }
          // Continuation line - append to description
          else if (currentRow && firstCell) {
            currentRow.description += '\n' + firstCell
            
            // Try to extract other values from continuation
            Object.entries(columnMap).forEach(([colIndex, fieldName]) => {
              const value = cells[parseInt(colIndex)]?.trim() || ''
              if (value && !currentRow[fieldName] && fieldName !== 'slNo') {
                currentRow[fieldName] = value
              }
            })
          }
        }
      }
    }
    
    // Don't forget the last row
    if (currentRow) {
      parsedItems.push(currentRow)
    }
    
    return parsedItems
  }

  const handlePasteBomChange = (e) => {
    const text = e.target.value
    setPasteBomData(text)
    if (text.trim()) {
      setParsedBomData(parseBomData(text))
    } else {
      setParsedBomData([])
    }
  }

  const clearPasteBom = () => {
    setPasteBomData('')
    setParsedBomData([])
    setShowBomPreview(false)
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        setProjectImages([...projectImages, {
          id: Date.now() + Math.random(),
          data: event.target.result,
          name: file.name
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const deleteProjectImage = (id) => {
    const newImages = projectImages.filter((img) => img.id !== id)
    setProjectImages(newImages)
    if (currentImageIndex >= newImages.length && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  const nextImage = () => {
    if (currentImageIndex < projectImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  const handleBrandLogoUpload = (event) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setBrandLogos([
            ...brandLogos,
            { id: Date.now() + Math.random(), data: e.target.result, name: file.name },
          ])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const deleteBrandLogo = (id) => {
    const newLogos = brandLogos.filter((logo) => logo.id !== id)
    setBrandLogos(newLogos)
    if (currentBrandLogoIndex >= newLogos.length && currentBrandLogoIndex > 0) {
      setCurrentBrandLogoIndex(currentBrandLogoIndex - 1)
    }
  }

  const nextBrandLogo = () => {
    if (currentBrandLogoIndex < brandLogos.length - 1) {
      setCurrentBrandLogoIndex(currentBrandLogoIndex + 1)
    }
  }

  const prevBrandLogo = () => {
    if (currentBrandLogoIndex > 0) {
      setCurrentBrandLogoIndex(currentBrandLogoIndex - 1)
    }
  }

  const addRevisedDate = () => {
    setQuotationData({
      ...quotationData,
      revisedDates: [...quotationData.revisedDates, ''],
    })
  }

  const deleteLastRevisedDate = () => {
    if (quotationData.revisedDates.length > 0) {
      const newDates = quotationData.revisedDates.slice(0, -1)
      setQuotationData({ ...quotationData, revisedDates: newDates })
    }
  }

  const handleRevisedDateChange = (index, value) => {
    const newDates = [...quotationData.revisedDates]
    newDates[index] = value
    setQuotationData({ ...quotationData, revisedDates: newDates })
  }

  const calculateBomTotals = () => {
    let taxableAmount = 0
    quotationData.bomItems.forEach(item => {
      const total = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 0)
      taxableAmount += total
    })
    return taxableAmount
  }

  const taxableAmount = calculateBomTotals()
  const gstAmount = (taxableAmount * quotationData.gstRate) / 100
  const grandTotal = taxableAmount + gstAmount

  const handleGenerateQuotation = async () => {
    try {
      setIsGeneratingPdf(true)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let pageNum = 1

      // Determine header image based on company selection
      const headerImageName = quotationData.companyLogo === 'staipl' ? 'staiplh.png' : 'stah.png'
      const headerPath = `/header-footer/${headerImageName}`

      // Preload header image
      let headerImageData = null
      try {
        const headerImg = new Image()
        headerImg.src = headerPath
        await new Promise((resolve, reject) => {
          headerImg.onload = () => {
            headerImageData = headerImg.src
            resolve()
          }
          headerImg.onerror = reject
        })
      } catch (e) {
        console.log('Could not preload header image')
      }

      // Helper function to add header image (except on page 1)
      const addHeaderToPage = () => {
        if (pageNum === 1) return // Skip header on first page
        
        if (headerImageData) {
          try {
            const headerWidth = 180
            const headerHeight = 25
            const headerX = (pageWidth - headerWidth) / 2
            const headerY = 10
            
            pdf.addImage(headerImageData, 'PNG', headerX, headerY, headerWidth, headerHeight)
          } catch (e) {
            console.log('Could not add header image to page')
          }
        }
      }

      // Helper function to add page number
      const addPageNumber = () => {
        pdf.setFontSize(10)
        pdf.setTextColor(150)
        pdf.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 10)
      }

      // Helper function to add footer (except on page 1)
      const addFooterToPage = () => {
        if (pageNum === 1) return // Skip footer on first page
        
        const footerY = pageHeight - 15
        const footerFontSize = 8
        
        pdf.setFontSize(footerFontSize)
        pdf.setTextColor(0, 0, 0)
        
        // Footer background line
        pdf.setDrawColor(200, 200, 200)
        pdf.line(10, pageHeight - 20, pageWidth - 10, pageHeight - 20)
        
        // Left: Purchaser
        const purchaserText = `Purchaser: ${quotationData.projectDetails.purchaser || 'N/A'}`
        pdf.text(purchaserText, 10, footerY)
        
        // Center: Reference (first line)
        const refText = `Ref: ${quotationData.offerReference || 'N/A'}`
        const refWidth = pdf.getStringUnitWidth(refText) * footerFontSize / pdf.internal.scaleFactor
        pdf.text(refText, pageWidth / 2 - refWidth / 2, footerY)
        
        // Right: Revision
        const revText = `Rev: ${quotationData.revNo || '00'}`
        const revWidth = pdf.getStringUnitWidth(revText) * footerFontSize / pdf.internal.scaleFactor
        pdf.text(revText, pageWidth - 10 - revWidth, footerY)
        
        // Second line: Date (center), Project (left), Page number (right)
        const secondLineY = pageHeight - 10
        const projectText = `Project: ${quotationData.offerDescription || 'N/A'}`
        pdf.text(projectText, 10, secondLineY)
        
        // Center: Date (second line)
        const dateText = `Date: ${quotationData.offerDate}`
        const dateWidth = pdf.getStringUnitWidth(dateText) * footerFontSize / pdf.internal.scaleFactor
        pdf.text(dateText, pageWidth / 2 - dateWidth / 2, secondLineY)
        
        // Page number (right side)
        const pageText = `Page No. ${pageNum}`
        const pageWidth_num = pdf.getStringUnitWidth(pageText) * footerFontSize / pdf.internal.scaleFactor
        pdf.text(pageText, pageWidth - 10 - pageWidth_num, secondLineY)
      }

      // Page 1: Cover Page with Logo, Offer Details, Project Details
      const logoFileName = quotationData.companyLogo === 'staipl' ? 'staipl-logo.png' : 'sta-logo.png'
      const logoPath = `/sta-logo/${logoFileName}`

      // Add logo - larger size with aspect ratio preservation
      try {
        const logoImg = new Image()
        logoImg.src = logoPath
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve
          logoImg.onerror = reject
        })
        
        const logoHeight = 90
        // Calculate width based on image aspect ratio to maintain proportions
        const aspectRatio = logoImg.width / logoImg.height
        const logoWidth = logoHeight * aspectRatio
        pdf.addImage(logoImg.src, 'PNG', (pageWidth - logoWidth) / 2, 25, logoWidth, logoHeight)
      } catch (e) {
        console.log('Could not load logo')
      }

      // Title
      pdf.setFontSize(18)
      pdf.setTextColor(0)
      pdf.text('Technical Offer', pageWidth / 2, 140, { align: 'center' })
      
      pdf.setFontSize(12)
      pdf.text(quotationData.offerDescription, pageWidth / 2, 150, { align: 'center' })
      
      // For section
      pdf.setFontSize(10)
      pdf.text('For', pageWidth / 2, 162, { align: 'center' })
      
      pdf.setFontSize(11)
      pdf.setFont(undefined, 'bold')
      pdf.text(quotationData.companyName, pageWidth / 2, 170, { align: 'center' })
      
      pdf.setFont(undefined, 'normal')
      pdf.setFontSize(9)
      pdf.text(quotationData.companyAddress, pageWidth / 2, 177, { align: 'center' })

      // Calculate required height dynamically
      pdf.setFontSize(8)
      const leftColMaxWidth = 60
      const rightColMaxWidth = 50
      
      // First pass: calculate heights
      let calculatedLeftHeight = 0
      let calculatedRightHeight = 0
      
      const fields = [
        { label: 'Enquiry Reference:', value: quotationData.projectDetails.ref },
        { label: 'End User:', value: quotationData.projectDetails.endUser },
        { label: 'Purchaser:', value: quotationData.projectDetails.purchaser },
        { label: 'Contractor:', value: quotationData.projectDetails.contractor },
        { label: 'Consultant:', value: quotationData.projectDetails.consultant },
        { label: 'Contact Person:', value: quotationData.projectDetails.contactPerson }
      ]
      
      fields.forEach(field => {
        const wrappedText = pdf.splitTextToSize(field.value || 'N/A', leftColMaxWidth)
        calculatedLeftHeight += 3 + (wrappedText.length * 3.5) + 2
      })
      
      const rightFields = [
        { label: 'Offer Reference:', value: quotationData.offerReference || 'N/A' },
        { label: 'Rev:', value: quotationData.revNo || '00' },
        { label: 'Offer Date:', value: quotationData.offerDate },
        { label: 'Revised Date(s):', value: quotationData.revisedDates?.filter(d => d).join(', ') || 'N/A' },
        { label: 'Offer Prepared by:', value: quotationData.preparedBy || 'N/A' }
      ]
      
      rightFields.forEach(field => {
        const wrappedText = pdf.splitTextToSize(field.value, rightColMaxWidth)
        calculatedRightHeight += 3 + (wrappedText.length * 3.5) + 2
      })
      
      const finalBoxHeight = Math.max(calculatedLeftHeight, calculatedRightHeight) + 10
      
      // Draw Info Box with dynamic height
      pdf.setDrawColor(0)
      pdf.rect(20, 190, pageWidth - 40, finalBoxHeight)
      
      // Left column - with text wrapping support
      pdf.setFontSize(8)
      pdf.setTextColor(0)
      
      let leftY = 194
      
      // Helper function to add field with wrapping
      const addFieldToLeft = (label, value) => {
        pdf.setFont(undefined, 'bold')
        pdf.text(label, 24, leftY)
        
        pdf.setFont(undefined, 'normal')
        const wrappedText = pdf.splitTextToSize(value || 'N/A', 45)
        pdf.text(wrappedText, 24, leftY + 3)
        
        leftY += 3 + (wrappedText.length * 3.5) + 2
      }
      
      fields.forEach(field => {
        addFieldToLeft(field.label, field.value)
      })
      
      // Right column - 2 columns layout
      let rightY = 194
      const rightX = pageWidth / 2 - 2
      
      pdf.setFont(undefined, 'bold')
      pdf.setFontSize(8)
      pdf.text('Offer Reference:', rightX, rightY)
      pdf.setFont(undefined, 'normal')
      const offerRefValue = quotationData.offerReference || 'N/A'
      pdf.text(offerRefValue, rightX, rightY + 3)
      
      // Rev on next line
      rightY += 7
      pdf.setFont(undefined, 'bold')
      pdf.text('Rev:', rightX, rightY)
      pdf.setFont(undefined, 'normal')
      pdf.text(quotationData.revNo || '00', rightX, rightY + 3)
      
      rightY += 8
      
      // Rest of right fields
      const addFieldToRight = (label, value) => {
        pdf.setFont(undefined, 'bold')
        pdf.setFontSize(8)
        pdf.text(label, rightX, rightY)
        
        pdf.setFont(undefined, 'normal')
        const wrappedText = pdf.splitTextToSize(value || 'N/A', 50)
        pdf.text(wrappedText, rightX, rightY + 3)
        
        rightY += 3 + (wrappedText.length * 3.5) + 2
      }
      
      // Offer Date
      addFieldToRight('Offer Date:', quotationData.offerDate)
      
      // Revised Date(s) - each on its own line
      pdf.setFont(undefined, 'bold')
      pdf.setFontSize(7)
      pdf.text('Revised Date(s):', rightX, rightY)
      
      pdf.setFont(undefined, 'normal')
      const revisedDates = quotationData.revisedDates?.filter(d => d) || []
      let revisedDateY = rightY + 3
      if (revisedDates.length > 0) {
        revisedDates.forEach(date => {
          pdf.text(date, rightX, revisedDateY)
          revisedDateY += 3.5
        })
        rightY = revisedDateY + 2
      } else {
        pdf.text('N/A', rightX, revisedDateY)
        rightY += 8
      }
      
      // Offer Prepared by
      addFieldToRight('Offer Prepared by:', quotationData.preparedBy || 'N/A')
      pageNum++

      // Page 2: Offer Type & Brand Logos
      pdf.addPage()
      addHeaderToPage()
      
      // Position Offer Type text in the middle of the page like a book chapter
      // Account for header space at top (approximately 35mm)
      const headerSpace = 35
      const availableHeight = pageHeight - headerSpace - 30 // 30mm bottom margin for footer space
      const pageMiddleY = headerSpace + (availableHeight / 2)
      
      // Draw Offer Type in large, prominent font centered on page
      pdf.setFontSize(28)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(60, 60, 60)
      
      // Split text if it's too long
      const offerTypeLines = pdf.splitTextToSize(offerTypeText || 'Offer Details', pageWidth - 40)
      const totalHeight = offerTypeLines.length * 12
      const startY = pageMiddleY - (totalHeight / 2)
      
      pdf.text(offerTypeLines, pageWidth / 2, startY, { align: 'center' })
      
      // Brand logos displayed below the offer type text
      if (includeBrandLogoInForm && brandLogos.length > 0) {
        let logoY = startY + totalHeight + 30
        
        if (logoY + 50 > pageHeight - 20) {
          pdf.addPage()
          logoY = 30
          pageNum++
        }
        
        let yPos = logoY
        const logosPerRow = 2
        const logoDisplayWidth = 50
        const logoSpacing = 20
        
        for (let i = 0; i < brandLogos.length; i++) {
          const col = i % logosPerRow
          const row = Math.floor(i / logosPerRow)
          
          // Calculate number of logos in this row
          const logosInThisRow = (i + logosPerRow > brandLogos.length) 
            ? (brandLogos.length - (row * logosPerRow))
            : logosPerRow
          
          // Calculate width and centering for this row
          const totalLogosWidth = (logosInThisRow * logoDisplayWidth) + ((logosInThisRow - 1) * logoSpacing)
          const logosStartX = (pageWidth - totalLogosWidth) / 2
          const xPos = logosStartX + (col * (logoDisplayWidth + logoSpacing))
          
          if (yPos + 50 > pageHeight - 30) {
            pdf.addPage()
            addHeaderToPage()
            yPos = 50
            pageNum++
          }
          
          try {
            pdf.addImage(brandLogos[i].data, 'PNG', xPos, yPos, logoDisplayWidth, 50)
          } catch (e) {
            console.log('Could not add brand logo')
          }
        }
      }
      
      addFooterToPage()
      pageNum++

      // Pages 3+: Project Drawings
      for (const image of projectImages) {
        pdf.addPage()
        addHeaderToPage()
        
        try {
          const img = new Image()
          img.src = image.data
          await new Promise((resolve) => {
            img.onload = resolve
          })
          
          // Account for header space (35mm) and footer space (25mm)
          const headerSpace = 35
          const footerSpace = 25
          const availableHeight = pageHeight - headerSpace - footerSpace
          
          const imgWidth = pageWidth - 20
          const imgHeight = availableHeight
          const maxWidth = imgWidth
          const maxHeight = imgHeight
          
          let finalWidth = maxWidth
          let finalHeight = (img.height / img.width) * finalWidth
          
          if (finalHeight > maxHeight) {
            finalHeight = maxHeight
            finalWidth = (img.width / img.height) * finalHeight
          }
          
          const xOffset = (pageWidth - finalWidth) / 2
          const yOffset = 40
          
          pdf.addImage(img.src, 'PNG', xOffset, yOffset, finalWidth, finalHeight)
        } catch (e) {
          console.log('Could not add project image')
        }
        
        addFooterToPage()
        pageNum++
      }

      // BOM Page (always include if items exist)
      const bomToUse = parsedBomData.length > 0 ? parsedBomData : quotationData.bomItems
      if (bomToUse.length > 0) {
        pdf.addPage()
        addHeaderToPage()
        
        pdf.setFontSize(14)
        // pdf.text('QUICK BOM', pageWidth / 2, 40, { align: 'center' })
        
        // Build dynamic columns based on bomTableColumns
        const columns = []
        const colWidths = {}
        
        if (bomTableColumns.includes('slNo')) {
          columns.push('Sl. No.')
          colWidths['Sl. No.'] = 12
        }
        if (bomTableColumns.includes('description')) {
          columns.push('Description')
          colWidths['Description'] = 110
        }
        if (bomTableColumns.includes('make')) {
          columns.push('Make')
          colWidths['Make'] = 35
        }
        if (bomTableColumns.includes('qty')) {
          columns.push('Qty')
          colWidths['Qty'] = 15
        }
        if (bomTableColumns.includes('uom')) {
          columns.push('UOM')
          colWidths['UOM'] = 20
        }
        if (bomTableColumns.includes('price')) {
          columns.push('Price')
          colWidths['Price'] = 20
        }
        
        const cellHeight = 6
        const cellPadding = 1
        const pageHeightLimit = pageHeight - 15
        const startX = 10
        
        // Calculate total table width based on actual columns
        let totalTableWidth = 0
        columns.forEach((col) => {
          totalTableWidth += colWidths[col]
        })
        
        // Function to draw header
        const drawBomHeader = (yPosition) => {
          pdf.setFillColor(200, 200, 200)
          pdf.setDrawColor(0, 0, 0)
          pdf.setLineWidth(0.4)
          pdf.setFont(undefined, 'bold')
          pdf.setFontSize(8)
          pdf.setTextColor(0, 0, 0)
          
          // Header background
          pdf.rect(startX, yPosition, totalTableWidth, cellHeight, 'F')
          
          // Header text
          let xPos = startX
          columns.forEach((col) => {
            pdf.text(col, xPos + cellPadding, yPosition + 4)
            xPos += colWidths[col]
          })
          
          // Header borders
          xPos = startX
          columns.forEach((col) => {
            pdf.rect(xPos, yPosition, colWidths[col], cellHeight)
            xPos += colWidths[col]
          })
        }
        
        // Draw initial header
        let yPos = 50
        drawBomHeader(yPos)
        yPos += cellHeight
        
        // Draw body rows
        pdf.setFont(undefined, 'normal')
        pdf.setFontSize(7)
        let isAlternate = false
        
        bomToUse.forEach((item) => {
          if (yPos + cellHeight > pageHeightLimit) {
            pdf.addPage()
            addHeaderToPage()
            addFooterToPage()
            yPos = 50
            drawBomHeader(yPos)
            yPos += cellHeight
          }
          
          if (item.isHeader) {
            // Category header
            pdf.setFillColor(220, 220, 220)
            pdf.setTextColor(0, 0, 0)
            pdf.setFont(undefined, 'bold')
            pdf.setFontSize(8)
            
            pdf.rect(startX, yPos, totalTableWidth, cellHeight, 'F')
            pdf.rect(startX, yPos, totalTableWidth, cellHeight)
            pdf.text(item.description, startX + cellPadding, yPos + 4)
            
            isAlternate = false
          } else {
            // Data row
            if (isAlternate) {
              pdf.setFillColor(240, 240, 240)
            } else {
              pdf.setFillColor(255, 255, 255)
            }
            
            pdf.setTextColor(0, 0, 0)
            pdf.setFont(undefined, 'normal')
            pdf.setFontSize(7)
            
            // Fill row background
            pdf.rect(startX, yPos, totalTableWidth, cellHeight, 'F')
            
            // Draw cell text for each column
            let xPos = startX
            columns.forEach((col) => {
              const colWidth = colWidths[col]
              let cellValue = ''
              
              switch(col) {
                case 'Sl. No.': cellValue = item.slNo || ''; break
                case 'Description': cellValue = item.description || ''; break
                case 'Make': cellValue = item.make || ''; break
                case 'Qty': cellValue = item.qty || ''; break
                case 'UOM': cellValue = item.uom || ''; break
                case 'Price': cellValue = item.price || ''; break
                default: cellValue = ''
              }
              
              pdf.text(String(cellValue).substring(0, 40), xPos + cellPadding, yPos + 4)
              xPos += colWidth
            })
            
            // Draw borders
            xPos = startX
            columns.forEach((col) => {
              pdf.rect(xPos, yPos, colWidths[col], cellHeight)
              xPos += colWidths[col]
            })
            
            isAlternate = !isAlternate
          }
          
          yPos += cellHeight
        })
        
        addFooterToPage()
        pageNum++
      }

      // Price Schedule Page
      pdf.addPage()
      addHeaderToPage()
      
      pdf.setFontSize(14)
      pdf.setTextColor(0, 0, 0)
      pdf.text('COMMERCIAL TERMS & CONDITIONS', pageWidth / 2, 40, { align: 'center' })
      
      let yPos = 50
      pdf.setFontSize(9)
      pdf.setTextColor(0, 0, 0)
      
      for (const item of quotationData.priceSchedule) {
        if (item.isHeader) {
          pdf.setFontSize(10)
          pdf.setFont(undefined, 'bold')
        } else {
          pdf.setFontSize(9)
          pdf.setFont(undefined, 'normal')
        }
        
        const wrappedText = pdf.splitTextToSize(item.value, pageWidth - 100)
        const lineHeight = wrappedText.length * 4
        
        pdf.text(`${item.sn}. ${item.item}:`, 15, yPos)
        pdf.text(wrappedText, 80, yPos)
        
        yPos += lineHeight + 5
        
        if (yPos > pageHeight - 20) {
          pdf.addPage()
          addHeaderToPage()
          addFooterToPage()
          yPos = 50
          pageNum++
        }
      }
      
      addFooterToPage()
      pageNum++

      // Company Details Page
      pdf.addPage()
      addHeaderToPage()
      
      pdf.setFontSize(14)
      pdf.setTextColor(0, 0, 0)
      pdf.text('COMPANY DETAILS', pageWidth / 2, 40, { align: 'center' })
      
      const companyDetails = [
        ['Company Name', quotationData.companyInfo.companyName],
        ['CIN', quotationData.companyInfo.cin],
        ['GSTIN', quotationData.companyInfo.gstin],
        ['PAN', quotationData.companyInfo.pan],
        ['MSME', quotationData.companyInfo.msme],
        ['Bank Name', quotationData.companyInfo.bankName],
        ['Branch/IFSC', quotationData.companyInfo.branchIfsc],
        ['Account No', quotationData.companyInfo.accountNo]
      ]
      
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)
      let yPos2 = 50
      
      companyDetails.forEach(([label, value]) => {
        pdf.setFont(undefined, 'bold')
        pdf.text(`${label}:`, 20, yPos2)
        pdf.setFont(undefined, 'normal')
        pdf.text(value, 80, yPos2)
        yPos2 += 10
      })
      
      addFooterToPage()

      // Save PDF
      const filename = `Quotation_${quotationData.companyName}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(filename)
      
      setIsGeneratingPdf(false)
      alert('Quotation PDF generated successfully!')
      onClose()
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
      setIsGeneratingPdf(false)
    }
  }

  return (
    <motion.div
      className="quotation-form-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="quotation-header">
        <h1>Quotation Generator</h1>
        <div className="header-buttons">
          <button 
            className="generate-btn"
            onClick={handleGenerateQuotation}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? 'Generating...' : 'Generate Quotation'}
          </button>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="quotation-content">
        {/* Company Logo Selection */}
        <section className="form-section">
          <h2>Select Company Logo</h2>
          <div className="form-group">
            <label>Company:</label>
            <select
              value={quotationData.companyLogo}
              onChange={(e) => handleOfferChange('companyLogo', e.target.value)}
              title="Select Company Logo"
            >
              <option value="">-- Select Company --</option>
              <option value="sta">STA</option>
              <option value="staipl">STAIPL</option>
            </select>
          </div>
        </section>

        {/* Offer Details */}
        <section className="form-section">
          <h2>Offer Details</h2>
          <div className="offer-preview-container">
            {/* Line 1: Offer Type */}
            <div className="preview-line">
              <textarea
                placeholder="Write Offer Type (e.g., Technical Offer)"
                value={quotationData.offerType}
                onChange={(e) => handleOfferChange('offerType', e.target.value)}
                className="preview-input large"
                rows="1"
              />
            </div>

            {/* Line 2: Description of Work */}
            <div className="preview-line">
              <textarea
                placeholder="Description of Work (Example: HVAC SYSTEM)"
                value={quotationData.offerDescription}
                onChange={(e) => handleOfferChange('offerDescription', e.target.value)}
                className="preview-input medium"
                rows="1"
              />
            </div>

            {/* Line 3: For */}
            <div className="preview-line">
              <textarea
                placeholder="For"
                value={quotationData.offerFor || 'For'}
                onChange={(e) => handleOfferChange('offerFor', e.target.value)}
                className="preview-input small"
                rows="1"
              />
            </div>

            {/* Line 4: Company Name */}
            <div className="preview-line">
              <textarea
                placeholder="COMPANY NAME"
                value={quotationData.companyName}
                onChange={(e) => handleOfferChange('companyName', e.target.value)}
                className="preview-input large bold"
                rows="1"
              />
            </div>

            {/* Line 5: Company Address */}
            <div className="preview-line">
              <textarea
                placeholder="Company Address"
                value={quotationData.companyAddress}
                onChange={(e) => handleOfferChange('companyAddress', e.target.value)}
                className="preview-input medium"
                rows="2"
              />
            </div>
          </div>
        </section>

        {/* Project Details */}
        <section className="form-section">
          <h2>Details About the Project</h2>
          <div className="project-details-grid">
            <div className="project-details-left">
              <div className="field-row">
                <label>Ref:</label>
                <textarea
                  value={quotationData.projectDetails.ref}
                  onChange={(e) => handleProjectDetailChange('ref', e.target.value)}
                  onKeyDown={handleMultilineKeydown}
                />
              </div>
              <div className="field-spacer"></div>
              <div className="field-row">
                <label>End User:</label>
                <textarea
                  value={quotationData.projectDetails.endUser}
                  onChange={(e) => handleProjectDetailChange('endUser', e.target.value)}
                  onKeyDown={handleMultilineKeydown}
                />
              </div>
              <div className="field-row">
                <label>Purchaser:</label>
                <textarea
                  value={quotationData.projectDetails.purchaser}
                  onChange={(e) => handleProjectDetailChange('purchaser', e.target.value)}
                  onKeyDown={handleMultilineKeydown}
                />
              </div>
              <div className="field-row">
                <label>Contractor:</label>
                <textarea
                  value={quotationData.projectDetails.contractor}
                  onChange={(e) => handleProjectDetailChange('contractor', e.target.value)}
                  onKeyDown={handleMultilineKeydown}
                />
              </div>
              <div className="field-row">
                <label>Consultant:</label>
                <textarea
                  value={quotationData.projectDetails.consultant}
                  onChange={(e) => handleProjectDetailChange('consultant', e.target.value)}
                  onKeyDown={handleMultilineKeydown}
                />
              </div>
              <div className="field-row">
                <label>Contact Person:</label>
                <textarea
                  value={quotationData.projectDetails.contactPerson}
                  onChange={(e) => handleProjectDetailChange('contactPerson', e.target.value)}
                  onKeyDown={handleMultilineKeydown}
                />
              </div>
            </div>

            <div className="project-details-right">
              <div className="offer-ref-section">
                <label><strong>Offer Reference:</strong></label>
                <input
                  type="text"
                  value={quotationData.offerReference}
                  onChange={(e) => handleOfferChange('offerReference', e.target.value)}
                  className="offer-ref-input"
                />
              </div>
              <div className="rev-no-section">
                <label>Rev. No:</label>
                <input
                  type="text"
                  value={quotationData.revNo}
                  onChange={(e) => handleOfferChange('revNo', e.target.value)}
                  className="rev-no-input"
                />
              </div>

              <div className="date-section">
                <label><strong>Offer Date</strong></label>
                <input
                  type="date"
                  value={quotationData.offerDate}
                  onChange={(e) => handleOfferChange('offerDate', e.target.value)}
                />
              </div>

              <div className="revised-dates-section">
                {quotationData.revisedDates.map((date, index) => (
                  <div key={index} className="revised-date-row">
                    <label>Revised Date {index + 1}:</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => handleRevisedDateChange(index, e.target.value)}
                    />
                  </div>
                ))}
                <div className="date-button-group">
                  <button className="add-date-btn" onClick={addRevisedDate}>
                    + Add Revised Date
                  </button>
                  {quotationData.revisedDates.length > 0 && (
                    <button className="delete-date-btn" onClick={deleteLastRevisedDate}>
                       Delete Last
                    </button>
                  )}
                </div>
              </div>

              <div className="prepared-section">
                <label><strong>Offer Prepared by:</strong></label>
                <textarea
                  value={quotationData.preparedBy}
                  onChange={(e) => handleOfferChange('preparedBy', e.target.value)}
                  onKeyDown={handleMultilineKeydown}
                  placeholder="Your name"
                  className="prepared-input"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Offer Type & Brand Logos */}
        <section className="form-section">
          <h2>Offer Type & Brand Logos</h2>
          
          <div className="offer-type-input">
            <label>Offer Type:</label>
            <textarea
              value={offerTypeText}
              onChange={(e) => setOfferTypeText(e.target.value)}
              placeholder="e.g., 1.0 Techno Commercial Offer"
              rows="2"
              className="offer-type-textarea"
            />
          </div>

          <div className="brand-logos-section">
            <h3>Brand Logos</h3>
            
            {/* Brand Logo Include Toggle */}
            <div className="brand-logo-toggle">
              <label className="brand-checkbox-label">
                <input
                  type="checkbox"
                  checked={includeBrandLogoInForm}
                  onChange={(e) => setIncludeBrandLogoInForm(e.target.checked)}
                />
                Include Brand Logo in PDF
              </label>
            </div>

            {/* Upload Area */}
            <div className="upload-area">
              <label htmlFor="brand-logo-upload" className="upload-label">
                <div className="upload-icon">🏢</div>
                <p>Click to upload brand logos</p>
              </label>
              <input
                id="brand-logo-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleBrandLogoUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Gallery Display */}
            {brandLogos.length > 0 && (
              <div className="brand-gallery">
                <div className="gallery-viewer">
                  <img src={brandLogos[currentBrandLogoIndex].data} alt={`Brand ${currentBrandLogoIndex + 1}`} />
                </div>

                <div className="gallery-controls">
                  <button
                    className="prev-btn"
                    onClick={prevBrandLogo}
                    disabled={currentBrandLogoIndex === 0}
                  >
                    ← Previous
                  </button>
                  <span className="image-counter">
                    {currentBrandLogoIndex + 1} / {brandLogos.length}
                  </span>
                  <button
                    className="next-btn"
                    onClick={nextBrandLogo}
                    disabled={currentBrandLogoIndex === brandLogos.length - 1}
                  >
                    Next →
                  </button>
                  <button
                    className="delete-image-btn"
                    onClick={() => deleteBrandLogo(brandLogos[currentBrandLogoIndex].id)}
                    title="Delete this logo"
                  >
                     Delete
                  </button>
                </div>

                {/* Thumbnail List */}
                <div className="gallery-thumbnails">
                  {brandLogos.map((logo, index) => (
                    <div
                      key={logo.id}
                      className={`thumbnail ${index === currentBrandLogoIndex ? 'active' : ''}`}
                      onClick={() => setCurrentBrandLogoIndex(index)}
                    >
                      <img src={logo.data} alt={`Thumbnail ${index + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {brandLogos.length === 0 && (
              <div className="empty-state">
                <p>No brand logos uploaded yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Project Drawings & Sketches */}
        <section className="form-section">
          <h2>Project Drawings & Sketches</h2>
          <div className="drawings-container">
            {/* Upload Area */}
            <div className="upload-area">
              <label htmlFor="image-upload" className="upload-label">
                <div className="upload-icon">📸</div>
                <p>Click to upload drawings or sketches</p>
                <span className="upload-hint">PNG, JPG, PDF up to 5MB</span>
              </label>
              <input
                id="image-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="upload-input"
              />
            </div>

            {/* Image Gallery */}
            {projectImages.length > 0 && (
              <div className="image-gallery">
                <div className="gallery-viewer">
                  <div className="image-display">
                    <img src={projectImages[currentImageIndex].data} alt="Project" />
                    <p className="image-name">{projectImages[currentImageIndex].name}</p>
                  </div>
                  
                  {/* Navigation Controls */}
                  <div className="gallery-controls">
                    <button 
                      className="nav-btn prev-btn"
                      onClick={prevImage}
                      disabled={currentImageIndex === 0}
                      title="Previous"
                    >
                      ◀ Previous
                    </button>
                    <span className="image-counter">
                      {currentImageIndex + 1} / {projectImages.length}
                    </span>
                    <button 
                      className="nav-btn next-btn"
                      onClick={nextImage}
                      disabled={currentImageIndex === projectImages.length - 1}
                      title="Next"
                    >
                      Next ▶
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    className="delete-image-btn"
                    onClick={() => deleteProjectImage(projectImages[currentImageIndex].id)}
                    title="Delete this image"
                  >
                     Delete
                  </button>
                </div>

                {/* Thumbnail List */}
                <div className="gallery-thumbnails">
                  {projectImages.map((img, index) => (
                    <div
                      key={img.id}
                      className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img src={img.data} alt={`Thumbnail ${index + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {projectImages.length === 0 && (
              <div className="empty-state">
                <p>No drawings or sketches uploaded yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Copy-Paste BOM Section */}
        <section className="form-section">
          <h2>Quick BOM Import (Copy from Excel)</h2>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
            Copy your BOM data from Excel and paste it here. Columns should be: Sl. No. | Description | Make | Qty | UOM. Include category headers with empty Sl. No.
          </p>
          
          <div className="paste-bom-container">
            <textarea
              value={pasteBomData}
              onChange={handlePasteBomChange}
              placeholder="Paste Excel data here (Ctrl+V)&#10;Excel columns: Sl. No. | Description | Make | Qty | UOM"
              className="paste-bom-textarea"
              rows="6"
            />
            
            <div className="paste-bom-actions">
              <button 
                className="preview-btn"
                onClick={() => setShowBomPreview(!showBomPreview)}
                disabled={parsedBomData.length === 0}
              >
                {showBomPreview ? 'Hide' : 'Preview'}
              </button>
              <button 
                className="clear-btn"
                onClick={clearPasteBom}
                disabled={!pasteBomData.trim()}
              >
                Clear
              </button>
            </div>

            {showBomPreview && parsedBomData.length > 0 && (
              <div className="bom-preview">
                <h3>Preview ({parsedBomData.filter(item => !item.isHeader).length} items)</h3>
                <div className="preview-table-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        {bomTableColumns.includes('slNo') && <th>Sl. No.</th>}
                        {bomTableColumns.includes('description') && <th>Description</th>}
                        {bomTableColumns.includes('make') && <th>Make</th>}
                        {bomTableColumns.includes('qty') && <th>Qty</th>}
                        {bomTableColumns.includes('uom') && <th>UOM</th>}
                        {bomTableColumns.includes('price') && <th>Price</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedBomData.map((item, idx) => (
                        item.isHeader ? (
                          <tr key={idx} className="header-row">
                            <td colSpan={bomTableColumns.length} className="category-header">{item.description}</td>
                          </tr>
                        ) : (
                          <tr key={idx}>
                            {bomTableColumns.includes('slNo') && <td>{item.slNo}</td>}
                            {bomTableColumns.includes('description') && <td style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{item.description}</td>}
                            {bomTableColumns.includes('make') && <td>{item.make}</td>}
                            {bomTableColumns.includes('qty') && <td>{item.qty}</td>}
                            {bomTableColumns.includes('uom') && <td>{item.uom}</td>}
                            {bomTableColumns.includes('price') && <td>{item.price}</td>}
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* BOM Table - TEMPORARILY COMMENTED OUT */}
        {/* <section className="form-section">
          <div className="bom-header">
            <h2>QUICK BOM</h2>
          </div>
          <div className="table-responsive">
            <table className="bom-table">
              <thead>
                <tr>
                  <th>SL no.</th>
                  <th>Model</th>
                  <th>Description</th>
                  <th>HSN/SAC</th>
                  <th>Qty</th>
                  <th>UOM</th>
                  <th>List Price</th>
                  <th>Max Discount</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {quotationData.bomItems.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        value={item.model}
                        onChange={(e) => handleBomItemChange(index, 'model', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleBomItemChange(index, 'description', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.hsn}
                        onChange={(e) => handleBomItemChange(index, 'hsn', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleBomItemChange(index, 'qty', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.uom}
                        onChange={(e) => handleBomItemChange(index, 'uom', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.listPrice}
                        onChange={(e) => handleBomItemChange(index, 'listPrice', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.maxDiscount}
                        onChange={(e) => handleBomItemChange(index, 'maxDiscount', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleBomItemChange(index, 'unitPrice', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) => handleBomItemChange(index, 'discount', e.target.value)}
                      />
                    </td>
                    <td>{((parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 0)).toFixed(2)}</td>
                    <td>
                      {quotationData.bomItems.length > 1 && (
                        <button className="delete-btn" onClick={() => removeBomItem(index)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="10" className="label-cell">Taxable Amount</td>
                  <td>{taxableAmount.toFixed(2)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan="10" className="label-cell">
                    <label>GST Rate (%):</label>
                    <input
                      type="number"
                      value={quotationData.gstRate}
                      onChange={(e) => handleOfferChange('gstRate', parseFloat(e.target.value))}
                      step="0.01"
                      min="0"
                    />
                    <label className="interstate-label">
                      <input
                        type="checkbox"
                        checked={quotationData.isInterState}
                        onChange={(e) => handleOfferChange('isInterState', e.target.checked)}
                      />
                      Inter-State (IGST)
                    </label>
                  </td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan="10" className="label-cell"><strong>Total GST</strong></td>
                  <td>{gstAmount.toFixed(2)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan="10" className="label-cell"><strong>Grand Total (Incl GST)</strong></td>
                  <td>{grandTotal.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button className="add-row-btn" onClick={addBomItem}>➕ Add Row</button>
        </section> */}

        {/* Price Schedule with Commercial Terms and Conditions */}
        <section className="form-section">
          <h2>Price Schedule with Commercial Terms & Conditions</h2>
          <div className="price-schedule-table">
            {quotationData.priceSchedule.map((row, index) => (
              <div key={index}>
                <div className="schedule-row">
                  <div className="sn-col">{row.sn}</div>
                  <div className="item-col">
                    <input
                      type="text"
                      value={row.item}
                      onChange={(e) => handlePriceScheduleChange(index, 'item', e.target.value)}
                      placeholder="Item"
                    />
                  </div>
                  <div className="value-col">
                    <textarea
                      value={row.value}
                      onChange={(e) => handlePriceScheduleChange(index, 'value', e.target.value)}
                      placeholder="Description"
                      rows="2"
                    />
                  </div>
                  {index === 0 && (
                    <button 
                      className="add-sub-row-btn" 
                      onClick={() => addSubRow(index)}
                      title="Add sub-row"
                    >
                      ➕
                    </button>
                  )}
                </div>
                {row.subRows && row.subRows.map((subRow, subIndex) => (
                  <div key={`sub-${index}-${subIndex}`} className="schedule-row sub-row">
                    <div className="sn-col">{subRow.sn}</div>
                    <div className="item-col">
                      <input
                        type="text"
                        value={subRow.item}
                        onChange={(e) => handleSubRowChange(index, subIndex, 'item', e.target.value)}
                        placeholder="Item"
                      />
                    </div>
                    <div className="value-col">
                      <textarea
                        value={subRow.value}
                        onChange={(e) => handleSubRowChange(index, subIndex, 'value', e.target.value)}
                        placeholder="Description"
                        rows="2"
                      />
                    </div>
                    <button
                      className="delete-sub-row-btn"
                      onClick={() => deleteSubRow(index, subIndex)}
                      title="Delete sub-row"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Company Details */}
        <section className="form-section">
          <h2>Company Details</h2>
          <div className="company-info-grid">
            {Object.entries(quotationData.companyInfo).map(([key, value]) => (
              <div key={key} className="info-row">
                <label>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}:</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleCompanyInfoChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>

        // ...existing code...
      </div>
    </motion.div>
  )
}
