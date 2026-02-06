// API base URL - matches your FastAPI backend
// Use environment variable for production, fallback to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

// Helper function to make authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Spread existing headers if they exist
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid - redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }

    if (response.status === 429) {
      // Rate limit exceeded
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || "Too many requests. Please slow down.",
      );
    }

    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

// Auth API - matches your /auth endpoints
export const authAPI = {
  login: async (username: string, password: string) => {
    // OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    const data = await response.json();

    // Store token in localStorage
    if (typeof window !== "undefined" && data.access_token) {
      localStorage.setItem("token", data.access_token);
    }

    return data;
  },

  register: async (fullName: string, email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }

    return response.json();
  },

  getCurrentUser: async () => {
    return fetchWithAuth(`${API_BASE_URL}/auth/me`);
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  },
};

// Content API - matches your /content endpoints
export const contentAPI = {
  // Get all content items (GET /content)
  getAll: async () => {
    return fetchWithAuth(`${API_BASE_URL}/content`);
  },

  // Get a single content item by ID (GET /content/{item_id})
  getById: async (id: string) => {
    return fetchWithAuth(`${API_BASE_URL}/content/${id}`);
  },

  // Get full content with extracted text (GET /content/{item_id}/full)
  getFullById: async (id: string) => {
    return fetchWithAuth(`${API_BASE_URL}/content/${id}/full`);
  },

  // Create a new content item (POST /content)
  create: async (data: { url: string; list_ids?: string[] }) => {
    return fetchWithAuth(`${API_BASE_URL}/content`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update a content item (PATCH /content/{item_id})
  update: async (
    id: string,
    data: {
      is_read?: boolean;
      is_archived?: boolean;
      read_position?: number;
      tags?: string[];
    },
  ) => {
    return fetchWithAuth(`${API_BASE_URL}/content/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Delete a content item (DELETE /content/{item_id})
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/content/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      }
      throw new Error(`Delete failed: ${response.status}`);
    }

    // DELETE often returns 204 No Content, so don't try to parse JSON
    if (response.status === 204) {
      return null;
    }

    return response.json();
  },

  // Trigger summarization (POST /content/{item_id}/summary)
  summarize: async (id: string) => {
    return fetchWithAuth(`${API_BASE_URL}/content/${id}/summary`, {
      method: "POST",
    });
  },
};

// Lists API - matches your /lists endpoints (for future use)
export const listsAPI = {
  // Get all lists (GET /lists)
  getAll: async () => {
    return fetchWithAuth(`${API_BASE_URL}/lists`);
  },

  // Create a new list (POST /lists)
  create: async (data: {
    name: string;
    description?: string;
    is_shared?: boolean;
  }) => {
    return fetchWithAuth(`${API_BASE_URL}/lists`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get a specific list (GET /lists/{list_id})
  getById: async (id: string) => {
    return fetchWithAuth(`${API_BASE_URL}/lists/${id}`);
  },

  // Update a list (PATCH /lists/{list_id})
  update: async (id: string, data: { name?: string; description?: string }) => {
    return fetchWithAuth(`${API_BASE_URL}/lists/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Delete a list (DELETE /lists/{list_id})
  delete: async (id: string) => {
    return fetchWithAuth(`${API_BASE_URL}/lists/${id}`, {
      method: "DELETE",
    });
  },

  // Get content in a list (GET /lists/{list_id}/content)
  getContent: async (id: string) => {
    return fetchWithAuth(`${API_BASE_URL}/lists/${id}/content`);
  },

  // Add content to a list (POST /lists/{list_id}/content)
  addContent: async (listId: string, contentItemIds: string[]) => {
    return fetchWithAuth(`${API_BASE_URL}/lists/${listId}/content`, {
      method: "POST",
      body: JSON.stringify({ content_item_ids: contentItemIds }),
    });
  },

  // Remove content from a list (DELETE /lists/{list_id}/content)
  removeContent: async (listId: string, contentItemIds: string[]) => {
    return fetchWithAuth(`${API_BASE_URL}/lists/${listId}/content`, {
      method: "DELETE",
      body: JSON.stringify({ content_item_ids: contentItemIds }),
    });
  },
};

// Search API - matches your /search endpoints (for future use)
export const searchAPI = {
  // Find similar content (GET /search/{item_id}/similar)
  findSimilar: async (id: string) => {
    return fetchWithAuth(`${API_BASE_URL}/search/${id}/similar`);
  },

  // Semantic search (GET /search/semantic)
  semantic: async (query: string) => {
    return fetchWithAuth(
      `${API_BASE_URL}/search/semantic?query=${encodeURIComponent(query)}`,
    );
  },
};

// Analytics API - matches your /analytics endpoints
export const analyticsAPI = {
  // Get user statistics (GET /analytics/stats)
  getStats: async () => {
    return fetchWithAuth(`${API_BASE_URL}/analytics/stats`);
  },
};

// Highlights API - matches your /highlights endpoints
export const highlightsAPI = {
  // Create a highlight (POST /content/{content_id}/highlights)
  create: async (
    contentId: string,
    data: {
      text: string;
      start_offset: number;
      end_offset: number;
      color?: string;
      note?: string;
    },
  ) => {
    return fetchWithAuth(`${API_BASE_URL}/content/${contentId}/highlights`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get all highlights for content (GET /content/{content_id}/highlights)
  getByContent: async (contentId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/content/${contentId}/highlights`);
  },

  // Update a highlight (PATCH /highlights/{highlight_id})
  update: async (
    highlightId: string,
    data: { note?: string; color?: string },
  ) => {
    return fetchWithAuth(`${API_BASE_URL}/highlights/${highlightId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Delete a highlight (DELETE /highlights/{highlight_id})
  delete: async (highlightId: string) => {
    const response = await fetch(`${API_BASE_URL}/highlights/${highlightId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      }
      throw new Error(`Delete failed: ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  },
};
