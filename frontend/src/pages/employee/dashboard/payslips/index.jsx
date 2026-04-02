import { Download, ReceiptIndianRupee } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const EmployeePayslips = () => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const [payslips, setPayslips] = useState([]);

  const fetchPayslips = async () => {
    try {
      const response = await fetch(`${BASE_URL}/salary/my-payslips`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch payslips');
      const data = await response.json();
      setPayslips(data.salaries || []);
    } catch (error) {
      toast.error(error.message || 'Unable to fetch payslips');
    }
  };

  const downloadPayslip = async payslip => {
    try {
      const response = await fetch(`${BASE_URL}/salary/payslip-html/${payslip._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download payslip');
      const data = await response.json();
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      printWindow.document.write(data.payslipHtml);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 400);
    } catch (error) {
      toast.error(error.message || 'Failed to download payslip');
    }
  };

  useEffect(() => {
    fetchPayslips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto">
        <Header
          title="My Payslips"
          description="View and download your monthly salary slips."
          icon={<ReceiptIndianRupee className="w-8 h-8 text-primary" />}
        />

        <div className="space-y-3">
          {payslips.map(payslip => (
            <div
              key={payslip._id}
              className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-light-text dark:text-dark-text">
                  {new Date(payslip.salaryYear, (payslip.salaryMonth || 1) - 1).toLocaleString(
                    'en-US',
                    {
                      month: 'long',
                    }
                  )}{' '}
                  {payslip.salaryYear}
                </p>
                <p className="text-sm opacity-70">Net Salary: INR {payslip.totalSalary}</p>
                <p className="text-sm opacity-70">
                  {payslip.emailedAt
                    ? `Emailed on ${new Date(payslip.emailedAt).toLocaleDateString()}`
                    : 'Not emailed'}
                </p>
              </div>
              <button
                onClick={() => downloadPayslip(payslip)}
                className="px-3 py-2 rounded-lg bg-primary text-white inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          ))}

          {!payslips.length && (
            <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-6 text-sm opacity-70">
              No payslips generated yet.
            </div>
          )}
        </div>
      </div>

      <ToastContainer
        position="top-right"
        pauseOnHover={false}
        limit={1}
        autoClose={2000}
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
      />
    </div>
  );
};

export default EmployeePayslips;
