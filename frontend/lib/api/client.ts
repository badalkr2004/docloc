import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/api/auth/sign-in') || 
                           url.includes('/api/auth/sign-up') || 
                           url.includes('/api/auth/get-session') || 
                           url.includes('/api/auth/keys');
    const isAuthPage = typeof window !== 'undefined' && 
                       (window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/signup'));

    if (error.response?.status === 401 && typeof window !== 'undefined' && !isAuthEndpoint && !isAuthPage) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { apiClient };

// R2 direct upload helper
export async function uploadToR2(presignedUrl: string, data: Uint8Array, mimeType: string): Promise<boolean> {
  try {
    const res = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: data as unknown as BodyInit,
    });
    return res.ok;
  } catch {
    return false;
  }
}
