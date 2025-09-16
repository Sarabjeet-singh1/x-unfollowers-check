import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'user_data');

function getUserDataPath(username) {
  return path.join(DATA_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
}
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
    let stats = { totalFollowers: 0, totalUnfollowers: 0, lastUpdated: null };
    const userPath = getUserDataPath(username);
    const unfPath = getUnfollowersPath(username);
    if (fs.existsSync(userPath)) {
      const userData = JSON.parse(fs.readFileSync(userPath));
      stats.totalFollowers = userData.totalFollowers || 0;
      stats.lastUpdated = userData.lastUpdated;
    }
    if (fs.existsSync(unfPath)) {
      const unfollowers = JSON.parse(fs.readFileSync(unfPath));
      stats.totalUnfollowers = unfollowers.length;
    }
    return NextResponse.json({ success: true, stats });
  } catch (e) {
    console.error('Get stats error:', e);
    return NextResponse.json({ success: false, error: 'Failed to get stats' }, { status: 500 });
  }
}


