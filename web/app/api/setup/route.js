import { NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

function safeDecodeURIComponent(value) {
  if (typeof value !== 'string') return '';
  try { return decodeURIComponent(value); } catch { return value; }
}

const DATA_DIR = path.join(process.cwd(), 'user_data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getUserDataPath(username) {
  return path.join(DATA_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
}

async function getUserId(username, bearerToken) {
  const res = await axios.get(`https://api.twitter.com/2/users/by/username/${username}` , {
    headers: { Authorization: `Bearer ${bearerToken}` }
  });
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

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUsername = (body.username || '');
    const username = rawUsername.trim().replace(/^@+/, '').toLowerCase();
    // Use token exactly as provided (only trim outer whitespace)
    const cleanedBearerToken = (body.bearerToken || '').trim();

    if (!username || !cleanedBearerToken) {
      return NextResponse.json({ success: false, error: 'Username and Bearer Token are required' }, { status: 400 });
    }

    try {
      const userId = await getUserId(username, cleanedBearerToken);
      const followers = await getFollowers(userId, cleanedBearerToken);

      const userData = { username, lastUpdated: new Date().toISOString(), followers, totalFollowers: followers.length };
      const userDataPath = getUserDataPath(username);
      fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));

      const res = NextResponse.json({ success: true, message: `Setup successful! Found ${followers.length} followers.`, totalFollowers: followers.length });
      res.cookies.set('username', username, { httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
      res.cookies.set('bearerToken', cleanedBearerToken, { httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
      return res;
    } catch (error) {
      console.error('Setup validation failed:', {
        status: error.response?.status,
        url: error.config?.url,
        detail: error.response?.data?.detail,
        title: error.response?.data?.title,
        message: error.message
      });

      let errorMessage = '❌ Invalid credentials. Please check your username and Bearer Token.';
      if (error.response?.status === 429) {
        errorMessage = '⏰ Rate limit exceeded! You have made too many requests. Please wait 15 minutes before trying again.';
      } else if (error.response?.status === 401) {
        if (error.response?.data?.detail?.includes('must use keys and tokens from a Twitter developer App')) {
          errorMessage = '❌ Invalid Bearer Token. Please make sure your Twitter Developer App is attached to a Project. Go to developer.twitter.com to create a project and attach your app.';
        } else {
          errorMessage = '❌ Invalid Bearer Token. Please check your credentials.';
        }
      } else if (error.response?.status === 403) {
        errorMessage = '❌ API access denied. Your Bearer Token may not have the required permissions.';
      } else if (error.response?.status >= 500) {
        const detail = error.response?.data?.detail || 'Twitter API error';
        errorMessage = `❌ Twitter API error (status ${error.response.status}). ${detail}. Please try again later.`;
      } else if (error.response?.status === 404) {
        errorMessage = '❌ Username not found. Please double-check your handle.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      const statusCode = error.response?.status === 429 ? 429 : (error.response?.status || 401);
      return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode });
    }
  } catch (e) {
    console.error('Setup error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


