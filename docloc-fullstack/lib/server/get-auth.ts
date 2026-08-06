import { auth } from './auth';

export async function getAuthSession(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    if (!session || !session.user) return null;
    return session;
  } catch (error) {
    return null;
  }
}
