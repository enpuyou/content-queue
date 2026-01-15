"use client";

import { useState } from "react";
import { contentAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface AddContentFormProps {
  onContentAdded: () => void;
}

export default function AddContentForm({
  onContentAdded,
}: AddContentFormProps) {
  const { showToast } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await contentAPI.create({ url });

      // Reset form
      setUrl("");

      // Show success toast
      showToast("Article added successfully!", "success");

      // Notify parent component
      onContentAdded();
    } catch (err) {
      // Extract the actual error message from the Error object
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to add content. Please try again.";

      setError(errorMessage);
      showToast(errorMessage, "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="url"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          URL *
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Adding..." : "Add to Queue"}
      </button>
    </form>
  );
}
