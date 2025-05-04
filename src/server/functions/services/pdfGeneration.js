const {db} = require("../../firebase");
const {collection, doc, setDoc, getDoc, query, where, getDocs} = require("firebase/firestore");

const savePdfToFirestore = async (pdfData) => {
  try {
    const docId = `${pdfData.date}_${pdfData.edition}`;
    const pdfRef = doc(db, "pdfs", docId);
    const pdfDataWithTimestamp = {
      ...pdfData,
      createdAt: new Date().toISOString(),
    };
    await setDoc(pdfRef, pdfDataWithTimestamp);
    return {
      id: docId,
      ...pdfDataWithTimestamp,
    };
  } catch (error) {
    console.error("Error saving PDF to Firestore:", error);
    throw error;
  }
};
const getPdfByDateAndEdition = async (date, edition) => {
  try {
    const docId = `${date}_${edition}`;
    const pdfRef = doc(db, "pdfs", docId);
    const pdfDoc = await getDoc(pdfRef);

    if (pdfDoc.exists()) {
      return {
        id: pdfDoc.id,
        ...pdfDoc.data(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting PDF from Firestore:", error);
    throw error;
  }
};
/**
 * Check if all pages for a specific date and edition are accepted
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} edition - Edition name
 * @return {Promise<boolean>} - True if all pages are accepted
 */
const checkAllPagesAccepted = async (date, edition) => {
  try {
    const q = query(
      collection(db, "pages"),
      where("date", "==", date),
      where("edition", "==", edition),
    );
    const querySnapshot = await getDocs(q);
    const totalPages = querySnapshot.size;
    if (totalPages !== 8) {
      return false;
    }
    let allAccepted = true;
    querySnapshot.forEach((doc) => {
      const pageData = doc.data();
      if (pageData.status !== "accepted") {
        allAccepted = false;
      }
    });
    return allAccepted;
  } catch (error) {
    console.error("Error checking page status:", error);
    throw error;
  }
};
module.exports = {
  savePdfToFirestore,
  getPdfByDateAndEdition,
  checkAllPagesAccepted,
};
