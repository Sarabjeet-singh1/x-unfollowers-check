const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// File paths
const DATA_DIR = path.join(__dirname, 'user_data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Helper function to get user data file path
function getUserDataPath(username) {
    return path.join(DATA_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
}

// Helper function to get unfollowers file path
function getUnfollowersPath(username) {
    return path.join(DATA_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}_unfollowers.json`);
}

// Twitter API functions
async function getUserId(username, bearerToken) {
    try {
        const res = await axios.get(`https://api.twitter.com/2/users/by/username/${username}`, {
            headers: { Authorization: `Bearer ${bearerToken}` }
        });
        return res.data.data.id;
    } catch (error) {
        throw new Error(`Failed to get user ID: ${error.response?.data?.detail || error.message}`);
    }
}

async function getFollowers(userId, bearerToken) {
    try {
        const res = await axios.get(`https://api.twitter.com/2/users/${userId}/followers`, {
            headers: { Authorization: `Bearer ${bearerToken}` },
            params: { 
                max_results: 1000,
                'user.fields': 'username,name,profile_image_url'
            }
        });
        
        if (!res.data.data) {
            throw new Error('No followers data returned from Twitter API');
        }
        
        return res.data.data.map(user => ({
            id: user.id,
            username: user.username,
            name: user.name,
            profile_image_url: user.profile_image_url
        }));
    } catch (error) {
        let errorMessage = 'Failed to get followers';
        
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
        } else if (error.response?.data?.detail) {
            errorMessage = error.response.data.detail;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
    }
}

// Check unfollowers for a specific user
async function checkUnfollowers(username, bearerToken) {
    try {
        const userId = await getUserId(username, bearerToken);
        const newFollowers = await getFollowers(userId, bearerToken);

        const userDataPath = getUserDataPath(username);
        const unfollowersPath = getUnfollowersPath(username);

        let oldFollowers = [];
        if (fs.existsSync(userDataPath)) {
            const userData = JSON.parse(fs.readFileSync(userDataPath));
            oldFollowers = userData.followers || [];
        }

        // Calculate unfollowers
        const oldFollowerIds = new Set(oldFollowers.map(f => f.id));
        const newFollowerIds = new Set(newFollowers.map(f => f.id));
        
        const unfollowers = oldFollowers.filter(f => !newFollowerIds.has(f.id));
        
        // Get existing unfollowers
        let existingUnfollowers = [];
        if (fs.existsSync(unfollowersPath)) {
            existingUnfollowers = JSON.parse(fs.readFileSync(unfollowersPath));
        }

        // Add new unfollowers to existing list
        const allUnfollowers = [...existingUnfollowers, ...unfollowers];
        
        // Remove duplicates based on user ID
        const uniqueUnfollowers = allUnfollowers.filter((user, index, self) => 
            index === self.findIndex(u => u.id === user.id)
        );

        // Save current followers
        const userData = {
            username: username,
            lastUpdated: new Date().toISOString(),
            followers: newFollowers,
            totalFollowers: newFollowers.length
        };
        fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));

        // Save unfollowers
        fs.writeFileSync(unfollowersPath, JSON.stringify(uniqueUnfollowers, null, 2));

        return {
            newUnfollowers: unfollowers,
            totalUnfollowers: uniqueUnfollowers.length,
            totalFollowers: newFollowers.length
        };

    } catch (error) {
        throw new Error(`Error checking unfollowers: ${error.message}`);
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login/setup route
app.post('/api/setup', async (req, res) => {
    try {
        const { username, bearerToken } = req.body;
        
        if (!username || !bearerToken) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username and Bearer Token are required' 
            });
        }

        // Validate the credentials and get follower count directly
        try {
            const userId = await getUserId(username, bearerToken);
            const followers = await getFollowers(userId, bearerToken);
            
            console.log(`✅ User ${username} authenticated successfully with ${followers.length} followers`);
            
            // Store credentials in session
            req.session.username = username;
            req.session.bearerToken = bearerToken;

            // Save current followers data
            const userData = {
                username: username,
                lastUpdated: new Date().toISOString(),
                followers: followers,
                totalFollowers: followers.length
            };
            
            const userDataPath = getUserDataPath(username);
            fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));

            res.json({ 
                success: true, 
                message: `Setup successful! Found ${followers.length} followers.`,
                totalFollowers: followers.length
            });
            return;
            
        } catch (error) {
            let errorMessage = '❌ Invalid credentials. Please check your username and Bearer Token.';
            
            if (error.response?.status === 429) {
                errorMessage = '⏰ Rate limit exceeded! You have made too many requests. Please wait 15 minutes before trying again.';
            } else if (error.message.includes('must use keys and tokens from a Twitter developer App')) {
                errorMessage = '❌ Invalid Bearer Token. Please make sure your Twitter Developer App is attached to a Project. Go to developer.twitter.com to create a project and attach your app.';
            } else if (error.message.includes('Invalid Bearer Token')) {
                errorMessage = '❌ Invalid Bearer Token. Please check your credentials.';
            } else if (error.message.includes('User has been suspended')) {
                errorMessage = '❌ The specified username does not exist or has been suspended.';
            } else if (error.response?.status === 401) {
                errorMessage = '❌ Invalid credentials. Please check your username and Bearer Token.';
            } else if (error.response?.status === 403) {
                errorMessage = '❌ Access denied. Your Bearer Token may not have the required permissions.';
            }
            
            const statusCode = error.response?.status === 429 ? 429 : 401;
            
            return res.status(statusCode).json({ 
                success: false, 
                error: errorMessage
            });
        }


    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Check unfollowers route
app.post('/api/check-unfollowers', async (req, res) => {
    try {
        const username = req.session.username;
        const bearerToken = req.session.bearerToken;

        if (!username || !bearerToken) {
            return res.status(401).json({ 
                success: false, 
                error: 'Please setup your credentials first' 
            });
        }

        const result = await checkUnfollowers(username, bearerToken);
        
        res.json({
            success: true,
            ...result,
            message: `Found ${result.newUnfollowers.length} new unfollowers. Total unfollowers: ${result.totalUnfollowers}`
        });

    } catch (error) {
        console.error('Check unfollowers error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get unfollowers route
app.get('/api/unfollowers', (req, res) => {
    try {
        const username = req.session.username;
        
        if (!username) {
            return res.status(401).json({ 
                success: false, 
                error: 'Please setup your credentials first' 
            });
        }

        const unfollowersPath = getUnfollowersPath(username);
        
        if (fs.existsSync(unfollowersPath)) {
            const unfollowers = JSON.parse(fs.readFileSync(unfollowersPath));
            res.json({ success: true, unfollowers });
        } else {
            res.json({ success: true, unfollowers: [] });
        }

    } catch (error) {
        console.error('Get unfollowers error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get unfollowers' 
        });
    }
});

// Get followers route
app.get('/api/followers', (req, res) => {
    try {
        const username = req.session.username;
        
        if (!username) {
            return res.status(401).json({ 
                success: false, 
                error: 'Please setup your credentials first' 
            });
        }

        const userDataPath = getUserDataPath(username);
        
        if (fs.existsSync(userDataPath)) {
            const userData = JSON.parse(fs.readFileSync(userDataPath));
            res.json({ success: true, followers: userData.followers || [] });
        } else {
            res.json({ success: true, followers: [] });
        }

    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get followers' 
        });
    }
});

// Get user stats route
app.get('/api/stats', (req, res) => {
    try {
        const username = req.session.username;
        
        if (!username) {
            return res.status(401).json({ 
                success: false, 
                error: 'Please setup your credentials first' 
            });
        }

        const userDataPath = getUserDataPath(username);
        const unfollowersPath = getUnfollowersPath(username);
        
        let stats = {
            totalFollowers: 0,
            totalUnfollowers: 0,
            lastUpdated: null
        };

        if (fs.existsSync(userDataPath)) {
            const userData = JSON.parse(fs.readFileSync(userDataPath));
            stats.totalFollowers = userData.totalFollowers || 0;
            stats.lastUpdated = userData.lastUpdated;
        }

        if (fs.existsSync(unfollowersPath)) {
            const unfollowers = JSON.parse(fs.readFileSync(unfollowersPath));
            stats.totalUnfollowers = unfollowers.length;
        }

        res.json({ success: true, stats });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get stats' 
        });
    }
});

// Logout route
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 X Unfollower Tracker running on http://localhost:${PORT}`);
    console.log('📝 Users can now enter their own username and Bearer Token to track unfollowers');
});