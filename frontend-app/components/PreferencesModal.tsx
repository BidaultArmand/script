"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Preferences {
  default_format: string;
  default_language: string;
  default_detail_level: string;
  auto_generate_summary: boolean;
  include_timestamps: boolean;
  include_action_items: boolean;
  include_decisions: boolean;
}

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function PreferencesModal({
  isOpen,
  onClose,
  onSave,
}: PreferencesModalProps) {
  const [preferences, setPreferences] = useState<Preferences>({
    default_format: "structured",
    default_language: "en",
    default_detail_level: "medium",
    auto_generate_summary: true,
    include_timestamps: true,
    include_action_items: true,
    include_decisions: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        setMessage("Not authenticated");
        return;
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      setMessage("Failed to load preferences");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        setMessage("Not authenticated");
        setLoading(false);
        return;
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setMessage("Preferences saved successfully!");
        setTimeout(() => {
          onSave?.();
          onClose();
        }, 1000);
      } else {
        setMessage("Failed to save preferences");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      setMessage("Error saving preferences");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Summary Preferences</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Summary Format
            </label>
            <select
              value={preferences.default_format}
              onChange={(e) =>
                setPreferences({ ...preferences, default_format: e.target.value })
              }
              className="w-full bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="structured">Structured (with sections)</option>
              <option value="bullet_points">Bullet Points</option>
              <option value="paragraph">Paragraph</option>
              <option value="action_items">Action Items Only</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Summary Language
            </label>
            <select
              value={preferences.default_language}
              onChange={(e) =>
                setPreferences({ ...preferences, default_language: e.target.value })
              }
              className="w-full bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          {/* Detail Level */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Detail Level
            </label>
            <select
              value={preferences.default_detail_level}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  default_detail_level: e.target.value,
                })
              }
              className="w-full bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="brief">Brief</option>
              <option value="medium">Medium</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={preferences.auto_generate_summary}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    auto_generate_summary: e.target.checked,
                  })
                }
                className="w-4 h-4 bg-slate-800 border-slate-700 rounded"
              />
              <span className="text-sm text-slate-300">
                Auto-generate summary after transcription
              </span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={preferences.include_timestamps}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    include_timestamps: e.target.checked,
                  })
                }
                className="w-4 h-4 bg-slate-800 border-slate-700 rounded"
              />
              <span className="text-sm text-slate-300">Include timestamps</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={preferences.include_action_items}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    include_action_items: e.target.checked,
                  })
                }
                className="w-4 h-4 bg-slate-800 border-slate-700 rounded"
              />
              <span className="text-sm text-slate-300">Extract action items</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={preferences.include_decisions}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    include_decisions: e.target.checked,
                  })
                }
                className="w-4 h-4 bg-slate-800 border-slate-700 rounded"
              />
              <span className="text-sm text-slate-300">Extract key decisions</span>
            </label>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded ${
                message.includes("success")
                  ? "bg-green-900/50 text-green-200"
                  : "bg-red-900/50 text-red-200"
              }`}
            >
              {message}
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              {loading ? "Saving..." : "Save Preferences"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
