import React from 'react';

import DailyReportsManager from '../../../../../../components/dailyReports/dailyReportsManager';

const DailyReportsTab = ({ employeeId, employeeName }) => {
  return (
    <div className="space-y-4">
      <DailyReportsManager employeeId={employeeId} employeeName={employeeName} />
    </div>
  );
};

export default DailyReportsTab;
