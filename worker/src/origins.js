// The only origins a browser may call this Worker from.
//
// Kept in its own module because both endpoints enforce it — and enforcement is
// the point: the CORS response header only asks a browser to be polite, while a
// 403 on a non-allowlisted Origin actually refuses the request.
export const ALLOWED_ORIGINS = [
  'https://forgeos-botforgeos.github.io',
  'http://localhost:5173',
  'https://localhost',
  'capacitor://localhost',
];
