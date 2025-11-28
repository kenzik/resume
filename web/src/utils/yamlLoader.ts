/**
 * YAML loader utility for resume data
 * Loads and parses YAML file using js-yaml
 */

import yaml from 'js-yaml';
import type { ResumeData, YamlData, WebConfig } from '../types/resume';

// Default path - YAML file is sourced from root /data folder (Single Source of Truth)
// In dev: served via Vite's fs.allow from ../data
// In prod: copied to dist/spa/data by afterBuild hook in quasar.config.js
const DEFAULT_YAML_PATH = '/data/kenzik.yml';

// Cached web config
let cachedWebConfig: WebConfig | null = null;

/**
 * Load raw YAML data
 */
async function loadRawYaml(path?: string): Promise<YamlData> {
  const yamlPath = path || import.meta.env.VITE_RESUME_YAML_PATH || DEFAULT_YAML_PATH;
  
  const response = await fetch(yamlPath);
  
  if (!response.ok) {
    throw new Error(`Failed to load YAML file: ${response.status} ${response.statusText}`);
  }
  
  const yamlText = await response.text();
  return yaml.load(yamlText) as YamlData;
}

/**
 * Load and parse YAML resume file
 * @param path - Path to YAML file (relative to public/ or absolute URL)
 * @returns Parsed resume data
 */
export async function loadResumeYaml(path?: string): Promise<ResumeData> {
  try {
    const data = await loadRawYaml(path);
    
    // Cache web config if present
    if (data.web) {
      cachedWebConfig = data.web;
    }
    
    // Resume data is nested under 'resume' key in kenzik.yml
    const resume = data.resume;
    
    // Validate required fields
    if (!resume || !resume.profile || !resume.skills || !resume.experience) {
      throw new Error('YAML file missing required fields: resume.profile, resume.skills, or resume.experience');
    }
    
    return {
      profile: resume.profile,
      skills: resume.skills,
      experience: resume.experience,
      earlier: resume.earlier || [],
      certs: resume.certs || [],
      education: resume.education || [],
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error loading resume YAML: ${error.message}`);
    }
    throw new Error('Unknown error loading resume YAML');
  }
}

/**
 * Load web config from YAML
 * @param path - Path to YAML file (relative to public/ or absolute URL)
 * @returns Web config with MOTD
 */
export async function loadWebConfig(path?: string): Promise<WebConfig | null> {
  // Return cached if available
  if (cachedWebConfig) {
    return cachedWebConfig;
  }
  
  try {
    const data = await loadRawYaml(path);
    cachedWebConfig = data.web || null;
    return cachedWebConfig;
  } catch (error) {
    console.error('Error loading web config:', error);
    return null;
  }
}

