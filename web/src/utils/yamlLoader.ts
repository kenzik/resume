/**
 * YAML loader utility for resume data
 * Loads and parses YAML file using js-yaml
 */

import yaml from 'js-yaml';
import type { ResumeData } from '../types/resume';

// Default path - YAML file should be in public/ folder
const DEFAULT_YAML_PATH = '/kenzik.yml';

/**
 * Load and parse YAML resume file
 * @param path - Path to YAML file (relative to public/ or absolute URL)
 * @returns Parsed resume data
 */
export async function loadResumeYaml(path?: string): Promise<ResumeData> {
  // Use provided path, env var, or default
  // For Vite, files in public/ are served from root
  // We'll need to copy the YAML to public/ or serve it from the python folder
  const yamlPath = path || import.meta.env.VITE_RESUME_YAML_PATH || DEFAULT_YAML_PATH;
  
  try {
    // Fetch the YAML file
    // If it's in public/, it will be served from root
    // If it's outside, we may need to configure Vite to serve it
    const response = await fetch(yamlPath);
    
    if (!response.ok) {
      throw new Error(`Failed to load YAML file: ${response.status} ${response.statusText}`);
    }
    
    const yamlText = await response.text();
    const data = yaml.load(yamlText) as Omit<ResumeData, 'header'>;
    
    // Validate required fields
    if (!data.profile || !data.skills || !data.experience) {
      throw new Error('YAML file missing required fields: profile, skills, or experience');
    }
    
    return {
      ...data,
      earlier: data.earlier || [],
      certs: data.certs || [],
      education: data.education || [],
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error loading resume YAML: ${error.message}`);
    }
    throw new Error('Unknown error loading resume YAML');
  }
}

