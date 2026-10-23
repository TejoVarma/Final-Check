import { useState, type FormEvent } from "react";
import { CATEGORIES, TITLE_MAX, type Category, type NewFeatureRequest } from "../types";

interface Props {
  onSubmit: (body: NewFeatureRequest) => Promise<void>;
}

export default function RequestForm({ onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("UI");
  const [submitting, setSubmitting] = useState(false);

  const trimmedTitle = title.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmedTitle) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: trimmedTitle, description: description.trim() || null, category });
      setTitle("");
      setDescription("");
      setCategory("UI");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>Suggest a feature</h2>

      <label>
        <span className="label-row">
          Title <span className="muted">{title.length}/{TITLE_MAX}</span>
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="e.g. Export reports to CSV"
          required
        />
      </label>

      <label>
        Description <span className="muted">(optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What problem would this solve?"
        />
      </label>

      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <button type="submit" className="primary" disabled={!trimmedTitle || submitting}>
        {submitting ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
