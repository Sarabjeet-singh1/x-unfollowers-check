import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'user_data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getUserDataPath(username) {
  return path.join(DATA_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
}
function getUnfollowersPath(username) {
  return path.join(DATA_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}_unfollowers.json`);
}

async function getUserId(username, bearerToken) {
  const res = await axios.get(`https://api.twitter.com/2/users/by/username/${username}`, { headers: { Authorization: `Bearer ${bearerToken}` } });
  return res.data.data.id;
}
async function getFollowers(userId, bearerToken) {
  const res = await axios.get(`https://api.twitter.com/2/users/${userId}/followers`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
    params: { max_results: 1000, 'user.fields': 'username,name,profile_image_url' }
  });
  if (!res.data.data) throw new Error('No followers data returned from Twitter API');
  return res.data.data.map(u => ({ id: u.id, username: u.username, name: u.name, profile_image_url: u.profile_image_url }));
}

export async function POST() {
  try {
    const store = cookies();
    const username = store.get('username')?.value;
    const bearerToken = store.get('bearerToken')?.value;

    if (!username || !bearerToken) {
      return NextResponse.json({ success: false, error: 'Please setup your credentials first' }, { status: 401 });
    }

    const userId = await getUserId(username, bearerToken);
    const newFollowers = await getFollowers(userId, bearerToken);

    const userDataPath = getUserDataPath(username);
    const unfollowersPath = getUnfollowersPath(username);

    let oldFollowers = [];
    if (fs.existsSync(userDataPath)) {
      const userData = JSON.parse(fs.readFileSync(userDataPath));
      oldFollowers = userData.followers || [];
    }

    const newFollowerIds = new Set(newFollowers.map(f => f.id));
    const unfollowers = oldFollowers.filter(f => !newFollowerIds.has(f.id));

    let existingUnfollowers = [];
    if (fs.existsSync(unfollowersPath)) {
      existingUnfollowers = JSON.parse(fs.readFileSync(unfollowersPath));
    }

    const allUnfollowers = [...existingUnfollowers, ...unfollowers];
    const uniqueUnfollowers = allUnfollowers.filter((user, index, self) => index === self.findIndex(u => u.id === user.id));

    const userData = { username, lastUpdated: new Date().toISOString(), followers: newFollowers, totalFollowers: newFollowers.length };
    fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
    fs.writeFileSync(unfollowersPath, JSON.stringify(uniqueUnfollowers, null, 2));

    return NextResponse.json({ success: true, newUnfollowers: unfollowers, totalUnfollowers: uniqueUnfollowers.length, totalFollowers: newFollowers.length });
  } catch (error) {
    console.error('Check unfollowers error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


