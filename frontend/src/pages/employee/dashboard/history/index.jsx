import { Calendar } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import AttendanceTable from './components/attendanceTable';
import EmptyState from './components/emptyState';
import LateCheckInsTable from './components/lateCheckInsTable';
import MapModal from './components/mapModal';
import SearchBar from './components/searchBar';
import StatsCard from './components/statsCards';
import Tabs from './components/tabs';

const MonthlyAttendance = () => {
  const [records, setRecords] = useState([]);
  const [lateCheckIns, setLateCheckIns] = useState([]);
  const [totalWorkHours, setTotalWorkHours] = useState(0);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'ascending',
  });
  const [searchDate, setSearchDate] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [filteredLateCheckIns, setFilteredLateCheckIns] = useState([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationType, setLocationType] = useState('');
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const employeeId = localStorage.getItem('_id');

  const formatTime = minutes => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hours ${remainingMinutes} minutes`;
  };

  const formatLateBy = minutes => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${remainingMinutes} minutes`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  };

  // 1. Extract this outside of component (above MonthlyAttendance)
  const sortData = (data, config) => {
    if (!config.key) return [...data];

    return [...data].sort((a, b) => {
      const getValue = (record, key) => {
        switch (key) {
          case 'date':
            return new Date(record.date);
          case 'checkInTime':
            return record.checkInTime ? new Date(record.checkInTime) : new Date(0);
          case 'checkOutTime':
            return record.checkOutTime ? new Date(record.checkOutTime) : new Date(0);
          case 'totalWorkingTime':
            return record.totalWorkingTime || 0;
          case 'lateByMinutes':
            return record.lateByMinutes || 0;
          default:
            return record[key] || '';
        }
      };

      const aValue = getValue(a, config.key);
      const bValue = getValue(b, config.key);

      if (config.direction === 'ascending') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  const filterByDate = (data, searchText) => {
    if (!searchText.trim()) return data;
    return data.filter(item => {
      const itemDate = new Date(item.date).toLocaleDateString();
      return itemDate.toLowerCase().includes(searchText.toLowerCase());
    });
  };

  const formatLocation = (location, type) => {
    if (!location || Object.keys(location).length === 0) return 'N/A';
    return (
      <button
        onClick={() => {
          setSelectedLocation(location);
          setLocationType(type);
          setShowMapModal(true);
        }}
        className="text-primary hover:underline"
      >
        {`${location.latitude}, ${location.longitude}`}
      </button>
    );
  };

  const fetchMonthlyAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/attendance-summary/monthly?employeeId=${employeeId}&month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch monthly attendance');

      const data = await response.json();
      setRecords(data.records || []);
      const totalMinutes = parseFloat(data.totalWorkHours.split(' ')[0]) * 60 || 0;
      setTotalWorkHours(totalMinutes / 60);

      toast.success(data.message || 'Monthly attendance fetched successfully');
    } catch (error) {
      console.error('Error fetching monthly attendance:', error);
      toast.error(error.message || 'Failed to fetch monthly attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchLateCheckIns = async () => {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    try {
      const response = await fetch(
        `${BASE_URL}/late-checkins/find?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch late check-ins');

      const data = await response.json();
      setLateCheckIns(data.lateCheckIns || []);
      toast.success(data.message || 'Late check-ins fetched successfully');
    } catch (error) {
      console.error('Error fetching late check-ins:', error);
      toast.error(error.message || 'Failed to fetch late check-ins');
    } finally {
      setLoading(false);
    }
  };

  const fetchAbsentDays = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/attendance/absent-days?employeeId=${employeeId}&month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch absent days'); // Add this line

      const data = await response.json();
      toast.success(data.message || 'Absent days fetched successfully');
      return data.absentDays || [];
    } catch (error) {
      console.error('Error fetching absent days:', error);
      toast.error(error.message || 'Failed to fetch absent days');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyAttendance();
    fetchLateCheckIns();
    fetchAbsentDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  useEffect(() => {
    const sortedRecords = sortData(records, sortConfig);
    const filteredSortedRecords = filterByDate(sortedRecords, searchDate);
    setFilteredRecords(filteredSortedRecords);

    const sortedLateCheckIns = sortData(lateCheckIns, sortConfig);
    const filteredSortedLateCheckIns = filterByDate(sortedLateCheckIns, searchDate);
    setFilteredLateCheckIns(filteredSortedLateCheckIns);
  }, [records, lateCheckIns, sortConfig, searchDate]);

  const handleSort = key => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        return {
          key,
          direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending',
        };
      }
      return { key, direction: 'ascending' };
    });
  };

  const handleMonthChange = e => setMonth(Number(e.target.value));
  const handleYearChange = e => setYear(Number(e.target.value));
  const handleSearchChange = e => setSearchDate(e.target.value);

  const getStatistics = () => {
    const totalDays = records.length;
    const totalLateCheckins = lateCheckIns.length;
    const averageWorkHours = totalDays ? (totalWorkHours / totalDays).toFixed(1) : 0;
    const onTimeCheckins = totalDays - totalLateCheckins;

    return { totalDays, totalLateCheckins, averageWorkHours, onTimeCheckins };
  };

  return (
    <div className="p-6 ml-8 min-h-screen pl-20 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Monthly Attendance"
          description="View and manage your monthly attendance records."
          icon={<Calendar className="w-8 h-8 text-light-text dark:text-dark-text" />}
        />
        <StatsCard
          totalDays={getStatistics().totalDays}
          averageWorkHours={getStatistics().averageWorkHours}
          onTimeCheckins={getStatistics().onTimeCheckins}
          totalLateCheckins={getStatistics().totalLateCheckins}
        />
        <SearchBar
          month={month}
          year={year}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
          onSearchChange={handleSearchChange}
          searchDate={searchDate}
          onFetch={() => {
            fetchMonthlyAttendance();
            fetchLateCheckIns();
          }}
          loading={loading}
        />
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="overflow-x-auto">
            {activeTab === 'attendance' ? (
              filteredRecords.length > 0 ? (
                <AttendanceTable
                  filteredRecords={filteredRecords}
                  sortConfig={sortConfig}
                  handleSort={handleSort}
                  formatLocation={formatLocation}
                  formatTime={formatTime}
                />
              ) : (
                <EmptyState isLateTab={false} searchDate={searchDate} />
              )
            ) : filteredLateCheckIns.length > 0 ? (
              <LateCheckInsTable
                filteredLateCheckIns={filteredLateCheckIns}
                sortConfig={sortConfig}
                handleSort={handleSort}
                formatLateBy={formatLateBy}
              />
            ) : (
              <EmptyState isLateTab={true} searchDate={searchDate} />
            )}
          </div>
        </div>
        <MapModal
          showMapModal={showMapModal}
          setShowMapModal={setShowMapModal}
          selectedLocation={selectedLocation}
          locationType={locationType}
          filteredRecords={filteredRecords}
        />
      </div>
      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        autoClose={2000}
      />
    </div>
  );
};

export default MonthlyAttendance;
