"use client";

import { useState, useEffect } from "react";
import { analyticsAPI } from "@/lib/api";

interface Stats {
  total_items: number;
  items_read: number;
  items_unread: number;
  items_archived: number;
  total_reading_time_minutes: number;
  read_reading_time_minutes: number;
}

export default function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await analyticsAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Total Items */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm text-gray-600 mb-1">Total Saved</div>
        <div className="text-3xl font-bold text-gray-900">
          {stats.total_items}
        </div>
      </div>

      {/* Items Read */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm text-gray-600 mb-1">Read</div>
        <div className="text-3xl font-bold text-green-600">
          {stats.items_read}
        </div>
        {stats.total_items > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {Math.round((stats.items_read / stats.total_items) * 100)}% of total
          </div>
        )}
      </div>

      {/* Items Unread */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm text-gray-600 mb-1">Unread</div>
        <div className="text-3xl font-bold text-blue-600">
          {stats.items_unread}
        </div>
      </div>

      {/* Reading Time */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm text-gray-600 mb-1">Reading Time</div>
        <div className="text-3xl font-bold text-purple-600">
          {formatTime(stats.read_reading_time_minutes)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {formatTime(stats.total_reading_time_minutes)} total
        </div>
      </div>
    </div>
  );
}
