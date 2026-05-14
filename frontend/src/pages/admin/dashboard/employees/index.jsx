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
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const AdminManageEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [uniqueDepartments, setUniqueDepartments] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/employee/all?page=1&limit=1000`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch employees.');

      const data = await response.json();
      setEmployees(data.employees || []);
      setUniqueDepartments([
        'All',
        ...new Set((data.employees || []).map(emp => emp.department).filter(Boolean)),
      ]);
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
    return selectedDepartment === 'All' || employee.department === selectedDepartment;
  });

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
              aria-label="Filter by department"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <span>{selectedDepartment === 'All' ? 'All Departments' : selectedDepartment}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 text-light-text dark:text-dark-text ${isFilterOpen ? 'transform rotate-180' : ''}`}
              />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg shadow-lg z-10 py-2 max-h-60 overflow-y-auto text-light-text dark:text-dark-text">
                {uniqueDepartments.map(department => (
                  <button
                    key={department}
                    onClick={() => {
                      setSelectedDepartment(department);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-light-bg/80 dark:hover:bg-dark-bg/80 transition-colors duration-200 flex items-center gap-2 ${selectedDepartment === department ? 'bg-primary bg-opacity-20' : ''}`}
                  >
                    {department === 'All' ? (
                      <Users className="w-4 h-4 text-primary" />
                    ) : (
                      <Building2 className="w-4 h-4 text-primary" />
                    )}
                    {department}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2 relative">
            <Link
              to="/admin/dashboard/employees/add"
              className="px-4 py-2.5 bg-primary hover:bg-primary-dark rounded-lg flex items-center gap-2 transition-colors duration-200 text-white"
            >
              <PlusCircle className="w-5 h-5" />
              Add Employee
            </Link>
          </div>
        </div>

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
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">{employee.name}</h3>
          <span className="text-sm text-primary-light">{employee.designation || 'N/A'}</span>
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
          {employee.department || 'N/A'}
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
