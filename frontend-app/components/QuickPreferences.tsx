"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuickPreferencesProps {
  onPreferencesChange?: () => void;
}

export default function QuickPreferences({ onPreferencesChange }: QuickPreferencesProps) {
  const [format, setFormat] = useState("structured");
  const [language, setLanguage] = useState("en");
  const [detailLevel, setDetailLevel] = useState("medium");
  const [autoGenerate, setAutoGenerate] = useState(true);
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

  const savePreferences = async (updatedPrefs: Partial<{
    default_format: string;
    default_language: string;
    default_detail_level: string;
    auto_generate_summary: boolean;
  }>) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
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
          ...updatedPrefs,
        }),
      });

      if (response.ok) {
        setMessage("Saved ✓");
        setTimeout(() => setMessage(""), 1500);
        onPreferencesChange?.();
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  const handleFormatChange = (value: string) => {
    setFormat(value);
    savePreferences({ default_format: value });
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    savePreferences({ default_language: value });
  };

  const handleDetailLevelChange = (value: string) => {
    setDetailLevel(value);
    savePreferences({ default_detail_level: value });
  };

  const handleAutoGenerateChange = (checked: boolean) => {
    setAutoGenerate(checked);
    savePreferences({ auto_generate_summary: checked });
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-medium text-gray-700">Summary Preferences</h3>
        {message && (
          <span className={`text-sm ${message.includes("✓") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </span>
        )}
      </div>

      <div className="space-y-4 flex-1">
        {/* Format */}
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-gray-700 font-medium">
                Summary Format
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuRadioGroup value={format} onValueChange={handleFormatChange}>
                <DropdownMenuRadioItem value="structured">Adaptive Structure</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="bullet_points">Bullet Points</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="paragraph">Paragraph</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="action_items">Action Items Only</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Language */}
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-gray-700 font-medium">
                Summary Language
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuRadioGroup value={language} onValueChange={handleLanguageChange}>
                <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="fr">Français</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Detail Level */}
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-gray-700 font-medium">
                Detail Level
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuRadioGroup value={detailLevel} onValueChange={handleDetailLevelChange}>
                <DropdownMenuRadioItem value="brief">Brief</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="detailed">Detailed</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Auto-generate */}
        <div className="flex items-center pt-2">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(e) => handleAutoGenerateChange(e.target.checked)}
              className="w-4 h-4 bg-white border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              Auto-generate summary after transcription
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
