/**
 * Resume Commands
 * 
 * Commands for displaying and downloading resume content:
 * resume, skills, experience, download
 */

import type { CommandDefinition, CommandRegistry } from './types';
import { COMMAND_PREFIXES } from './types';

// Cache the resume module to avoid repeated dynamic imports
let resumeModule: typeof import('../composables/useResume') | null = null;

/**
 * Helper to execute a function with a loaded resume
 * Handles loading and error checking with caching
 */
async function withResume<T>(
  fn: (resume: ReturnType<typeof import('../composables/useResume').useResume>) => T
): Promise<T | string> {
  if (!resumeModule) {
    resumeModule = await import('../composables/useResume');
  }
  const resume = resumeModule.useResume();
  await resume.loadResume();
  if (resume.error.value) {
    return `Error: ${resume.error.value}`;
  }
  return fn(resume);
}

export const resumeCommands: CommandRegistry = {
  resume: {
    handler: async () => withResume(r => r.getFullResume()),
    description: 'Display full resume',
    examples: ['resume', 'resume | more'],
  },

  skills: {
    handler: async () => withResume(r => r.getSkills()),
    description: 'List technical skills',
    examples: ['skills', 'skills | grep kubernetes'],
  },

  experience: {
    handler: async (ctx) => {
      const filter = ctx.args.length > 0 ? ctx.args.join(' ') : undefined;
      return withResume(r => r.getExperience(filter));
    },
    description: 'Show work experience',
    usage: 'experience [company]',
    examples: ['experience', 'experience /five9/i', 'experience google'],
  },

  download: {
    handler: async (ctx) => {
      const validFormats = ['pdf', 'docx', 'md', 'rtf'];
      const format = ctx.args[0]?.toLowerCase() || 'pdf';
      
      if (!validFormats.includes(format)) {
        return `Invalid format: "${ctx.args[0]}"\n\nAvailable formats: ${validFormats.join(', ')}\n\nUsage: \`download [format]\`\nExample: \`download pdf\``;
      }
      
      // Return special navigation marker
      // Terminal.vue will detect this and navigate
      return `${COMMAND_PREFIXES.NAV}/resume/download/${format}`;
    },
    description: 'Download resume in specified format',
    usage: 'download [format]',
    examples: ['download', 'download pdf', 'download docx'],
  },
};

