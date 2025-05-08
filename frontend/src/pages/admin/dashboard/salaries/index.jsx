/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { ArrowUpRight, Briefcase, ChevronDown, Filter, Search, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const AdminSalaryManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('name');
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employee/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch employees.');
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error(error.message || 'Failed to fetch employees.');
    }
  };

  const fetchSalaries = async () => {
    try {
      const response = await fetch(`${BASE_URL}/salary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch salaries.');
      const data = await response.json();
      setSalaries(data.salaries || []);
    } catch (error) {
      console.error('Error fetching salaries:', error);
      toast.error(error.message || 'Failed to fetch salaries.');
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchSalaries();
  }, []);

  const getEmployeeSalary = email => {
    const salaryEntry = salaries.find(salary => salary.email === email);
    return salaryEntry ? salaryEntry.salary : 'N/A';
  };

  const filteredEmployees = employees
    .filter(
      employee =>
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'name') return a.name.localeCompare(b.name);
      if (sortOrder === 'email') return a.email.localeCompare(b.email);
      return 0;
    });

  const stats = [
    {
      title: 'Total Employees',
      value: employees.length,
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Active Departments',
      value: '3',
      icon: Briefcase,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="ml-20 p-6 min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Salary Management"
          icon={<Users className="w-6 h-6 text-light-text dark:text-dark-text" />}
          description="Manage employee salaries and view their details."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-light-card/40 dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-6 hover:border-light-border/70 dark:hover:border-dark-border transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-light-text dark:text-dark-text text-sm mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-light-text dark:text-dark-text " />
            <input
              type="text"
              placeholder="Search employees by name or email..."
              className="w-full pl-12 pr-4 py-3 bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-light-text/50 dark:placeholder:text-dark-text/50 text-light-text dark:text-dark-text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search employees"
            />
          </div>
          <button
            className="px-6 py-3 bg-light-card/40 dark:bg-dark-card/40 rounded-xl border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:border-light-border/70 dark:hover:border-dark-border/70 flex items-center gap-2"
            aria-label="Open filters"
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map(employee => (
            <div
              key={employee._id}
              className="group bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-6 hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => navigate(`/admin/dashboard/salaries/${employee._id}`)}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xl">
                    {employee.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-success rounded-full border-2 border-light-bg dark:border-dark-bg"></div>
                </div>
                <div className="flex-1">
                  <p className="text-xl font-medium text-light-text dark:text-dark-text group-hover:text-primary transition-colors">
                    {employee.name}
                  </p>
                  <p className="text-sm text-light-text dark:text-dark-text">{employee.email}</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-light-text dark:text-dark-text group-hover:text-primary transition-colors" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-light-text dark:text-dark-text opacity-70">
                  <span className="text-light-text dark:text-dark-text font-medium">
                    ₹{getEmployeeSalary(employee.email)}
                  </span>{' '}
                  / month
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary">Full Time</div>
              </div>
            </div>
          ))}
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

export default AdminSalaryManagement;
