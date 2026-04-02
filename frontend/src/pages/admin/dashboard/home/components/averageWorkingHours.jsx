/* eslint-disable react-hooks/exhaustive-deps */
import Chart from 'chart.js/auto';
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns';
import { BarChart3, ChevronLeft, ChevronRight, Info, LineChart, PieChart } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { useTheme } from '../../../../../context/themeContext';

const AverageWorkingHours = () => {
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekEnd, setWeekEnd] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [chartType, setChartType] = useState('bar');
  const [totalWeekHours, setTotalWeekHours] = useState(0);
  const [averageWeekHours, setAverageWeekHours] = useState(0);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [chartData, setChartData] = useState(null);
  const { theme } = useTheme();
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchAverageWorkingHours = async (startDate, endDate) => {
    setLoading(true);
    try {
      const start = format(startDate, 'yyyy-MM-dd');
      const end = format(endDate, 'yyyy-MM-dd');
      const response = await fetch(
        `${BASE_URL}/attendance-summary/average-working-hours?startDate=${start}&endDate=${end}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch average working hours');

      const data = await response.json();

      // Calculate total and average week hours
      const workDays = data.averageWorkingHours.filter(
        day => parseFloat(day.totalWorkingHours) > 0
      );

      const total = workDays.reduce((sum, day) => sum + parseFloat(day.totalWorkingHours), 0);

      // Calculate average hours per employee per day
      const activeDays = workDays.filter(day => day.totalEmployees > 0);
      const averagePerDay =
        activeDays.length > 0
          ? (total / activeDays.reduce((sum, day) => sum + day.totalEmployees, 0)).toFixed(2)
          : '0.00';

      setTotalWeekHours(total.toFixed(2));
      setAverageWeekHours(averagePerDay);
      setChartData(data.averageWorkingHours);

      updateChart(data.averageWorkingHours);
    } catch (error) {
      console.error('Error fetching average working hours:', error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const updateChart = averageWorkingHours => {
    if (!chartRef.current) return;

    const labels = averageWorkingHours.map(item => item.day);
    const averageData = averageWorkingHours.map(item => parseFloat(item.averageWorkingHours));

    // Create gradient
    const ctx = chartRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(
      0,
      theme === 'dark' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(165, 180, 252, 0.8)'
    );
    gradient.addColorStop(
      1,
      theme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(165, 180, 252, 0.2)'
    );

    const chartConfigs = {
      bar: {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Average Hours',
              data: averageData,
              backgroundColor: gradient,
              borderColor: theme === 'dark' ? '#4f46e5' : '#6366f1',
              borderWidth: 1,
              borderRadius: 6,
              barThickness: 32,
            },
          ],
        },
      },
      line: {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Average Hours',
              data: averageData,
              borderColor: theme === 'dark' ? '#4f46e5' : '#6366f1',
              backgroundColor: gradient,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: theme === 'dark' ? '#4f46e5' : '#6366f1',
              pointBorderColor: theme === 'dark' ? '#e2e8f0' : '#1E293B',
              pointRadius: 5,
              pointHoverRadius: 7,
            },
          ],
        },
      },
      area: {
        type: 'radar',
        data: {
          labels,
          datasets: [
            {
              label: 'Average Hours',
              data: averageData,
              backgroundColor:
                theme === 'dark' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(165, 180, 252, 0.3)',
              borderColor: theme === 'dark' ? '#4f46e5' : '#6366f1',
              pointBackgroundColor: theme === 'dark' ? '#4f46e5' : '#6366f1',
              pointBorderColor: theme === 'dark' ? '#e2e8f0' : '#1E293B',
              pointHoverBackgroundColor: theme === 'dark' ? '#e2e8f0' : '#1E293B',
              pointHoverBorderColor: theme === 'dark' ? '#4f46e5' : '#6366f1',
            },
          ],
        },
      },
    };

    const selectedConfig = chartConfigs[chartType];

    const config = {
      type: selectedConfig.type,
      data: selectedConfig.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: theme === 'dark' ? '#e2e8f0' : '#1E293B',
              boxWidth: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor:
              theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(241, 245, 249, 0.8)',
            titleColor: theme === 'dark' ? '#e2e8f0' : '#1E293B',
            bodyColor: theme === 'dark' ? '#e2e8f0' : '#1E293B',
            padding: 12,
            cornerRadius: 8,
            boxPadding: 6,
            callbacks: {
              title: tooltipItems => {
                const index = tooltipItems[0].dataIndex;
                return averageWorkingHours[index].day;
              },
              label: context => {
                const index = context.dataIndex;
                const dayData = averageWorkingHours[index];

                return [
                  `Average: ${dayData.averageWorkingHours} hours`,
                  `Total: ${dayData.totalWorkingHours} hours`,
                  `Employees: ${dayData.totalEmployees}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: theme === 'dark' ? '#475569' : '#CBD5E1',
              drawBorder: false,
            },
            ticks: {
              color: theme === 'dark' ? '#e2e8f0' : '#1E293B',
              font: { size: 11 },
            },
          },
          y: {
            grid: {
              color: theme === 'dark' ? '#475569' : '#CBD5E1',
              drawBorder: false,
            },
            ticks: {
              color: theme === 'dark' ? '#e2e8f0' : '#1E293B',
              callback: value => `${value}h`,
              font: { size: 11 },
            },
            beginAtZero: true,
            suggestedMax: Math.max(...averageData) * 1.2,
          },
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
        },
        ...(chartType === 'area' && {
          scales: {
            r: {
              beginAtZero: true,
              angleLines: {
                color: theme === 'dark' ? '#475569' : '#CBD5E1',
              },
              grid: {
                color: theme === 'dark' ? '#475569' : '#CBD5E1',
              },
              pointLabels: {
                color: theme === 'dark' ? '#e2e8f0' : '#1E293B',
                font: { size: 11 },
              },
              ticks: {
                backdropColor: 'transparent',
                color: theme === 'dark' ? '#e2e8f0' : '#1E293B',
                font: { size: 10 },
              },
            },
          },
        }),
      },
    };

    if (chartInstance) {
      chartInstance.destroy();
    }

    const newChart = new Chart(chartRef.current, config);
    setChartInstance(newChart);
  };

  useEffect(() => {
    fetchAverageWorkingHours(weekStart, weekEnd);
  }, [weekStart, weekEnd]);

  // Effect to update chart when chart type changes
  useEffect(() => {
    if (chartData) {
      updateChart(chartData);
    }
  }, [chartType, theme]);

  const handlePrevWeek = () => {
    const newStart = subWeeks(weekStart, 1);
    const newEnd = subWeeks(weekEnd, 1);
    setWeekStart(newStart);
    setWeekEnd(newEnd);
  };

  const handleNextWeek = () => {
    const newStart = addWeeks(weekStart, 1);
    const newEnd = addWeeks(weekEnd, 1);
    setWeekStart(newStart);
    setWeekEnd(newEnd);
  };

  const handleChartTypeChange = type => {
    setChartType(type);
  };

  // Weekly stats cards component
  const StatsCard = ({ title, value, icon, color, onClick, isHovered }) => (
    <div
      className={`flex items-center p-4 rounded-lg ${isHovered ? 'bg-light-bg dark:bg-dark-bg' : 'bg-light-card dark:bg-dark-card'} border border-light-border dark:border-dark-border transition-all cursor-pointer`}
      onClick={onClick}
      onMouseEnter={() => setHoveredDay(title)}
      onMouseLeave={() => setHoveredDay(null)}
    >
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div className="ml-4">
        <p className="text-xs font-medium text-light-text dark:text-dark-text opacity-70">
          {title}
        </p>
        <p className="text-lg font-semibold text-light-text dark:text-dark-text">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
          Working Hours Dashboard
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 hover:bg-light-bg dark:hover:bg-dark-bg rounded-lg transition-colors text-light-text dark:text-dark-text opacity-50 hover:text-primary"
            disabled={loading}
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium bg-light-bg dark:bg-dark-bg px-3 py-1.5 rounded-md text-light-text dark:text-dark-text">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-light-bg dark:hover:bg-dark-bg rounded-lg transition-colors text-light-text dark:text-dark-text opacity-50 hover:text-primary"
            disabled={loading}
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard
          title="Total Weekly Hours (All Employees)"
          value={`${totalWeekHours}h`}
          icon={<BarChart3 size={18} className="text-primary" />}
          color="bg-primary/20"
          isHovered={hoveredDay === 'Total Weekly Hours (All Employees)'}
        />
        <StatsCard
          title="Average Daily Hours Per Employee"
          value={`${averageWeekHours}h`}
          icon={<LineChart size={18} className="text-secondary" />}
          color="bg-secondary/20"
          isHovered={hoveredDay === 'Average Daily Hours Per Employee'}
        />
        <StatsCard
          title="Chart Type"
          value={
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => handleChartTypeChange('bar')}
                className={`p-1.5 rounded-md ${chartType === 'bar' ? 'bg-primary text-white' : 'text-light-text dark:text-dark-text opacity-50 hover:bg-light-bg dark:hover:bg-dark-bg'}`}
                aria-label="Bar chart"
              >
                <BarChart3 size={16} />
              </button>
              <button
                onClick={() => handleChartTypeChange('line')}
                className={`p-1.5 rounded-md ${chartType === 'line' ? 'bg-primary text-white' : 'text-light-text dark:text-dark-text opacity-50 hover:bg-light-bg dark:hover:bg-dark-bg'}`}
                aria-label="Line chart"
              >
                <LineChart size={16} />
              </button>
              <button
                onClick={() => handleChartTypeChange('area')}
                className={`p-1.5 rounded-md ${chartType === 'area' ? 'bg-primary text-white' : 'text-light-text dark:text-dark-text opacity-50 hover:bg-light-bg dark:hover:bg-dark-bg'}`}
                aria-label="Radar chart"
              >
                <PieChart size={16} />
              </button>
            </div>
          }
          icon={<Info size={18} className="text-info" />}
          color="bg-info/20"
          isHovered={hoveredDay === 'Chart Type'}
        />
      </div>

      {/* Chart Container */}
      <div className="h-[330px] relative bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border p-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm z-10">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-t-primary border-b-primary-dark border-l-primary border-r-primary rounded-full animate-spin"></div>
              <span className="text-light-text dark:text-dark-text mt-3 text-sm font-medium">
                Loading chart data...
              </span>
            </div>
          </div>
        )}
        <canvas ref={chartRef}></canvas>
      </div>

      {/* Chart Legend/Info */}
      <div className="mt-4 text-xs text-light-text dark:text-dark-text opacity-70 flex items-center justify-between">
        <div>
          <span className="inline-block w-3 h-3 rounded-full bg-primary mr-1"></span>
          Average working hours per weekday
        </div>
        <div>Updated {format(new Date(), 'MMM d, yyyy')}</div>
      </div>
    </div>
  );
};

export default AverageWorkingHours;
