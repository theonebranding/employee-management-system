import {
  ArrowLeft,
  Briefcase,
  Building2,
  ChevronDown,
  ExternalLink,
  Filter,
  Loader2,
  Mail,
  Phone,
  PlusCircle,
  Search,
  User,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const AdminManageEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [uniqueRoles, setUniqueRoles] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmployeeForm, setAddEmployeeForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    jobRole: '',
    password: '1234',
  });
  const [addLoading, setAddLoading] = useState(false);

  const jobRoleOptions = uniqueRoles.filter(role => role !== 'All');

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/employee/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch employees.');

      const data = await response.json();
      setEmployees(data.employees || []);
      setUniqueRoles(['All', ...new Set(data.employees.map(emp => emp.jobRole))]);
      toast.success('Employees fetched successfully');
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error(error.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/employee/find?name=${encodeURIComponent(searchTerm)}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to search employees.');

      const data = await response.json();
      setSearchResults([data.employee]);
      setIsSearchActive(true);
      toast.success('Search completed successfully');
    } catch (error) {
      console.error('Error searching employees:', error);
      toast.error(error.message || 'Failed to search employees');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setIsSearchActive(false);
    setSearchResults([]);
    setSearchTerm('');
  };

  const filteredEmployees = employees.filter(employee => {
    return selectedRole === 'All' || employee.jobRole === selectedRole;
  });

  const handleAddEmployeeChange = e => {
    const { name, value } = e.target;
    setAddEmployeeForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRemoveRole = roleToRemove => {
    if (roleToRemove === 'All') return;
    setUniqueRoles(prev => prev.filter(role => role !== roleToRemove));
    if (selectedRole === roleToRemove) {
      setSelectedRole('All');
    }
    if (addEmployeeForm.jobRole === roleToRemove) {
      setAddEmployeeForm(prev => ({ ...prev, jobRole: '' }));
    }
  };

  const handleJobRoleChange = e => {
    const { value } = e.target;
    if (value === '__add_role__') {
      const nextRole = window.prompt('Enter new role name');
      const trimmed = (nextRole || '').trim();
      if (!trimmed) return;
      if (uniqueRoles.includes(trimmed)) {
        toast.error('Role already exists');
        return;
      }
      setUniqueRoles(prev => [...prev, trimmed]);
      setAddEmployeeForm(prev => ({ ...prev, jobRole: trimmed }));
      return;
    }
    if (value === '__remove_role__') {
      if (!addEmployeeForm.jobRole) {
        toast.error('Select a role to remove');
        return;
      }
      handleRemoveRole(addEmployeeForm.jobRole);
      return;
    }
    setAddEmployeeForm(prev => ({ ...prev, jobRole: value }));
  };

  const handleAddEmployee = async e => {
    e.preventDefault();

    if (
      !addEmployeeForm.name ||
      !addEmployeeForm.email ||
      !addEmployeeForm.phoneNumber ||
      !addEmployeeForm.jobRole
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    setAddLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/employee/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(addEmployeeForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add new employee');
      }

      toast.success('Employee added successfully');
      setShowAddModal(false);
      setAddEmployeeForm({
        name: '',
        email: '',
        phoneNumber: '',
        jobRole: '',
        password: '1234',
      });
      fetchEmployees();
    } catch (error) {
      toast.error(error.message || 'Failed to add employee');
    } finally {
      setAddLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = event => {
      if (!event.target.closest('.filter-dropdown')) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Manage Employees"
          description="View, search, and manage employees in your organization."
          icon={<Users className="w-8 h-8 text-primary" />}
        />

        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-light-card dark:bg-dark-card p-4 rounded-xl border border-light-border dark:border-dark-border">
          <div className="md:col-span-6 relative">
            <input
              type="text"
              placeholder="Search employees by name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-light-text dark:text-dark-text placeholder-light-text dark:placeholder-dark-text "
            />
          </div>
          <div className="md:col-span-1 relative">
            <button
              onClick={handleSearch}
              className="w-full px-4 py-4 bg-primary hover:bg-primary-dark rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
              aria-label="Search employees"
            >
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="md:col-span-3 relative filter-dropdown">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg flex items-center justify-between gap-2 hover:bg-light-bg/80 dark:hover:bg-dark-bg/80 transition-all duration-200 text-light-text dark:text-dark-text"
              aria-label="Filter by role"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <span>{selectedRole === 'All' ? 'All Roles' : selectedRole}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 text-light-text dark:text-dark-text ${isFilterOpen ? 'transform rotate-180' : ''}`}
              />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg shadow-lg z-10 py-2 max-h-60 overflow-y-auto text-light-text dark:text-dark-text">
                {uniqueRoles.map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      setSelectedRole(role);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-light-bg/80 dark:hover:bg-dark-bg/80 transition-colors duration-200 flex items-center gap-2 ${selectedRole === role ? 'bg-primary bg-opacity-20' : ''}`}
                  >
                    {role === 'All' ? (
                      <Users className="w-4 h-4 text-primary" />
                    ) : (
                      <Building2 className="w-4 h-4 text-primary" />
                    )}
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2 relative">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-primary hover:bg-primary-dark rounded-lg flex items-center gap-2 transition-colors duration-200 text-white"
              aria-label="Add new employee"
            >
              <PlusCircle className="w-5 h-5" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Search Results or Employee List */}
        {isSearchActive ? (
          <div className="space-y-4">
            <button
              onClick={handleGoBack}
              className="px-4 py-2 bg-light-card dark:bg-dark-card hover:bg-light-card/80 dark:hover:bg-dark-card/80 rounded-lg flex items-center gap-2 transition-colors duration-200 text-light-text dark:text-dark-text"
              aria-label="Back to all employees"
            >
              <ArrowLeft className="w-4 h-4" /> Back to All Employees
            </button>

            {searchResults.map(employee => (
              <EmployeeCard key={employee._id} employee={employee} />
            ))}
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="ml-3 text-light-text dark:text-dark-text">Loading employees...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map(employee => (
              <EmployeeCard key={employee._id} employee={employee} />
            ))}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-6 max-w-lg w-full border border-light-border dark:border-dark-border shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-light-text dark:text-dark-text">
                Add New Employee
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-light-bg/80 dark:hover:bg-dark-bg/80 transition-colors duration-200"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-light-text dark:text-dark-text " />
              </button>
            </div>

            <form onSubmit={handleAddEmployee}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text  mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text dark:text-dark-text  w-5 h-5" />
                    <input
                      type="text"
                      name="name"
                      value={addEmployeeForm.name}
                      onChange={handleAddEmployeeChange}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-light-text dark:text-dark-text placeholder-light-text dark:placeholder-dark-text "
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text  mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text dark:text-dark-text  w-5 h-5" />
                    <input
                      type="email"
                      name="email"
                      value={addEmployeeForm.email}
                      onChange={handleAddEmployeeChange}
                      placeholder="john.doe@company.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-light-text dark:text-dark-text placeholder-light-text dark:placeholder-dark-text "
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-light-text/60 dark:text-dark-text/60">
                    Employees can sign in using either their email or employee code.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text  mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text dark:text-dark-text  w-5 h-5" />
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={addEmployeeForm.phoneNumber}
                      onChange={handleAddEmployeeChange}
                      placeholder="+1 (555) 123-4567"
                      className="w-full pl-10 pr-4 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-light-text dark:text-dark-text placeholder-light-text dark:placeholder-dark-text "
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text  mb-1">
                    Job Role *
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text dark:text-dark-text  w-5 h-5" />
                    <select
                      name="jobRole"
                      value={addEmployeeForm.jobRole}
                      onChange={handleJobRoleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-light-text dark:text-dark-text"
                      required
                    >
                      <option value="">Select a role</option>
                      {jobRoleOptions.map(role => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                      <option value="__add_role__">Add new role...</option>
                      <option value="__remove_role__">Remove selected role...</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text  mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value="1234"
                      className="w-full pl-4 pr-4 py-2.5 bg-light-bg/50 dark:bg-dark-bg/50 border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text  cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <p className="mt-1 text-sm text-warning">
                    <span className="flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Default password is "1234". Employee can change it using the forgot password
                      feature.
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-light-text/60 dark:text-dark-text/60">
                    Employee ID is auto-generated (e.g., JD26001) using initials + year + sequence.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-light-card dark:bg-dark-card hover:bg-light-card/80 dark:hover:bg-dark-card/80 rounded-lg transition-colors duration-200 text-light-text dark:text-dark-text"
                  aria-label="Cancel add employee"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2.5 bg-primary hover:bg-primary-dark rounded-lg flex items-center gap-2 transition-colors duration-200 text-white"
                  aria-label="Add employee"
                >
                  {addLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      Add Employee
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick={true}
        autoClose={1000}
      />
    </div>
  );
};

const EmployeeCard = ({ employee }) => (
  <div className="group bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border hover:border-primary transition-all duration-300 overflow-hidden">
    <div className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-primary bg-opacity-20 rounded-xl flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
            {employee.name}
          </h3>
          <span className="text-sm text-primary-light">{employee.jobRole}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-light-text dark:text-dark-text ">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          {employee.employeeCode || 'ID Pending'}
        </div>

        <div className="flex items-center gap-3 text-sm text-light-text dark:text-dark-text ">
          <div className="w-8 h-8 bg-success bg-opacity-10 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-success" />
          </div>
          {employee.email}
        </div>

        <div className="flex items-center gap-3 text-sm text-light-text dark:text-dark-text ">
          <div className="w-8 h-8 bg-warning bg-opacity-10 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-warning" />
          </div>
          {employee.phoneNumber}
        </div>

        <div className="flex items-center gap-3 text-sm text-light-text dark:text-dark-text ">
          <div className="w-8 h-8 bg-info bg-opacity-10 rounded-lg flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-info" />
          </div>
          {employee.jobRole}
        </div>
      </div>

      <Link
        to={`/admin/dashboard/employees/${employee._id}`}
        className="mt-6 w-full px-4 py-2 bg-light-bg dark:bg-dark-bg hover:bg-light-bg/80 dark:hover:bg-dark-bg/80 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 group-hover:bg-primary group-hover:text-white text-light-text dark:text-dark-text"
      >
        <ExternalLink className="w-4 h-4 group-hover:text-white" />
        <span>View Profile</span>
      </Link>
    </div>
  </div>
);

export default AdminManageEmployees;
