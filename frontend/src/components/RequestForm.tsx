import { useState, type FormEvent } from "react";
import { useFeatureRequests } from "../store/featureRequests";
import { CATEGORIES, TITLE_MAX, type Category } from "../types";

export default function RequestForm() {
  const createRequest = useFeatureRequests((s) => s.createRequest);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("UI");
  const [submitting, setSubmitting] = useState(false);

  const trimmedTitle = title.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmedTitle) return;
    setSubmitting(true);
    const created = await createRequest({ title: trimmedTitle, description: description.trim() || null, category });
    setSubmitting(false);
    // Keep what the user typed if the request failed, so they can retry.
    if (created) {
      setTitle("");
      setDescription("");
      setCategory("UI");
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
