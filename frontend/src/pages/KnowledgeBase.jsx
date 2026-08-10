import React, { useState, useEffect } from 'react';
import { aiAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    text: '',
    category: 'menu'
  });

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await aiAPI.getKnowledgeBase();
      setDocuments(res.data?.documents || []);
    } catch (err) {
      toast.error('Failed to load vector database documents');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.id || !formData.text) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await aiAPI.addKnowledgeDoc(formData);
      toast.success('Document indexed into ChromaDB vector store!');
      setShowModal(false);
      setFormData({ id: '', text: '', category: 'menu' });
      fetchDocs();
    } catch (err) {
      toast.error('Failed to index document');
    }
  };

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title d-flex align-items-center gap-2">
            <span>📚</span> Vector Knowledge Base & Document Index
          </h1>
          <p className="page-subtitle">
            Manage operational documents, menu knowledge, and policies indexed in ChromaDB for RAG retrieval.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Add Knowledge Document
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-3 text-muted">Loading ChromaDB vector documents...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc, index) => (
            <div key={doc.id || index} className="card hover-lift">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                  {doc.metadata?.category || 'General'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  ID: {doc.id}
                </span>
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '12px' }}>
                {doc.text}
              </p>
              {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-subtle)',
                    padding: '6px 10px',
                    borderRadius: '4px'
                  }}
                >
                  Metadata: {JSON.stringify(doc.metadata)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Document Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div className="card fade-in" style={{ width: '100%', maxWidth: '540px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Index New Knowledge Base Document</h2>
            <form onSubmit={handleAdd}>
              <div className="mb-3">
                <label className="form-label">Document Unique ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. policy_refunds, menu_special"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="menu">Menu Specification</option>
                  <option value="policy">Operational Policy</option>
                  <option value="recipe">Recipe & Ingredients</option>
                  <option value="faq">Staff FAQ</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="form-label">Document Content Text</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Enter full text content to be vectorized by ChromaDB..."
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  required
                />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Index Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
