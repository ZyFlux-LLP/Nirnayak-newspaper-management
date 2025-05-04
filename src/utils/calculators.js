/**
 * Calculate advertisement price based on type, size, rate, and color
 * @param {Object} params - Calculation parameters
 * @param {string} params.adType - 'central', 'state', or 'private'
 * @param {number} params.adSize - Size in square centimeters
 * @param {number} params.ratePerSqCm - Rate per square centimeter
 * @param {boolean} params.isColored - Whether the ad is colored
 * @returns {Object} Price breakdown
 */
export const calculateAdPrice = (params) => {
    const { adType, adSize, ratePerSqCm, isColored } = params;
    
    // Calculate base price
    const basePrice = adSize * ratePerSqCm;
    
    // Apply color charge if applicable (40% extra)
    const colorCharge = isColored ? basePrice * 0.4 : 0;
    
    // Calculate price before GST
    let priceBeforeGST = basePrice + colorCharge;
    
    // Apply commission for private ads (15% deduction)
    let commission = 0;
    if (adType === 'private') {
      commission = priceBeforeGST * 0.15;
      priceBeforeGST -= commission;
    }
    
    // Apply GST based on ad type
    // - Central Government: 5% IGST
    // - State Government: 2.5% CGST + 2.5% SGST (total 5%)
    // - Private: 5% GST
    const gstRate = 0.05; // 5% for all types
    const gstAmount = priceBeforeGST * gstRate;
    
    // Calculate final price
    const finalPrice = priceBeforeGST + gstAmount;
    
    return {
      basePrice,
      colorCharge,
      commission,
      gstAmount,
      finalPrice
    };
  };
  
  /**
   * Extract GST details for records
   * @param {Object} invoice - Invoice data
   * @returns {Object} GST record details
   */
  export const extractGSTRecord = (invoice) => {
    const { client, adDetails, invoiceNumber, date } = invoice;
    
    // Process GST breakdown based on client type
    let gstBreakdown = {};
    
    if (client.type === 'central') {
      gstBreakdown = {
        igst: adDetails.gstAmount,
        cgst: 0,
        sgst: 0
      };
    } else if (client.type === 'state') {
      const halfGST = adDetails.gstAmount / 2;
      gstBreakdown = {
        igst: 0,
        cgst: halfGST,
        sgst: halfGST
      };
    } else {
      // Private companies
      gstBreakdown = {
        igst: 0,
        cgst: adDetails.gstAmount / 2,
        sgst: adDetails.gstAmount / 2
      };
    }
    
    // Extract month and year for record keeping
    const invoiceDate = new Date(date);
    const month = invoiceDate.getMonth() + 1; // 0-indexed
    const year = invoiceDate.getFullYear();
    
    return {
      invoiceNumber,
      date,
      clientName: client.name,
      clientGST: client.gstNumber,
      adType: client.type,
      taxableAmount: adDetails.basePrice + adDetails.colorCharge - adDetails.commission,
      ...gstBreakdown,
      totalGST: adDetails.gstAmount,
      finalAmount: adDetails.finalPrice,
      month,
      year
    };
  };