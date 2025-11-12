"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface AdvancedPreferences {
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
  const [preferences, setPreferences] = useState<AdvancedPreferences>({
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
        setPreferences({
          include_timestamps: data.include_timestamps ?? true,
          include_action_items: data.include_action_items ?? true,
          include_decisions: data.include_decisions ?? true,
        });
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

      // Get current preferences first to preserve other settings
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const getCurrentPrefs = await fetch(`${apiBaseUrl}/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let currentPrefs = {};
      if (getCurrentPrefs.ok) {
        currentPrefs = await getCurrentPrefs.json();
      }

      // Update only advanced settings
      const response = await fetch(`${apiBaseUrl}/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...currentPrefs,
          ...preferences,
        }),
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
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">Advanced Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Configure advanced options for summary generation
          </p>

          {/* Toggles */}
          <div className="space-y-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.include_timestamps}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    include_timestamps: e.target.checked,
                  })
                }
                className="w-4 h-4 mt-1 bg-white border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">Include timestamps</span>
                <p className="text-xs text-gray-600 mt-1">
                  Show time markers in the summary for easy reference
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.include_action_items}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    include_action_items: e.target.checked,
                  })
                }
                className="w-4 h-4 mt-1 bg-white border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">Extract action items</span>
                <p className="text-xs text-gray-600 mt-1">
                  Automatically identify and highlight action items
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.include_decisions}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    include_decisions: e.target.checked,
                  })
                }
                className="w-4 h-4 mt-1 bg-white border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">Extract key decisions</span>
                <p className="text-xs text-gray-600 mt-1">
                  Highlight important decisions made during the meeting
                </p>
              </div>
            </label>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded ${
                message.includes("success")
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
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
              className="flex-1 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {loading ? "Saving..." : "Save Settings"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-black font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
