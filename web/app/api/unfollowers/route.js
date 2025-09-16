import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'user_data');

function getUnfollowersPath(username) {
  return path.join(DATA_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}_unfollowers.json`);
}

export async function GET() {
  try {
    const store = cookies();
    const username = store.get('username')?.value;
    if (!username) {
      return NextResponse.json({ success: false, error: 'Please setup your credentials first' }, { status: 401 });
    }
    const p = getUnfollowersPath(username);
    if (fs.existsSync(p)) {
      const unfollowers = JSON.parse(fs.readFileSync(p));
      return NextResponse.json({ success: true, unfollowers });
    }
    return NextResponse.json({ success: true, unfollowers: [] });
  } catch (e) {
    console.error('Get unfollowers error:', e);
    return NextResponse.json({ success: false, error: 'Failed to get unfollowers' }, { status: 500 });
  }
}


