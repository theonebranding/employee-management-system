const BASE_URL = import.meta.env.VITE_BACKEND_URL;

const buildQueryString = params => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

const parseResponse = async response => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
};

const withAuthHeaders = (headers = {}) => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    ...headers,
  };
};

export const apiGet = async (path, query, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}${buildQueryString(query)}`, {
    ...options,
    headers: withAuthHeaders(options.headers),
  });
  return parseResponse(response);
};

export const apiPost = async (path, body, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    ...options,
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }),
    body: JSON.stringify(body),
  });
  return parseResponse(response);
};
