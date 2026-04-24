import { useState } from "react";
import g from "../styles/shared.module.css";

function CreateBucketModal({ isOpen, onClose, onCreate, existingNames = [] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (
      existingNames.some((n) => n.toLowerCase() === name.trim().toLowerCase())
    ) {
      setError("An account with this name already exists.");
      return;
    }
    setError("");

    onCreate({
      name: name.trim(),
      description: description.trim(),
    });

    setName("");
    setDescription("");
    onClose();
  }

  return (
    <div
      className={g.overlay}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className={g.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bucket-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="bucket-modal-title">Create Account</h2>

        <form onSubmit={handleSubmit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account name"
            maxLength={50}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            maxLength={100}
          />
          {error && <p className={g.error}>{error}</p>}

          <div className={g.actions}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateBucketModal;
