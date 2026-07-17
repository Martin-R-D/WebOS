import { useState } from "react";
import {
  Code2, Briefcase, Mail, AtSign, Link as LinkIcon, ExternalLink,
  Pencil, Check, X, Plus, Trash2, RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppProps } from "../../types";
import { useProfileStore } from "../../stores/useProfileStore";
import type { Profile, ProfileProject } from "../../stores/useProfileStore";
import "./AboutMe.css";

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  GitHub: Code2,
  LinkedIn: Briefcase,
  Email: Mail,
  X: AtSign,
};

const emptyProject: ProfileProject = { title: "", description: "", tags: [], url: "" };

export function AboutMe({}: AppProps) {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const resetProfile = useProfileStore((s) => s.resetProfile);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);
  const [skillInput, setSkillInput] = useState("");

  function startEdit() {
    setDraft(structuredClone(profile));
    setEditing(true);
  }

  function save() {
    setProfile(draft);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  function handleReset() {
    if (window.confirm("Reset your portfolio to the default template?")) {
      resetProfile();
      setEditing(false);
    }
  }

  function setField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || draft.skills.includes(s)) { setSkillInput(""); return; }
    setField("skills", [...draft.skills, s]);
    setSkillInput("");
  }

  function removeSkill(i: number) {
    setField("skills", draft.skills.filter((_, idx) => idx !== i));
  }

  function updateProject(i: number, patch: Partial<ProfileProject>) {
    setField("projects", draft.projects.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function addProject() {
    setField("projects", [...draft.projects, structuredClone(emptyProject)]);
  }

  function removeProject(i: number) {
    setField("projects", draft.projects.filter((_, idx) => idx !== i));
  }

  function updateSocial(i: number, url: string) {
    setField("socials", draft.socials.map((s, idx) => (idx === i ? { ...s, url } : s)));
  }

  // ----- READ MODE -----
  if (!editing) {
    return (
      <div className="about">
        <div className="about__topbar">
          <button className="about__btn about__btn--ghost" onClick={handleReset} title="Reset to template">
            <RotateCcw size={14} />
          </button>
          <button className="about__btn about__btn--edit" onClick={startEdit}>
            <Pencil size={14} /> Edit Profile
          </button>
        </div>

        <div className="about__hero">
          <div className="about__avatar">{profile.initials}</div>
          <div className="about__name">{profile.name}</div>
          <div className="about__tagline">{profile.tagline}</div>
          <div className="about__socials">
            {profile.socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.label] ?? LinkIcon;
              return (
                <a
                  key={s.label}
                  className="about__social"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                >
                  <Icon size={18} />
                </a>
              );
            })}
          </div>
        </div>

        <div className="about__section">
          <div className="about__h">About</div>
          <p style={{ fontSize: 13, lineHeight: 1.7 }}>{profile.bio}</p>
        </div>

        <div className="about__section">
          <div className="about__h">Skills</div>
          <div className="about__chips">
            {profile.skills.map((s) => (
              <span key={s} className="about__chip">{s}</span>
            ))}
          </div>
        </div>

        <div className="about__section">
          <div className="about__h">Projects</div>
          <div className="about__projects">
            {profile.projects.map((p, i) => (
              <div key={i} className="about__card">
                <h4>{p.title}</h4>
                <p>{p.description}</p>
                <div className="about__tags">
                  {p.tags.map((t) => (
                    <span key={t} className="about__tag">{t}</span>
                  ))}
                </div>
                <a className="about__view" href={p.url} target="_blank" rel="noopener noreferrer">
                  View Project <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="about__cta">
          <p>Interested in working together?</p>
          <a href={`mailto:${profile.email}`}>Get in Touch</a>
        </div>
      </div>
    );
  }

  // ----- EDIT MODE -----
  return (
    <div className="about about--editing">
      <div className="about__topbar">
        <button className="about__btn about__btn--ghost" onClick={cancel}>
          <X size={14} /> Cancel
        </button>
        <button className="about__btn about__btn--save" onClick={save}>
          <Check size={14} /> Save
        </button>
      </div>

      <div className="about__hero">
        <div className="about__avatar">{draft.initials || "?"}</div>
        <input
          className="about__edit about__edit--initials"
          value={draft.initials}
          maxLength={3}
          onChange={(e) => setField("initials", e.target.value)}
          placeholder="Initials"
        />
        <input
          className="about__edit about__edit--name"
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="Your Name"
        />
        <input
          className="about__edit about__edit--tagline"
          value={draft.tagline}
          onChange={(e) => setField("tagline", e.target.value)}
          placeholder="A short tagline"
        />

        <div className="about__social-edits">
          {draft.socials.map((s, i) => {
            const Icon = SOCIAL_ICONS[s.label] ?? LinkIcon;
            return (
              <div key={s.label} className="about__social-edit">
                <span className="about__social-edit-icon"><Icon size={16} /></span>
                <input
                  className="about__edit"
                  value={s.url}
                  onChange={(e) => updateSocial(i, e.target.value)}
                  placeholder={`${s.label} URL`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="about__section">
        <div className="about__h">About</div>
        <textarea
          className="about__edit about__edit--bio"
          value={draft.bio}
          onChange={(e) => setField("bio", e.target.value)}
          rows={5}
          placeholder="Write a short bio…"
        />
      </div>

      <div className="about__section">
        <div className="about__h">Skills</div>
        <div className="about__chips">
          {draft.skills.map((s, i) => (
            <span key={i} className="about__chip about__chip--edit">
              {s}
              <button className="about__chip-x" onClick={() => removeSkill(i)}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="about__skill-add">
          <input
            className="about__edit"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addSkill(); }}
            placeholder="Add a skill and press Enter"
          />
          <button className="about__btn about__btn--edit" onClick={addSkill}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="about__section">
        <div className="about__h">Projects</div>
        <div className="about__projects">
          {draft.projects.map((p, i) => (
            <div key={i} className="about__card about__card--edit">
              <div className="about__card-head">
                <input
                  className="about__edit about__edit--strong"
                  value={p.title}
                  onChange={(e) => updateProject(i, { title: e.target.value })}
                  placeholder="Project title"
                />
                <button className="about__chip-x" onClick={() => removeProject(i)} title="Remove project">
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                className="about__edit"
                value={p.description}
                onChange={(e) => updateProject(i, { description: e.target.value })}
                rows={3}
                placeholder="Short description"
              />
              <input
                className="about__edit"
                value={p.tags.join(", ")}
                onChange={(e) =>
                  updateProject(i, {
                    tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                  })
                }
                placeholder="Tags (comma separated)"
              />
              <input
                className="about__edit"
                value={p.url}
                onChange={(e) => updateProject(i, { url: e.target.value })}
                placeholder="Project URL"
              />
            </div>
          ))}
        </div>
        <button className="about__addcard" onClick={addProject}>
          <Plus size={15} /> Add Project
        </button>
      </div>

      <div className="about__section">
        <div className="about__h">Contact Email</div>
        <input
          className="about__edit"
          value={draft.email}
          onChange={(e) => setField("email", e.target.value)}
          placeholder="you@example.com"
        />
      </div>
    </div>
  );
}
