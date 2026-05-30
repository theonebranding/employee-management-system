import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Edit2,
  Loader2,
  Lock,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const jsonHeaders = () => ({
  ...authHeaders(),
  'Content-Type': 'application/json',
});

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateLong = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Convert any date value to a `YYYY-MM-DD` string suitable for an
// <input type="date"> control. Avoids timezone drift caused by toISOString.
const toInputDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const TypeBadge = ({ type }) => {
  if (type === 'fixed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        Fixed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/15 text-violet-600 dark:text-violet-400">
      Floating
    </span>
  );
};

const AdminHolidays = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [yearFilter, setYearFilter] = useState(String(CURRENT_YEAR));
  const [typeFilter, setTypeFilter] = useState('all');

  // Drawer / modal state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create'); // 'create' | 'edit'
  const [drawerTemplate, setDrawerTemplate] = useState(null);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerCloseTimerRef = useRef(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);

  // Click-through view: shows the list of employees a template is assigned to
  const [assigneesTarget, setAssigneesTarget] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (yearFilter) params.set('year', yearFilter);
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
      const url = `${BASE_URL}/holidays/templates${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch holiday templates');
      }
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch (err) {
      console.error('Error fetching holiday templates:', err);
      toast.error(err.message || 'Failed to fetch holiday templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter, typeFilter]);

  // Drive the drawer open/close animation the same way the payroll snapshot
  // panel does in admin/salaries: mount first with `visible=false`, then on
  // the next animation frame flip `visible` so the backdrop fades in and the
  // surface translates from the right; on close, drop `visible` first and
  // unmount after 300 ms so the form state can reset cleanly. Splitting
  // mount and visible across two effects (and a double RAF) guarantees React
  // commits the off-screen frame before the browser paints the visible one.
  useEffect(() => {
    if (drawerOpen) {
      if (drawerCloseTimerRef.current) {
        clearTimeout(drawerCloseTimerRef.current);
        drawerCloseTimerRef.current = null;
      }
      setDrawerMounted(true);
      return undefined;
    }
    if (!drawerMounted) return undefined;
    setDrawerVisible(false);
    drawerCloseTimerRef.current = setTimeout(() => {
      setDrawerMounted(false);
      setDrawerTemplate(null);
      drawerCloseTimerRef.current = null;
    }, 300);
    return () => {
      if (drawerCloseTimerRef.current) {
        clearTimeout(drawerCloseTimerRef.current);
        drawerCloseTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerMounted || drawerVisible) return undefined;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setDrawerVisible(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerMounted]);

  const openCreateDrawer = () => {
    setDrawerMode('create');
    setDrawerTemplate(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (template) => {
    setDrawerMode('edit');
    setDrawerTemplate(template);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const onDrawerSaved = () => {
    closeDrawer();
    fetchTemplates();
  };

  const openAssignModal = (template) => {
    setAssignTarget(template);
    setAssignOpen(true);
  };

  const closeAssignModal = () => {
    setAssignOpen(false);
    setAssignTarget(null);
  };

  const onAssignDone = () => {
    closeAssignModal();
    fetchTemplates();
  };

  const requestDelete = (template) => setDeleteTarget(template);
  const cancelDelete = () => setDeleteTarget(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `${BASE_URL}/holidays/templates/${deleteTarget._id}`,
        { method: 'DELETE', headers: authHeaders() }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409 && data.code === 'TEMPLATE_HAS_ASSIGNMENTS') {
          const count =
            typeof deleteTarget.assignmentCount === 'number'
              ? deleteTarget.assignmentCount
              : null;
          toast.error(
            count !== null
              ? `Cannot delete: template has ${count} active assignment${count === 1 ? '' : 's'}. Unassign them first.`
              : 'Cannot delete: template has active assignments. Unassign them first.'
          );
          return;
        }
        throw new Error(data.message || 'Failed to delete template');
      }
      toast.success('Holiday template deleted');
      setDeleteTarget(null);
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting holiday template:', err);
      toast.error(err.message || 'Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Holiday Templates"
          description="Create reusable holiday calendars and bulk-assign them to employees."
          icon={<Calendar className="w-8 h-8 text-primary" />}
        />

        {/* Filters + Create CTA */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border shadow-card mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-light-text dark:text-dark-text">
                  Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All years</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-light-text dark:text-dark-text">
                  Type
                </label>
                <div className="flex rounded-lg border border-light-border dark:border-dark-border overflow-hidden">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'fixed', label: 'Fixed' },
                    { value: 'floating', label: 'Floating' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTypeFilter(opt.value)}
                      className={`px-3 py-1.5 text-sm transition-colors ${
                        typeFilter === opt.value
                          ? 'bg-primary text-white'
                          : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="ml-3 text-light-text dark:text-dark-text">
                Loading templates...
              </span>
            </div>
          ) : templates.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="w-12 h-12 text-light-text dark:text-dark-text opacity-40 mx-auto mb-4" />
              <p className="text-light-text dark:text-dark-text text-lg font-medium">
                No holiday templates yet.
              </p>
              <p className="text-light-text dark:text-dark-text opacity-60 mt-2">
                Create your first template to get started.
              </p>
              <button
                type="button"
                onClick={openCreateDrawer}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/70 dark:text-dark-text/70">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Template Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Year</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Holidays</th>
                    <th className="text-left py-3 px-4 font-semibold">Assigned</th>
                    <th className="text-left py-3 px-4 font-semibold">Created On</th>
                    <th className="text-center py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                  {templates.map((tpl) => (
                    <tr
                      key={tpl._id}
                      className="hover:bg-light-bg/60 dark:hover:bg-dark-bg/60 transition-colors"
                    >
                      <td className="py-3 px-4 text-light-text dark:text-dark-text">
                        <div className="font-medium">{tpl.name}</div>
                        {tpl.description ? (
                          <div className="text-xs opacity-70 mt-0.5 line-clamp-1">
                            {tpl.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-light-text dark:text-dark-text">
                        {tpl.year}
                      </td>
                      <td className="py-3 px-4">
                        <TypeBadge type={tpl.type} />
                      </td>
                      <td className="py-3 px-4 text-light-text dark:text-dark-text">
                        {Array.isArray(tpl.holidays) ? tpl.holidays.length : 0}
                      </td>
                      <td className="py-3 px-4 text-light-text dark:text-dark-text">
                        {(() => {
                          const count =
                            typeof tpl.assignmentCount === 'number' ? tpl.assignmentCount : 0;
                          if (count === 0) {
                            return (
                              <span className="inline-flex items-center gap-1 opacity-60">
                                <Users className="w-4 h-4" />0
                              </span>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => setAssigneesTarget(tpl)}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                              title="View assigned employees"
                            >
                              <Users className="w-4 h-4" />
                              {count}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-light-text dark:text-dark-text">
                        {formatDate(tpl.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(tpl)}
                            className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            title="Edit template"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openAssignModal(tpl)}
                            className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Assign to employees"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(tpl)}
                            className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {drawerMounted ? (
        <TemplateDrawer
          mode={drawerMode}
          template={drawerTemplate}
          visible={drawerVisible}
          onClose={closeDrawer}
          onSaved={onDrawerSaved}
        />
      ) : null}

      {assignOpen && assignTarget ? (
        <AssignTemplateModal
          template={assignTarget}
          onClose={closeAssignModal}
          onAssigned={onAssignDone}
        />
      ) : null}

      {assigneesTarget ? (
        <AssigneesModal
          template={assigneesTarget}
          onClose={() => setAssigneesTarget(null)}
          onUnassigned={() => {
            // Refresh templates so assignmentCount drops, but keep the
            // modal open so the admin can keep removing entries.
            fetchTemplates();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteConfirmDialog
          title="Delete holiday template?"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          deleting={deleting}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      ) : null}

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={3}
        closeOnClick
        autoClose={2500}
      />
    </div>
  );
};

export default AdminHolidays;


// ---------------------------------------------------------------------------
// Create / Edit Template drawer
// ---------------------------------------------------------------------------

const TemplateDrawer = ({ mode, template, visible, onClose, onSaved }) => {
  const isEdit = mode === 'edit';
  const assignmentCount =
    isEdit && template && typeof template.assignmentCount === 'number'
      ? template.assignmentCount
      : 0;
  const typeLocked = isEdit && assignmentCount > 0;

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [year, setYear] = useState(template?.year || CURRENT_YEAR);
  const [type, setType] = useState(template?.type || 'fixed');
  const [holidays, setHolidays] = useState(() =>
    Array.isArray(template?.holidays)
      ? template.holidays.map((h) => ({
          name: h.name,
          date: toInputDate(h.date),
        }))
      : []
  );
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const addHoliday = (entry) => {
    setHolidays((prev) => [...prev, entry]);
    setAddOpen(false);
  };

  const removeHoliday = (index) => {
    setHolidays((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || yearNum < 1970 || yearNum > 2100) {
      toast.error('Please enter a valid year');
      return;
    }
    if (!['fixed', 'floating'].includes(type)) {
      toast.error('Please choose Fixed or Floating');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      year: yearNum,
      type,
      holidays: holidays.map((h) => ({ name: h.name, date: h.date })),
    };

    const url = isEdit
      ? `${BASE_URL}/holidays/templates/${template._id}`
      : `${BASE_URL}/holidays/templates`;
    const method = isEdit ? 'PUT' : 'POST';

    setSaving(true);
    try {
      const response = await fetch(url, {
        method,
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409 && data.code === 'TEMPLATE_TYPE_CHANGE_BLOCKED') {
          toast.error(
            data.message ||
              'Template type cannot change once assignments or credits exist.'
          );
          return;
        }
        if (response.status === 400 && data.code === 'TEMPLATE_HOLIDAY_OUT_OF_YEAR') {
          toast.error('One or more holidays fall outside the template year');
          return;
        }
        throw new Error(data.message || 'Failed to save template');
      }
      toast.success(
        isEdit ? 'Holiday template updated' : 'Holiday template created'
      );
      onSaved();
    } catch (err) {
      console.error('Error saving holiday template:', err);
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit holiday template' : 'Create holiday template'}
        className={`fixed inset-y-0 right-0 w-full max-w-lg bg-light-card dark:bg-dark-card shadow-2xl z-50 flex flex-col border-l border-light-border dark:border-dark-border transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border">
          <div>
            <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
              {isEdit ? 'Edit Holiday Template' : 'Create Holiday Template'}
            </h2>
            {isEdit ? (
              <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-0.5">
                {assignmentCount} employee{assignmentCount === 1 ? '' : 's'} assigned
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg text-light-text dark:text-dark-text"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. India Public Holidays 2025"
              className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
              className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
                Year <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
                min={1970}
                max={2100}
                className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
                Type <span className="text-danger">*</span>
              </label>
              <div className="flex gap-3 pt-1">
                {[
                  { value: 'fixed', label: 'Fixed' },
                  { value: 'floating', label: 'Floating' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                      type === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg'
                    } ${typeLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="template-type"
                      value={opt.value}
                      checked={type === opt.value}
                      onChange={() => !typeLocked && setType(opt.value)}
                      disabled={typeLocked}
                      className="accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {typeLocked ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-light-text/70 dark:text-dark-text/70">
                  <Lock className="w-3.5 h-3.5" />
                  Type cannot change after assignments or credits exist.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                Holidays
              </label>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Holiday
              </button>
            </div>

            {holidays.length === 0 ? (
              <div className="rounded-lg border border-dashed border-light-border dark:border-dark-border px-4 py-6 text-center text-sm text-light-text/60 dark:text-dark-text/60">
                No holidays added yet. Click <span className="font-medium">Add Holiday</span> to start.
              </div>
            ) : (
              <ul className="rounded-lg border border-light-border dark:border-dark-border divide-y divide-light-border dark:divide-dark-border">
                {holidays.map((h, idx) => (
                  <li
                    key={`${h.date}-${h.name}-${idx}`}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <div>
                      <div className="text-sm font-medium text-light-text dark:text-dark-text">
                        {h.name}
                      </div>
                      <div className="text-xs text-light-text/70 dark:text-dark-text/70">
                        {formatDateLong(h.date)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeHoliday(idx)}
                      className="p-1.5 rounded text-danger hover:bg-danger/10"
                      aria-label={`Remove ${h.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>

        <footer className="px-6 py-4 border-t border-light-border dark:border-dark-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium transition-colors ${
              saving ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isEdit ? 'Save Changes' : 'Save Template'}
          </button>
        </footer>
      </aside>

      {addOpen ? (
        <AddHolidayModal
          year={Number(year)}
          onCancel={() => setAddOpen(false)}
          onAdd={addHoliday}
        />
      ) : null}
    </>
  );
};

// ---------------------------------------------------------------------------
// Add Holiday modal (client-side only - pushes into the drawer's holiday list)
// ---------------------------------------------------------------------------

const AddHolidayModal = ({ year, onCancel, onAdd }) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      toast.error('Holiday name and date are required');
      return;
    }
    if (Number.isInteger(year)) {
      const parsedYear = new Date(`${date}T00:00:00`).getFullYear();
      if (parsedYear !== year) {
        toast.error('Holiday date must fall within the template year');
        return;
      }
    }
    onAdd({ name: name.trim(), date });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add holiday"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-light-card dark:bg-dark-card rounded-xl shadow-2xl border border-light-border dark:border-dark-border"
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-light-border dark:border-dark-border">
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text">
            Add Holiday
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg text-light-text dark:text-dark-text"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Diwali"
              className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <footer className="flex justify-end gap-2 px-5 py-3 border-t border-light-border dark:border-dark-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium"
          >
            Add
          </button>
        </footer>
      </form>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Bulk Assign Template modal
// ---------------------------------------------------------------------------

const AssignTemplateModal = ({ template, onClose, onAssigned }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState([]); // [{ _id, name, employeeCode, email }]
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [search]);

  // Fetch employees: name search uses /employee/find when a query is present,
  // otherwise the paginated /employee/all endpoint.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setSearchLoading(true);
      try {
        let employees = [];
        if (debouncedSearch) {
          const url = `${BASE_URL}/employee/find?name=${encodeURIComponent(debouncedSearch)}`;
          const response = await fetch(url, { headers: authHeaders() });
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.employee) {
            employees = [data.employee];
          } else if (response.status === 404) {
            employees = [];
          } else if (!response.ok) {
            throw new Error(data.message || 'Failed to search employees');
          }
        } else {
          const response = await fetch(`${BASE_URL}/employee/all?page=1&limit=50`, {
            headers: authHeaders(),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch employees');
          }
          employees = Array.isArray(data.employees) ? data.employees : [];
        }
        if (!cancelled) setResults(employees);
      } catch (err) {
        if (!cancelled) {
          console.error('Error searching employees:', err);
          toast.error(err.message || 'Failed to search employees');
          setResults([]);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const selectedIds = useMemo(() => new Set(selected.map((e) => e._id)), [selected]);

  const toggleEmployee = (emp) => {
    setSelected((prev) => {
      if (prev.some((e) => e._id === emp._id)) {
        return prev.filter((e) => e._id !== emp._id);
      }
      return [...prev, emp];
    });
  };

  const removeChip = (id) => {
    setSelected((prev) => prev.filter((e) => e._id !== id));
  };

  const handleSubmit = async () => {
    if (selected.length === 0) {
      toast.error('Select at least one employee');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${BASE_URL}/holidays/templates/${template._id}/assign`,
        {
          method: 'POST',
          headers: jsonHeaders(),
          body: JSON.stringify({ employeeIds: selected.map((e) => e._id) }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to assign template');
      }
      const created = Array.isArray(data.created) ? data.created : [];
      const skipped = Array.isArray(data.skipped) ? data.skipped : [];
      if (created.length > 0) {
        toast.success(
          `Assigned to ${created.length} employee${created.length === 1 ? '' : 's'}`
        );
      } else if (skipped.length > 0) {
        toast.info('All selected employees were already assigned');
      } else {
        toast.success('Assignment processed');
      }
      if (skipped.length > 0) {
        toast.info(
          `Skipped ${skipped.length} employee${skipped.length === 1 ? '' : 's'} already assigned`
        );
      }
      onAssigned();
    } catch (err) {
      console.error('Error assigning template:', err);
      toast.error(err.message || 'Failed to assign template');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Assign template ${template.name}`}
    >
      <div className="w-full max-w-2xl bg-light-card dark:bg-dark-card rounded-xl shadow-2xl border border-light-border dark:border-dark-border flex flex-col max-h-[85vh]">
        <header className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border">
          <div>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Assign Template: {template.name}
            </h3>
            <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-0.5">
              {template.year} · <TypeBadge type={template.type} />
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg text-light-text dark:text-dark-text"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Search employees
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-light-text/50 dark:text-dark-text/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a name to search..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selected.map((emp) => (
                <span
                  key={emp._id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs"
                >
                  <span className="font-medium">{emp.name}</span>
                  {emp.employeeCode ? (
                    <span className="opacity-70">· {emp.employeeCode}</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeChip(emp._id)}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                    aria-label={`Remove ${emp.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="rounded-lg border border-light-border dark:border-dark-border overflow-hidden">
            <div className="px-4 py-2 bg-light-bg/60 dark:bg-dark-bg/60 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
              {searchLoading
                ? 'Searching...'
                : results.length > 0
                  ? `${results.length} result${results.length === 1 ? '' : 's'}`
                  : 'No matching employees'}
            </div>
            <ul className="max-h-72 overflow-y-auto divide-y divide-light-border dark:divide-dark-border">
              {results.length === 0 && !searchLoading ? (
                <li className="px-4 py-6 text-center text-sm text-light-text/60 dark:text-dark-text/60 flex flex-col items-center gap-2">
                  <AlertCircle className="w-5 h-5 opacity-60" />
                  Try a different search term.
                </li>
              ) : null}
              {results.map((emp) => {
                const isChecked = selectedIds.has(emp._id);
                return (
                  <li key={emp._id} className="hover:bg-light-bg/60 dark:hover:bg-dark-bg/60">
                    <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleEmployee(emp)}
                        className="h-4 w-4 accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-light-text dark:text-dark-text truncate">
                          {emp.name}
                        </div>
                        <div className="text-xs text-light-text/60 dark:text-dark-text/60 truncate">
                          {emp.employeeCode ? `${emp.employeeCode} · ` : ''}
                          {emp.email || ''}
                        </div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <footer className="flex items-center justify-between px-6 py-4 border-t border-light-border dark:border-dark-border">
          <span className="text-sm text-light-text/70 dark:text-dark-text/70">
            {selected.length} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selected.length === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium transition-colors ${
                submitting || selected.length === 0 ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Assign Template
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Assignees modal — view & remove the employees a template is assigned to
// ---------------------------------------------------------------------------

const AssigneesModal = ({ template, onClose, onUnassigned }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/holidays/templates/${template._id}/assignments`,
        { headers: authHeaders() }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch assignments');
      }
      setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      toast.error(err.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?._id]);

  const handleUnassign = async (employeeId, displayName) => {
    if (!employeeId) return;
    if (
      !window.confirm(
        `Remove ${displayName || 'this employee'} from "${template.name}"? ` +
          (template.type === 'floating'
            ? 'Their unused floating credits for this template will be forfeited.'
            : 'They will stop receiving these holidays going forward.')
      )
    ) {
      return;
    }

    setRemovingId(employeeId);
    try {
      const response = await fetch(
        `${BASE_URL}/holidays/templates/${template._id}/assignments/${employeeId}`,
        { method: 'DELETE', headers: authHeaders() }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove assignment');
      }
      toast.success('Assignment removed');
      // Refresh both this modal and the parent list (counts will change).
      await fetchAssignments();
      onUnassigned?.();
    } catch (err) {
      console.error('Error removing assignment:', err);
      toast.error(err.message || 'Failed to remove assignment');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Employees assigned to ${template.name}`}
    >
      <div className="w-full max-w-2xl bg-light-card dark:bg-dark-card rounded-xl shadow-2xl border border-light-border dark:border-dark-border flex flex-col max-h-[85vh]">
        <header className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border">
          <div>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Assigned to: {template.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-light-text/60 dark:text-dark-text/60">
              <span>{template.year}</span>
              <span>·</span>
              <TypeBadge type={template.type} />
              <span>·</span>
              <span>
                {assignments.length} employee{assignments.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg text-light-text dark:text-dark-text"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-6 py-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="ml-3 text-sm text-light-text/70 dark:text-dark-text/70">
                Loading assignments...
              </span>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-10">
              <AlertCircle className="w-8 h-8 mx-auto text-light-text/40 dark:text-dark-text/40 mb-2" />
              <p className="text-sm text-light-text/70 dark:text-dark-text/70">
                No employees are currently assigned to this template.
              </p>
            </div>
          ) : (
            <ul className="rounded-lg border border-light-border dark:border-dark-border divide-y divide-light-border dark:divide-dark-border">
              {assignments.map((row) => {
                const emp = row.employee || {};
                const empId = emp._id || emp.id;
                const displayName = emp.name || 'Unknown employee';
                return (
                  <li
                    key={String(row._id || empId)}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-light-bg/60 dark:hover:bg-dark-bg/60"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-light-text dark:text-dark-text truncate">
                        {displayName}
                      </div>
                      <div className="text-xs text-light-text/60 dark:text-dark-text/60 truncate">
                        {emp.employeeCode ? `${emp.employeeCode} · ` : ''}
                        {emp.email || ''}
                      </div>
                      {row.assignedAt ? (
                        <div className="text-[11px] text-light-text/50 dark:text-dark-text/50 mt-0.5">
                          Assigned on {formatDate(row.assignedAt)}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnassign(empId, displayName)}
                      disabled={removingId === empId}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 ${
                        removingId === empId ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      title="Remove this employee from the template"
                    >
                      {removingId === empId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex justify-end px-6 py-4 border-t border-light-border dark:border-dark-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

const DeleteConfirmDialog = ({ title, message, deleting, onCancel, onConfirm }) => (
  <div
    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <div className="w-full max-w-md bg-light-card dark:bg-dark-card rounded-xl shadow-2xl border border-light-border dark:border-dark-border">
      <div className="px-5 py-4 border-b border-light-border dark:border-dark-border flex items-center gap-3">
        <div className="p-2 rounded-full bg-danger/10 text-danger">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-base font-semibold text-light-text dark:text-dark-text">
          {title}
        </h3>
      </div>
      <p className="px-5 py-4 text-sm text-light-text/80 dark:text-dark-text/80">{message}</p>
      <footer className="flex justify-end gap-2 px-5 py-3 border-t border-light-border dark:border-dark-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-danger text-white text-sm font-medium hover:opacity-90 ${
            deleting ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Delete
        </button>
      </footer>
    </div>
  </div>
);
