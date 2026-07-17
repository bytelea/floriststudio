/* Florist Studio v3.1 — secure Supabase account and workspace sync */
(() => {
  const PROJECT_URL = 'https://ckvytqenwzsfvobxpmyp.supabase.com';
  const PUBLIC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdnl0cWVud3pzZnZvYnhwbXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTY0NjAsImV4cCI6MjA5OTg3MjQ2MH0.xKM8IUkcPlCMEi4euhNq73nIFjpy_7p8YAl4lQrvp34';
  const TABLE = 'workspace_snapshots';
  let client = null;
  let currentUser = null;
  let syncTimer = null;
  let applyingRemote = false;

  const el = id => document.getElementById(id);
  const status = (message, kind = '') => {
    const node = el('cloudStatus');
    if (!node) return;
    node.textContent = message;
    node.dataset.state = kind;
  };

  function initialiseClient() {
    if (client) return client;
    if (!window.supabase?.createClient) {
      status('Cloud library did not load. Check your internet connection.', 'error');
      return null;
    }
    client = window.supabase.createClient(PROJECT_URL, PUBLIC_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  function updateAccountUI() {
    const signedIn = Boolean(currentUser);
    el('cloudSignedOut')?.toggleAttribute('hidden', signedIn);
    el('cloudSignedIn')?.toggleAttribute('hidden', !signedIn);
    if (el('cloudAccountEmail')) el('cloudAccountEmail').textContent = currentUser?.email || '';
    const badge = document.querySelector('.privacy-status');
    if (badge) badge.textContent = signedIn ? '☁️ Cloud account connected' : '🔒 Local private mode';
    if (signedIn) status(`Signed in as ${currentUser.email}. Local changes can now sync securely.`, 'success');
  }

  async function refreshSession() {
    const sb = initialiseClient();
    if (!sb) return;
    const { data, error } = await sb.auth.getSession();
    if (error) status(error.message, 'error');
    currentUser = data?.session?.user || null;
    updateAccountUI();
  }

  async function pushWorkspace({ silent = false } = {}) {
    if (applyingRemote) return;
    const sb = initialiseClient();
    if (!sb || !currentUser) {
      if (!silent) status('Sign in before syncing.', 'error');
      return;
    }
    if (!silent) status('Uploading this device’s workspace…', 'working');
    const payload = JSON.parse(JSON.stringify(window.db || {}));
    if (payload.cloud) payload.cloud = { provider: 'supabase', connected: true };
    const { error } = await sb.from(TABLE).upsert({
      user_id: currentUser.id,
      workspace: payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) {
      status(error.message.includes('workspace_snapshots')
        ? 'Database setup is not finished. Run the included supabase-setup.sql file in Supabase SQL Editor.'
        : `Sync failed: ${error.message}`, 'error');
      return;
    }
    if (window.db?.cloud) window.db.cloud.connected = true;
    status(`Synced securely at ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}.`, 'success');
  }

  async function pullWorkspace() {
    const sb = initialiseClient();
    if (!sb || !currentUser) return status('Sign in before restoring cloud data.', 'error');
    status('Checking the cloud workspace…', 'working');
    const { data, error } = await sb.from(TABLE).select('workspace, updated_at').eq('user_id', currentUser.id).maybeSingle();
    if (error) return status(`Restore failed: ${error.message}`, 'error');
    if (!data?.workspace) return status('No cloud backup exists yet. Choose “Upload this device” first.', 'error');
    if (!confirm(`Replace this device’s current data with the cloud copy saved ${new Date(data.updated_at).toLocaleString()}? A local backup is recommended first.`)) {
      return status('Cloud restore cancelled. Nothing changed.', '');
    }
    applyingRemote = true;
    try {
      window.db = data.workspace;
      if (window.db.cloud) window.db.cloud.connected = true;
      localStorage.ebFloristStudioConnected = JSON.stringify(window.db);
      if (typeof window.normalize === 'function') window.normalize();
      if (typeof window.render === 'function') window.render();
      status('Cloud workspace restored to this device.', 'success');
    } finally { applyingRemote = false; }
  }

  function scheduleSync() {
    if (!currentUser || applyingRemote) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => pushWorkspace({ silent: true }), 1800);
  }

  window.cloudCreateAccount = async function () {
    const sb = initialiseClient();
    const email = el('cloudEmail')?.value.trim();
    const password = el('cloudPassword')?.value || '';
    if (!email || password.length < 8) return status('Enter your email and a password of at least 8 characters.', 'error');
    status('Creating your account…', 'working');
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return status(`Account creation failed: ${error.message}`, 'error');
    currentUser = data.user || null;
    updateAccountUI();
    status(data.session ? 'Account created and signed in.' : 'Account created. Check your email to confirm it, then sign in.', 'success');
  };

  window.cloudSignIn = async function () {
    const sb = initialiseClient();
    const email = el('cloudEmail')?.value.trim();
    const password = el('cloudPassword')?.value || '';
    if (!email || !password) return status('Enter your email and password.', 'error');
    status('Signing in…', 'working');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return status(`Sign-in failed: ${error.message}`, 'error');
    currentUser = data.user;
    updateAccountUI();
  };

  window.cloudSignOut = async function () {
    const sb = initialiseClient();
    await sb.auth.signOut();
    currentUser = null;
    updateAccountUI();
    status('Signed out. Your local data remains on this device.', '');
  };
  window.cloudPushNow = () => pushWorkspace();
  window.cloudPullNow = () => pullWorkspace();

  document.addEventListener('DOMContentLoaded', async () => {
    if (el('cloudUrl')) el('cloudUrl').value = PROJECT_URL;
    if (el('cloudAnonKey')) el('cloudAnonKey').value = PUBLIC_ANON_KEY;
    const sb = initialiseClient();
    if (!sb) return;
    sb.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      updateAccountUI();
    });
    await refreshSession();

    const originalSave = window.save;
    if (typeof originalSave === 'function') {
      window.save = function (...args) {
        const result = originalSave.apply(this, args);
        scheduleSync();
        return result;
      };
    }
  });
})();
