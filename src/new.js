import { useState } from "react";
import axios from "axios";

export default function PDFMerge() {
    const [files, setFiles] = useState(Array(8).fill(null));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const handleFileChange = (index, event) => {
        const newFiles = [...files];
        newFiles[index] = event.target.files[0];
        setFiles(newFiles);
    };

    const handleUpload = async () => {
        if (files.some(file => file === null)) {
            setError("Please upload exactly 8 PDF files.");
            return;
        }
        setError(null);
        setLoading(true);

        const formData = new FormData();
        files.forEach(file => formData.append("pdfs", file));

        try {
            const response = await axios.post("http://localhost:3000/merge", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                responseType: "blob", // To handle file response
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "merged.pdf");
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            setError("Error merging PDFs. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center p-6">
            <h1 className="text-2xl font-bold mb-4">Merge PDFs</h1>
            {Array.from({ length: 8 }).map((_, index) => (
                <input 
                    key={index} 
                    type="file" 
                    accept="application/pdf" 
                    onChange={(e) => handleFileChange(index, e)} 
                    className="mb-2" 
                />
            ))}
            <button 
                onClick={handleUpload} 
                disabled={loading} 
                className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
                {loading ? "Merging..." : "Merge PDFs"}
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
    );
}
