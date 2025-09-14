ge wge# 🔑 Twitter API Setup Guide

## The Issue You're Experiencing

The error message "When authenticating requests to the Twitter API v2 endpoints, you must use keys and tokens from a Twitter developer App that is attached to a Project" means your Bearer Token is not from a properly configured Twitter Developer Project.

## ✅ Correct Setup Steps

### 1. Go to Twitter Developer Portal
Visit: https://developer.twitter.com/en/portal/dashboard

### 2. Create a Project (Required)
- Click **"Create Project"**
- Choose **"Making a bot"** as your use case
- Fill in project details:
  - **Project name**: "X Unfollower Tracker"
  - **Description**: "Personal unfollower tracking application"
- Accept the terms and create the project

### 3. Create an App within the Project
- In your project dashboard, click **"Create App"**
- Choose your app environment (Development is fine for personal use)
- Fill in app details:
  - **App name**: "unfollower-tracker-app"
  - **App description**: "Track unfollowers on X/Twitter"

### 4. Get Your Bearer Token
- Go to your app's **"Keys and Tokens"** tab
- Scroll down to **"Bearer Token"** section
- Click **"Generate"** to create your Bearer Token
- **Important**: Copy the token immediately - it won't be shown again!

### 5. Configure App Permissions
- Go to **"App Settings"** tab
- Under **"App permissions"**, make sure you have:
  - **Read** permissions (this is usually default)
  - If you want to read followers, you might need **"Read users"** permission

### 6. Use the Correct Bearer Token
- Use the Bearer Token from step 4 (not the API Key or API Secret)
- The Bearer Token should look like: `AAAAAAAAAAAAAAAAAAAAAF7opAEAAAAA0%2BuSeid%2BULvsea4JtiGRiSDSJSI%3DEUifiRBkKG5E2XzMDjRfl76ZC9Ub0wnz4XsNiRVBChTYbJcE3F`

## 🔍 Common Issues & Solutions

### Issue 1: "App must be attached to a Project"
**Solution**: Make sure you created a Project first, then created an App within that Project.

### Issue 2: "Invalid Bearer Token"
**Solution**: 
- Make sure you're using the Bearer Token (not API Key)
- The token should start with "AAAA" or similar
- Copy the token exactly without extra spaces

### Issue 3: "Rate limit exceeded"
**Solution**: Twitter API has rate limits. Wait a few minutes before trying again.

### Issue 4: "User has been suspended"
**Solution**: The username you entered doesn't exist or has been suspended.

## 🚀 Testing Your Setup

1. Open the app at http://localhost:3000
2. Click "Setup New Account" if you're already logged in
3. Enter your Twitter username (without @)
4. Enter your Bearer Token
5. Click "Setup Account"

If successful, you should see your dashboard with follower statistics.

## 📝 Important Notes

- **Bearer Tokens don't expire** for most use cases
- **Keep your token secure** - don't share it publicly
- **Free tier limitations**: Twitter API free tier has rate limits
- **Personal use only**: This setup is for personal unfollower tracking

## 🆘 Still Having Issues?

If you're still getting errors:
1. Double-check you created a Project first
2. Make sure your App is attached to the Project
3. Verify you're using the Bearer Token (not API Key/Secret)
4. Try creating a new Bearer Token
5. Check if your Twitter account is in good standing

## 🔗 Useful Links

- [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [Bearer Token Authentication](https://developer.twitter.com/en/docs/authentication/oauth-2-0/bearer-token)
