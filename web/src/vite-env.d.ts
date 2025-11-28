/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RESUME_YAML_PATH?: string;
  readonly VITE_RESUME_NAME?: string;
  readonly VITE_RESUME_WEBSITE?: string;
  readonly VITE_RESUME_LINKEDIN?: string;
  readonly VITE_RESUME_GITHUB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

