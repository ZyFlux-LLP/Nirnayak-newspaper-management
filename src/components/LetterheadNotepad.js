import React, { useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import html2pdf from 'html2pdf.js';
import '../css/LetterheadNotepad.css';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="editor-menu">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
      >
        B
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
      >
        I
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'is-active' : ''}
      >
        U
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
      >
        H3
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
      >
        •
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'is-active' : ''}
      >
        1.
      </button>
    </div>
  );
};

const LetterheadNotepad = ({ companyLogo, companyName, companyAddress, companyContact }) => {
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [documentType, setDocumentType] = useState('notice'); // notice, communication, documentation
  const [letterheadType, setLetterheadType] = useState('default');
  const documentRef = useRef(null);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Underline,
      Heading.configure({
        levels: [2, 3],
      }),
      BulletList,
      OrderedList,
    ],
    content: '<p>Start typing your document content here...</p>',
  });

  const handleDocumentTitleChange = (e) => {
    setDocumentTitle(e.target.value);
  };

  const handleDocumentTypeChange = (e) => {
    setDocumentType(e.target.value);
  };

  const handleLetterheadChange = (e) => {
    setLetterheadType(e.target.value);
  };

  const exportToPdf = () => {
    // First, update the hidden document with current editor content
    const contentElement = document.querySelector('.hidden-document .document-content');
    if (contentElement && editor) {
      contentElement.innerHTML = editor.getHTML();
    }
    
    const element = document.querySelector('.hidden-document .letterhead');
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${documentTitle.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const getLetterheadClass = () => {
    return `letterhead letterhead-${letterheadType}`;
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDocumentTypeTitle = () => {
    switch(documentType) {
      case 'notice':
        return 'OFFICIAL NOTICE';
      case 'communication':
        return 'GOVERNMENT COMMUNICATION';
      case 'documentation':
        return 'COMPANY DOCUMENTATION';
      default:
        return 'OFFICIAL DOCUMENT';
    }
  };

  return (
    <div className="letterhead-notepad-container">
      <div className="letterhead-controls">
        <div className="control-group">
          <label htmlFor="document-title">Document Title:</label>
          <input 
            type="text" 
            id="document-title" 
            value={documentTitle} 
            onChange={handleDocumentTitleChange} 
            placeholder="Enter document title" 
          />
        </div>
        
        <div className="control-group">
          <label htmlFor="document-type">Document Type:</label>
          <select 
            id="document-type" 
            value={documentType} 
            onChange={handleDocumentTypeChange}
          >
            <option value="notice">Official Notice</option>
            <option value="communication">Government Communication</option>
            <option value="documentation">Company Documentation</option>
          </select>
        </div>
        
        <div className="control-group">
          <label htmlFor="letterhead-type">Letterhead Style:</label>
          <select 
            id="letterhead-type" 
            value={letterheadType} 
            onChange={handleLetterheadChange}
          >
            <option value="default">Default</option>
            <option value="elegant">Elegant</option>
            <option value="modern">Modern</option>
            <option value="official">Official</option>
          </select>
        </div>
        
        <button className="export-btn" onClick={exportToPdf}>
          Export as PDF
        </button>
      </div>

      <div className="document-preview">
        <div className={getLetterheadClass()} ref={documentRef}>
          <div className="letterhead-header">
            {companyLogo && <img src={companyLogo} alt="Company Logo" className="company-logo" />}
            <div className="company-info">
              <h1 className="company-name">{companyName || 'Company Name'}</h1>
              <p className="company-address">{companyAddress || 'Company Address'}</p>
              <p className="company-contact">{companyContact || 'Phone: (123) 456-7890 | Email: info@company.com'}</p>
            </div>
          </div>
          
          <div className="document-header">
            <div className="document-title-container">
              <h2>{documentTitle}</h2>
              <h3>{getDocumentTypeTitle()}</h3>
            </div>
            <div className="document-date">
              <p>Date: {getCurrentDate()}</p>
              <p>Ref: DOC-{Math.floor(Math.random() * 10000)}</p>
            </div>
          </div>
          
          <div className="document-content">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="editor-main" />
          </div>
          
          <div className="letterhead-footer">
            <p>This is an official document of {companyName || 'Company Name'}</p>
            <p>Page 1 of 1</p>
          </div>
        </div>
      </div>

      <div className="hidden-document" style={{ display: 'none' }}>
        <div className={getLetterheadClass()}>
          <div className="letterhead-header">
            {companyLogo && <img src={companyLogo} alt="Company Logo" className="company-logo" />}
            <div className="company-info">
              <h1 className="company-name">{companyName || 'Company Name'}</h1>
              <p className="company-address">{companyAddress || 'Company Address'}</p>
              <p className="company-contact">{companyContact || 'Phone: (123) 456-7890 | Email: info@company.com'}</p>
            </div>
          </div>
          
          <div className="document-header">
            <div className="document-title-container">
              <h2>{documentTitle}</h2>
              <h3>{getDocumentTypeTitle()}</h3>
            </div>
            <div className="document-date">
              <p>Date: {getCurrentDate()}</p>
              <p>Ref: DOC-{Math.floor(Math.random() * 10000)}</p>
            </div>
          </div>
          
          <div className="document-content">
            {/* This will be filled dynamically when exporting */}
          </div>
          
          <div className="letterhead-footer">
            <p>This is an official document of {companyName || 'Company Name'}</p>
            <p>Page 1 of 1</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterheadNotepad;