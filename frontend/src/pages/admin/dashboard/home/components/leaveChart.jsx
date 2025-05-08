import Chart from 'chart.js/auto';
import React, { useEffect, useRef } from 'react';

const LeaveChart = ({ data, config }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const chart = new Chart(chartRef.current, {
      type: 'bar',
      data: data,
      options: {
        ...config,
        plugins: {
          ...config.plugins,
          title: {
            display: false,
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data, config]);

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Leave Distribution</h3>
      <div className="h-[300px]">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default LeaveChart;
