
import { useMemo, useState } from "react";
import "./App.css";

const initialResources = [
  { id: 1, name: "3D Printer", category: "Equipment", location: "Innovation Lab", owner: "Engineering Department", available: true, icon: "🖨️", description: "For prototypes and college projects.", hours: "10:00 AM – 4:00 PM" },
  { id: 2, name: "Computer Workstation", category: "Technology", location: "Computer Lab 2", owner: "Computer Science Department", available: true, icon: "💻", description: "A workstation for coding and development.", hours: "9:00 AM – 5:00 PM" },
  { id: 3, name: "Electronics Toolkit", category: "Equipment", location: "Electronics Lab", owner: "Electronics Department", available: true, icon: "🧰", description: "Tools for circuit building and testing.", hours: "11:00 AM – 3:00 PM" },
  { id: 4, name: "Seminar Room", category: "Spaces", location: "Academic Block", owner: "Campus Facilities", available: false, icon: "🏫", description: "A shared space for team meetings.", hours: "Next slot: Tomorrow" },
  { id: 5, name: "DSLR Camera", category: "Media", location: "Media Centre", owner: "Media Department", available: true, icon: "📷", description: "For campus events and project shoots.", hours: "10:00 AM – 2:00 PM" },
  { id: 6, name: "Meeting Room", category: "Spaces", location: "Library, Floor 2", owner: "Library Team", available: true, icon: "🪑", description: "A quiet place for collaborative work.", hours: "1:00 PM – 4:00 PM" },
];

const categories = ["All resources", "Equipment", "Technology", "Spaces", "Media"];

function App() {
  const [resources] = useState(initialResources);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All resources");
  const [selected, setSelected] = useState(null);
  const [requests, setRequests] = useState([]);
  const [notice, setNotice] = useState("");

  const filteredResources = useMemo(() => resources.filter((resource) => {
    const matchesSearch = `${resource.name} ${resource.location} ${resource.description}`
      .toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All resources" || resource.category === category;
    return matchesSearch && matchesCategory;
  }), [resources, search, category]);

  function requestBooking(resource) {
    if (requests.some((request) => request.resourceId === resource.id && request.status === "Pending")) {
      setNotice("You already have a pending request for this resource.");
      setSelected(null);
      return;
    }

    setRequests((previous) => [
      ...previous,
      { id: Date.now(), resourceId: resource.id, name: resource.name, status: "Pending" },
    ]);
    setNotice(`Demo request submitted for ${resource.name}.`);
    setSelected(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <span className="brand-mark">R</span>
          <span>Resource<span className="brand-light">Bridge</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <a className="nav-link active" href="#home">◈ <span>Discover resources</span></a>
        <a className="nav-link" href="#requests">▤ <span>My requests</span></a>
        <a className="nav-link" href="#how-it-works">◎ <span>How it works</span></a>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">✦</div>
            <strong>Share more. Waste less.</strong>
            <p>Make better use of the resources we already have.</p>
          </div>
          <div className="profile-row">
            <div className="avatar">S</div>
            <div><strong>Student workspace</strong><small>Demo account</small></div>
          </div>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Discover</div>
          <div className="topbar-right"><span className="live-dot" /> Campus resources <span className="top-avatar">S</span></div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span /> CAMPUS RESOURCE SHARING</div>
            <h1>Good resources<br />deserve <span>more use.</span></h1>
            <p>Discover equipment and spaces around your campus. Request what you need, when you need it.</p>
            <a className="primary-button" href="#catalogue">Explore resources <span>↘</span></a>
          </div>
          <div className="hero-art" aria-label="Resource sharing illustration">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-card art-card-main"><span>🧪</span><strong>Shared resources</strong><small>Ready for the next idea</small></div>
            <div className="art-card art-card-float"><span>✓</span><div><strong>Less idle time</strong><small>More possibilities</small></div></div>
            <div className="art-symbol">R</div>
          </div>
        </section>

        <section className="stats-row">
          <div className="stat"><span>LISTED RESOURCES</span><strong>{resources.length.toString().padStart(2, "0")}</strong></div>
          <div className="stat"><span>AVAILABLE NOW</span><strong>{resources.filter((r) => r.available).length.toString().padStart(2, "0")}</strong></div>
          <div className="stat"><span>YOUR REQUESTS</span><strong>{requests.length.toString().padStart(2, "0")}</strong></div>
          <div className="stat stat-note"><span>OUR PURPOSE</span><strong>Use what exists.</strong></div>
        </section>

        <section className="catalogue" id="catalogue">
          <div className="section-heading">
            <div><div className="eyebrow">THE CAMPUS CATALOGUE</div><h2>Find your next resource.</h2><p>Explore shared tools, technology, and spaces.</p></div>
            <span className="result-count">{filteredResources.length} results</span>
          </div>

          <div className="search-row">
            <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search equipment, rooms, locations..." /></label>
          </div>

          <div className="category-tabs">
            {categories.map((item) => <button key={item} className={category === item ? "category-tab selected" : "category-tab"} onClick={() => setCategory(item)}>{item}</button>)}
          </div>

          <div className="resource-grid">
            {filteredResources.map((resource) => (
              <article className="resource-card" key={resource.id}>
                <div className={`resource-visual visual-${resource.category.toLowerCase()}`}>
                  <span className="resource-icon">{resource.icon}</span>
                  <span className={resource.available ? "availability available" : "availability unavailable"}><i />{resource.available ? "Available" : "Currently booked"}</span>
                  <span className="resource-number">RB / {String(resource.id).padStart(3, "0")}</span>
                </div>
                <div className="resource-card-body">
                  <div className="resource-category">{resource.category}</div>
                  <h3>{resource.name}</h3>
                  <p>{resource.description}</p>
                  <div className="resource-location"><span>⌖</span>{resource.location}</div>
                  <div className="resource-card-footer"><span>Managed by<br /><strong>{resource.owner}</strong></span><button disabled={!resource.available} onClick={() => setSelected(resource)}>{resource.available ? "View & request ↗" : "Unavailable"}</button></div>
                </div>
              </article>
            ))}
            {filteredResources.length === 0 && <div className="empty-state">No matching resources. Try another search or category.</div>}
          </div>
        </section>

        <section className="requests-section" id="requests">
          <div className="section-heading"><div><div className="eyebrow">YOUR ACTIVITY</div><h2>My booking requests</h2><p>Demo requests created during this session.</p></div></div>
          {requests.length === 0 ? <div className="empty-requests">No requests yet. Choose an available resource above to try the booking flow.</div> : <div className="request-list">{requests.map((request) => <div className="request-row" key={request.id}><div className="request-symbol">↗</div><div className="request-details"><strong>{request.name}</strong><small>Request #{String(request.id).slice(-6)}</small></div><span className="pending-badge">{request.status}</span></div>)}</div>}
        </section>

        <section className="how-section" id="how-it-works">
          <div className="eyebrow">SIMPLE BY DESIGN</div><h2>Sharing, with accountability.</h2>
          <div className="how-grid">
            <div><span>01</span><strong>Discover</strong><p>Find resources and review the conditions for use.</p></div>
            <div><span>02</span><strong>Request</strong><p>Submit a booking for the time you need.</p></div>
            <div><span>03</span><strong>Get approval</strong><p>The resource manager reviews your request.</p></div>
            <div><span>04</span><strong>Return responsibly</strong><p>Record the condition and keep a clear history.</p></div>
          </div>
        </section>

        <footer>RESOURCEBRIDGE <span>Built for a culture of sharing.</span></footer>
      </main>

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}>
        <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close dialog">×</button>
          <div className="modal-resource-icon">{selected.icon}</div>
          <div className="eyebrow">RESOURCE DETAILS</div>
          <h2 id="modal-title">{selected.name}</h2>
          <p>{selected.description}</p>
          <div className="modal-detail"><span>Location</span><strong>{selected.location}</strong></div>
          <div className="modal-detail"><span>Managed by</span><strong>{selected.owner}</strong></div>
          <div className="modal-detail"><span>Listed availability</span><strong>{selected.hours}</strong></div>
          <div className="demo-notice">Demo mode: this request is stored only in your current browser session.</div>
          <button className="primary-button modal-submit" onClick={() => requestBooking(selected)}>Submit booking request ↗</button>
        </section>
      </div>}
    </div>
  );
}

export default App;
