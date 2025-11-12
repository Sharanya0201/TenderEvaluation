import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../pages/Sidebar";

export default function SidebarLayout() {
  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* Sidebar stays fixed */}
      <Sidebar />
      {/* Main content changes dynamically */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "#f5f5f5",
          transition: "all 0.3s ease",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
