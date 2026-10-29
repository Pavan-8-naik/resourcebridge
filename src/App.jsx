
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import "./App.css";

const initialResources = [
  {
    id: 1,
    name: "3D Printer",
    category: "Equipment",
    location: "Innovation Lab",
    owner: "Engineering Department",
    available: true,
    icon: "🖨️",
    description: "For prototypes and college projects.",
    hours: "10:00 AM – 4:00 PM",
  },
  {
    id: 2,
    name: "Computer Workstation",
    category: "Technology",
    location: "Computer Lab 2",
    owner: "Computer Science Department",
    available: true,
    icon: "💻",
    description: "A workstation for coding and development.",
    hours: "9:00 AM – 5:00 PM",
  },
  {
    id: 3,
    name: "Electronics Toolkit",
    category: "Equipment",
    location: "Electronics Lab",
    owner: "Electronics Department",
    available: true,
    icon: "🧰",
    description: "Tools for circuit building and testing.",
    hours: "11:00 AM – 3:00 PM",
  },
  {
    id: 4,
    name: "Seminar Room",
    category: "Spaces",
    location: "Academic Block",
    owner: "Campus Facilities",
    available: false,
    icon: "🏫",
    description: "A shared space for team meetings.",
    hours: "Next slot: Tomorrow",
  },
  {
    id: 5,
    name: "DSLR Camera",
    category: "Media",
    location: "Media Centre",
    owner: "Media Department",
    available: true,
    icon: "📷",
    description: "For campus events and project shoots.",
    hours: "10:00 AM – 2:00 PM",
  },
  {
    id: 6,
    name: "Meeting Room",
    category: "Spaces",
    location: "Library, Floor 2",
    owner: "Library Team",
    available: true,
    icon: "🪑",
    description: "A quiet place for collaborative work.",
    hours: "1:00 PM – 4:00 PM",
  },
];

const categories = [
  "All resources",
  "Equipment",
  "Technology",
  "Spaces",
  "Media",
];

const categoryIcons = {
  Equipment: "🧰",
  Technology: "💻",
  Spaces: "🏫",
  Media: "📷",
};

const BOOKING_COLUMNS =
  "id, created_at, resource_id, requester_id, start_time, end_time, status, purpose";

const EMPTY_RESOURCE_FORM = {
  name: "",
  category: "Equipment",
  location: "",
  owner: "",
  description: "",
  hours: "",
};

function toDatabaseDateTime(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapResource(item) {
  return {
    ...item,
    category: item.category || "Equipment",
    location: item.location || "Location not specified",
    owner: item.owner || "Campus community",
    available: item.available ?? true,
    icon: categoryIcons[item.category] || "📦",
    description: item.description || "Shared campus resource.",
    hours: item.hours || "Contact the resource manager",
  };
}

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState("requester");
  const [roleLoading, setRoleLoading] = useState(false);

  const [resources, setResources] = useState(initialResources);
  const [resourceError, setResourceError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All resources");
  const [selected, setSelected] = useState(null);

  const [showAddResource, setShowAddResource] = useState(false);
  const [savingResource, setSavingResource] = useState(false);
  const [resourceForm, setResourceForm] = useState(EMPTY_RESOURCE_FORM);

  const [requests, setRequests] = useState([]);
  const [notice, setNotice] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");

  const isResourceOwner = role === "resource_owner";

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (active) setSession(data.session ?? null);
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (active) {
        setSession(newSession);
        setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setRole("requester");
      setRoleLoading(false);
      return;
    }

    let active = true;
    setRoleLoading(true);

    async function loadRole() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (active) setRole(data?.role || "requester");
      } catch (error) {
        console.error("Could not load account role:", error);

        if (active) {
          setRole("requester");
          setNotice("Could not load your account role. Please refresh.");
        }
      } finally {
        if (active) setRoleLoading(false);
      }
    }

    loadRole();

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;

    let active = true;

    async function loadResources() {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("id", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Resource loading failed:", error);
        setResourceError(
          "Could not load database resources. Demo resources are shown, but bookings are disabled until the database catalogue loads."
        );
        setResources(initialResources);
        return;
      }

      setResources((data || []).map(mapResource));
      setResourceError("");
    }

    loadResources();

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session?.user?.id || roleLoading) return;

    let active = true;

    async function loadBookings() {
      let query = supabase
        .from("bookings")
        .select(BOOKING_COLUMNS)
        .order("created_at", { ascending: false });

      if (!isResourceOwner) {
        query = query.eq("requester_id", session.user.id);
      }

      const { data, error } = await query;

      if (!active) return;

      if (error) {
        console.error("Booking loading failed:", error);
        setNotice(`Could not load booking requests: ${error.message}`);
        return;
      }

      setRequests(
        (data || []).map((booking) => {
          const resource = resources.find(
            (item) => String(item.id) === String(booking.resource_id)
          );

          return {
            ...booking,
            name: resource?.name || `Resource #${booking.resource_id}`,
          };
        })
      );
    }

    loadBookings();

    return () => {
      active = false;
    };
  }, [session, isResourceOwner, roleLoading, resources]);

  const filteredResources = useMemo(
    () =>
      resources.filter((resource) => {
        const searchable = [
          resource.name,
          resource.location,
          resource.description,
          resource.category,
        ]
          .join(" ")
          .toLowerCase();

        return (
          searchable.includes(search.toLowerCase()) &&
          (category === "All resources" || resource.category === category)
        );
      }),
    [resources, search, category]
  );

  function openResource(resource) {
    setSelected(resource);
    setStartTime("");
    setEndTime("");
    setPurpose("");
    setNotice("");
  }

  async function addResource(event) {
    event.preventDefault();

    if (!session?.user?.id || !isResourceOwner) {
      setNotice("Only signed-in resource owners can add resources.");
      return;
    }

    if (resourceError) {
      setNotice(
        "The database resource catalogue is unavailable. Refresh and try again."
      );
      return;
    }

    const { name, category, location, owner, description, hours } =
      resourceForm;

    if (
      !name.trim() ||
      !location.trim() ||
      !owner.trim() ||
      !description.trim() ||
      !hours.trim()
    ) {
      setNotice("Please complete all resource fields.");
      return;
    }

    setSavingResource(true);
    setNotice("");

    try {
      const { data, error } = await supabase
        .from("resources")
        .insert({
          name: name.trim(),
          category,
          location: location.trim(),
          owner: owner.trim(),
          description: description.trim(),
          hours: hours.trim(),
          owner_id: session.user.id,
          available: true,
        })
        .select("*")
        .single();

      if (error) throw error;

      const newResource = mapResource(data);

      setResources((previous) =>
        [...previous, newResource].sort(
          (a, b) => Number(a.id) - Number(b.id)
        )
      );

      setResourceForm(EMPTY_RESOURCE_FORM);
      setShowAddResource(false);
      setNotice(`Resource "${newResource.name}" added successfully.`);
    } catch (error) {
      console.error("Could not add resource:", error);
      setNotice(
        `Could not add resource: ${error.message}. Check your resources table columns and INSERT policy in Supabase.`
      );
    } finally {
      setSavingResource(false);
    }
  }

  async function requestBooking(event) {
    event.preventDefault();

    if (!session?.user?.id || !selected) {
      setNotice("Please log in to request a resource.");
      return;
    }

    if (resourceError) {
      setNotice(
        "The database resource catalogue could not be loaded. Refresh and try again."
      );
      return;
    }

    if (!selected.available) {
      setNotice("This resource is currently unavailable.");
      return;
    }

    if (!startTime || !endTime) {
      setNotice("Please choose both a start and end date and time.");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      setNotice("Choose a valid start time and an end time after it.");
      return;
    }

    if (!purpose.trim()) {
      setNotice("Please enter the purpose of your booking.");
      return;
    }

    const duplicate = requests.some(
      (request) =>
        String(request.resource_id) === String(selected.id) &&
        String(request.requester_id) === String(session.user.id) &&
        String(request.status).toLowerCase() === "pending"
    );

    if (duplicate) {
      setNotice("You already have a pending request for this resource.");
      return;
    }

    const startIso = toDatabaseDateTime(startTime);
    const endIso = toDatabaseDateTime(endTime);

    if (!startIso || !endIso) {
      setNotice("The selected date or time is invalid. Please try again.");
      return;
    }

    setBookingLoading(true);
    setNotice("");

    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          resource_id: selected.id,
          requester_id: session.user.id,
          start_time: startIso,
          end_time: endIso,
          purpose: purpose.trim(),
          status: "Pending",
        })
        .select(BOOKING_COLUMNS)
        .single();

      if (error) throw error;

      setRequests((previous) => [
        { ...data, name: selected.name },
        ...previous,
      ]);

      setSelected(null);
      setNotice(
        `Success! Your request for ${selected.name} was submitted and is pending approval.`
      );
    } catch (error) {
      console.error("Booking request failed:", error);
      setNotice(`Could not save booking: ${error.message}`);
    } finally {
      setBookingLoading(false);
    }
  }

  async function updateBookingStatus(bookingId, status) {
    if (!isResourceOwner) {
      setNotice("Only a resource owner can approve or reject requests.");
      return;
    }

    if (!["Approved", "Rejected"].includes(status)) {
      setNotice("Invalid booking status.");
      return;
    }

    setUpdatingBookingId(bookingId);
    setNotice("");

    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", bookingId)
        .select(BOOKING_COLUMNS);

      if (error) {
        console.error("Could not update booking:", error);
        setNotice(
          `Could not update booking: ${error.message}. Check the bookings UPDATE policy and permissions in Supabase.`
        );
        return;
      }

      if (!data || data.length === 0) {
        setNotice(
          "No booking was updated. Check your bookings UPDATE and SELECT policies and resource ownership."
        );
        return;
      }

      const updatedBooking = data[0];

      setRequests((previous) =>
        previous.map((request) =>
          String(request.id) === String(bookingId)
            ? {
                ...request,
                ...updatedBooking,
                name:
                  resources.find(
                    (resource) =>
                      String(resource.id) ===
                      String(updatedBooking.resource_id)
                  )?.name || request.name,
              }
            : request
        )
      );

      setNotice(`Booking #${bookingId} marked ${status.toLowerCase()}.`);
    } catch (error) {
      console.error("Unexpected booking update error:", error);
      setNotice(
        `Unexpected error while updating the booking: ${error.message || "Please try again."}`
      );
    } finally {
      setUpdatingBookingId(null);
    }
  }

  async function handleLogout() {
    setSigningOut(true);
    setNotice("");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setRequests([]);
      setSelected(null);
      setResources(initialResources);
    } catch (error) {
      setNotice(`Could not log out: ${error.message}`);
    } finally {
      setSigningOut(false);
    }
  }

  if (authLoading) {
    return (
      <main className="auth-page">
        <p>Loading ResourceBridge...</p>
      </main>
    );
  }

  if (!session) return <Auth />;

  const pendingRequests = requests.filter(
    (request) => String(request.status).toLowerCase() === "pending"
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          Resource<span>Bridge</span>
        </a>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          <a className="nav-link active" href="#home">
            <span>⌂</span> Dashboard
          </a>
          <a className="nav-link" href="#resources">
            <span>▦</span> Resources
          </a>
          <a className="nav-link" href="#requests">
            <span>◷</span> My requests
          </a>
          {isResourceOwner && (
            <a className="nav-link" href="#owner">
              <span>✓</span> Owner requests
            </a>
          )}
          <a className="nav-link" href="#how-it-works">
            <span>ⓘ</span> How it works
          </a>
        </nav>

        <div className="sidebar-bottom">
          <p className="sidebar-label">
            {isResourceOwner ? "RESOURCE OWNER" : "SIGNED IN AS"}
          </p>
          <p className="user-email">{session.user.email}</p>
          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
          >
            {signingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div>
            <p className="eyebrow">CAMPUS RESOURCE SHARING</p>
            <h1>Dashboard</h1>
          </div>
          <div className="topbar-user">
            <span className="user-avatar">
              {(session.user.email?.[0] || "U").toUpperCase()}
            </span>
            <span className="topbar-email">{session.user.email}</span>
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">SHARE MORE. DO MORE.</p>
            <h2>Your campus resources, all in one place.</h2>
            <p>
              Discover shared equipment, workspaces, and tools available
              across your campus.
            </p>
            <a className="primary-button" href="#resources">
              Explore resources
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-art-card card-one">💻</div>
            <div className="hero-art-card card-two">🧰</div>
            <div className="hero-art-card card-three">📷</div>
            <div className="hero-art-circle">↗</div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Statistics">
          <article className="stat-card">
            <span className="stat-icon">▦</span>
            <p>Total resources</p>
            <strong>{resources.length}</strong>
          </article>
          <article className="stat-card">
            <span className="stat-icon">✓</span>
            <p>Available resources</p>
            <strong>
              {resources.filter((resource) => resource.available).length}
            </strong>
          </article>
          <article className="stat-card">
            <span className="stat-icon">◷</span>
            <p>{isResourceOwner ? "Pending requests" : "My requests"}</p>
            <strong>
              {isResourceOwner ? pendingRequests.length : requests.length}
            </strong>
          </article>
        </section>

        {notice && (
          <p className="notice" role="status" aria-live="polite">
            {notice}
          </p>
        )}

        {roleLoading && <p>Checking account permissions...</p>}

        <section className="resources-section" id="resources">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FIND WHAT YOU NEED</p>
              <h2>Explore resources</h2>
              <p>Find equipment and spaces for your next project.</p>
            </div>

            {isResourceOwner && (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setShowAddResource((previous) => !previous);
                  setNotice("");
                }}
              >
                {showAddResource ? "Cancel" : "+ Add Resource"}
              </button>
            )}
          </div>

          {isResourceOwner && showAddResource && (
            <form
              className="booking-form add-resource-form"
              onSubmit={addResource}
            >
              <h3>Add a campus resource</h3>
              <p>
                Complete the details below to add a resource to the catalogue.
              </p>

              <label htmlFor="new-resource-name">Resource name</label>
              <input
                id="new-resource-name"
                value={resourceForm.name}
                onChange={(event) =>
                  setResourceForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                maxLength={150}
                required
              />

              <label htmlFor="new-resource-category">Category</label>
              <select
                id="new-resource-category"
                value={resourceForm.category}
                onChange={(event) =>
                  setResourceForm((previous) => ({
                    ...previous,
                    category: event.target.value,
                  }))
                }
                required
              >
                {categories
                  .filter((item) => item !== "All resources")
                  .map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
              </select>

              <label htmlFor="new-resource-location">Location</label>
              <input
                id="new-resource-location"
                value={resourceForm.location}
                onChange={(event) =>
                  setResourceForm((previous) => ({
                    ...previous,
                    location: event.target.value,
                  }))
                }
                maxLength={200}
                required
              />

              <label htmlFor="new-resource-owner">
                Department or owner name
              </label>
              <input
                id="new-resource-owner"
                value={resourceForm.owner}
                onChange={(event) =>
                  setResourceForm((previous) => ({
                    ...previous,
                    owner: event.target.value,
                  }))
                }
                maxLength={150}
                required
              />

              <label htmlFor="new-resource-hours">Available hours</label>
              <input
                id="new-resource-hours"
                value={resourceForm.hours}
                onChange={(event) =>
                  setResourceForm((previous) => ({
                    ...previous,
                    hours: event.target.value,
                  }))
                }
                placeholder="e.g. 10:00 AM – 4:00 PM"
                maxLength={150}
                required
              />

              <label htmlFor="new-resource-description">Description</label>
              <textarea
                id="new-resource-description"
                value={resourceForm.description}
                onChange={(event) =>
                  setResourceForm((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                rows={3}
                maxLength={1000}
                required
              />

              <button
                type="submit"
                className="primary-button"
                disabled={savingResource}
              >
                {savingResource ? "Saving resource..." : "Save Resource"}
              </button>
            </form>
          )}

          {resourceError && (
            <p className="notice warning-notice" role="status">
              {resourceError}
            </p>
          )}

          <div className="resource-controls">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search resources, locations..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search resources"
              />
            </label>
            <label className="category-select-label">
              <span className="visually-hidden">Filter by category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="category-chips">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`category-chip ${
                  category === item ? "selected" : ""
                }`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="resources-grid">
            {filteredResources.map((resource) => (
              <article className="resource-card" key={resource.id}>
                <div className="resource-card-top">
                  <span className="resource-icon">{resource.icon}</span>
                  <span
                    className={`availability ${
                      resource.available ? "available" : "unavailable"
                    }`}
                  >
                    <span className="availability-dot" />
                    {resource.available ? "Available" : "Unavailable"}
                  </span>
                </div>
                <p className="resource-category">{resource.category}</p>
                <h3>{resource.name}</h3>
                <p className="resource-description">{resource.description}</p>
                <div className="resource-meta">
                  <span>⌖ {resource.location}</span>
                  <span>◷ {resource.hours}</span>
                </div>
                <button
                  type="button"
                  className="resource-button"
                  onClick={() => openResource(resource)}
                >
                  View details <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>

          {filteredResources.length === 0 && (
            <div className="empty-state">
              <span>⌕</span>
              <h3>No resources found</h3>
              <p>Try another search or choose a different category.</p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSearch("");
                  setCategory("All resources");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <section className="requests-section" id="requests">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BOOKING HISTORY</p>
              <h2>{isResourceOwner ? "Booking requests" : "My requests"}</h2>
              <p>
                {isResourceOwner
                  ? "Review requests for resources you manage."
                  : "Track the approval status of your submitted requests."}
              </p>
            </div>
          </div>

          {isResourceOwner && (
            <p className="notice warning-notice" role="status">
              Supabase RLS must restrict owners to booking requests for their
              own resources.
            </p>
          )}

          {requests.length === 0 ? (
            <div className="empty-requests">
              <span>◷</span>
              <div>
                <h3>No booking requests yet</h3>
                <p>
                  {isResourceOwner
                    ? "Requests will appear here when permitted by your database policies."
                    : "Open an available resource to submit a booking request."}
                </p>
              </div>
            </div>
          ) : (
            <div className="requests-list">
              {requests.map((request) => (
                <article className="request-row" key={request.id}>
                  <div>
                    <h3>{request.name}</h3>
                    <p>Request #{request.id}</p>
                    {isResourceOwner && (
                      <p>Requested by: {request.requester_id}</p>
                    )}
                    <p>
                      <strong>From:</strong> {formatDate(request.start_time)}
                    </p>
                    <p>
                      <strong>Until:</strong> {formatDate(request.end_time)}
                    </p>
                    {request.purpose && <p>Purpose: {request.purpose}</p>}
                    <p>Submitted: {formatDate(request.created_at)}</p>
                  </div>

                  <div className="request-actions">
                    <span className="request-status">{request.status}</span>
                    {isResourceOwner &&
                      String(request.status).toLowerCase() === "pending" && (
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="primary-button"
                            disabled={updatingBookingId === request.id}
                            onClick={() =>
                              updateBookingStatus(request.id, "Approved")
                            }
                          >
                            {updatingBookingId === request.id
                              ? "Saving..."
                              : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={updatingBookingId === request.id}
                            onClick={() =>
                              updateBookingStatus(request.id, "Rejected")
                            }
                          >
                            {updatingBookingId === request.id
                              ? "Saving..."
                              : "Reject"}
                          </button>
                        </div>
                      )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="how-section" id="how-it-works">
          <p className="eyebrow">SIMPLE BY DESIGN</p>
          <h2>How ResourceBridge works</h2>
          <div className="how-grid">
            <article className="how-card">
              <span>01</span>
              <h3>Discover</h3>
              <p>Search the catalogue for equipment and shared spaces.</p>
            </article>
            <article className="how-card">
              <span>02</span>
              <h3>Request</h3>
              <p>Choose a booking period and explain what you need it for.</p>
            </article>
            <article className="how-card">
              <span>03</span>
              <h3>Get approval</h3>
              <p>
                The resource owner reviews the request when ownership and
                database permissions are configured.
              </p>
            </article>
          </div>
        </section>

        <footer className="app-footer">
          <a className="brand" href="#home">
            Resource<span>Bridge</span>
          </a>
          <p>Making campus resources easier to discover and share.</p>
        </footer>
      </main>

      {selected && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              !bookingLoading
            ) {
              setSelected(null);
            }
          }}
        >
          <section
            className="resource-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-modal-title"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close resource details"
              disabled={bookingLoading}
              onClick={() => setSelected(null)}
            >
              ×
            </button>

            <span className="resource-icon modal-resource-icon">
              {selected.icon}
            </span>
            <p className="resource-category">{selected.category}</p>
            <h2 id="resource-modal-title">{selected.name}</h2>
            <p className="resource-description">{selected.description}</p>

            <div className="modal-details">
              <p>
                <strong>Location</strong>
                <span>{selected.location}</span>
              </p>
              <p>
                <strong>Managed by</strong>
                <span>{selected.owner}</span>
              </p>
              <p>
                <strong>Hours</strong>
                <span>{selected.hours}</span>
              </p>
              <p>
                <strong>Status</strong>
                <span>
                  {selected.available ? "Available" : "Unavailable"}
                </span>
              </p>
            </div>

            {selected.available ? (
              <form className="booking-form" onSubmit={requestBooking}>
                <h3>Request a booking</h3>

                <label htmlFor="booking-start">Start date and time</label>
                <input
                  id="booking-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                />

                <label htmlFor="booking-end">End date and time</label>
                <input
                  id="booking-end"
                  type="datetime-local"
                  value={endTime}
                  min={startTime || undefined}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                />

                <label htmlFor="booking-purpose">Purpose</label>
                <textarea
                  id="booking-purpose"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="Explain why you need this resource"
                  rows={3}
                  maxLength={1000}
                  required
                />

                <button
                  type="submit"
                  className="primary-button modal-request-button"
                  disabled={bookingLoading}
                >
                  {bookingLoading
                    ? "Submitting request..."
                    : "Submit for approval"}
                </button>
              </form>
            ) : (
              <p className="notice warning-notice">
                This resource is currently unavailable.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
