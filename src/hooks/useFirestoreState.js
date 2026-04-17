import { useState, useEffect, useRef, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Syncs a piece of state to a Firestore document at:
 *   users/{uid}/data/{key}
 * Uses onSnapshot for real-time sync and debounced writes.
 * Returns [value, setValue, loaded, error, saving]
 */
export default function useFirestoreState(uid, key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const initialLoadDone = useRef(false);
  const localWrite = useRef(false);
  const debounceTimer = useRef(null);

  // Real-time listener
  useEffect(() => {
    if (!uid) return;
    initialLoadDone.current = false;
    setLoaded(false);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(db, "users", uid, "data", key),
      (snap) => {
        // Skip remote updates while we have a pending local write
        if (localWrite.current) return;
        if (snap.exists()) {
          setValue(snap.data().value ?? defaultValue);
        }
        if (!initialLoadDone.current) {
          setLoaded(true);
          requestAnimationFrame(() => {
            initialLoadDone.current = true;
          });
        }
      },
      (err) => {
        console.error(`Failed to listen to ${key}:`, err);
        setError(`Failed to load ${key}.`);
        if (!initialLoadDone.current) {
          setLoaded(true);
          requestAnimationFrame(() => {
            initialLoadDone.current = true;
          });
        }
      },
    );

    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [uid, key]);

  // Debounced writes
  useEffect(() => {
    if (!initialLoadDone.current || !uid) return;

    localWrite.current = true;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      setSaving(true);
      setDoc(doc(db, "users", uid, "data", key), { value })
        .then(() => {
          setError(null);
          setSaving(false);
          localWrite.current = false;
        })
        .catch((err) => {
          console.error(`Failed to save ${key}:`, err);
          setError(`Failed to save. Changes may be lost.`);
          setSaving(false);
          localWrite.current = false;
        });
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value, uid, key]);

  return [value, setValue, loaded, error, saving];
}
