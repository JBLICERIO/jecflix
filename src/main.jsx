import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import Hls from "hls.js";
import {
  Search, Play, Plus, Trash2, Pencil, X, LogOut, Film, Tv,
  Bookmark, Settings, ChevronDown, Info, Menu, ExternalLink
} from "lucide-react";
import "./styles.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const demoTitles = [
  {
    id: "demo-1", title: "The Grand Adventure", type: "Movie", year: 2025,
    genre: "Adventure", description: "A sample title to help you preview the Jecflix experience. Replace it with a video you are authorized to share.",
    poster_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600",
    backdrop_url: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600",
    source_type: "youtube", source_url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    featured: true, created_at: new Date().toISOString()
  },
  {
    id: "demo-2", title: "Beyond the Horizon", type: "Movie", year: 2024,
    genre: "Drama", description: "A second sample card. Add your own library through the administrator dashboard after connecting Supabase.",
    poster_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600",
    backdrop_url: "", source_type: "youtube", source_url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    featured: false, created_at: new Date().toISOString()
  },
  {
    id: "demo-3", title: "Little Big Worlds", type: "Series", year: 2025,
    genre: "Family", description: "A sample family-friendly collection entry.",
    poster_url: "https://images.unsplash.com/photo-1440404653325-ab127d49 ABC?auto=format&w=600".replace(" ABC",""),
    backdrop_url: "", source_type: "youtube", source_url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    featured: false, created_at: new Date().toISOString()
  },
  {
    id: "demo-4", title: "Night at the Museum", type: "Movie", year: 2023,
    genre: "Comedy", description: "Sample content for layout preview only.",
    poster_url: "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=600",
    backdrop_url: "", source_type: "youtube", source_url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    featured: false, created_at: new Date().toISOString()
  }
];

const emptyForm = {
  title: "", type: "Movie", year: new Date().getFullYear(), genre: "",
  description: "", poster_url: "", backdrop_url: "", source_type: "youtube",
  source_url: "", featured: false
};

function youtubeId(url = "") {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2];
      return u.searchParams.get("v");
    }
  } catch {}
  return null;
}
function sourceLabel(type) {
  return ({ youtube: "YouTube", mp4: "Direct video", hls: "HLS stream", embed: "External embed", magnet: "Magnet link" })[type] || type;
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [titles, setTitles] = useState(demoTitles);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(!!supabase);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Home");
  const [selected, setSelected] = useState(null);
  const [playerTitle, setPlayerTitle] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [watchlist, setWatchlist] = useState(() => JSON.parse(localStorage.getItem("jecflix-watchlist") || "[]"));
  const [progress, setProgress] = useState(() => JSON.parse(localStorage.getItem("jecflix-progress") || "{}"));

  const isAdmin = profile?.role === "admin";
  const isDemo = !supabase;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) { setProfile(null); return; }
    supabase.from("profiles").select("id, display_name, role").eq("id", session.user.id).single()
      .then(({ data }) => setProfile(data || { role: "family" }));
  }, [session]);

  useEffect(() => {
    if (!supabase || !session) return;
    loadTitles();
  }, [session]);

  async function loadTitles() {
    setLoading(true);
    const { data, error } = await supabase.from("titles").select("*").order("created_at", { ascending: false });
    if (!error) setTitles(data || []);
    else setAuthMessage(error.message);
    setLoading(false);
  }

  async function handleAuth(e) {
    e.preventDefault(); setAuthMessage("");
    if (!supabase) return;
    const result = authMode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setAuthMessage(result.error.message);
    else if (authMode === "signup") setAuthMessage("Account created. If email confirmation is enabled, check your inbox.");
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setProfile(null);
  }

  function toggleWatch(id) {
    const next = watchlist.includes(id) ? watchlist.filter(x => x !== id) : [...watchlist, id];
    setWatchlist(next); localStorage.setItem("jecflix-watchlist", JSON.stringify(next));
  }

  function playTitle(item) {
    if (item.source_type === "magnet") {
      window.location.href = item.source_url;
      return;
    }
    setPlayerTitle(item);
    setSelected(null);
  }

  async function saveTitle(e) {
    e.preventDefault();
    if (!supabase || !isAdmin) return;
    const payload = { ...form, year: Number(form.year), updated_at: new Date().toISOString() };
    const result = editing
      ? await supabase.from("titles").update(payload).eq("id", editing)
      : await supabase.from("titles").insert(payload);
    if (result.error) { alert(result.error.message); return; }
    setShowAdmin(false); setEditing(null); setForm(emptyForm); loadTitles();
  }

  async function deleteTitle(id) {
    if (!supabase || !isAdmin || !confirm("Remove this title from Jecflix?")) return;
    const { error } = await supabase.from("titles").delete().eq("id", id);
    if (error) alert(error.message); else loadTitles();
  }

  function editTitle(item) {
    setEditing(item.id);
    setForm({ ...emptyForm, ...item });
    setShowAdmin(true);
  }

  const visibleTitles = useMemo(() => {
    let list = titles;
    if (activeTab === "Movies") list = list.filter(x => x.type === "Movie");
    if (activeTab === "Series") list = list.filter(x => x.type === "Series");
    if (activeTab === "My List") list = list.filter(x => watchlist.includes(x.id));
    if (query.trim()) list = list.filter(x => `${x.title} ${x.genre} ${x.type}`.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [titles, activeTab, query, watchlist]);

  const featured = titles.find(x => x.featured) || titles[0];

  if (configured && !session) {
    return <AuthScreen {...{ email, setEmail, password, setPassword, authMode, setAuthMode, handleAuth, authMessage }} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-toggle icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu"><Menu /></button>
        <a className="brand" href="#" onClick={() => setActiveTab("Home")}>JEC<span>FLIX</span></a>
        <nav className={mobileMenu ? "nav open" : "nav"}>
          {["Home", "Movies", "Series", "My List"].map(tab =>
            <button key={tab} className={activeTab === tab ? "nav-link active" : "nav-link"} onClick={() => {setActiveTab(tab);setMobileMenu(false);}}>{tab}</button>
          )}
        </nav>
        <div className="top-actions">
          <div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles..." /></div>
          {isAdmin && <button className="admin-shortcut" onClick={() => {setEditing(null);setForm(emptyForm);setShowAdmin(true);}}><Plus size={16}/> Add title</button>}
          {configured && <button className="icon-button" title="Sign out" onClick={signOut}><LogOut size={18}/></button>}
        </div>
      </header>

      {isDemo && <div className="demo-banner"><Info size={15}/> Preview mode. Connect Supabase to enable family sign-in and secure admin controls.</div>}

      {activeTab === "Home" && featured && !query && (
        <section className="hero" style={{backgroundImage:`linear-gradient(90deg, #090909 0%, rgba(9,9,9,.88) 35%, rgba(9,9,9,.15) 100%), linear-gradient(0deg,#090909 0%,transparent 50%), url("${featured.backdrop_url || featured.poster_url}")`}}>
          <div className="hero-content">
            <div className="eyebrow">JECFLIX ORIGINAL COLLECTION</div>
            <h1>{featured.title}</h1>
            <div className="meta"><span>{featured.year}</span><span className="rating">FAMILY LIBRARY</span><span>{featured.genre}</span></div>
            <p>{featured.description}</p>
            <div className="hero-buttons">
              <button className="primary-button" onClick={() => playTitle(featured)}><Play fill="currentColor" size={19}/> Play</button>
              <button className="secondary-button" onClick={() => setSelected(featured)}><Info size={19}/> More Info</button>
            </div>
          </div>
        </section>
      )}

      <main className="content">
        <div className="section-heading"><div><h2>{query ? "Search results" : activeTab === "Home" ? "Explore your library" : activeTab}</h2><p>{visibleTitles.length} titles in your collection</p></div>{loading && <span className="muted">Loading…</span>}</div>
        {visibleTitles.length === 0 ? <div className="empty-state"><Film size={36}/><h3>No titles found</h3><p>Add something to your library or try another search.</p></div> :
          <div className="poster-grid">
            {visibleTitles.map(item => <article className="poster-card" key={item.id}>
              <button className="poster-button" onClick={() => setSelected(item)}>
                <img src={item.poster_url || "https://placehold.co/400x600/171717/eeeeee?text=JECFLIX"} alt="" loading="lazy"/>
                <span className="poster-hover"><Play fill="currentColor" size={25}/></span>
              </button>
              <div className="poster-info"><div><strong>{item.title}</strong><small>{item.year} · {item.genre || item.type}</small></div>
                {isAdmin && <div className="card-admin"><button title="Edit" onClick={() => editTitle(item)}><Pencil size={14}/></button><button title="Delete" onClick={() => deleteTitle(item.id)}><Trash2 size={14}/></button></div>}
              </div>
            </article>)}
          </div>
        }
        {isDemo && <div className="setup-note"><strong>Next step:</strong> Connect your Supabase project using the setup guide included in this package. Demo titles are placeholders, not a real video library.</div>}
      </main>

      <footer><span className="brand small">JEC<span>FLIX</span></span><span>Made for movie nights at home.</span><span>Private family library</span></footer>

      {selected && <div className="overlay" onClick={() => setSelected(null)}><div className="detail-modal" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={() => setSelected(null)}><X/></button>
        <div className="detail-backdrop" style={{backgroundImage:`linear-gradient(0deg,#171717,transparent 80%),url("${selected.backdrop_url || selected.poster_url}")`}}/>
        <div className="detail-body"><div className="eyebrow">{selected.type} · {selected.genre}</div><h2>{selected.title}</h2><div className="meta">{selected.year} <span>•</span> {sourceLabel(selected.source_type)}</div><p>{selected.description}</p>
          <div className="hero-buttons"><button className="primary-button" onClick={() => playTitle(selected)}><Play fill="currentColor" size={18}/> {selected.source_type === "magnet" ? "Open magnet" : "Play"}</button><button className="secondary-button" onClick={() => toggleWatch(selected.id)}><Bookmark size={17}/> {watchlist.includes(selected.id) ? "Remove from My List" : "My List"}</button></div>
        </div>
      </div></div>}

      {playerTitle && <VideoPlayer item={playerTitle} onClose={() => setPlayerTitle(null)} />}
      {showAdmin && <div className="overlay" onClick={() => setShowAdmin(false)}><div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div><div className="eyebrow">ADMINISTRATION</div><h2>{editing ? "Edit title" : "Add to Jecflix"}</h2></div><button className="close-button" onClick={() => setShowAdmin(false)}><X/></button></div>
        {!isAdmin || !supabase ? <p>Admin tools become available after Supabase is connected and your account is assigned the admin role.</p> :
        <form className="admin-form" onSubmit={saveTitle}>
          <label>Title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
          <div className="form-row"><label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Movie</option><option>Series</option></select></label><label>Year<input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label></div>
          <label>Genre<input value={form.genre} onChange={e=>setForm({...form,genre:e.target.value})} placeholder="Action, Family, Anime..."/></label>
          <label>Description<textarea rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
          <label>Poster image URL<input value={form.poster_url} onChange={e=>setForm({...form,poster_url:e.target.value})} placeholder="https://..."/></label>
          <label>Backdrop image URL<input value={form.backdrop_url} onChange={e=>setForm({...form,backdrop_url:e.target.value})} placeholder="https://..."/></label>
          <label>Video source<select value={form.source_type} onChange={e=>setForm({...form,source_type:e.target.value})}><option value="youtube">YouTube</option><option value="mp4">Direct MP4 / WebM</option><option value="hls">HLS (.m3u8)</option><option value="embed">External embed URL</option><option value="magnet">Magnet link</option></select></label>
          <label>Source URL<input required value={form.source_url} onChange={e=>setForm({...form,source_url:e.target.value})} placeholder="Paste authorized video URL or magnet link"/></label>
          <label className="check-label"><input type="checkbox" checked={form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/> Feature on homepage</label>
          <button className="primary-button full" type="submit">{editing ? "Save changes" : "Add title"}</button>
        </form>}
      </div></div>}
    </div>
  );
}

function AuthScreen({email,setEmail,password,setPassword,authMode,setAuthMode,handleAuth,authMessage}) {
  return <div className="auth-screen"><div className="auth-card"><a className="brand" href="#">JEC<span>FLIX</span></a><h1>{authMode === "login" ? "Welcome back." : "Join your family library."}</h1><p>Sign in to continue watching.</p>
    <form onSubmit={handleAuth}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary-button full">{authMode === "login" ? "Sign in" : "Create account"}</button></form>
    {authMessage && <p className="auth-message">{authMessage}</p>}
    <p className="switch-auth">{authMode === "login" ? "New family member?" : "Already have an account?"} <button onClick={()=>setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Request an account" : "Sign in"}</button></p>
    <small>Family access is controlled by the Jecflix administrator.</small>
  </div></div>;
}

function VideoPlayer({item,onClose}) {
  const videoRef = useRef(null);
  const yt = youtubeId(item.source_url);
  useEffect(() => {
    if (!videoRef.current || item.source_type !== "hls" || !item.source_url) return;
    const video = videoRef.current;
    let hls;
    if (video.canPlayType("application/vnd.apple.mpegurl")) video.src = item.source_url;
    else if (Hls.isSupported()) { hls = new Hls(); hls.loadSource(item.source_url); hls.attachMedia(video); }
    return () => hls?.destroy();
  }, [item]);
  return <div className="player-overlay"><div className="player-top"><strong>{item.title}</strong><button className="close-button" onClick={onClose}><X/></button></div>
    <div className="player-stage">
      {item.source_type === "youtube" && yt ? <iframe src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`} title={item.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/> :
      (item.source_type === "mp4" || item.source_type === "hls") ? <video ref={videoRef} src={item.source_type === "mp4" ? item.source_url : undefined} controls autoPlay playsInline/> :
      item.source_type === "embed" ? <iframe src={item.source_url} title={item.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen/> :
      <div className="unsupported"><Info/><h2>Open this video source</h2><p>This source uses an external player or torrent client.</p><a className="primary-button" href={item.source_url} target="_blank" rel="noreferrer">Open source <ExternalLink size={16}/></a></div>}
    </div>
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);
