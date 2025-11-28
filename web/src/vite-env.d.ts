/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

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

