import { jsonResponse, handleOptions } from '@/lib/cors';
import { authenticateAdmin } from '@/lib/db';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse({ success: false, error: 'Email and password are required' }, 400);
    }

    const authResult = await authenticateAdmin(email, password);

    if (!authResult.success) {
      return jsonResponse({ success: false, error: authResult.error || 'Invalid credentials' }, 401);
    }

    return jsonResponse({
      success: true,
      token: authResult.token,
      admin: authResult.admin,
      message: 'Login successful',
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
