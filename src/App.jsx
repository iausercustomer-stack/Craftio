import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Package, Plus, Search, X, IndianRupee, Mic, Camera, Heart, LogIn, LogOut, Trash2, Leaf, Check, Save, ImagePlus } from 'lucide-react';
import { supabase, setupError } from './supabase';
import { money, readDemoProducts, saveDemoProducts, getPrice, readPhoto, preparePhoto } from './helpers';

const crafts = ['Textile', 'Pottery', 'Jewellery', 'Woodwork', 'Metal craft', 'Painting', 'Basketry', 'Other'];

export default function App() {
  const demo = !supabase;
  const [page, setPage] = useState('overview');
  const [products, setProducts] = useState(() => demo ? readDemoProducts() : []);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!demo);
  const [notice, setNotice] = useState(setupError ? { text: setupError, error: true } : null);
  const [showAuth, setShowAuth] = useState(false);
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const notify = (text, error = false) => setNotice({ text, error });
  const name = profile?.full_name || user?.user_metadata?.full_name || 'Artisan';

  // Keep the auth callback small. Database reads run separately after user changes.
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) notify(error.message, true);
      setUser(data.session?.user || null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setUser(session?.user || null);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (!user) { setProducts([]); setProfile(null); return; }
    let alive = true;
    setLoading(true);
    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('products').select('*').eq('artisan_id', user.id).order('created_at', { ascending: false }),
    ]).then(([profileResult, productResult]) => {
      if (!alive) return;
      setLoading(false);
      if (profileResult.error || productResult.error) {
        notify((profileResult.error || productResult.error).message + ' Check the SQL setup in README.md.', true);
        return;
      }
      setProfile(profileResult.data);
      setProducts(productResult.data || []);
    }).catch((error) => { if (alive) { setLoading(false); notify(error.message, true); } });
    return () => { alive = false; };
  }, [user, dataVersion]);

  async function saveProduct(product) {
    if (demo) {
      const next = [{ ...product, id: crypto.randomUUID(), created_at: new Date().toISOString() }, ...products];
      saveDemoProducts(next);
      setProducts(next);
    } else {
      if (!user) throw new Error('Please sign in before saving a product to your cloud catalog.');
      let imageUrl = '';
      let imagePath = '';
      if (product.image_url) {
        imagePath = `${user.id}/${crypto.randomUUID()}.jpg`;
        const blob = await (await fetch(product.image_url)).blob();
        const { error } = await supabase.storage.from('product-images').upload(imagePath, blob, { contentType: 'image/jpeg' });
        if (error) throw new Error('Photo upload failed: ' + error.message);
        imageUrl = supabase.storage.from('product-images').getPublicUrl(imagePath).data.publicUrl;
      }
      const { data, error } = await supabase.from('products').insert({
        ...product, image_url: imageUrl, image_path: imagePath, artisan_id: user.id,
      }).select().single();
      if (error) {
        if (imagePath) await supabase.storage.from('product-images').remove([imagePath]);
        throw new Error('Could not save your listing: ' + error.message);
      }
      setProducts((current) => [data, ...current]);
    }
    setSearch('');
    setPage('catalog');
    notify(demo ? 'Product saved on this browser, including your photo and story.' : 'Product saved to your cloud catalog.');
  }

  async function removeProduct() {
    setDeleteBusy(true);
    try {
      if (!demo) {
        const { error } = await supabase.from('products').delete().eq('id', removing.id).eq('artisan_id', user.id);
        if (error) throw error;
        if (removing.image_path) {
          const { error: imageError } = await supabase.storage.from('product-images').remove([removing.image_path]);
          if (imageError) notify('Listing removed, but its stored photo could not be removed. ' + imageError.message, true);
        }
      }
      const next = products.filter((item) => item.id !== removing.id);
      if (demo) saveDemoProducts(next);
      setProducts(next);
      setRemoving(null);
    } catch (error) { notify(error.message, true); }
    finally { setDeleteBusy(false); }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message, true);
    else { setPage('overview'); notify('You have signed out.'); }
  }

  const average = products.length ? products.reduce((sum, item) => sum + Number(item.price), 0) / products.length : 0;
  const visibleProducts = page === 'overview' ? products.slice(0, 3) : products.filter((item) =>
    `${item.title} ${item.category} ${item.description} ${item.hindi_description || ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('overview'); }}>
          <img src="/logo.jpeg" alt="" />
          <span>Kala<span className="brand-accent">Nidhi</span><small>ARTISAN STUDIO</small></span>
        </a>
        <p className="nav-label">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          <button className={`nav-item ${page === 'overview' ? 'active' : ''}`} onClick={() => setPage('overview')}><LayoutDashboard size={20} />Overview <small>होम</small></button>
          <button className={`nav-item ${page === 'catalog' ? 'active' : ''}`} onClick={() => setPage('catalog')}><Package size={20} />My catalog <span className="nav-count">{products.length}</span></button>
          <button className={`nav-item ${page === 'add' ? 'active' : ''}`} onClick={() => setPage('add')}><Plus size={20} />Add a product</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><Heart size={22} /><h3>Your craft matters.</h3><p>Share the story behind every handmade piece.</p><span>Made with care in India</span></div>
          <div className="account-row"><div className="avatar">{name.charAt(0).toUpperCase()}</div><div><b>{name}</b><small>{demo ? 'Demo artisan' : user ? 'Artisan account' : 'Not signed in'}</small></div></div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span className="crumb">My workspace / <b>{page === 'overview' ? 'Overview' : page === 'catalog' ? 'My catalog' : 'Add a product'}</b></span>
          <span className={`mode-chip ${demo ? 'demo' : ''}`}>{demo ? 'Demo mode' : user ? 'Cloud catalog' : 'Cloud sign-in'}</span>
          {demo ? <span className="local-note">Saved on this browser</span> : <button className="small-button" onClick={user ? signOut : () => setShowAuth(true)}>{user ? <LogOut size={16} /> : <LogIn size={16} />}{user ? 'Sign out' : 'Sign in'}</button>}
        </header>
        <div className="content">
          {notice && <div className={`notice ${notice.error ? 'error' : ''}`} role={notice.error ? 'alert' : 'status'}><span>{notice.text}</span><button aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={18} /></button></div>}
          {!demo && !user && <div className="signin-callout"><div><b>Welcome to your artisan studio.</b><p>Sign in or create an account to save products to your cloud catalog.</p></div><button className="primary-btn" onClick={() => setShowAuth(true)}><LogIn size={18} /> Sign in / Sign up</button></div>}
          {page === 'add' ? <AddProduct name={name} onSave={saveProduct} canSave={demo || !!user} onSignIn={() => setShowAuth(true)} /> : <>
            <div className="page-heading"><div><p className="eyebrow">{page === 'overview' ? 'YOUR CREATIVE SPACE' : 'YOUR WORK, BEAUTIFULLY PRESENTED'}</p><h1>{page === 'overview' ? `Namaste, ${name}` : 'My catalog'}{page === 'overview' && <span className="greeting-mark"> ✦</span>}</h1><p>{page === 'overview' ? 'A little care. A good photo. A story only you can tell.' : 'Every handmade piece you’ve shared, in one place.'}</p></div><button className="primary-btn" onClick={() => setPage('add')}><Plus size={19} />Add a product</button></div>
            {page === 'overview' && <>
              <section className="stat-grid" aria-label="Catalog summary"><div className="stat-card"><span className="stat-icon"><Package size={23} /></span><div><p>Products listed</p><strong>{products.length}</strong></div></div><div className="stat-card"><span className="stat-icon green"><IndianRupee size={23} /></span><div><p>Average product price</p><strong>{products.length ? money(average) : '—'}</strong></div></div></section>
              <section className="story-banner"><div><span className="eyebrow">YOUR DIGITAL DUKAAN</span><h2>Handmade by you.<br /><em>Ready for the world.</em></h2><p>Turn a photo and your own words into a listing that keeps your craft’s story alive.</p><button className="secondary-btn" onClick={() => setPage('add')}><Camera size={18} />Create a listing · बनाएं</button></div><div className="craft-note"><Leaf size={29} /><span>Roots in tradition.<br />Room to grow.</span></div></section>
              <div className="section-heading"><h2>Recently added</h2><button className="text-button" onClick={() => setPage('catalog')}>View all products</button></div>
            </>}
            {page === 'catalog' && <div className="catalog-toolbar"><label className="search-box"><Search size={20} /><input aria-label="Search products" placeholder="Search by name, story, or craft" value={search} onChange={(event) => setSearch(event.target.value)} /></label><span>{visibleProducts.length} {visibleProducts.length === 1 ? 'piece' : 'pieces'}</span></div>}
            {loading ? <p className="loading" role="status">Loading your catalog…</p> : visibleProducts.length ? <div className="product-grid">{visibleProducts.map((item) => <ProductCard key={item.id} item={item} onRemove={() => setRemoving(item)} />)}</div> : <div className="empty-state"><Package size={36} /><h2>{search ? 'No matching pieces' : 'Your catalog is waiting'}</h2><p>{search ? 'Try a different name or craft.' : 'Add a photo, tell your story, and share your first piece.'}</p>{!search && <button className="primary-btn" onClick={() => setPage('add')}><Plus size={18} />Add your first product</button>}</div>}
            {page === 'overview' && <div className="tip-banner"><Camera size={24} /><div><b>A small tip for a lovely listing</b><p>Take your photo near a window. Natural light helps buyers see the texture and details.</p></div></div>}
          </>}
          <footer><span>✦ Kala Nidhi</span><span>SIH 2026 · SIH26090</span></footer>
        </div>
      </main>
      {showAuth && <AuthDialog onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); setDataVersion((value) => value + 1); notify('Welcome! Your artisan account is ready.'); }} />}
      {removing && <div className="modal-backdrop"><section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="remove-title"><h2 id="remove-title">Remove this product?</h2><p>“{removing.title}” will be removed from {demo ? 'this browser’s catalog' : 'your catalog'}. This cannot be undone.</p><div className="dialog-actions"><button className="secondary-btn" disabled={deleteBusy} onClick={() => setRemoving(null)}>Keep product</button><button className="danger-btn" disabled={deleteBusy} onClick={removeProduct}>{deleteBusy ? 'Removing…' : 'Remove product'}</button></div></section></div>}
    </div>
  );
}

function ProductCard({ item, onRemove }) {
  const [imageFailed, setImageFailed] = useState(false);
  return <article className="product-card">
    <div className="product-image">{item.image_url && !imageFailed ? <img src={item.image_url} alt={item.title} onError={() => setImageFailed(true)} /> : <div className="no-photo"><ImagePlus size={32} /><span>No photo added</span></div>}<span className="category-tag">{item.category}</span></div>
    <div className="product-details"><h3>{item.title}</h3><p>{item.description}</p>{item.hindi_description && <details className="hindi-story"><summary>हिन्दी विवरण</summary><p lang="hi">{item.hindi_description}</p></details>}<div className="product-meta"><strong>{money(item.price)}</strong><button className="remove-button" aria-label={`Remove ${item.title}`} onClick={onRemove}><Trash2 size={16} />Remove</button></div></div>
  </article>;
}

function AddProduct({ name, onSave, canSave, onSignIn }) {
  const [form, setForm] = useState({ title: '', category: 'Textile', description: '', hindi: '', material: '', hours: '', rate: '150', packaging: '', finalPrice: '' });
  const [photo, setPhoto] = useState('');
  const [brightness, setBrightness] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  const speech = useRef(null);
  const speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const price = getPrice(form.material, form.hours, form.rate, form.packaging);
  const chosenPrice = form.finalPrice === '' ? Math.round((price.low + price.high) / 2) : Number(form.finalPrice);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => () => speech.current?.abort(), []);

  async function choosePhoto(file) {
    if (!file) return;
    try { setPhoto(await readPhoto(file)); setBrightness(100); setError(''); }
    catch (problem) { setError(problem.message); }
  }

  function voiceInput() {
    if (listening) { speech.current?.stop(); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    speech.current = recognition;
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.onstart = () => { setListening(true); setSpeechMessage('Listening in Hindi. Tell us about your craft.'); };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const words = event.results[0][0].transcript;
      setForm((current) => ({ ...current, hindi: [current.hindi, words].filter(Boolean).join(' ') }));
      setSpeechMessage('Hindi text added below. Please review and edit it before saving.');
    };
    recognition.onerror = (event) => setSpeechMessage(event.error === 'not-allowed' ? 'Microphone permission was denied. You can type the Hindi text instead.' : 'We could not hear clearly. Try again, or type your Hindi text.');
    try { recognition.start(); } catch { setSpeechMessage('Voice input could not start. Try again or type your text.'); }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!canSave) { onSignIn(); return; }
    setBusy(true);
    try {
      if (!form.title.trim() || !form.description.trim()) throw new Error('Please add a product name and English story.');
      if (!Number.isFinite(chosenPrice) || chosenPrice <= 0) throw new Error('Choose a final selling price above ₹0.');
      const adjustedPhoto = await preparePhoto(photo, brightness);
      await onSave({ title: form.title.trim(), category: form.category, description: form.description.trim(), hindi_description: form.hindi.trim(), price: chosenPrice, image_url: adjustedPhoto });
    } catch (problem) { setError(problem.message || 'Your product could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">A FEW SIMPLE DETAILS</p><h1>Let’s list your craft <span className="greeting-mark">✦</span></h1><p>A photo, a story, and a price that feels right.</p></div></div>
    <form className="form-layout" onSubmit={submit}>
      <div className="form-main">
        <section className="form-card"><div className="form-title"><span>01</span><div><h2>Show your creation</h2><p>A bright, clear photo helps your craft shine.</p></div></div>
          <label className={`upload-box ${photo ? 'with-photo' : ''}`}>
            {photo ? <img src={photo} alt="Your selected product photo" style={{ filter: `brightness(${brightness}%)` }} /> : <><Camera size={30} /><b>Add a product photo</b><span>JPG, PNG, or WebP · Up to 8 MB</span></>}
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Product photo" onChange={(event) => choosePhoto(event.target.files?.[0])} />
          </label>
          {photo && <><div className="photo-tools"><label>Brightness: {brightness}%<input aria-label="Photo brightness" type="range" min="70" max="140" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /></label><button type="button" className="text-button" onClick={() => { setPhoto(''); setBrightness(100); }}>Remove photo</button></div><p className="help-text">Basic brightness adjustment. The saved photo includes this adjustment.</p></>}
        </section>
        <section className="form-card"><div className="form-title"><span>02</span><div><h2>Tell your story</h2><p>Your materials, your process, your tradition.</p></div></div>
          <label>Product name <span className="required">*</span><input required maxLength={100} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Marigold block-printed dupatta" /></label>
          <label>Craft category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{crafts.map((craft) => <option key={craft}>{craft}</option>)}</select></label>
          <label>English description & story <span className="required">*</span><textarea required maxLength={2000} rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="What is it made from? Who taught you this craft? What makes this piece special?" /></label>
          <div className="voice-heading"><h3>Hindi story · हिन्दी विवरण</h3><button type="button" className={`voice-btn ${listening ? 'listening' : ''}`} disabled={!speechSupported} onClick={voiceInput}><Mic size={18} />{listening ? 'Stop recording' : 'Speak in Hindi'}</button></div>
          <label className="sr-only" htmlFor="hindi">Hindi description</label><textarea id="hindi" lang="hi" maxLength={2000} rows={3} value={form.hindi} onChange={(event) => update('hindi', event.target.value)} placeholder="अपनी कला और कहानी के बारे में बताएं…" />
          <p className="help-text" role="status">{speechMessage || (speechSupported ? 'Voice input adds editable Hindi text. English and Hindi are saved separately; no automatic translation is applied.' : 'Voice input is not supported in this browser. Type Hindi here, or try Chrome with microphone access.')}</p>
        </section>
        <section className="form-card"><div className="form-title"><span>03</span><div><h2>Choose a fair price</h2><p>Your time and skill have value.</p></div></div>
          <div className="cost-grid">{[['material', 'Materials cost (₹)'], ['hours', 'Hours of work'], ['rate', 'Hourly rate (₹)'], ['packaging', 'Packing & other costs (₹)']].map(([key, label]) => <label key={key}>{label}<input type="number" min="0" max="1000000" step={key === 'hours' ? '0.5' : '1'} value={form[key]} onChange={(event) => update(key, event.target.value)} placeholder="0" /></label>)}</div>
          <div className="price-suggestion"><IndianRupee size={23} /><div><b>Starting price range</b><strong>{price.cost ? `${money(price.low)} – ${money(price.high)}` : 'Add your costs above'}</strong></div></div>
          <p className="help-text">Your cost = materials + (hours × hourly rate) + packing. Estimated cost: <b>{money(price.cost)}</b>. The range adds 20–50% to that cost. It is a starting guide, not a live market comparison or guaranteed valuation.</p>
          <label>Final selling price (₹) <span className="required">*</span><input aria-label="Final selling price" required type="number" min="1" step="1" value={form.finalPrice === '' ? (price.cost ? chosenPrice : '') : form.finalPrice} onChange={(event) => update('finalPrice', event.target.value)} placeholder="Choose your price" /></label>
          <button type="button" className="text-button" onClick={() => update('finalPrice', '')}>Use the middle of the suggested range</button>
        </section>
        {error && <div className="notice error" role="alert">{error}</div>}
      </div>
      <aside className="form-side"><section className="preview-card" aria-label="Live listing preview"><div className="preview-label"><span className="live-dot" />LISTING PREVIEW</div><div className="preview-image">{photo ? <img src={photo} alt="Listing preview" style={{ filter: `brightness(${brightness}%)` }} /> : <div className="no-photo"><ImagePlus size={30} /><span>Your photo will appear here</span></div>}</div><div className="preview-info"><span className="craft-label">{form.category}</span><h2>{form.title || 'Your product name'}</h2><p>{form.description || 'Tell buyers about your materials, your tradition, and the care behind this piece.'}</p>{form.hindi && <p lang="hi">{form.hindi}</p>}<strong className="preview-price">{chosenPrice ? money(chosenPrice) : '₹ —'}</strong><div className="artisan-byline"><span className="mini-avatar">{name.charAt(0).toUpperCase()}</span>Handmade by {name}</div></div></section><div className="side-note"><Leaf size={23} /><p><b>Rooted in tradition</b><br />Your cultural story belongs with your craft.</p></div><button type="submit" className="primary-btn submit-btn" disabled={busy}><Save size={19} />{busy ? 'Saving your product…' : canSave ? 'Save to my catalog' : 'Sign in to save'}</button></aside>
    </form>
  </>;
}

function AuthDialog({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', craft: '', location: '' });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const focusRef = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    focusRef.current?.focus();
    const escape = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const elements = [...focusRef.current.querySelectorAll('button,input')].filter((element) => !element.disabled);
        if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0].focus(); }
      }
    };
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('keydown', escape); before?.focus(); };
  }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setIsError(false);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { data: { full_name: form.name.trim(), role: 'artisan', specialty: form.craft.trim(), location: form.location.trim() } } });
        if (error) throw error;
        if (data.session) onSuccess();
        else { setMessage('Account request received. Check your email to confirm your account, then sign in.'); setMode('login'); }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
        onSuccess();
      }
    } catch (error) { setIsError(true); setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog auth-dialog" ref={focusRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" aria-label="Close sign-in dialog" onClick={onClose}><X size={21} /></button><img className="auth-logo" src="/logo.jpeg" alt="" /><h2 id="auth-title">{mode === 'login' ? 'Welcome back' : 'Join the artisan circle'}</h2><p>{mode === 'login' ? 'Sign in to manage your products.' : 'Create an account for your craft.'}</p><form onSubmit={submit}>{mode === 'signup' && <><label>Your name<input required maxLength={100} autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} /></label><label>Your craft<input required maxLength={100} value={form.craft} onChange={(event) => update('craft', event.target.value)} placeholder="e.g. pottery" /></label><label>Town or village<input required maxLength={150} autoComplete="address-level2" value={form.location} onChange={(event) => update('location', event.target.value)} /></label></>}<label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label><label>Password<input required minLength={6} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(event) => update('password', event.target.value)} /></label>{message && <div className={`notice ${isError ? 'error' : ''}`} role={isError ? 'alert' : 'status'}>{message}</div>}<button className="primary-btn submit-btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form><button className="switch-auth" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></section></div>;
}
