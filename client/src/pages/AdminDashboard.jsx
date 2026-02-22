import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [complements, setComplements] = useState([]);
  const [residentQuery, setResidentQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [complimentQuery, setComplimentQuery] = useState("");
  const [complimentFilter, setComplimentFilter] = useState("all");
  const [workerFilter, setWorkerFilter] = useState("all");
  const [resolvingItem, setResolvingItem] = useState(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  // Predefined workers list
  const workers = [
    { id: "worker1", name: "John Smith", role: "Electrician" },
    { id: "worker2", name: "Sarah Johnson", role: "Plumber" },
    { id: "worker3", name: "Mike Davis", role: "Carpenter" },
    { id: "worker4", name: "Emily Brown", role: "Cleaner" },
    { id: "worker5", name: "Robert Wilson", role: "Maintenance" },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, complementsRes] = await Promise.all([
        axios.get("http://localhost:5000/admin/stats"),
        axios.get("http://localhost:5000/admin/complements")
      ]);

      setStats(statsRes.data);
      setComplements(complementsRes.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    navigate("/login");
  };


  const handleAssignWorker = async (complementId, workerId, workerName) => {
    try {
      await axios.put(`http://localhost:5000/admin/complements/${complementId}/assign`, {
        assignedWorker: workerName,
        workerId: workerId
      });
      fetchDashboardData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to assign worker");
    }
  };

  const paymentSummary = useMemo(() => {
    const totalUsers = stats?.totalUsers || 0;
    const totalPaid = stats?.totalPaid || 0;
    const totalPending = stats?.totalPending || 0;
    const paidRate = totalUsers > 0 ? Math.min(100, Math.round((totalPaid / totalUsers) * 100)) : 0;
    const pendingRate = totalUsers > 0 ? Math.min(100, Math.round((totalPending / totalUsers) * 100)) : 0;

    return { paidRate, pendingRate };
  }, [stats]);

  const filteredUsers = useMemo(() => {
    const users = stats?.users || [];
    const normalizedQuery = residentQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesText =
        !normalizedQuery ||
        user.name?.toLowerCase().includes(normalizedQuery) ||
        user.email?.toLowerCase().includes(normalizedQuery) ||
        user.roomNumber?.toString().toLowerCase().includes(normalizedQuery);

      const matchesPayment =
        paymentFilter === "all" ||
        (paymentFilter === "paid" && user.paymentStatus === "Paid") ||
        (paymentFilter === "pending" && user.paymentStatus !== "Paid");

      return matchesText && matchesPayment;
    });
  }, [stats, residentQuery, paymentFilter]);

  const filteredComplements = useMemo(() => {
    const normalizedQuery = complimentQuery.trim().toLowerCase();

    return complements.filter((item) => {
      const matchesText =
        !normalizedQuery ||
        item.name?.toLowerCase().includes(normalizedQuery) ||
        item.email?.toLowerCase().includes(normalizedQuery) ||
        item.message?.toLowerCase().includes(normalizedQuery) ||
        item.roomNumber?.toString().toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        complimentFilter === "all" ||
        (complimentFilter === "pending" && item.status === "Pending") ||
        (complimentFilter === "resolved" && item.status === "Resolved");

      const matchesWorker =
        workerFilter === "all" ||
        item.assignedWorker === workerFilter;

      return matchesText && matchesStatus && matchesWorker;
    });
  }, [complements, complimentQuery, complimentFilter, workerFilter]);

  const openResolveModal = (item) => {
    setResolvingItem(item);
    setAdminResponse(item.adminResponse || "Resolved by admin. Thank you for your input.");
  };

  const closeResolveModal = () => {
    setResolvingItem(null);
    setAdminResponse("");
    setSelectedWorker("");
    setIsSubmittingResolve(false);
  };

  const handleResolveSubmit = async (event) => {
    event.preventDefault();

    if (!resolvingItem?._id) return;
    if (!adminResponse.trim()) return;

    setIsSubmittingResolve(true);
    try {
      await axios.put(`http://localhost:5000/admin/complements/${resolvingItem._id}/resolve`, {
        adminResponse: adminResponse.trim(),
        assignedWorker: selectedWorker || resolvingItem.assignedWorker || null
      });
      closeResolveModal();
      fetchDashboardData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to resolve complement");
      setIsSubmittingResolve(false);
    }
  };

  if (!stats) {
    return (
      <div className="admin-dashboard loading-view">
        <div className="loading-orb" />
        <h2>Preparing your control room...</h2>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="ambient-glow ambient-glow-left" />
      <div className="ambient-glow ambient-glow-right" />

      {/* Header with Logout button */}
      <div className="admin-header">
        <button className="admin-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Premium Operations Console</p>
          <h1>Community Command Center</h1>
          <p className="hero-subtitle">
            Monitor residents, resolve feedback, and manage payment flow from one interactive dashboard.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="hero-metric">
            <span>Paid Completion</span>
            <strong>{paymentSummary.paidRate}%</strong>
            <div className="meter-track">
              <div className="meter-fill paid" style={{ width: `${paymentSummary.paidRate}%` }} />
            </div>
          </div>
          <div className="hero-metric">
            <span>Pending Share</span>
            <strong>{paymentSummary.pendingRate}%</strong>
            <div className="meter-track">
              <div className="meter-fill pending" style={{ width: `${paymentSummary.pendingRate}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card residents">
          <span>Total Residents</span>
          <h2>{stats.totalUsers}</h2>
        </article>
        <article className="stat-card paid">
          <span>Payments Received</span>
          <h2>{stats.totalPaid}</h2>
        </article>
        <article className="stat-card pending">
          <span>Pending Payments</span>
          <h2>{stats.totalPending}</h2>
        </article>
      </section>

      <section className="data-panel">
        <div className="panel-header">
          <h3>Resident Directory</h3>
          <div className="panel-controls">
            <input
              type="text"
              className="dashboard-input"
              placeholder="Search name, email, room..."
              value={residentQuery}
              onChange={(event) => setResidentQuery(event.target.value)}
            />
            <div className="filter-chips">
              <button
                type="button"
                className={paymentFilter === "all" ? "chip active" : "chip"}
                onClick={() => setPaymentFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={paymentFilter === "paid" ? "chip active" : "chip"}
                onClick={() => setPaymentFilter("paid")}
              >
                Paid
              </button>
              <button
                type="button"
                className={paymentFilter === "pending" ? "chip active" : "chip"}
                onClick={() => setPaymentFilter("pending")}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Phone</th>
                <th>Room</th>
                <th>Room Type</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={`${user.email}-${index}`}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || "None"}</td>
                  <td>{user.roomNumber || "None"}</td>
                  <td>{user.roomType || "None"}</td>
                  <td>
                    <span className={user.paymentStatus === "Paid" ? "badge paid" : "badge pending"}>
                      {user.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && <p className="empty-text">No residents match your current filters.</p>}
      </section>

      <section className="data-panel">
        <div className="panel-header">
          <h3>User Complaints / Complements</h3>
          <div className="panel-controls">
            <input
              type="text"
              className="dashboard-input"
              placeholder="Search name, email, room, message..."
              value={complimentQuery}
              onChange={(event) => setComplimentQuery(event.target.value)}
            />
            <div className="filter-chips">
              <button
                type="button"
                className={complimentFilter === "all" ? "chip active" : "chip"}
                onClick={() => setComplimentFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={complimentFilter === "pending" ? "chip active" : "chip"}
                onClick={() => setComplimentFilter("pending")}
              >
                Pending
              </button>
              <button
                type="button"
                className={complimentFilter === "resolved" ? "chip active" : "chip"}
                onClick={() => setComplimentFilter("resolved")}
              >
                Resolved
              </button>
            </div>
          </div>
        </div>

        {/* Worker Filter */}
        <div className="worker-filter-section">
          <label className="worker-filter-label">Filter by Worker:</label>
          <select 
            className="worker-filter-select"
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
          >
            <option value="all">All Workers</option>
            <option value="unassigned">Unassigned</option>
            {workers.map(worker => (
              <option key={worker.id} value={worker.name}>
                {worker.name} ({worker.role})
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Room #</th>
                <th>Message</th>
                <th>Assigned Worker</th>
                <th>Status</th>
                <th>Result</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplements.map((item) => (
                <tr key={item._id}>
                  <td>{item.name || "N/A"}</td>
                  <td>{item.email}</td>
                  <td>
                    <span className="room-badge">
                      {item.roomNumber || "N/A"}
                    </span>
                  </td>
                  <td className="message-cell">{item.message}</td>
                  <td>
                    {item.assignedWorker ? (
                      <span className="worker-badge">{item.assignedWorker}</span>
                    ) : (
                      <select
                        className="worker-assign-select"
                        value=""
                        onChange={(e) => handleAssignWorker(item._id, e.target.value, e.target.options[e.target.selectedIndex].text)}
                      >
                        <option value="">Assign Worker</option>
                        {workers.map(worker => (
                          <option key={worker.id} value={worker.id}>
                            {worker.name} ({worker.role})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <span className={item.status === "Resolved" ? "badge paid" : "badge pending"}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.adminResponse || "Pending"}</td>
                  <td>
                    {item.status === "Pending" ? (
                      <button type="button" className="resolve-button" onClick={() => openResolveModal(item)}>
                        Resolve
                      </button>
                    ) : (
                      <span className="resolved-text">Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredComplements.length === 0 && <p className="empty-text">No complaints match your filters.</p>}
      </section>

      {resolvingItem && (
        <div className="modal-backdrop" onClick={closeResolveModal}>
          <div className="resolve-modal" onClick={(event) => event.stopPropagation()}>
            <h4>Resolve Complaint</h4>
            <div className="resolve-detail">
              <strong>Room:</strong> {resolvingItem.roomNumber || "N/A"}
            </div>
            <div className="resolve-detail">
              <strong>Issue:</strong> {resolvingItem.message}
            </div>
            
            <div className="worker-assign-section">
              <label>Assign/Change Worker:</label>
              <select
                className="worker-select-modal"
                value={selectedWorker || resolvingItem.assignedWorker || ""}
                onChange={(e) => setSelectedWorker(e.target.value)}
              >
                <option value="">Select Worker (Optional)</option>
                {workers.map(worker => (
                  <option key={worker.id} value={worker.name}>
                    {worker.name} - {worker.role}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleResolveSubmit}>
              <textarea
                className="dashboard-textarea"
                value={adminResponse}
                onChange={(event) => setAdminResponse(event.target.value)}
                placeholder="Write the response sent to the user..."
                rows={4}
              />
              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={closeResolveModal}>
                  Cancel
                </button>
                <button type="submit" className="resolve-button" disabled={isSubmittingResolve}>
                  {isSubmittingResolve ? "Saving..." : "Mark as Resolved"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
