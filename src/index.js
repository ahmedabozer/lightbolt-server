const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const app = express();
const port = process.env.PORT || 8000;

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-Telegram-Init-Data'],
    optionsSuccessStatus: 200
}));

// Middleware
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Search for music using yt-dlp
async function searchMusic(query, limit = 10) {
    try {
        const command = `yt-dlp ytsearch${limit}:"${query}" -j --flat-playlist`;
        const { stdout } = await execAsync(command);
        
        return stdout
            .trim()
            .split('\n')
            .map(line => {
                const data = JSON.parse(line);
                return {
                    id: data.id,
                    title: data.title,
                    artist: data.uploader || data.channel,
                    duration: data.duration,
                    thumbnail: data.thumbnail
                };
            });
    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
}

// Get stream URL using yt-dlp
async function getStreamUrl(videoId) {
    try {
        const command = `yt-dlp -f bestaudio[ext=m4a] -g "https://youtube.com/watch?v=${videoId}"`;
        const { stdout } = await execAsync(command);
        return stdout.trim();
    } catch (error) {
        console.error('Stream URL error:', error);
        throw error;
    }
}

// Search endpoint
app.post('/api/search', async (req, res) => {
    try {
        console.log('Received search request:', req.body);
        const { query, limit = 10 } = req.body;
        
        if (!query) {
            return res.status(400).json({ 
                error: 'Bad Request',
                message: 'Query is required'
            });
        }

        const results = await searchMusic(query, limit);
        console.log('Search results:', results);
        res.json({ results });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

// Stream endpoint
app.get('/api/stream/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Video ID is required'
            });
        }

        const streamUrl = await getStreamUrl(id);
        res.json({ streamUrl });
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
}); 