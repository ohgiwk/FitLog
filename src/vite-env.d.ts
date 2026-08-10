/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_STORE_URL?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_CANONICAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
