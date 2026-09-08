import { useState } from "react";
import "./App.css";

/* =========================================================
   CAMPUSNOVA DATA
   ========================================================= */

const teachers = [
  {
    id: 1,
    name: "Dr. Priya Sharma",
    department: "Computer Science",
    subjects: "Java, Data Structures",
    status: "Available",
    location: "CSE Lab 2",
  },
  {
    id: 2,
    name: "Prof. Rahul Patil",
    department: "Computer Science",
    subjects: "Web Development, JavaScript",
    status: "Busy",
    location: "CSE Department",
  },
  {
    id: 3,
    name: "Dr. Neha Joshi",
    department: "Computer Science",
    subjects: "Database, SQL",
    status: "Available",
    location: "Database Lab",
  },
];

/* =========================================================
   MAIN APP
   ========================================================= */

function App() {
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("dashboard");

  const [search, setSearch] = useState("");

  const [requests, setRequests] = useState([]);

  const [notifications, setNotifications] = useState([]);

  const [teacherRequests, setTeacherRequests] = useState([
    {
      id: 1,
      student: "Aarav Kulkarni",
      reason: "Need help with Java assignment",
      status: "Pending",
    },
  ]);

  const [availability, setAvailability] =
    useState("Available");

  /* -------------------------------------------------------
     LOGIN
     ------------------------------------------------------- */

  const login = (newRole) => {
    setRole(newRole);
    setPage("dashboard");
    setSearch("");
  };

  /* -------------------------------------------------------
     LOGOUT
     ------------------------------------------------------- */

  const logout = () => {
    setRole(null);
    setPage("dashboard");
    setSearch("");
  };

  /* -------------------------------------------------------
     FILTER TEACHERS
     ------------------------------------------------------- */

  const filteredTeachers = teachers.filter((teacher) => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return true;
    }

    return (
      teacher.name.toLowerCase().includes(value) ||
      teacher.department.toLowerCase().includes(value) ||
      teacher.subjects.toLowerCase().includes(value)
    );
  });

  /* -------------------------------------------------------
     STUDENT SEND REQUEST
     ------------------------------------------------------- */

  const sendRequest = (teacher, reason) => {
    if (!reason.trim()) {
      return;
    }

    const requestId = Date.now();

    setRequests((oldRequests) => [
      {
        id: requestId,
        teacher: teacher.name,
        reason: reason.trim(),
        status: "Pending",
      },
      ...oldRequests,
    ]);

    setNotifications((oldNotifications) => [
      {
        id: requestId,
        text: `Request sent to ${teacher.name}`,
        type: "sent",
      },
      ...oldNotifications,
    ]);

    setPage("requests");
  };

  /* -------------------------------------------------------
     LOGIN SCREEN
     ------------------------------------------------------- */

  if (!role) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="app">

      {/* ===================================================
          SIDEBAR
          =================================================== */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-mark">C</div>

          <div>
            <strong>CampusNova</strong>
            <span>Smart Campus</span>
          </div>
        </div>

        <div className="role-label">
          {role === "student" && "Student Portal"}
          {role === "teacher" && "Faculty Portal"}
          {role === "admin" && "Admin Portal"}
        </div>

        <nav>

          <Nav
            active={page === "dashboard"}
            onClick={() => setPage("dashboard")}
          >
            Dashboard
          </Nav>

          {/* STUDENT NAVIGATION */}

          {role === "student" && (
            <>
              <Nav
                active={page === "teachers"}
                onClick={() => setPage("teachers")}
              >
                Find Teacher
              </Nav>

              <Nav
                active={page === "requests"}
                onClick={() => setPage("requests")}
              >
                My Requests
              </Nav>

              <Nav
                active={page === "notifications"}
                onClick={() =>
                  setPage("notifications")
                }
              >
                Notifications
              </Nav>
            </>
          )}

          {/* TEACHER NAVIGATION */}

          {role === "teacher" && (
            <>
              <Nav
                active={page === "requests"}
                onClick={() => setPage("requests")}
              >
                Student Requests
              </Nav>

              <Nav
                active={page === "availability"}
                onClick={() =>
                  setPage("availability")
                }
              >
                Availability
              </Nav>

              <Nav
                active={page === "notifications"}
                onClick={() =>
                  setPage("notifications")
                }
              >
                Notifications
              </Nav>
            </>
          )}

          {/* ADMIN NAVIGATION */}

          {role === "admin" && (
            <>
              <Nav
                active={page === "users"}
                onClick={() => setPage("users")}
              >
                Users
              </Nav>

              <Nav
                active={page === "applications"}
                onClick={() =>
                  setPage("applications")
                }
              >
                Applications
              </Nav>

              <Nav
                active={page === "activity"}
                onClick={() => setPage("activity")}
              >
                System Activity
              </Nav>
            </>
          )}

        </nav>

        <div className="sidebar-bottom">

          <div className="privacy">
            <strong>Private portal</strong>
            <span>
              Your role controls access.
            </span>
          </div>

          <button
            className="logout"
            onClick={logout}
          >
            Sign out
          </button>

        </div>

      </aside>

      {/* ===================================================
          MAIN AREA
          =================================================== */}

      <main className="main">

        {/* TOP BAR */}

        <header className="topbar">

          <div>
            <div className="small-title">
              CAMPUSNOVA
            </div>

            <h1>
              {role === "student" &&
                "Student Dashboard"}

              {role === "teacher" &&
                "Faculty Dashboard"}

              {role === "admin" &&
                "Admin Dashboard"}
            </h1>
          </div>

          <div className="profile">

            <div className="avatar">
              {role === "student"
                ? "S"
                : role === "teacher"
                ? "F"
                : "A"}
            </div>

            <div>
              <strong>
                {role === "student"
                  ? "Student"
                  : role === "teacher"
                  ? "Faculty"
                  : "Administrator"}
              </strong>

              <span>CampusNova</span>
            </div>

          </div>

        </header>

        {/* =================================================
            STUDENT DASHBOARD
            ================================================= */}

        {page === "dashboard" &&
          role === "student" && (
            <StudentDashboard
              requests={requests}
              notifications={notifications}
              onFind={() => setPage("teachers")}
            />
          )}

        {/* =================================================
            TEACHER DASHBOARD
            ================================================= */}

        {page === "dashboard" &&
          role === "teacher" && (
            <TeacherDashboard
              requests={teacherRequests}
              availability={availability}
              onRequests={() =>
                setPage("requests")
              }
              onAvailability={() =>
                setPage("availability")
              }
            />
          )}

        {/* =================================================
            ADMIN DASHBOARD
            ================================================= */}

        {page === "dashboard" &&
          role === "admin" && (
            <AdminDashboard />
          )}

        {/* =================================================
            STUDENT — FIND TEACHER
            ================================================= */}

        {role === "student" &&
          page === "teachers" && (
            <TeacherPage
              teachers={filteredTeachers}
              search={search}
              setSearch={setSearch}
              onSend={sendRequest}
            />
          )}

        {/* =================================================
            STUDENT — REQUESTS
            ================================================= */}

        {role === "student" &&
          page === "requests" && (
            <RequestsPage
              requests={requests}
            />
          )}

        {/* =================================================
            STUDENT — NOTIFICATIONS
            ================================================= */}

        {role === "student" &&
          page === "notifications" && (
            <Notifications
              items={notifications}
            />
          )}

        {/* =================================================
            TEACHER — REQUESTS
            ================================================= */}

        {role === "teacher" &&
          page === "requests" && (
            <TeacherRequests
              requests={teacherRequests}
              setRequests={setTeacherRequests}
            />
          )}

        {/* =================================================
            TEACHER — AVAILABILITY
            ================================================= */}

        {role === "teacher" &&
          page === "availability" && (
            <Availability
              value={availability}
              setValue={setAvailability}
            />
          )}

        {/* =================================================
            TEACHER — NOTIFICATIONS
            ================================================= */}

        {role === "teacher" &&
          page === "notifications" && (
            <Notifications
              items={teacherRequests.map(
                (request) => ({
                  id: request.id,
                  text: `Request from ${request.student}`,
                  type:
                    request.status.toLowerCase(),
                })
              )}
            />
          )}

        {/* =================================================
            ADMIN — USERS
            ================================================= */}

        {role === "admin" &&
          page === "users" && (
            <SimplePage
              title="Users"
              text="Manage students and faculty."
            />
          )}

        {/* =================================================
            ADMIN — APPLICATIONS
            ================================================= */}

        {role === "admin" &&
          page === "applications" && (
            <SimplePage
              title="Applications"
              text="Manage campus applications."
            />
          )}

        {/* =================================================
            ADMIN — ACTIVITY
            ================================================= */}

        {role === "admin" &&
          page === "activity" && (
            <SimplePage
              title="System Activity"
              text="Monitor CampusNova activity."
            />
          )}

      </main>
    </div>
  );
}

/* =========================================================
   LOGIN SCREEN
   ========================================================= */

function LoginScreen({ onLogin }) {
  const [flipped, setFlipped] =
    useState(false);

  return (
    <div className="login-page">

      <div
        className={
          flipped
            ? "login-box is-flipped"
            : "login-box"
        }
      >

        {/* FRONT */}

        <section className="login-side welcome-side">

          <div className="welcome-content">

            <div className="welcome-crest">
              C
            </div>

            <p className="eyebrow">
              SMART CAMPUS PLATFORM
            </p>

            <h1>
              Welcome to
              <br />
              CampusNova
            </h1>

            <p>
              Find faculty, manage requests
              and stay connected with your
              campus.
            </p>

            <button
              className="enter-button"
              onClick={() =>
                setFlipped(true)
              }
            >
              Continue
            </button>

          </div>

        </section>

        {/* BACK */}

        <section className="login-side role-side">

          <div className="login-content">

            <p className="eyebrow">
              CAMPUS ACCESS
            </p>

            <h2>
              Login to continue
            </h2>

            <p>
              Choose your account type
            </p>

            <div className="login-options">

              <button
                onClick={() =>
                  onLogin("student")
                }
              >
                <strong>Student</strong>
                <span>
                  Access campus services
                </span>
              </button>

              <button
                onClick={() =>
                  onLogin("teacher")
                }
              >
                <strong>Faculty</strong>
                <span>
                  Manage requests and
                  availability
                </span>
              </button>

              <button
                onClick={() =>
                  onLogin("admin")
                }
              >
                <strong>Admin</strong>
                <span>
                  Manage CampusNova
                </span>
              </button>

            </div>

            <button
              className="back-button"
              onClick={() =>
                setFlipped(false)
              }
            >
              ← Back
            </button>

          </div>

        </section>

      </div>

    </div>
  );
}

/* =========================================================
   NAVIGATION COMPONENT
   ========================================================= */

function Nav({
  active,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "nav active"
          : "nav"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* =========================================================
   STUDENT DASHBOARD
   ========================================================= */

function StudentDashboard({
  requests,
  notifications,
  onFind,
}) {
  return (
    <div className="content">

      <div className="hero">

        <span className="tag">
          STUDENT PORTAL
        </span>

        <h2>
          Find the right faculty,
          <br />
          when you need them.
        </h2>

        <p>
          Quickly find teachers and send
          a request for academic help.
        </p>

        <button
          className="primary"
          onClick={onFind}
        >
          Find a Teacher
        </button>

      </div>

      <div className="stats">

        <Stat
          title="My Requests"
          value={requests.length}
        />

        <Stat
          title="Notifications"
          value={notifications.length}
        />

        <Stat
          title="Campus Access"
          value="Active"
        />

      </div>

    </div>
  );
}

/* =========================================================
   TEACHER DASHBOARD
   ========================================================= */

function TeacherDashboard({
  requests,
  availability,
  onRequests,
  onAvailability,
}) {
  const pending =
    requests.filter(
      (request) =>
        request.status === "Pending"
    ).length;

  return (
    <div className="content">

      <div className="hero">

        <span className="tag">
          FACULTY PORTAL
        </span>

        <h2>
          Manage student requests
          <br />
          with ease.
        </h2>

        <p>
          Keep your availability updated
          and respond to students.
        </p>

      </div>

      <div className="stats">

        <Stat
          title="Pending Requests"
          value={pending}
        />

        <Stat
          title="Availability"
          value={availability}
        />

      </div>

      <div className="action-row">

        <button
          className="primary"
          onClick={onRequests}
        >
          View Requests
        </button>

        <button
          className="secondary"
          onClick={onAvailability}
        >
          Change Availability
        </button>

      </div>

    </div>
  );
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

function AdminDashboard() {
  return (
    <div className="content">

      <div className="hero">

        <span className="tag">
          ADMIN PORTAL
        </span>

        <h2>
          CampusNova
          <br />
          administration.
        </h2>

        <p>
          Manage users, applications
          and system activity.
        </p>

      </div>

      <div className="stats">

        <Stat
          title="Students"
          value="—"
        />

        <Stat
          title="Faculty"
          value="—"
        />

        <Stat
          title="System Status"
          value="Active"
        />

      </div>

    </div>
  );
}/* =========================================================
   FIND TEACHER PAGE
   ========================================================= */

function TeacherPage({
  teachers,
  search,
  setSearch,
  onSend,
}) {
  const [selected, setSelected] =
    useState(null);

  const [reason, setReason] =
    useState("");

  const submit = () => {
    if (!selected) {
      return;
    }

    if (!reason.trim()) {
      return;
    }

    onSend(selected, reason);

    setSelected(null);
    setReason("");
  };

  return (
    <div className="content">

      <div className="section-title">

        <span className="tag">
          CAMPUS DIRECTORY
        </span>

        <h2>
          Find a Teacher
        </h2>

        <p>
          Search by teacher, department
          or subject.
        </p>

      </div>

      <input
        className="search"
        type="text"
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        placeholder="Search teacher or subject..."
        aria-label="Search teachers"
      />

      <div className="teacher-list">

        {teachers.length === 0 ? (
          <Empty
            text="No teachers found for your search."
          />
        ) : (
          teachers.map((teacher) => (
            <div
              className="teacher-card"
              key={teacher.id}
            >

              {/* TEACHER INFORMATION */}

              <div className="teacher-info">

                <div className="teacher-avatar">
                  {teacher.name.charAt(0)}
                </div>

                <div>

                  <h3>
                    {teacher.name}
                  </h3>

                  <span>
                    {teacher.department}
                  </span>

                  <p>
                    {teacher.subjects}
                  </p>

                </div>

              </div>

              {/* TEACHER STATUS */}

              <div className="teacher-right">

                <span
                  className={
                    teacher.status ===
                    "Available"
                      ? "status available"
                      : teacher.status ===
                        "Busy"
                      ? "status busy"
                      : "status"
                  }
                >
                  {teacher.status}
                </span>

                <small>
                  {teacher.location}
                </small>

                <button
                  type="button"
                  className="primary small"
                  onClick={() =>
                    setSelected(teacher)
                  }
                >
                  Request Help
                </button>

              </div>

            </div>
          ))
        )}

      </div>

      {/* =================================================
          REQUEST MODAL
          ================================================= */}

      {selected && (
        <div
          className="modal-bg"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelected(null);
            }
          }}
        >

          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-title"
          >

            <button
              type="button"
              className="close"
              aria-label="Close"
              onClick={() =>
                setSelected(null)
              }
            >
              ×
            </button>

            <span className="tag">
              FACULTY REQUEST
            </span>

            <h2 id="request-title">
              {selected.name}
            </h2>

            <p>
              Tell the faculty member what
              you need help with.
            </p>

            <textarea
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              placeholder="Example: I need help with my Java assignment..."
              aria-label="Request reason"
            />

            <button
              type="button"
              className="primary"
              disabled={!reason.trim()}
              onClick={submit}
            >
              Send Request
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

/* =========================================================
   STUDENT REQUESTS PAGE
   ========================================================= */

function RequestsPage({
  requests,
}) {
  return (
    <div className="content">

      <div className="section-title">

        <span className="tag">
          STUDENT PORTAL
        </span>

        <h2>
          My Requests
        </h2>

        <p>
          Track your faculty requests.
        </p>

      </div>

      {requests.length === 0 ? (
        <Empty
          text="No requests yet. Find a teacher to send your first request."
        />
      ) : (
        <div className="request-list">

          {requests.map((request) => (
            <div
              className="request-card"
              key={request.id}
            >

              <div>

                <h3>
                  {request.teacher}
                </h3>

                <p>
                  {request.reason}
                </p>

              </div>

              <RequestStatus
                status={request.status}
              />

            </div>
          ))}

        </div>
      )}

    </div>
  );
}

/* =========================================================
   TEACHER REQUESTS PAGE
   ========================================================= */

function TeacherRequests({
  requests,
  setRequests,
}) {
  const decide = (
    id,
    status
  ) => {
    setRequests((oldRequests) =>
      oldRequests.map(
        (request) =>
          request.id === id
            ? {
                ...request,
                status,
              }
            : request
      )
    );
  };

  return (
    <div className="content">

      <div className="section-title">

        <span className="tag">
          FACULTY PORTAL
        </span>

        <h2>
          Student Requests
        </h2>

        <p>
          Review and respond to
          student requests.
        </p>

      </div>

      {requests.length === 0 ? (
        <Empty
          text="No student requests."
        />
      ) : (
        <div className="request-list">

          {requests.map((request) => (
            <div
              className="request-card"
              key={request.id}
            >

              <div>

                <h3>
                  {request.student}
                </h3>

                <p>
                  {request.reason}
                </p>

              </div>

              {request.status ===
              "Pending" ? (
                <div className="decision">

                  <button
                    type="button"
                    className="primary small"
                    onClick={() =>
                      decide(
                        request.id,
                        "Accepted"
                      )
                    }
                  >
                    Accept
                  </button>

                  <button
                    type="button"
                    className="secondary small"
                    onClick={() =>
                      decide(
                        request.id,
                        "Declined"
                      )
                    }
                  >
                    Decline
                  </button>

                </div>
              ) : (
                <RequestStatus
                  status={request.status}
                />
              )}

            </div>
          ))}

        </div>
      )}

    </div>
  );
}

/* =========================================================
   REQUEST STATUS
   ========================================================= */

function RequestStatus({
  status,
}) {
  const normalized =
    status.toLowerCase();

  let statusClass =
    "status pending";

  if (normalized === "accepted") {
    statusClass =
      "status accepted";
  }

  if (normalized === "declined") {
    statusClass =
      "status declined";
  }

  return (
    <span className={statusClass}>
      {status}
    </span>
  );
}

/* =========================================================
   AVAILABILITY PAGE
   ========================================================= */

function Availability({
  value,
  setValue,
}) {
  const options = [
    "Available",
    "Busy",
    "Unavailable",
  ];

  return (
    <div className="content">

      <div className="section-title">

        <span className="tag">
          FACULTY PORTAL
        </span>

        <h2>
          Availability
        </h2>

        <p>
          Let students know when you
          are available.
        </p>

      </div>

      <div className="availability-box">

        {options.map((item) => (
          <button
            type="button"
            key={item}
            className={
              value === item
                ? "availability active"
                : "availability"
            }
            onClick={() =>
              setValue(item)
            }
          >
            {item}
          </button>
        ))}

      </div>

    </div>
  );
}

/* =========================================================
   NOTIFICATIONS PAGE
   ========================================================= */

function Notifications({
  items,
}) {
  return (
    <div className="content">

      <div className="section-title">

        <span className="tag">
          CAMPUS UPDATES
        </span>

        <h2>
          Notifications
        </h2>

        <p>
          Your latest CampusNova
          updates.
        </p>

      </div>

      {items.length === 0 ? (
        <Empty
          text="No new notifications."
        />
      ) : (
        <div>

          {items.map((item) => (
            <div
              className="notification"
              key={item.id}
            >
              {item.text}
            </div>
          ))}

        </div>
      )}

    </div>
  );
}

/* =========================================================
   ADMIN SIMPLE PAGE
   ========================================================= */

function SimplePage({
  title,
  text,
}) {
  return (
    <div className="content">

      <div className="section-title">

        <span className="tag">
          ADMIN PORTAL
        </span>

        <h2>
          {title}
        </h2>

        <p>
          {text}
        </p>

      </div>

      <div className="empty-box">
        This section is ready for setup.
      </div>

    </div>
  );
}/* =========================================================
   STAT CARD
   ========================================================= */

function Stat({
  title,
  value,
}) {
  return (
    <div className="stat">

      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}

/* =========================================================
   SECTION TITLE
   ========================================================= */

function SectionTitle({
  title,
  text,
}) {
  return (
    <div className="section-title">

      <span className="tag">
        CAMPUSNOVA
      </span>

      <h2>
        {title}
      </h2>

      <p>
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function Empty({
  text,
}) {
  return (
    <div className="empty-box">
      {text}
    </div>
  );
}

/* =========================================================
   END OF COMPONENTS
   ========================================================= *//* =========================================================
   CAMPUSNOVA — FINAL EXPORT
   ========================================================= */

/*
  App is the root component of CampusNova.
  All role-based screens are handled inside App.
*/

export default App;