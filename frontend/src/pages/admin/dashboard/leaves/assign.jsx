import 'react-toastify/dist/ReactToastify.css';

import { ArrowLeft, CheckSquare } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const AdminAssignLeaveTemplate = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => new Set());
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const token = localStorage.getItem('token');
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${BASE_URL}/leave-templates/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to fetch templates');
      setTemplates(data.templates || []);
      if (!selectedTemplate && data.templates?.length) {
        setSelectedTemplate(data.templates[0]._id);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch templates');
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/leave-templates/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to fetch employees');
      setEmployees(data.employees || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allSelected = selected.size > 0 && selected.size === employees.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(employees.map(emp => emp._id)));
  };

  const toggleOne = id => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const assignTemplate = async () => {
    if (!selectedTemplate || selected.size === 0) {
      toast.error('Select a template and at least one employee.');
      return;
    }
    setAssigning(true);
    try {
      const response = await fetch(`${BASE_URL}/leave-templates/assign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          employeeIds: Array.from(selected),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to assign template');
      await fetchEmployees();
      setSelected(new Set());
      toast.success(data.message || 'Leave template assigned successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to assign template');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Header
            title="Assign Leave Template"
            icon={<CheckSquare className="w-6 h-6 text-primary" />}
            description="Select employees and assign a leave template."
          />
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border shadow-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-b border-light-border dark:border-dark-border">
            <div className="flex items-center gap-3">
              <label className="text-sm text-light-text dark:text-dark-text">Select Template</label>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-sm"
              >
                {templates.map(template => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={assignTemplate}
              disabled={assigning || !selectedTemplate || selected.size === 0}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              {assigning ? 'Assigning...' : 'Assign Template'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-primary"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Emp ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-left font-semibold">Designation</th>
                  <th className="px-4 py-3 text-left font-semibold">Template Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-light-text/70 dark:text-dark-text/70"
                    >
                      Loading employees...
                    </td>
                  </tr>
                ) : employees.length > 0 ? (
                  employees.map(emp => {
                    const isChecked = selected.has(emp._id);
                    return (
                      <tr key={emp._id} className="text-light-text dark:text-dark-text">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOne(emp._id)}
                            className="h-4 w-4 accent-primary"
                            aria-label={`Select ${emp.name}`}
                          />
                        </td>
                        <td className="px-4 py-3">{emp.employeeCode || emp._id}</td>
                        <td className="px-4 py-3">{emp.name}</td>
                        <td className="px-4 py-3">{emp.department}</td>
                        <td className="px-4 py-3">{emp.designation}</td>
                        <td className="px-4 py-3">{emp.templateAssigned || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-light-text/70 dark:text-dark-text/70"
                    >
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
      />
    </div>
  );
};

export default AdminAssignLeaveTemplate;
