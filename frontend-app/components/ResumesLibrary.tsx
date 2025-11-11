"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import SummaryRefinementChat from "./SummaryRefinementChat";

interface Summary {
  id: string;
  meeting_id: string;
  title: string;
  summary_text: string;
  format: string;
  language: string;
  detail_level: string;
  created_at: string;
  generation_time_seconds: number;
}

export default function ResumesLibrary() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSummaries();
  }, []);

  const loadSummaries = async () => {
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
      const response = await fetch(`${apiBaseUrl}/summaries`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummaries(data.summaries || []);
      } else {
        const errorText = await response.text();
        console.error("Failed to load summaries:", errorText);
        setMessage(`Failed to load summaries: ${response.status}`);
      }
    } catch (error) {
      console.error("Error loading summaries:", error);
      setMessage("Cannot connect to backend. Make sure the server is running on http://localhost:8000");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getFormatLabel = (format: string) => {
    const labels: { [key: string]: string } = {
      structured: "Structured",
      bullet_points: "Bullet Points",
      paragraph: "Paragraph",
      action_items: "Action Items",
    };
    return labels[format] || format;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-400">Loading summaries...</div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400">{message}</div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 text-lg mb-2">No summaries yet</div>
        <div className="text-slate-500 text-sm">
          Upload an audio file and generate a summary to see it here
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Your Summaries</h2>
        <button
          onClick={loadSummaries}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          Refresh
        </button>
      </div>

      {/* Summary List */}
      <div className="grid gap-4">
        {summaries.map((summary) => (
          <div
            key={summary.id}
            className="bg-slate-800 rounded-lg p-4 hover:bg-slate-750 cursor-pointer transition-colors border border-slate-700"
            onClick={() => setSelectedSummary(summary)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-white">{summary.title}</h3>
              <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                {getFormatLabel(summary.format)}
              </span>
            </div>
            <div className="text-sm text-slate-400 mb-2">
              {formatDate(summary.created_at)}
            </div>
            <div className="text-sm text-slate-300 line-clamp-2">
              {summary.summary_text.substring(0, 200)}...
            </div>
            <div className="flex gap-2 mt-3 text-xs text-slate-500">
              <span className="bg-slate-700 px-2 py-1 rounded">
                {summary.language.toUpperCase()}
              </span>
              <span className="bg-slate-700 px-2 py-1 rounded">
                {summary.detail_level}
              </span>
              <span className="bg-slate-700 px-2 py-1 rounded">
                {summary.generation_time_seconds.toFixed(1)}s
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Detail Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg p-6 max-w-7xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedSummary.title}
                </h2>
                <div className="flex gap-2 text-xs text-slate-400">
                  <span>{formatDate(selectedSummary.created_at)}</span>
                  <span>•</span>
                  <span>{getFormatLabel(selectedSummary.format)}</span>
                  <span>•</span>
                  <span>{selectedSummary.language.toUpperCase()}</span>
                  <span>•</span>
                  <span>{selectedSummary.detail_level}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedSummary(null);
                  setShowChat(false);
                }}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex gap-4">
              {/* Summary Content */}
              <div className={`${showChat ? "w-1/2" : "w-full"} flex flex-col`}>
                <div className="flex-1 overflow-y-auto bg-slate-800 rounded-lg p-6 prose prose-invert max-w-none">
                  <div
                    className="text-slate-200 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: selectedSummary.summary_text
                        .replace(/\n/g, "<br/>")
                        .replace(/## /g, '<h2 class="text-xl font-bold mt-4 mb-2">')
                        .replace(/<\/h2>/g, "</h2>")
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                    }}
                  />
                </div>
              </div>

              {/* Chat Interface */}
              {showChat && (
                <div className="w-1/2">
                  <SummaryRefinementChat
                    summaryId={selectedSummary.id}
                    currentSummary={selectedSummary.summary_text}
                    onSummaryUpdated={(newSummary) => {
                      setSelectedSummary({
                        ...selectedSummary,
                        summary_text: newSummary,
                      });
                      // Update in the list too
                      setSummaries(
                        summaries.map((s) =>
                          s.id === selectedSummary.id
                            ? { ...s, summary_text: newSummary }
                            : s
                        )
                      );
                    }}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowChat(!showChat)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {showChat ? "Hide Chat" : "Refine with AI"}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedSummary.summary_text);
                  setMessage("Copied to clipboard!");
                  setTimeout(() => setMessage(""), 2000);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  setSelectedSummary(null);
                  setShowChat(false);
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            {message && (
              <div className="mt-4 p-3 bg-green-900/50 text-green-200 rounded">
                {message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
