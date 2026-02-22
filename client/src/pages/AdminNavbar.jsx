import { Link } from "react-router-dom";

function AdminNavbar() {
  return (
    <div style={styles.nav}>
      <h2>Admin Panel</h2>
      <div>
        <Link to="/admin" style={styles.link}>Dashboard</Link>
        <Link to="/login" style={styles.link}>Logout</Link>
      </div>
    </div>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "15px",
    backgroundColor: "#1e293b",
    color: "white"
  },
  link: {
    marginLeft: "20px",
    color: "white",
    textDecoration: "none"
  }
};

export default AdminNavbar;
