// Fonts are served from our own origin, never from a font CDN.
//
// Loading them from fonts.googleapis.com would hand every visitor's IP address
// to Google on each launch, which EU courts have held needs consent (LG München
// I, 3 O 17493/20, 2022). It was also silently broken: the CSP never allowed
// that host, so Tempo's typeface had never loaded at all.
//
// Only the latin + latin-ext subsets (latin-ext carries Slovak diacritics) and
// only the weights the app uses, so the precache stays small. All four
// families are SIL Open Font License 1.1, which allows self-hosting.
import '@fontsource/saira/latin-400.css';
import '@fontsource/saira/latin-ext-400.css';
import '@fontsource/saira/latin-500.css';
import '@fontsource/saira/latin-ext-500.css';
import '@fontsource/saira/latin-600.css';
import '@fontsource/saira/latin-ext-600.css';
import '@fontsource/saira/latin-700.css';
import '@fontsource/saira/latin-ext-700.css';
import '@fontsource/saira/latin-500-italic.css';
import '@fontsource/saira/latin-ext-500-italic.css';
import '@fontsource/saira/latin-600-italic.css';
import '@fontsource/saira/latin-ext-600-italic.css';
import '@fontsource/saira/latin-700-italic.css';
import '@fontsource/saira/latin-ext-700-italic.css';
import '@fontsource/saira-condensed/latin-600.css';
import '@fontsource/saira-condensed/latin-ext-600.css';
import '@fontsource/saira-condensed/latin-700.css';
import '@fontsource/saira-condensed/latin-ext-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-ext-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-ext-500.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/jetbrains-mono/latin-ext-700.css';
