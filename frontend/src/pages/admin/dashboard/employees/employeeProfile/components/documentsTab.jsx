import { Download, FilePlus2, Trash2, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const DocumentsTab = ({ employeeId }) => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const [employee, setEmployee] = useState(null);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    type: 'offer-letter',
    fileData: '',
    fileName: '',
    mimeType: '',
  });
  const [loading, setLoading] = useState(false);

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employee/find?id=${employeeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch employee documents');
      const data = await response.json();
      setEmployee(data.employee);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch employee documents');
    }
  };

  useEffect(() => {
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleFileChange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileData = await new Promise((resolve, reject) => {
      const reader = new window.FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    setDocumentForm(previous => ({
      ...previous,
      fileData,
      fileName: file.name,
      mimeType: file.type,
    }));
  };

  const uploadDocument = async event => {
    event.preventDefault();

    if (!documentForm.title || !documentForm.fileData) {
      toast.error('Document title and file are required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/employee/${employeeId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(documentForm),
      });

      if (!response.ok) throw new Error('Failed to upload document');

      toast.success('Document uploaded successfully');
      setDocumentForm({
        title: '',
        type: 'offer-letter',
        fileData: '',
        fileName: '',
        mimeType: '',
      });
      await fetchEmployee();
    } catch (error) {
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async documentId => {
    try {
      const response = await fetch(`${BASE_URL}/employee/${employeeId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to delete document');
      toast.success('Document deleted successfully');
      await fetchEmployee();
    } catch (error) {
      toast.error(error.message || 'Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FilePlus2 className="w-5 h-5 text-primary" />
          Upload Employee Document
        </h3>
        <form onSubmit={uploadDocument} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="w-full px-4 py-2 border border-light-border dark:border-dark-border rounded-lg bg-light-bg dark:bg-dark-bg"
            placeholder="Document title"
            value={documentForm.title}
            onChange={event =>
              setDocumentForm(previous => ({ ...previous, title: event.target.value }))
            }
          />
          <select
            className="w-full px-4 py-2 border border-light-border dark:border-dark-border rounded-lg bg-light-bg dark:bg-dark-bg"
            value={documentForm.type}
            onChange={event =>
              setDocumentForm(previous => ({ ...previous, type: event.target.value }))
            }
          >
            <option value="offer-letter">Offer Letter</option>
            <option value="aadhaar-card">Aadhaar Card</option>
            <option value="pan-card">PAN Card</option>
            <option value="other">Other</option>
          </select>
          <input type="file" onChange={handleFileChange} className="md:col-span-2" />
          <button
            type="submit"
            disabled={loading}
            className="md:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
          >
            <Upload className="w-4 h-4" />
            {loading ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>
      </div>

      <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold mb-4">Saved Documents</h3>
        <div className="space-y-3">
          {(employee?.documents || []).map(document => (
            <div
              key={document._id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border border-light-border dark:border-dark-border rounded-lg"
            >
              <div>
                <p className="font-medium">{document.title}</p>
                <p className="text-sm opacity-70">
                  {document.type} {document.fileName ? `| ${document.fileName}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={document.fileData}
                  download={document.fileName || `${document.title}.file`}
                  className="px-3 py-2 rounded-lg bg-info text-white inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <button
                  onClick={() => deleteDocument(document._id)}
                  className="px-3 py-2 rounded-lg bg-danger text-white inline-flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}
          {!(employee?.documents || []).length && (
            <p className="text-sm opacity-70">No documents uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsTab;
