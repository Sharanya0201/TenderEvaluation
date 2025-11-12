// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";

import LogoutButton from "../components/LogoutButton";
import { 
  getTenders, 
  getUsers, 
  fetchVendors, 
  getTenderVendorMappings,
  getAIEvaluations,
  getTendersWithAttachments 
} from "../api/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import '../styles/Dashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Custom label component to prevent overlapping
const RenderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent, name
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if segment is large enough (more than 5%)
  if (percent < 0.05) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Custom tooltip for pie chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{`${data.name}`}</p>
        <p className="tooltip-value">{`Count: ${data.value}`}</p>
        <p className="tooltip-percent">{`Percentage: ${((data.value / payload[0].payload.total) * 100).toFixed(1)}%`}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const { isCollapsed } = useSidebar();
  const [tenderStatusData, setTenderStatusData] = useState([
    { name: "Draft", value: 0 },
    { name: "Open", value: 0 },
    { name: "Evaluation", value: 0 },
    { name: "Awarded", value: 0 },
    { name: "Closed", value: 0 }
  ]);
  const [stats, setStats] = useState({
    tenders: 0,
    vendors: 0,
    users: 0,
    evaluations: 0
  });
  const [monthlyEvaluations, setMonthlyEvaluations] = useState([]);
  const [vendorPerformance, setVendorPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to safely extract data from API responses
  const extractData = (response) => {
    if (!response) return [];
    
    // Handle different response structures
    if (Array.isArray(response)) {
      return response;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.users && Array.isArray(response.users)) {
      return response.users;
    } else if (response.mappings && Array.isArray(response.mappings)) {
      return response.mappings;
    } else if (response.tender_types && Array.isArray(response.tender_types)) {
      return response.tender_types;
    } else if (response.success && Array.isArray(response.criteria)) {
      return response.criteria;
    }
    
    return [];
  };

  // Helper function to generate monthly data from actual tender creation dates
  const generateMonthlyEvaluationsData = (tenders, evaluations) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Group tenders by month
    const tendersByMonth = {};
    const evaluationsByMonth = {};
    
    // Initialize all months with 0
    months.forEach(month => {
      tendersByMonth[month] = 0;
      evaluationsByMonth[month] = 0;
    });

    // Process tenders by creation month
    if (tenders && Array.isArray(tenders)) {
      tenders.forEach(tender => {
        if (tender.created_at) {
          const date = new Date(tender.created_at);
          const monthName = months[date.getMonth()];
          if (tendersByMonth[monthName] !== undefined) {
            tendersByMonth[monthName]++;
          }
        }
      });
    }

    // Process evaluations by creation date (if available)
    if (evaluations && Array.isArray(evaluations)) {
      evaluations.forEach(evaluation => {
        if (evaluation.created_at || evaluation.evaluated_at) {
          const date = new Date(evaluation.created_at || evaluation.evaluated_at);
          const monthName = months[date.getMonth()];
          if (evaluationsByMonth[monthName] !== undefined) {
            evaluationsByMonth[monthName]++;
          }
        }
      });
    }

    // Generate the final data for last 6 months
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];
      
      last6Months.push({
        month: monthName,
        tenders: tendersByMonth[monthName] || 0,
        evaluations: evaluationsByMonth[monthName] || 0
      });
    }

    return last6Months;
  };

  // Helper function to generate vendor performance from actual data
  const generateVendorPerformanceData = (vendors, mappings, evaluations) => {
    if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
      return [];
    }

    const vendorPerformanceMap = {};

    // Initialize vendor performance data
    vendors.forEach(vendor => {
      vendorPerformanceMap[vendor.id] = {
        name: vendor.vendor_name || `Vendor ${vendor.id}`,
        score: 0,
        tenders: 0,
        evaluationCount: 0
      };
    });

    // Count tenders per vendor from mappings
    if (mappings && Array.isArray(mappings)) {
      mappings.forEach(mapping => {
        if (vendorPerformanceMap[mapping.vendor_id]) {
          vendorPerformanceMap[mapping.vendor_id].tenders++;
        }
      });
    }

    // Calculate average scores from evaluations
    if (evaluations && Array.isArray(evaluations)) {
      evaluations.forEach(evaluation => {
        if (vendorPerformanceMap[evaluation.vendor_id]) {
          const vendor = vendorPerformanceMap[evaluation.vendor_id];
          vendor.score += evaluation.score || 0;
          vendor.evaluationCount++;
        }
      });
    }

    // Calculate final scores and prepare data
    const performanceData = Object.values(vendorPerformanceMap)
      .map(vendor => ({
        name: vendor.name,
        score: vendor.evaluationCount > 0 ? Math.round((vendor.score / vendor.evaluationCount) * 10) / 10 : 0,
        tenders: vendor.tenders
      }))
      .filter(vendor => vendor.tenders > 0) // Only show vendors with tenders
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 5); // Top 5 vendors

    // If no real data, return empty instead of mock data
    return performanceData;
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading dashboard data...');
        
        // Load all data sequentially to better handle errors
        let tenders = [];
        let users = [];
        let vendors = [];
        let evaluations = [];
        let mappings = [];
        let tendersWithAttachments = [];

        try {
          const tendersResponse = await getTenders();
          tenders = extractData(tendersResponse);
          console.log('Tenders loaded:', tenders.length);
        } catch (err) {
          console.error('Failed to load tenders:', err);
        }

        try {
          const usersResponse = await getUsers();
          users = extractData(usersResponse);
          console.log('Users loaded:', users.length);
        } catch (err) {
          console.error('Failed to load users:', err);
        }

        try {
          const vendorsResponse = await fetchVendors();
          vendors = extractData(vendorsResponse);
          console.log('Vendors loaded:', vendors.length);
        } catch (err) {
          console.error('Failed to load vendors:', err);
        }

        try {
          const evaluationsResponse = await getAIEvaluations();
          evaluations = extractData(evaluationsResponse);
          console.log('Evaluations loaded:', evaluations.length);
        } catch (err) {
          console.error('Failed to load evaluations:', err);
        }

        try {
          const mappingsResponse = await getTenderVendorMappings();
          mappings = extractData(mappingsResponse);
          console.log('Mappings loaded:', mappings.length);
        } catch (err) {
          console.error('Failed to load mappings:', err);
        }

        try {
          const attachmentsResponse = await getTendersWithAttachments();
          tendersWithAttachments = extractData(attachmentsResponse);
          console.log('Tenders with attachments loaded:', tendersWithAttachments.length);
        } catch (err) {
          console.error('Failed to load tenders with attachments:', err);
        }

        // Process tender status data
        const statusCounts = {
          Draft: 0,
          Open: 0,
          Evaluation: 0,
          Awarded: 0,
          Closed: 0
        };

        tenders.forEach(tender => {
          const status = tender.status || 'Draft';
          if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
          }
        });

        // Calculate total for percentages
        const totalTenders = tenders.length;
        
        setTenderStatusData([
          { name: "Draft", value: statusCounts.Draft, total: totalTenders },
          { name: "Open", value: statusCounts.Open, total: totalTenders },
          { name: "Evaluation", value: statusCounts.Evaluation, total: totalTenders },
          { name: "Awarded", value: statusCounts.Awarded, total: totalTenders },
          { name: "Closed", value: statusCounts.Closed, total: totalTenders }
        ]);

        // Calculate stats from real data
        setStats({
          tenders: tenders.length,
          vendors: vendors.length,
          users: users.length,
          evaluations: evaluations.length
        });

        // Generate monthly evaluations data from real dates
        const monthlyData = generateMonthlyEvaluationsData(tendersWithAttachments.length > 0 ? tendersWithAttachments : tenders, evaluations);
        setMonthlyEvaluations(monthlyData);

        // Generate vendor performance data from real relationships
        const vendorPerformanceData = generateVendorPerformanceData(vendors, mappings, evaluations);
        setVendorPerformance(vendorPerformanceData);

        console.log('Dashboard data loaded successfully');
        console.log('Final stats:', {
          tenders: tenders.length,
          vendors: vendors.length,
          users: users.length,
          evaluations: evaluations.length
        });

      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setError('Failed to load dashboard data. Please try refreshing the page.');
        // Don't fall back to mock data - show zeros instead
        setStats({
          tenders: 0,
          vendors: 0,
          users: 0,
          evaluations: 0
        });
        setTenderStatusData([
          { name: "Draft", value: 0, total: 0 },
          { name: "Open", value: 0, total: 0 },
          { name: "Evaluation", value: 0, total: 0 },
          { name: "Awarded", value: 0, total: 0 },
          { name: "Closed", value: 0, total: 0 }
        ]);
        setMonthlyEvaluations([]);
        setVendorPerformance([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const StatCard = ({ title, value, icon, color, description }) => (
    <div className="db-stat-card" style={{ borderLeftColor: color }}>
      <div className="db-stat-content">
        <div className="db-stat-text">
          <p className="db-stat-title">{title}</p>
          <h3 className="db-stat-value">
            {loading ? (
              <div className="db-loading-skeleton">--</div>
            ) : (
              value.toLocaleString()
            )}
          </h3>
          <p className="db-stat-description">{description}</p>
        </div>
        <div className="db-stat-icon" style={{ background: `${color}20` }}>
          {icon}
        </div>
      </div>
    </div>
  );

  const ChartCard = ({ title, children, width = "100%" }) => (
    <div className="db-chart-card" style={{ width: width }}>
      <h3 className="db-chart-title">{title}</h3>
      {loading ? (
        <div className="db-chart-loading">
          <div className="db-loading-skeleton">Loading chart...</div>
        </div>
      ) : (
        children
      )}
    </div>
  );

  return (
    <div className="db-container">
      

      <div className={`db-main-content ${isCollapsed ? 'db-collapsed' : 'db-expanded'}`}>
        {/* Header */}
        <div className="db-header">
          <div className="db-header-content">
            <h1 className="db-welcome-title">
              Welcome back, {user?.username || "User"}! 👋
            </h1>
            <p className="db-welcome-subtitle">
              {loading ? "Loading dashboard data..." : "Here's what's happening with your tenders today"}
            </p>
            {error && (
              <div className="db-error-message">
                {error}
              </div>
            )}
          </div>
          <LogoutButton />
        </div>

        {/* Stats Grid */}
        <div className="db-stats-grid">
          <StatCard
            title="Total Tenders"
            value={stats.tenders}
            icon="📋"
            color="#3498db"
            description="Active and completed"
          />
          <StatCard
            title="Vendors"
            value={stats.vendors}
            icon="🏢"
            color="#2ecc71"
            description="Registered vendors"
          />
          <StatCard
            title="Users"
            value={stats.users}
            icon="👥"
            color="#9b59b6"
            description="System users"
          />
          <StatCard
            title="Evaluations"
            value={stats.evaluations}
            icon="🤖"
            color="#e74c3c"
            description="AI processed"
          />
        </div>

        {/* Charts Grid */}
        <div className="db-charts-grid">
          {/* Tender Status Chart - Fixed with better labels */}
          <ChartCard title="Tender Status Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tenderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={RenderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tenderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{
                    paddingLeft: '20px',
                    fontSize: '12px'
                  }}
                  formatter={(value, entry) => (
                    <span style={{ color: '#333', fontSize: '12px' }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Monthly Evaluations Chart */}
          <ChartCard title="Monthly Evaluations & Tenders">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyEvaluations} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="evaluations" fill="#8884d8" name="AI Evaluations" />
                <Bar dataKey="tenders" fill="#82ca9d" name="New Tenders" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Vendor Performance */}
        <ChartCard title="Top Vendor Performance">
          {vendorPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendorPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#ffc658" name="Performance Score" />
                <Bar dataKey="tenders" fill="#ff7300" name="Tenders Participated" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="db-no-data">
              No vendor performance data available
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}