import React, { useState, useRef, useEffect, memo } from "react";
import { NavLink, useNavigate } from "react-router-dom";  // Removed unused useLocation
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import "../styles/Sidebar.css";

function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [activeMenu, setActiveMenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedSections, setCollapsedSections] = useState({});
  const [clickedSection, setClickedSection] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const sidebarRef = useRef(null);
  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleSection = (sectionName) => {
    if (isCollapsed) {
      const element = document.getElementById(`section-${sectionName}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        setMenuPosition({
          top: rect.top,
          left: rect.right + 10,
        });
      }

      if (clickedSection === sectionName) {
        setClickedSection(null);
      } else {
        setClickedSection(sectionName);
      }
    } else {
      setCollapsedSections(prev => ({
        ...prev,
        [sectionName]: !prev[sectionName]
      }));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target) &&
        !event.target.closest('.sb-section-header')
      ) {
        setClickedSection(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // =========================
  // Navigation structure
  // =========================
  const navigationStructure = {
    main: [
      { 
        path: '/dashboard', 
        label: 'Dashboard', 
        icon: 'dashboard',
        roles: ['Admin', 'Evaluator', 'Viewer'],
        badge: null
      },
    ],
    tenders: [
      { 
        path: '/tendertypes', 
        label: 'Tender Types', 
        icon: 'assignment',
        roles: ['Admin', 'Evaluator','Viewer'],
        badge: '12'
      },
      { 
        path: '/Tenderstatus', 
        label: 'Tender Status', 
        icon: 'upload_file',
        roles: ['Admin', 'Evaluator','Viewer'],
        badge: '12'
      },
      // Uploads page (tender upload)
      {
        path: '/uploads',
        label: 'TenderVendor Mapping',
        icon: 'cloud_upload',
        roles: ['Admin', 'Evaluator','Viewer'],
        badge: null
      },
    ],
    uploads: [
      {
        path: '/upload-management',
        label: 'TenderVendor Uploads',
        icon: 'manage_history',
        roles: ['Admin', 'Evaluator', 'Viewer'],
        badge: null
      }
    ],
    vendors: [
      // Vendor-specific pages
      {
        path: '/vendor-uploads',
        label: 'Vendor Uploads',
        icon: 'folder_open',
        roles: ['Admin', 'Evaluator'],
        badge: null
      },
      {
        path: '/vendors-list',
        label: 'Vendors',
        icon: 'business',
        roles: ['Admin', 'Evaluator', 'Viewer'],
        badge: null
      }
    ],
    
    users: [
      { 
        path: '/user-management', 
        label: 'Add User', 
        icon: 'person_add',
        roles: ['Admin','Evaluator', 'Viewer'],
        badge: '24'
      },
    ],
    roles: [
      { 
        path: '/role-management', 
        label: 'Add Role', 
        icon: 'add_moderator',
        roles: ['Admin','Evaluator', 'Viewer'],
        badge: null
      }
    ],
    ai: [
      { 
        path: '/evaluationcriteria', 
        label: 'Evaluation Criteria', 
        icon: 'rule',
        roles: ['Admin', 'Evaluator','Viewer'],
        badge: null
      },
      { 
        path: '/aievaluation', 
        label: 'AI Evaluation', 
        icon: 'smart_toy',
        roles: ['Admin', 'Evaluator','Viewer'],
        badge: 'AI'
      },
    ]
  };

  const getFilteredNavigation = () => {
    const userRole = (currentUser?.role || "Viewer").toLowerCase();
    const filtered = {};
    Object.keys(navigationStructure).forEach(section => {
      filtered[section] = navigationStructure[section].filter(item => 
        item.roles.map(r => r.toLowerCase()).includes(userRole)
      );
    });
    return filtered;
  };
  
  const filteredNavigation = getFilteredNavigation();

  const NavItem = ({ item, level = 0 }) => {
    return (
      <li className="sb-nav-item">
        <NavLink
          to={item.path}
          end={false}
          className={({ isActive }) => `sb-nav-link ${isActive ? 'sb-active' : ''}`}
          title={isCollapsed ? item.label : ""}
          onClick={() => {
            if (isCollapsed) {
              setClickedSection(null);
            }
          }}
        >
          <i className="material-icons sb-nav-icon">
            {item.icon}
          </i>
          
          {!isCollapsed && (
            <>
              <span className="sb-nav-label">{item.label}</span>
              {item.badge && (
                <span className={`sb-nav-badge ${item.badge === 'AI' ? 'sb-ai-badge' : ''}`}>
                  {item.badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      </li>
    );
  };

  const SectionHeader = ({ title, icon, sectionName, items = [] }) => {
    const isSectionCollapsed = collapsedSections[sectionName];
    const hasItems = items.length > 0;
    const isCurrentlyClicked = clickedSection === sectionName;

    if (!hasItems) return null;

    if (isCollapsed) {
      return (
        <div
          id={`section-${sectionName}`}
          className={`sb-section-header ${isCurrentlyClicked ? 'sb-active' : ''}`}
          onClick={() => toggleSection(sectionName)}
          title={title}
        >
          <i className="material-icons sb-section-header-icon">
            {icon}
          </i>
        </div>
      );
    }

    return (
      <div
        className="sb-section-header"
        onClick={() => toggleSection(sectionName)}
      >
        <i className="material-icons sb-section-header-icon">
          {icon}
        </i>
        <span className="sb-section-header-title">{title}</span>
        <i 
          className={`material-icons sb-section-toggle-icon ${isSectionCollapsed ? 'sb-collapsed' : ''}`}
        >
          expand_more
        </i>
      </div>
    );
  };

  const FloatingMenu = ({ sectionName, items, position }) => {
    if (!isCollapsed || !clickedSection || clickedSection !== sectionName) return null;

    return (
      <div
        ref={menuRef}
        className="sb-floating-menu"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="sb-menu-header">
          <i className="material-icons sb-menu-header-icon">
            {getSectionIcon(sectionName)}
          </i>
          <div>
            <div className="sb-menu-title">{getSectionTitle(sectionName)}</div>
            <div className="sb-menu-subtitle">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <ul className="sb-menu-list">
          {items.map((item) => (
            <li key={item.path} className="sb-menu-item">
              <NavLink
                to={item.path}
                end={false}
                className={({ isActive }) => `sb-menu-link ${isActive ? 'sb-active' : ''}`}
                onClick={() => setClickedSection(null)}
              >
                <i className="material-icons sb-menu-icon">
                  {item.icon}
                </i>
                <span className="sb-menu-label">{item.label}</span>
                {item.badge && (
                  <span className={`sb-menu-badge ${item.badge === 'AI' ? 'sb-ai-badge' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sb-menu-close">
          <button
            onClick={() => setClickedSection(null)}
            className="sb-close-btn"
          >
            <i className="material-icons sb-close-icon">close</i>
            Close
          </button>
        </div>
      </div>
    );
  };

  const getSectionTitle = (sectionName) => {
    const titles = {
      main: "Main Navigation",
      tenders: "Tender Management",
      vendors: "Vendor Management",
      uploads: "Upload Management",
      users: "User Management",
      roles: "Role Management",
      ai: "AI Features"
    };
    return titles[sectionName] || sectionName;
  };

  const getSectionIcon = (sectionName) => {
    const icons = {
      main: "home",
      tenders: "view_timeline",
      vendors: "business_center",
      uploads: "cloud_upload",
      users: "people",
      roles: "admin_panel_settings",
      ai: "smart_toy"
    };
    return icons[sectionName] || "folder";
  };

  const renderNavigationSection = (sectionName, items, title, icon) => {
    if (items.length === 0) return null;

    const isSectionCollapsed = collapsedSections[sectionName];

    return (
      <div key={sectionName}>
        <SectionHeader 
          title={title} 
          icon={icon} 
          sectionName={sectionName}
          items={items}
        />
        
        {!isCollapsed && !isSectionCollapsed && (
          <ul className="sb-nav-list sb-animated-section">
            {items.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </ul>
        )}

        <FloatingMenu 
          sectionName={sectionName}
          items={items}
          position={menuPosition}
        />
      </div>
    );
  };

  return (
    <div
      ref={sidebarRef}
      className={`sb-container ${isCollapsed ? 'sb-collapsed' : ''}`}
    >
      <button
        onClick={toggleSidebar}
        className="sb-toggle-btn"
      >
        <i className="material-icons sb-toggle-icon">
          {isCollapsed ? "chevron_right" : "chevron_left"}
        </i>
      </button>

      <div className="sb-logo-section">
        <div className="sb-logo-icon">
          <i className="material-icons">ai</i>
        </div>
        <div className="sb-logo-text">
          <div className="sb-logo-title">AI Tender</div>
          <div className="sb-logo-subtitle">Smart Evaluation</div>
        </div>
      </div>

      <div className="sb-user-section">
        <div className="sb-user-avatar">
          <i className="material-icons">account_circle</i>
        </div>
        <div className="sb-user-info">
          <div className="sb-username">{currentUser?.username || "Guest User"}</div>
          <div className="sb-user-role">
            {currentUser?.role ? currentUser.role.toUpperCase() : "USER"}
          </div>
        </div>
      </div>

      <nav className="sb-nav">
        <div className="sb-nav-list">
          {renderNavigationSection('main', filteredNavigation.main, "Main", "home")}
          {renderNavigationSection('tenders', filteredNavigation.tenders, "Tender Management", "view_timeline")}
          {renderNavigationSection('vendors', filteredNavigation.vendors, "Vendor Management", "business_center")}
          {renderNavigationSection('uploads', filteredNavigation.uploads, "Upload Management", "cloud_upload")}
          {renderNavigationSection('users', filteredNavigation.users, "User Management", "people")}
          {renderNavigationSection('roles', filteredNavigation.roles, "Role Management", "admin_panel_settings")}
          {renderNavigationSection('ai', filteredNavigation.ai, "AI Features", "smart_toy")}
        </div>
      </nav>

      <div className="sb-footer">
        <button
          onClick={handleLogout}
          className="sb-logout-btn"
        >
          <i className="material-icons sb-logout-icon">logout</i>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
export default memo(Sidebar);
