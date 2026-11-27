
const express = require('express');
const router = express.Router();

// Fetch posts from external API
router.get('/posts', async (req, res) => {
    try {
        const response = await fetch(
            'https://jsonplaceholder.typicode.com/posts'
        );

        if (!response.ok) {
            throw new Error('Failed to fetch API data');
        }

        const data = await response.json();

        res.status(200).json({
            success: true,
            data: data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
