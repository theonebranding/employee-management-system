import {
  AlertCircle,
  ArrowRight,
  CalendarX,
  Clock,
  DollarSign,
  Info,
  Trophy,
  UserMinus,
} from 'lucide-react';
import React from 'react';

const OverallCalculation = ({ baseSalary, bonuses, deductions, month, year }) => {
  const { totalLateCheckinDeduction, totalHalfDayDeduction, totalAbsentDayDeduction } = deductions;

  const formatCurrency = amount => {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalDeductions =
    (Number(totalLateCheckinDeduction) || 0) +
    (Number(totalHalfDayDeduction) || 0) +
    (Number(totalAbsentDayDeduction) || 0);

  const finalSalary = (Number(baseSalary) || 0) + (Number(bonuses) || 0) - totalDeductions;

  const SalaryCard = ({ title, subtitle, amount, icon: Icon, colorClass, prefix = '₹' }) => (
    <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl border border-light-border  dark:border-dark-border  hover:bg-light-card/60 dark:hover:bg-dark-card/60 transition-all duration-300">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-lg bg-light-bg/80 dark:bg-dark-bg/80 ${colorClass} ring-1 ring-light-border  dark:ring-dark-border `}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-light-text dark:text-dark-text font-medium tracking-wide">{title}</p>
            <p className="text-sm text-light-text dark:text-dark-text mt-1">{subtitle}</p>
          </div>
        </div>
        <span className={`text-xl font-semibold ${colorClass}`}>
          {prefix}
          {formatCurrency(amount)}
        </span>
      </div>
    </div>
  );

  const DeductionItem = ({ icon: Icon, label, amount }) => (
    <div className="flex justify-between items-center px-4 py-3 rounded-lg hover:bg-light-card dark:hover:bg-dark-card transition-all">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-danger/90" />
        <span className="text-light-text dark:text-dark-text">{label}</span>
      </div>
      <span className="text-danger/90 font-medium">-₹{formatCurrency(amount)}</span>
    </div>
  );

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className="ml-10 p-6 min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-xl">
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-light-text dark:text-dark-text tracking-wide">
              Salary Overview
            </h2>
            <p className="text-light-text dark:text-dark-text text-sm mt-1">
              {months[month - 1]} {year}
            </p>
          </div>
        </div>
        <div className="bg-light-card dark:bg-dark-card px-4 py-2 rounded-lg flex items-center gap-2 text-light-text dark:text-dark-text text-sm border border-light-border  dark:border-dark-border ">
          <Info className="w-4 h-4" />
          <span>{months[month - 1]} Breakdown</span>
        </div>
      </div>

      <div className="space-y-6">
        <SalaryCard
          title="Base Salary"
          subtitle="Monthly base compensation"
          amount={baseSalary}
          icon={DollarSign}
          colorClass="text-primary"
        />

        <SalaryCard
          title="Bonuses"
          subtitle="Performance rewards"
          amount={bonuses}
          icon={Trophy}
          colorClass="text-success"
          prefix="+₹"
        />

        <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl border border-light-border  dark:border-dark-border ">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-danger/10">
                <AlertCircle className="w-5 h-5 text-danger" />
              </div>
              <h3 className="text-light-text dark:text-dark-text font-medium">Deductions</h3>
            </div>
            <span className="text-danger font-medium text-lg">
              -₹{formatCurrency(totalDeductions)}
            </span>
          </div>

          <div className="space-y-1">
            <DeductionItem icon={Clock} label="Late Check-ins" amount={totalLateCheckinDeduction} />
            <DeductionItem icon={UserMinus} label="Half-Days" amount={totalHalfDayDeduction} />
            <DeductionItem icon={CalendarX} label="Absences" amount={totalAbsentDayDeduction} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary to-primary-dark p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/10 transform -skew-x-12 group-hover:skew-x-12 transition-transform duration-700"></div>
          <div className="relative flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Final Salary</p>
                <p className="text-white text-3xl font-bold tracking-tight mt-1">
                  ₹{formatCurrency(finalSalary)}
                </p>
              </div>
            </div>
            <div className="bg-white/10 p-3 rounded-xl">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallCalculation;
