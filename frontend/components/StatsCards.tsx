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
      <div className="flex flex-wrap items-center gap-8 py-4 border-b border-[var(--color-border)]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-3 bg-[var(--color-border)] rounded w-16 mb-2"></div>
            <div className="h-6 bg-[var(--color-border)] rounded w-12"></div>
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
    <div className="flex flex-wrap items-center gap-8 py-4 border-b border-[var(--color-border)] text-sm">
      {/* Total Items */}
      <div>
        <div className="text-xs text-[var(--color-text-faint)] uppercase tracking-widest mb-1">
          Total Saved
        </div>
        <div className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {stats.total_items}
        </div>
      </div>

      {/* Items Read */}
      <div>
        <div className="text-xs text-[var(--color-text-faint)] uppercase tracking-widest mb-1">
          Read
        </div>
        <div className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {stats.items_read}
        </div>
        {stats.total_items > 0 && (
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            {Math.round((stats.items_read / stats.total_items) * 100)}% of total
          </div>
        )}
      </div>

      {/* Items Unread */}
      <div>
        <div className="text-xs text-[var(--color-text-faint)] uppercase tracking-widest mb-1">
          Unread
        </div>
        <div className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {stats.items_unread}
        </div>
      </div>

      {/* Reading Time */}
      <div>
        <div className="text-xs text-[var(--color-text-faint)] uppercase tracking-widest mb-1">
          Reading Time
        </div>
        <div className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {formatTime(stats.read_reading_time_minutes)}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] mt-1">
          {formatTime(stats.total_reading_time_minutes)} total
        </div>
      </div>
    </div>
  );
}
