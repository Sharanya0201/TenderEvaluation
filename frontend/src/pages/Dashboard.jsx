// src/pages/Dashboard.jsx
import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext"; // Import the hook
import Sidebar from "./Sidebar";
import LogoutButton from "../components/LogoutButton";
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

const mockData = {
  stats: {
    tenders: 124,
    vendors: 89,
    users: 42,
    evaluations: 567
  },
  tenderStatus: [
    { name: "Draft", value: 15 },
    { name: "Open", value: 45 },
    { name: "Evaluation", value: 32 },
    { name: "Awarded", value: 20 },
    { name: "Closed", value: 12 }
  ],
  monthlyEvaluations: [
    { month: "Jan", evaluations: 45, tenders: 12 },
    { month: "Feb", evaluations: 78, tenders: 18 },
    { month: "Mar", evaluations: 92, tenders: 22 },
    { month: "Apr", evaluations: 65, tenders: 15 },
    { month: "May", evaluations: 110, tenders: 28 },
    { month: "Jun", evaluations: 85, tenders: 20 }
  ],
  vendorPerformance: [
    { name: "Vendor A", score: 92, tenders: 8 },
    { name: "Vendor B", score: 87, tenders: 12 },
    { name: "Vendor C", score: 95, tenders: 6 },
    { name: "Vendor D", score: 78, tenders: 15 },
    { name: "Vendor E", score: 88, tenders: 9 }
  ]
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const { isCollapsed } = useSidebar(); // Use the context

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
            {value}
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
      {children}
    </div>
  );

  return (
    <div style={{ 
      display: "flex", 
      minHeight: "100vh", 
      backgroundColor: "#f5f7fa",
      margin: 0,
      padding: 0 
    }}>
      {/* --- Fixed Sidebar --- */}
      <Sidebar />

      {/* --- Main Content Area - Dynamic based on sidebar state --- */}
      <div style={{
        flex: 1,
        padding: "2rem",
        backgroundColor: "#f5f7fa",
        color: "#333",
        marginLeft: isCollapsed ? "80px" : "280px", // Dynamic margin from context
        minHeight: "100vh",
        width: isCollapsed ? "calc(100vw - 80px)" : "calc(100vw - 280px)", // Dynamic width from context
        transition: "all 0.3s ease" // Smooth transition
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
              Here's what's happening with your tenders today
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Rest of your dashboard content remains the same */}
        {/* Stats Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem"
        }}>
          <StatCard
            title="Total Tenders"
            value={mockData.stats.tenders}
            icon="📋"
            color="#3498db"
            description="Active and completed"
          />
          <StatCard
            title="Vendors"
            value={mockData.stats.vendors}
            icon="🏢"
            color="#2ecc71"
            description="Registered vendors"
          />
          <StatCard
            title="Users"
            value={mockData.stats.users}
            icon="👥"
            color="#9b59b6"
            description="System users"
          />
          <StatCard
            title="Evaluations"
            value={mockData.stats.evaluations}
            icon="🤖"
            color="#e74c3c"
            description="AI processed"
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
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockData.tenderStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockData.tenderStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Monthly Evaluations Chart */}
          <ChartCard title="Monthly Evaluations & Tenders">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockData.monthlyEvaluations}>
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData.vendorPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#ffc658" name="Performance Score" />
              <Bar dataKey="tenders" fill="#ff7300" name="Tenders Participated" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}