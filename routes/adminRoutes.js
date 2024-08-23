
// const User = require('../models/User');
// const express = require('express');
// const passport = require('passport');
// const path = require('path');
// const router = express.Router();
// const nodemailer = require('nodemailer');
// const crypto = require('crypto');
// const { check, validationResult } = require('express-validator');
// const multer = require('multer');
// const Project = require('../models/Project');
// const upload = multer({ dest: 'uploads/' });

// // // Route to clear all users
// // router.delete('/api/admin/clear-users', async (req, res) => {
// //     try {
// //         await User.deleteMany({}); // Delete all users
// //         res.json({ msg: 'All users have been deleted successfully.' });
// //     } catch (error) {
// //         console.error('Error deleting users:', error);
// //         res.status(500).json({ msg: 'An error occurred while clearing users.' });
// //     }
// // });
// // Middleware to ensure the request is authenticated
// const ensureAuthenticated = (req, res, next) => {
//     if (req.isAuthenticated() && req.user.isAdmin) { // Ensure the user is an admin
//         return next();
//     }
//     res.status(401).json({ message: 'Unauthorized' });
// };

// // Clear all users
// router.delete('/clear-users', ensureAuthenticated, async (req, res) => {
//     try {
//         await User.deleteMany({});
//         res.json({ msg: 'All users cleared successfully' });
//     } catch (error) {
//         res.status(500).json({ msg: 'Error clearing users: ' + error.message });
//     }
// });

// // Get all users
// router.get('/users', ensureAuthenticated, async (req, res) => {
//     try {
//         const users = await User.find({});
//         res.json(users);
//     } catch (error) {
//         res.status(500).json({ msg: 'Error fetching users: ' + error.message });
//     }
// });

// // Delete a specific user
// router.delete('/users/:userId', ensureAuthenticated, async (req, res) => {
//     try {
//         await User.findByIdAndDelete(req.params.userId);
//         res.json({ msg: 'User deleted successfully' });
//     } catch (error) {
//         res.status(500).json({ msg: 'Error deleting user: ' + error.message });
//     }
// });

// // Get all projects
// router.get('/projects', ensureAuthenticated, async (req, res) => {
//     try {
//         const projects = await Project.find({}).populate('user');
//         res.json(projects);
//     } catch (error) {
//         res.status(500).json({ msg: 'Error fetching projects: ' + error.message });
//     }
// });

// // Download project files
// router.get('/projects/:projectId/download', ensureAuthenticated, async (req, res) => {
//     try {
//         const project = await Project.findById(req.params.projectId);
//         // Implement file zipping and downloading logic here
//         // Example: res.download('/path/to/zip/file.zip');
//     } catch (error) {
//         res.status(500).json({ msg: 'Error downloading project: ' + error.message });
//     }
// });

// // Upload edited project
// router.post('/projects/:projectId/upload', ensureAuthenticated, upload.single('editedProject'), async (req, res) => {
//     try {
//         const project = await Project.findById(req.params.projectId);
//         project.editedFile = req.file.path;
//         project.status = 'Completed';
//         await project.save();
//         res.json({ msg: 'Edited project uploaded successfully' });
//     } catch (error) {
//         res.status(500).json({ msg: 'Error uploading edited project: ' + error.message });
//     }
// });


// module.exports = router;