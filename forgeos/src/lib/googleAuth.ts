// Real "Sign in with Google" using Google Identity Services (GIS), fully
// client-side — needs only a public OAuth Client ID (no server, no secret).
// Set VITE_GOOGLE_CLIENT_ID and add your site origin to the OAuth client's
// "Authorized JavaScript origins". Without an ID, the app uses demo sign-in.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const googleIsLive = Boolean(CLIENT_ID);

export interface GoogleUser {
  name: string;
  email: string;
  picture?: string;
  sub: string;
}

let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if ((window as unknown as { google?: unknown }).google) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google sign-in'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

type TokenClient = { requestAccessToken: () => void };
interface GoogleNS {
  accounts: {
    oauth2: {
      initTokenClient: (cfg: {
        client_id: string;
        scope: string;
        callback: (resp: { access_token?: string; error?: string }) => void;
      }) => TokenClient;
    };
  };
}

// Opens the real Google account-chooser popup and returns the chosen profile.
export async function signInWithGoogle(): Promise<GoogleUser> {
  if (!CLIENT_ID) throw new Error('no-client-id');
  await loadGis();
  const google = (window as unknown as { google: GoogleNS }).google;

  return new Promise<GoogleUser>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'openid email profile',
      callback: async (resp) => {
        if (resp.error || !resp.access_token) return reject(new Error(resp.error || 'cancelled'));
        try {
          const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          }).then((r) => r.json());
          resolve({ name: info.name, email: info.email, picture: info.picture, sub: info.sub });
        } catch (e) {
          reject(e);
        }
      },
    });
    client.requestAccessToken(); // triggers the Google popup
  });
}
