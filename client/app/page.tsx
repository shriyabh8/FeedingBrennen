'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_URL, authenticate, createRestaurant, createVisit, User } from '@/lib/apiClient';
import type { Restaurant, Visit } from '@/lib/types';

type LoadState = 'loading' | 'ready' | 'error';
type SortMode = 'newest' | 'highest';
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`, { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((currentUser) => { setUser(currentUser); setAuthReady(true); })
      .catch(() => setAuthReady(true));
  }, []);

  if (!authReady) return <div className="loading-state"><span className="pulse-dot" />Loading your journal...</div>;
  return user ? <Dashboard user={user} onLogout={() => setUser(null)} /> : <AuthScreen onAuthenticated={() => window.location.reload()} />;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await authenticate(mode, { email, password, ...(mode === 'register' ? { displayName } : {}) });
      onAuthenticated();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); }
    finally { setSaving(false); }
  }

  return <div className="auth-shell">
    <div className="auth-copy"><p className="eyebrow">Your table, your story</p><h2>Good food,<br /><em>well remembered.</em></h2><p>Sign in to keep your restaurants and visits private to you.</p></div>
    <form className="auth-card" onSubmit={submit}>
      <div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button></div>
      <h3>{mode === 'login' ? 'Welcome back' : 'Start your journal'}</h3>
      {mode === 'register' && <label>Name<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Brennen" /></label>}
      <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
      <label>Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 characters minimum" /></label>
      <button className="auth-submit" disabled={saving}>{saving ? 'Working...' : mode === 'login' ? 'Enter journal ->' : 'Create my journal ->'}</button>
      {error && <p role="alert" className="form-error">{error}</p>}
      {mode === 'login' && <p className="auth-hint">Demo account: demo@example.com / demo1234</p>}
    </form>
  </div>;
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountSpent, setAmountSpent] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const [saving, setSaving] = useState(false);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({ name: '', cuisine: '', address: '', rating: '' });

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/restaurants`, { cache: 'no-store' }).then(async (res) => { if (res.status === 401) throw new Error('signed out'); if (!res.ok) throw new Error('Unable to load restaurants'); return res.json(); }),
      fetch(`${API_URL}/api/visits`, { cache: 'no-store' }).then(async (res) => { if (!res.ok) throw new Error('Unable to load visits'); return res.json(); }),
    ]).then(([loadedRestaurants, loadedVisits]) => {
      setRestaurants(loadedRestaurants); setVisits(loadedVisits); setRestaurantId(String(loadedRestaurants[0]?.id || '')); setLoadState('ready');
    }).catch((err) => { if (err.message === 'signed out') onLogout(); else { setError('The journal could not connect to the API.'); setLoadState('error'); } });
  }, [onLogout]);

  const restaurantNames = useMemo(() => new Map(restaurants.map((restaurant) => [restaurant.id, restaurant.name])), [restaurants]);
  const totalSpent = visits.reduce((total, visit) => total + (visit.amountSpent || 0), 0);
  const pricedVisits = visits.filter((visit) => visit.amountSpent !== null);
  const filteredVisits = useMemo(() => {
    const visible = filter === 'all' ? visits : visits.filter((visit) => String(visit.restaurantId) === filter);
    return [...visible].sort((a, b) => sort === 'newest' ? b.date.localeCompare(a.date) : (b.amountSpent || 0) - (a.amountSpent || 0));
  }, [filter, sort, visits]);

  async function addVisit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const visit = await createVisit({ restaurantId: Number(restaurantId), date, amountSpent: amountSpent === '' ? null : Number(amountSpent), notes: notes.trim() || null });
      setVisits((current) => [visit, ...current]); setAmountSpent(''); setNotes(''); setNotice('Visit added to your journal.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to record visit'); } finally { setSaving(false); }
  }

  async function addRestaurant(event: FormEvent | React.MouseEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const restaurant = await createRestaurant({ name: newRestaurant.name, cuisine: newRestaurant.cuisine || null, address: newRestaurant.address || null, rating: newRestaurant.rating === '' ? null : Number(newRestaurant.rating) });
      setRestaurants((current) => [restaurant, ...current]); setRestaurantId(String(restaurant.id)); setNewRestaurant({ name: '', cuisine: '', address: '', rating: '' }); setShowRestaurantForm(false); setNotice(`${restaurant.name} added to your restaurants.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to add restaurant'); } finally { setSaving(false); }
  }

  async function logout() { await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' }); onLogout(); }
  if (loadState === 'loading') return <div className="loading-state"><span className="pulse-dot" />Loading your journal...</div>;
  if (loadState === 'error') return <p className="error-state">{error}</p>;

  return <div className="dashboard">
    <section className="hero-block"><div><p className="eyebrow">{user.displayName}&apos;s table / 2026</p><h2>Good food,<br /><em>well remembered.</em></h2><p className="hero-copy">A private record of the places worth returning to, and the receipts worth keeping.</p></div><div className="hero-actions"><span className="user-chip">{user.email}</span><button onClick={logout}>Sign out</button><div className="hero-mark" aria-hidden="true"><span>FB</span><i /></div></div></section>
    <section className="stats-grid" aria-label="Ledger summary"><div className="stat-card stat-card-accent"><span>Total tracked</span><strong>{money.format(totalSpent)}</strong><small>Across {visits.length} {visits.length === 1 ? 'visit' : 'visits'}</small></div><div className="stat-card"><span>Average receipt</span><strong>{money.format(pricedVisits.length ? totalSpent / pricedVisits.length : 0)}</strong><small>For visits with an amount</small></div><div className="stat-card"><span>Restaurant list</span><strong>{restaurants.length}</strong><small>Saved to your account</small></div></section>
    <section className="workspace-grid"><form onSubmit={addVisit} className="entry-panel"><div className="panel-heading"><div className="panel-icon">+</div><div><p className="eyebrow">New entry</p><h3>Record a visit</h3></div></div><p className="panel-intro">Capture the essentials now. Add the story while it is still fresh.</p><div className="form-fields"><label>Restaurant<select required value={restaurantId} onChange={(event) => setRestaurantId(event.target.value)}><option value="" disabled>Select a restaurant</option>{restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}</select></label><button type="button" className="add-restaurant-link" onClick={() => setShowRestaurantForm((current) => !current)}>+ Add a restaurant not listed</button>{showRestaurantForm && <div className="nested-form"><label>Name<input required value={newRestaurant.name} onChange={(event) => setNewRestaurant({ ...newRestaurant, name: event.target.value })} placeholder="Restaurant name" /></label><label>Cuisine<input value={newRestaurant.cuisine} onChange={(event) => setNewRestaurant({ ...newRestaurant, cuisine: event.target.value })} placeholder="Cuisine" /></label><label>Address<input value={newRestaurant.address} onChange={(event) => setNewRestaurant({ ...newRestaurant, address: event.target.value })} placeholder="Address" /></label><label>Rating<input type="number" min="0" max="5" step="0.1" value={newRestaurant.rating} onChange={(event) => setNewRestaurant({ ...newRestaurant, rating: event.target.value })} placeholder="0 - 5" /></label><button type="button" className="small-submit" onClick={(event) => addRestaurant(event)}>Save restaurant</button></div>}<div className="field-row"><label>Date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Amount<input type="number" min="0" step="0.01" value={amountSpent} onChange={(event) => setAmountSpent(event.target.value)} placeholder="0.00" /></label></div><label>Note <span className="optional">optional</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="A dish, a mood, a reason to return..." /></label><button type="submit" disabled={saving || !restaurantId}>{saving ? 'Saving entry...' : 'Save to journal'} <span aria-hidden="true">-&gt;</span></button>{error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status" className="form-success">{notice}</p>}</div></form>
    <section className="visits-panel"><div className="section-heading"><div><p className="eyebrow">The archive</p><h3>Recent visits <span>{visits.length}</span></h3></div><span className="live-indicator"><i />Private</span></div><div className="toolbar"><select aria-label="Filter by restaurant" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All restaurants</option>{restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}</select><select aria-label="Sort visits" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="newest">Newest first</option><option value="highest">Highest spend</option></select></div>{filteredVisits.length === 0 ? <p className="empty-state">No visits match this filter.</p> : <ul className="visit-list">{filteredVisits.map((visit, index) => <li key={visit.id} className="visit-row" style={{ '--row-delay': `${index * 60}ms` } as React.CSSProperties}><div className="date-badge"><strong>{new Date(`${visit.date}T12:00:00`).toLocaleDateString('en-US', { day: '2-digit' })}</strong><span>{new Date(`${visit.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' })}</span></div><div className="visit-detail"><strong>{restaurantNames.get(visit.restaurantId) || 'Unknown restaurant'}</strong><span>{visit.notes || 'No note added'}</span></div><strong className="visit-amount">{visit.amountSpent === null ? '--' : money.format(visit.amountSpent)}</strong></li>)}</ul>}</section></section>
  </div>;
}
