import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProfileSocial {
  label: string;
  url: string;
}

export interface ProfileProject {
  title: string;
  description: string;
  tags: string[];
  url: string;
}

export interface Profile {
  name: string;
  initials: string;
  tagline: string;
  bio: string;
  email: string;
  socials: ProfileSocial[];
  skills: string[];
  projects: ProfileProject[];
}

export const defaultProfile: Profile = {
  name: "Your Name",
  initials: "YN",
  tagline: "Full-Stack Developer & Creative Technologist",
  bio:
    "I'm a passionate developer who loves building beautiful, interactive web experiences. " +
    "With a background in both design and engineering, I bridge the gap between aesthetics and functionality. " +
    "When I'm not coding, you'll find me exploring new technologies, contributing to open source, or brewing coffee.",
  email: "you@example.com",
  socials: [
    { label: "GitHub", url: "https://github.com/yourname" },
    { label: "LinkedIn", url: "https://linkedin.com/in/yourname" },
    { label: "Email", url: "mailto:you@example.com" },
    { label: "X", url: "https://x.com/yourname" },
  ],
  skills: [
    "React", "TypeScript", "Node.js", "CSS", "Python",
    "PostgreSQL", "Docker", "Git", "Figma", "REST APIs",
    "GraphQL", "Tailwind", "Linux", "AWS",
  ],
  projects: [
    {
      title: "WebOS",
      description:
        "A browser-based desktop environment built with React and TypeScript, featuring a virtual file system and multiple apps.",
      tags: ["React", "TypeScript", "Zustand"],
      url: "https://github.com/yourname/webos",
    },
    {
      title: "Project Alpha",
      description:
        "A real-time collaborative editing platform with conflict-free data syncing and rich text support.",
      tags: ["Node.js", "WebSockets", "PostgreSQL"],
      url: "https://github.com/yourname/project-alpha",
    },
    {
      title: "Design System",
      description:
        "A comprehensive component library with accessible, themeable UI primitives for modern web apps.",
      tags: ["React", "CSS", "Storybook"],
      url: "https://github.com/yourname/design-system",
    },
  ],
};

interface ProfileState {
  profile: Profile;
  setProfile: (p: Profile) => void;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      setProfile: (p) => set({ profile: p }),
      resetProfile: () => set({ profile: defaultProfile }),
    }),
    {
      name: "webos-profile",
      partialize: (state) => ({ profile: state.profile }),
    },
  ),
);
