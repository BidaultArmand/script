"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import SummaryRefinementChat from "./SummaryRefinementChat";
import { Progress } from "@/components/ui/progress";

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

interface ResumesLibraryProps {
  isProcessing?: boolean;
  processingProgress?: number;
}

export default function ResumesLibrary({ isProcessing = false, processingProgress = 0 }: ResumesLibraryProps) {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleDelete = async (summaryId: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        setMessage("Not authenticated");
        return;
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/summaries/${summaryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove from local state
        setSummaries(summaries.filter((s) => s.id !== summaryId));
        setMessage("Summary deleted successfully");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorText = await response.text();
        console.error("Failed to delete summary:", errorText);
        setMessage(`Failed to delete summary: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting summary:", error);
      setMessage("Cannot connect to backend");
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">Loading summaries...</div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600">{message}</div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 text-lg mb-2">No summaries yet</div>
        <div className="text-gray-500 text-sm">
          Upload an audio file and generate a summary to see it here
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Your Summaries</h2>
        <button
          onClick={loadSummaries}
          className="text-sm text-black hover:text-gray-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Processing Progress Bar */}
      {isProcessing && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {processingProgress < 30 && "Uploading audio..."}
                {processingProgress >= 30 && processingProgress < 70 && "Transcribing audio..."}
                {processingProgress >= 70 && processingProgress < 100 && "Generating summary..."}
                {processingProgress === 100 && "Complete!"}
              </p>
              <span className="text-sm text-gray-500">{Math.round(processingProgress)}%</span>
            </div>
            <Progress value={processingProgress} className="w-full" />
          </div>
        </div>
      )}

      {/* Summary List */}
      <div className="grid gap-4">
        {summaries.map((summary) => (
          <div
            key={summary.id}
            className="bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors border border-gray-200 relative"
          >
            <div
              className="cursor-pointer"
              onClick={() => setSelectedSummary(summary)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-black pr-8">{summary.title}</h3>
                <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded mr-6">
                  {getFormatLabel(summary.format)}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {formatDate(summary.created_at)}
              </div>
              <div className="text-sm text-gray-700 line-clamp-2">
                {summary.summary_text.substring(0, 200)}...
              </div>
              <div className="flex gap-2 mt-3 text-xs text-gray-600">
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {summary.language.toUpperCase()}
                </span>
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {summary.detail_level}
                </span>
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {summary.generation_time_seconds.toFixed(1)}s
                </span>
              </div>
            </div>
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm(summary.id);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete summary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Summary Detail Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-7xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-black mb-2">
                  {selectedSummary.title}
                </h2>
                <div className="flex gap-2 text-xs text-gray-600">
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
                className="text-gray-600 hover:text-black text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex gap-4">
              {/* Summary Content */}
              <div className={`${showChat ? "w-1/2" : "w-full"} flex flex-col`}>
                <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-6 prose max-w-none">
                  <div
                    className="text-gray-800 whitespace-pre-wrap"
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
                className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {showChat ? "Hide Chat" : "Refine with AI"}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedSummary.summary_text);
                  setMessage("Copied to clipboard!");
                  setTimeout(() => setMessage(""), 2000);
                }}
                className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  setSelectedSummary(null);
                  setShowChat(false);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-black font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            {message && (
              <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
                {message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-black mb-4">Delete Summary?</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this summary? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="bg-gray-200 hover:bg-gray-300 text-black font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
