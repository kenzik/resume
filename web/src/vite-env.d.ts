/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RESUME_YAML_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

