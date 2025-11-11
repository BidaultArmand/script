"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface QuickPreferencesProps {
  onPreferencesChange?: () => void;
}

export default function QuickPreferences({ onPreferencesChange }: QuickPreferencesProps) {
  const [format, setFormat] = useState("structured");
  const [language, setLanguage] = useState("en");
  const [detailLevel, setDetailLevel] = useState("medium");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) return;

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFormat(data.default_format || "structured");
        setLanguage(data.default_language || "en");
        setDetailLevel(data.default_detail_level || "medium");
        setAutoGenerate(data.auto_generate_summary ?? true);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const savePreferences = async () => {
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

      // Get current full preferences first
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const getCurrentPrefs = await fetch(`${apiBaseUrl}/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let currentPrefs = {};
      if (getCurrentPrefs.ok) {
        currentPrefs = await getCurrentPrefs.json();
      }

      // Update with new values
      const response = await fetch(`${apiBaseUrl}/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...currentPrefs,
          default_format: format,
          default_language: language,
          default_detail_level: detailLevel,
          auto_generate_summary: autoGenerate,
        }),
      });

      if (response.ok) {
        setMessage("Saved ✓");
        setTimeout(() => setMessage(""), 2000);
        onPreferencesChange?.();
      } else {
        setMessage("Failed to save");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      setMessage("Error saving");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Summary Preferences</h3>
        {message && (
          <span className={`text-sm ${message.includes("✓") ? "text-green-400" : "text-red-400"}`}>
            {message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Summary Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="structured">Adaptive Structure</option>
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
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
            value={detailLevel}
            onChange={(e) => setDetailLevel(e.target.value)}
            className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="brief">Brief</option>
            <option value="medium">Medium</option>
            <option value="detailed">Detailed</option>
          </select>
        </div>

        {/* Auto-generate */}
        <div className="flex items-center">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
              className="w-4 h-4 bg-slate-700 border-slate-600 rounded"
            />
            <span className="text-sm text-slate-300">
              Auto-generate summary after transcription
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={savePreferences}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
      >
        {loading ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
