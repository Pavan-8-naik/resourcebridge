import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import './ResourceManager.css';

const INITIAL_FORM = {
  name: '',
  category: '',
  description: '',
  location: '',
  available: true,
};

export default function ResourceManager() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  // Form State
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('All');

  // Confirmation modal state
  const [resourceToDelete, setResourceToDelete] = useState(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // 1. Fetch Resources
  const fetchResources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      showToast('error', `Error loading resources: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Form Validation
  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Resource name is required.';
    }
    if (!formData.category.trim()) {
      errors.category = 'Category is required.';
    }
    if (!formData.location.trim()) {
      errors.location = 'Location is required.';
    }
    if (!formData.description.trim()) {
      errors.description = 'Description is required.';
    } else if (formData.description.trim().length < 8) {
      errors.description = 'Description must be at least 8 characters long.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 3. Add or Update Resource
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      if (editingId) {
        // Edit mode
        const { data, error } = await supabase
          .from('resources')
          .update({
            name: formData.name.trim(),
            category: formData.category.trim(),
            description: formData.description.trim(),
            location: formData.location.trim(),
            available: Boolean(formData.available),
          })
          .eq('id', editingId)
          .select()
          .single();

        if (error) throw error;

        setResources((prev) =>
          prev.map((item) => (item.id === editingId ? data : item))
        );
        showToast('success', `Resource "${data.name}" updated successfully.`);
        handleCancelEdit();
      } else {
        // Create mode
        const newRecord = {
          name: formData.name.trim(),
          category: formData.category.trim(),
          description: formData.description.trim(),
          location: formData.location.trim(),
          available: Boolean(formData.available),
        };

        if (currentUserId) {
          newRecord.owner_id = currentUserId;
        }

        const { data, error } = await supabase
          .from('resources')
          .insert([newRecord])
          .select()
          .single();

        if (error) throw error;

        setResources((prev) => [data, ...prev]);
        showToast('success', `Resource "${data.name}" added successfully.`);
        setFormData(INITIAL_FORM);
        setFormErrors({});
      }
    } catch (err) {
      showToast('error', `Failed to save: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditInit = (resource) => {
    setEditingId(resource.id);
    setFormData({
      name: resource.name || '',
      category: resource.category || '',
      description: resource.description || '',
      location: resource.location || '',
      available: resource.available ?? true,
    });
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
  };

  // 4. Delete Resource
  const handleDeleteConfirm = async () => {
    if (!resourceToDelete) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceToDelete.id);

      if (error) throw error;

      setResources((prev) => prev.filter((r) => r.id !== resourceToDelete.id));
      showToast('success', `Resource "${resourceToDelete.name}" deleted.`);

      if (editingId === resourceToDelete.id) {
        handleCancelEdit();
      }
    } catch (err) {
      showToast('error', `Delete failed: ${err.message}`);
    } finally {
      setSubmitting(false);
      setResourceToDelete(null);
    }
  };

  // Filter Categories
  const categoryOptions = useMemo(() => {
    const cats = new Set(
      resources.map((r) => r.category).filter((c) => Boolean(c && c.trim()))
    );
    return ['All', ...Array.from(cats)];
  }, [resources]);

  // Search & Filter Execution
  const displayedResources = useMemo(() => {
    return resources.filter((item) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;

      const matchesAvailability =
        selectedAvailability === 'All' ||
        (selectedAvailability === 'available' && item.available === true) ||
        (selectedAvailability === 'unavailable' && item.available === false);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [resources, searchQuery, selectedCategory, selectedAvailability]);

  return (
    <div className="rb-mgmt-wrapper">
      {/* Toast Alert */}
      {toast && (
        <div className={`rb-toast rb-toast-${toast.type}`} role="alert">
          <div className="rb-toast-icon">
            {toast.type === 'success' ? '✓' : '!'}
          </div>
          <span>{toast.message}</span>
          <button
            type="button"
            className="rb-toast-close"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Section Header */}
      <div className="rb-header-bar">
        <div>
          <span className="rb-badge-subtitle">Operational Hub</span>
          <h1 className="rb-title">Resource Inventory</h1>
          <p className="rb-subtitle">
            Manage, provision, and track asset availability across the ecosystem.
          </p>
        </div>
        <div className="rb-stats-chip">
          <span className="rb-stats-num">{resources.length}</span>
          <span className="rb-stats-label">Total Assets</span>
        </div>
      </div>

      {/* Form Card */}
      <section className="rb-card rb-form-card">
        <div className="rb-card-header">
          <div>
            <h2 className="rb-card-title">
              {editingId ? 'Modify Resource' : 'Register New Resource'}
            </h2>
            <p className="rb-card-description">
              Ensure all required specifications match physical logistics.
            </p>
          </div>
          {editingId && (
            <span className="rb-badge-editing">Editing Active Record</span>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="rb-form">
          <div className="rb-grid-form">
            <div className="rb-input-group">
              <label htmlFor="res-name">
                Resource Name <span className="rb-required">*</span>
              </label>
              <input
                id="res-name"
                type="text"
                placeholder="e.g., High-Torque Generator"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={formErrors.name ? 'rb-input-error' : ''}
              />
              {formErrors.name && (
                <small className="rb-field-error">{formErrors.name}</small>
              )}
            </div>

            <div className="rb-input-group">
              <label htmlFor="res-category">
                Category <span className="rb-required">*</span>
              </label>
              <input
                id="res-category"
                type="text"
                placeholder="e.g., Heavy Equipment, Electronics"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className={formErrors.category ? 'rb-input-error' : ''}
              />
              {formErrors.category && (
                <small className="rb-field-error">{formErrors.category}</small>
              )}
            </div>

            <div className="rb-input-group">
              <label htmlFor="res-location">
                Storage / Base Location <span className="rb-required">*</span>
              </label>
              <input
                id="res-location"
                type="text"
                placeholder="e.g., Sector 4 - Bay 12"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className={formErrors.location ? 'rb-input-error' : ''}
              />
              {formErrors.location && (
                <small className="rb-field-error">{formErrors.location}</small>
              )}
            </div>

            <div className="rb-input-group rb-checkbox-group">
              <label className="rb-toggle-label">
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e) =>
                    setFormData({ ...formData, available: e.target.checked })
                  }
                />
                <span className="rb-toggle-text">Status: Marked as Available</span>
              </label>
            </div>
          </div>

          <div className="rb-input-group">
            <label htmlFor="res-desc">
              Description & Specifications <span className="rb-required">*</span>
            </label>
            <textarea
              id="res-desc"
              rows={3}
              placeholder="State technical constraints, handling instructions, or condition..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className={formErrors.description ? 'rb-input-error' : ''}
            />
            {formErrors.description && (
              <small className="rb-field-error">{formErrors.description}</small>
            )}
          </div>

          <div className="rb-form-footer">
            <button
              type="submit"
              disabled={submitting}
              className="rb-btn rb-btn-primary"
            >
              {submitting
                ? 'Processing...'
                : editingId
                ? 'Update Resource'
                : 'Deploy Resource'}
            </button>
            {editingId && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleCancelEdit}
                className="rb-btn rb-btn-ghost"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="rb-toolbar">
        <div className="rb-search-wrap">
          <svg className="rb-search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            className="rb-search-input"
            placeholder="Search by name, specs, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="rb-filters">
          <div className="rb-select-wrap">
            <label htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="rb-select-wrap">
            <label htmlFor="filter-availability">Availability</label>
            <select
              id="filter-availability"
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="available">Available Only</option>
              <option value="unavailable">In Use Only</option>
            </select>
          </div>
        </div>
      </section>

      {/* Listing Grid */}
      <section className="rb-catalog-area">
        {loading ? (
          <div className="rb-empty-box">
            <div className="rb-spinner"></div>
            <p>Synchronizing with database...</p>
          </div>
        ) : displayedResources.length === 0 ? (
          <div className="rb-empty-box">
            <p className="rb-empty-title">No resources match your query</p>
            <p className="rb-empty-desc">
              Try adjusting your search criteria or register a new resource above.
            </p>
          </div>
        ) : (
          <div className="rb-resource-grid">
            {displayedResources.map((item) => (
              <div key={item.id} className="rb-item-card">
                <div className="rb-item-top">
                  <div className="rb-item-heading">
                    <span className="rb-item-cat">{item.category}</span>
                    <h3 className="rb-item-title">{item.name}</h3>
                  </div>
                  <span
                    className={`rb-status-pill ${
                      item.available ? 'rb-status-online' : 'rb-status-offline'
                    }`}
                  >
                    {item.available ? 'Available' : 'Reserved'}
                  </span>
                </div>

                <div className="rb-item-loc">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{item.location || 'Unassigned Location'}</span>
                </div>

                <p className="rb-item-desc">{item.description}</p>

                <div className="rb-item-actions">
                  <button
                    type="button"
                    onClick={() => handleEditInit(item)}
                    className="rb-action-btn rb-btn-edit"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setResourceToDelete(item)}
                    className="rb-action-btn rb-btn-delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {resourceToDelete && (
        <div className="rb-modal-overlay">
          <div className="rb-modal-card">
            <h3 className="rb-modal-title">Confirm Deletion</h3>
            <p className="rb-modal-body">
              Are you sure you want to delete{' '}
              <strong>"{resourceToDelete.name}"</strong>? This will permanently
              remove this resource record from the Supabase database.
            </p>
            <div className="rb-modal-foot">
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="rb-btn rb-btn-danger"
              >
                {submitting ? 'Deleting...' : 'Confirm & Delete'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setResourceToDelete(null)}
                className="rb-btn rb-btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}