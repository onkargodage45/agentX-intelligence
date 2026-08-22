import { useState } from 'react';
import { Building2, Check, Pencil, Plus, X } from 'lucide-react';
import type { MonitoringProfile } from '@/types';
import { Panel } from './ui';

interface Props {
  profile: MonitoringProfile;
  onChange: (p: MonitoringProfile) => void;
}

export function ProfilePanel({ profile, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MonitoringProfile>(profile);

  function startEdit() {
    setDraft(profile);
    setEditing(true);
  }
  function save() {
    onChange({
      organization: draft.organization.trim() || profile.organization,
      competitors: draft.competitors.filter(Boolean),
      researchTopics: draft.researchTopics.filter(Boolean),
      keywords: draft.keywords.filter(Boolean),
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <Panel
        title="Monitoring Profile"
        icon={<Building2 size={16} />}
        action={
          <button className="btn-ghost !py-1 !px-2 !text-xs" onClick={startEdit}>
            <Pencil size={12} /> Edit
          </button>
        }
        bodyClassName="space-y-3"
      >
        <Field label="Organization" value={profile.organization} />
        <TagField label="Competitors" tags={profile.competitors} color="text-signal-amber" />
        <TagField label="Research Topics" tags={profile.researchTopics} color="text-signal-cyan" />
        <TagField label="Keywords" tags={profile.keywords} color="text-signal-violet" />
      </Panel>
    );
  }

  return (
    <Panel
      title="Edit Monitoring Profile"
      icon={<Building2 size={16} />}
      action={
        <div className="flex gap-1.5">
          <button className="btn-ghost !py-1 !px-2 !text-xs" onClick={() => setEditing(false)}>
            <X size={12} /> Cancel
          </button>
          <button className="btn-primary !py-1 !px-2 !text-xs" onClick={save}>
            <Check size={12} /> Save
          </button>
        </div>
      }
      bodyClassName="space-y-3"
    >
      <div>
        <label className="label">Organization</label>
        <input
          className="input mt-1"
          value={draft.organization}
          onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
        />
      </div>
      <EditableTags
        label="Competitors"
        tags={draft.competitors}
        onChange={(competitors) => setDraft({ ...draft, competitors })}
        placeholder="Add competitor…"
      />
      <EditableTags
        label="Research Topics"
        tags={draft.researchTopics}
        onChange={(researchTopics) => setDraft({ ...draft, researchTopics })}
        placeholder="Add topic…"
      />
      <EditableTags
        label="Keywords"
        tags={draft.keywords}
        onChange={(keywords) => setDraft({ ...draft, keywords })}
        placeholder="Add keyword…"
      />
    </Panel>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}

function TagField({ label, tags, color }: { label: string; tags: string[]; color: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span key={i} className={`chip border-white/10 bg-white/5 ${color}`}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function EditableTags({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');
  function add() {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput('');
  }
  return (
    <div>
      <label className="label">{label}</label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span key={i} className="chip border-white/10 bg-white/5 text-slate-200">
            {t}
            <button
              className="ml-1 text-slate-500 hover:text-signal-red"
              onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <input
          className="input"
          value={input}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="btn-ghost !px-2" onClick={add}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
