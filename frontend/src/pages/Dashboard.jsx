// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import LogoutButton from "../components/LogoutButton"
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
import {
  getDashboardStats,
  getTenderStatusDistribution,
  getMonthlyEvaluations,
  getVendorPerformance
} from "../api/auth";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const { isCollapsed } = useSidebar();
  
  const [dashboardData, setDashboardData] = useState({
    stats: {
      tenders: 0,
      vendors: 0,
      users: 0,
      evaluations: 0
    },
    tenderStatus: [],
    monthlyEvaluations: [],
    vendorPerformance: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all dashboard data in parallel
      const [statsResponse, statusResponse, monthlyResponse, performanceResponse] = await Promise.all([
        getDashboardStats(),
        getTenderStatusDistribution(),
        getMonthlyEvaluations(),
        getVendorPerformance()
      ]);

      if (statsResponse.success && statusResponse.success && monthlyResponse.success && performanceResponse.success) {
        setDashboardData({
          stats: statsResponse.stats,
          tenderStatus: statusResponse.distribution,
          monthlyEvaluations: monthlyResponse.data,
          vendorPerformance: performanceResponse.data
        });
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
      // You can set fallback mock data here if needed
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, description }) => (
    <div style={{
      background: "white",
      padding: "1.5rem",
      borderRadius: "12px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      borderLeft: `4px solid ${color}`,
      minWidth: "200px",
      height: "120px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ 
            margin: 0, 
            color: "#666", 
            fontSize: "0.9rem",
            fontWeight: "600",
            textTransform: "uppercase"
          }}>
            {title}
          </p>
          <h3 style={{ 
            margin: "0.5rem 0 0 0", 
            fontSize: "2rem", 
            fontWeight: "bold",
            color: "#333"
          }}>
            {loading ? "..." : value}
          </h3>
          <p style={{ 
            margin: "0.25rem 0 0 0", 
            color: "#888", 
            fontSize: "0.8rem" 
          }}>
            {description}
          </p>
        </div>
        <div style={{
          background: `${color}20`,
          padding: "0.75rem",
          borderRadius: "8px",
          fontSize: "1.5rem"
        }}>
          {icon}
        </div>
      </div>
    </div>
  );

  const ChartCard = ({ title, children, width = "100%" }) => (
    <div style={{
      background: "white",
      padding: "1.5rem",
      borderRadius: "12px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      width: width,
      height: "400px"
    }}>
      <h3 style={{ 
        margin: "0 0 1.5rem 0", 
        color: "#333",
        fontSize: "1.2rem",
        fontWeight: "600"
      }}>
        {title}
      </h3>
      {loading ? (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "100%",
          color: "#666"
        }}>
          Loading chart data...
        </div>
      ) : (
        children
      )}
    </div>
  );

  if (error) {
    return (
      <div style={{ 
        flex: 1,
        padding: "2rem",
        backgroundColor: "#f5f7fa",
        marginLeft: isCollapsed ? "80px" : "280px",
        minHeight: "100vh",
        width: isCollapsed ? "calc(100vw - 80px)" : "calc(100vw - 280px)",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <div style={{ 
          background: "white", 
          padding: "2rem", 
          borderRadius: "12px", 
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          textAlign: "center"
        }}>
          <h2 style={{ color: "#e74c3c" }}>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button 
            onClick={loadDashboardData}
            style={{
              background: "#3498db",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              marginTop: "1rem"
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", 
      minHeight: "100vh", 
      backgroundColor: "#f5f7fa",
      margin: 0,
      padding: 0 
    }}>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        padding: "2rem",
        backgroundColor: "#f5f7fa",
        color: "#333",
        marginLeft: isCollapsed ? "80px" : "280px",
        minHeight: "100vh",
        width: isCollapsed ? "calc(100vw - 80px)" : "calc(100vw - 280px)",
        transition: "all 0.3s ease"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem"
        }}>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: "2rem", 
              fontWeight: "bold",
              color: "#2c3e50"
            }}>
              Welcome back, {user?.username || "User"}! 👋
            </h1>
            <p style={{ 
              margin: "0.5rem 0 0 0", 
              color: "#7f8c8d",
              fontSize: "1rem"
            }}>
              {loading ? "Loading dashboard data..." : "Here's what's happening with your tenders today"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {loading && (
              <div style={{ 
                padding: "0.5rem 1rem", 
                background: "#3498db", 
                color: "white", 
                borderRadius: "6px",
                fontSize: "0.9rem"
              }}>
                Loading...
              </div>
            )}
            <LogoutButton />
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem"
        }}>
          <StatCard
            title="Total Tenders"
            value={dashboardData.stats.tenders}
            icon="📋"
            color="#3498db"
            description="Active and completed"
          />
          <StatCard
            title="Vendors"
            value={dashboardData.stats.vendors}
            icon="🏢"
            color="#2ecc71"
            description="Registered vendors"
          />
          <StatCard
            title="Users"
            value={dashboardData.stats.users}
            icon="👥"
            color="#9b59b6"
            description="System users"
          />
          <StatCard
            title="Evaluations"
            value={dashboardData.stats.evaluations}
            icon="🤖"
            color="#e74c3c"
            description="Documents processed"
          />
        </div>

        {/* Charts Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginBottom: "2rem"
        }}>
          {/* Tender Status Chart */}
          <ChartCard title="Tender Status Distribution">
            {dashboardData.tenderStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.tenderStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.tenderStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                height: "100%",
                color: "#666"
              }}>
                No tender status data available
              </div>
            )}
          </ChartCard>

          {/* Monthly Evaluations Chart */}
          <ChartCard title="Monthly Activity">
            {dashboardData.monthlyEvaluations.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.monthlyEvaluations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="evaluations" fill="#8884d8" name="Documents Processed" />
                  <Bar dataKey="tenders" fill="#82ca9d" name="New Tenders" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                height: "100%",
                color: "#666"
              }}>
                No monthly data available
              </div>
            )}
          </ChartCard>
        </div>

        {/* Vendor Performance */}
        <ChartCard title="Top Vendor Activity">
          {dashboardData.vendorPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.vendorPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#ffc658" name="Activity Score" />
                <Bar dataKey="tenders" fill="#ff7300" name="Tenders Participated" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              height: "100%",
              color: "#666"
            }}>
              No vendor performance data available
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}