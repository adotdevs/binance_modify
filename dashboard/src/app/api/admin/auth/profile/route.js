import { jsonResponse, handleOptions } from '@/lib/cors';
import { getAdminProfile, updateAdminProfile } from '@/lib/db';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const profile = await getAdminProfile(email);

    if (!profile) {
      return jsonResponse({ success: false, error: 'Admin profile not found' }, 404);
    }

    return jsonResponse({
      success: true,
      profile,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { currentEmail, newEmail, currentPassword, newPassword, name } = body;

    const result = await updateAdminProfile({
      currentEmail,
      newEmail,
      currentPassword,
      newPassword,
      name,
    });

    if (!result.success) {
      return jsonResponse({ success: false, error: result.error }, 400);
    }

    return jsonResponse({
      success: true,
      admin: result.admin,
      message: 'Profile and security credentials updated successfully',
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
