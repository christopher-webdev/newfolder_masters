const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const connectDB = require('./config/db');
const { User } = require('./models/User');
const { SubscriptionPlan } = require('./models/User');
const Project = require('./models/Project');
const Avatar = require('./models/Avatar');

const signupRoute = require('./routes/signupRoute');
const bodyParser = require('body-parser');
const multer = require('multer');
const resetPasswordRoute = require('./routes/resetPasswordRoute');

const { check, validationResult } = require('express-validator');
const { PORT } = require('./config');
const adminAuthRoutes = require('./routes/admin');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const fs = require('fs');
const os = require('os');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');
const userInfoController = require('./controllers/user.controller');
const userBillingController = require('./controllers/user-billing.controller');

// Passport Config
require('./config/passport')(passport);

// Connect to MongoDB
connectDB();

const app = express();

// Express session
app.use(
    session({
        secret: 'secret',
        resave: false,
        saveUninitialized: false,
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Body parser middleware
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration starts//////////////////////////////////////////////////////////////////////
const uploadDir = path.join(__dirname, 'uploads');
const downloadDir = path.join(__dirname, 'downloads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

// Multer storage configuration for 'uploads' directory
const uploadStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(
            null,
            file.fieldname +
                '-' +
                uniqueSuffix +
                path.extname(file.originalname)
        );
    },
});

// Multer storage configuration for 'download' directory
const downloadStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'downloads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(
            null,
            `${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`
        );
    },
});

// Create Multer instances for each storage configuration
const upload = multer({ storage: uploadStorage });
const downloadUpload = multer({ storage: downloadStorage });
/////////////////////end of multer settings///////////////////////////////////////////////////////
// middleware
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated() && req.user.isSignedIn) {
        return next();
    }
    res.redirect('/login.html'); // Redirect to login page if not authenticated or signed in
}

const verifyTokenMiddleware = async (req, res, next) => {
    const { token } = req.query;
    if (!token) {
        return res.status(403).json({ msg: 'No token provided' });
    }

    try {
        const user = await User.findOne({
            oneTimeToken: token,
            oneTimeTokenExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(403).json({ msg: 'Invalid or expired token' });
        }

        // Attach user to request object if needed
        req.user = user;
        // Clear the one-time token for security reasons
        user.oneTimeToken = undefined;
        user.oneTimeTokenExpires = undefined;
        await user.save();

        // Proceed to the next middleware or route handler
        next();
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

const updateCreditsMiddleware = async (req, res, next) => {
    const { userId } = req.params;
    const { subscriptionPlan } = req.body;

    console.log(`Updating user ${userId} to plan ${subscriptionPlan}`);

    try {
        // Find the subscription plan to inherit credits from
        const plan = await SubscriptionPlan.findOne({ plan: subscriptionPlan });

        if (!plan) {
            console.error(`Subscription plan ${subscriptionPlan} not found`);
            return res
                .status(404)
                .json({ message: 'Subscription plan not found' });
        }

        // Update the user's subscription plan and credits
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                subscriptionPlan,
                credits: plan.credits, // Inherit credits from the subscription plan
            },
            { new: true }
        );

        if (!updatedUser) {
            console.error(`User with ID ${userId} not found`);
            return res.status(404).json({ message: 'User not found' });
        }

        req.updatedUser = updatedUser;
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
function ensureAdminAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/admin-login.html');
}

// API Routes
app.use('/api/signup', signupRoute);
app.use('/api/forgot-password', resetPasswordRoute);
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes

app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));

//handles user info updates
app.use('/api/user-info', ensureAuthenticated, userInfoController);
app.use('/api/billings', ensureAuthenticated, userBillingController);

// Serve index.html for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Displays billing methods
app.get('/payment-methods', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'payment-methods.html'));
});
app.get('/affiliate-daashboard.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'affiliate-daashboard.html'));
});
app.get('/affiliate-daashboard', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'affiliate-daashboard.html'));
});
app.get('/payment-methods.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'payment-methods.html'));
});
// Displays billing methods
app.get('/manage-subscription', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'manage-subscription.html'));
});
app.get('/manage-subscription.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'manage-subscription.html'));
});
// Protect specific routes
app.get('/plans-billing', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'plans-billing.html'));
});
app.get('/plans-billing.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'plans-billing.html'));
});
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/dashboard.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/video-editor', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'video-editor.html'));
});
app.get('/video-editor.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'video-editor.html'));
});
app.get('/face-swap', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'face-swap.html'));
});
app.get('/face-swap.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'face-swap.html'));
});

app.get('/video-restyle', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'video-restyle.html'));
});
app.get('/video-restyle.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'video-restyle.html'));
});
app.get('/3d-video', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', '3d-video.html'));
});
app.get('/3d-video.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', '3d-video.html'));
});
app.get('/lip-sync', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'lip-sync.html'));
});
app.get('/lip-sync.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'lip-sync.html'));
});
app.get('/video-voicing', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'video-voicing.html'));
});
app.get('/video-voicing.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'video-voicing.html'));
});
app.get('/my-avatar', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'my-avatar.html'));
});
app.get('/my-avatar.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'my-avatar.html'));
});
app.get('/my-account', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'my-account.html'));
});
app.get('/my-account.html', ensureAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'my-account.html'));
});
app.get('/login', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
// // app.get('/admin-dashboard.html', ensureAdminAuthenticated, (req, res) => {
// //     res.set('Cache-Control', 'no-store');
// //     res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
// });
// app.get('/admin-dashboard', ensureAdminAuthenticated, (req, res) => {
//     res.set('Cache-Control', 'no-store');
//     res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
// });
//email verification middleware
// Middleware to check if the user is new (i.e., created within the last 10 minutes)

app.get('/email-verified', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'email-verified.html'));
});
//rest password token rest link
app.get('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({
                msg: 'Password reset token is invalid or has expired.',
            });
        }
        // Serve the reset-password.html file
        res.sendFile(path.join(__dirname, './public/reset-password.html')); // Adjust the path as needed
    } catch (err) {
        console.error(err);
        res.status(500).json({
            msg: 'There was an error processing your request. Please try again later.',
        });
    }
});
// Route to handle password reset form submission
app.post('/auth/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                msg: 'Password reset token is invalid or has expired.',
            });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ msg: 'Password has been successfully reset.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            msg: 'There was an error resetting your password. Please try again later.',
        });
    }
});
app.post(
    '/submit-video',
    ensureAuthenticated,
    upload.fields([
        { name: 'videoFiles', maxCount: 5 },
        { name: 'pictureFiles', maxCount: 5 },
        { name: 'audioFiles', maxCount: 5 },
    ]),
    async (req, res) => {
        try {
            const userId = req.user._id;
            const {
                videoLinks, // Changed to handle multiple links
                videoDescription,
                selectedAvatar,
                location_avatar, // Handle location for avatar
            } = req.body;
            const title = req.headers['page-title'] || 'Untitled Project';

            // Determine the feature based on the project title
            const featureMap = {
                'Video Editor AI': 'videoEditor',
                'Video Restyling AI': 'videoRestyle',
                'Video Voicing': 'videoVoicing',
                'Lip Sync AI': 'lipSync',
                'Face Swap AI': 'faceSwap',
                '3D Video Modeling AI': '3dVideoModeling',
                'Add Avatar': 'myAvatar',
            };
            const feature = featureMap[title];

            // Check if the user has enough credits for the feature
            const user = await User.findById(userId);
            const userCredit = user.credits.find(
                (credit) => credit.feature === feature
            );
            if (!userCredit || userCredit.credits <= 0) {
                return res.status(403).json({
                    error: `You have exceeded the submit limit for ${title}. Please upgrade your subscription to submit more.`,
                });
            }

            // Deduct a credit
            userCredit.credits -= 1;
            await user.save();

            const videoFiles = req.files['videoFiles']
                ? req.files['videoFiles'].map((file) => file.path)
                : [];
            const pictureFiles = req.files['pictureFiles']
                ? req.files['pictureFiles'].map((file) => file.path)
                : [];
            const audioFiles = req.files['audioFiles']
                ? req.files['audioFiles'].map((file) => file.path)
                : [];

            const newProject = new Project({
                userId,
                title,
                videoFiles,
                videoLink: JSON.parse(req.body.videoLinks), // Parse JSON string to array
                pictureFiles,
                audioFiles,
                videoDescription,
                avatar: selectedAvatar,
                location: location_avatar, // Save location if avatar is selected
                status: 'Pending',
            });

            await newProject.save();
            res.status(201).json({
                message: 'Project created successfully',
                projectId: newProject._id,
                remainingCredits: userCredit.credits, // Include remaining credits in the response
            });
        } catch (error) {
            res.status(500).json({
                error: 'Error creating project: ' + error.message,
            });
        }
    }
);

// //handles video ai submits
// app.post(
//     '/submit-video',
//     ensureAuthenticated,
//     upload.fields([
//         { name: 'videoFiles', maxCount: 5 },
//         { name: 'pictureFiles', maxCount: 5 },
//         { name: 'audioFiles', maxCount: 5 },
//     ]),
//     async (req, res) => {
//         try {
//             const userId = req.user._id;
//             const {
//                 videoLink,
//                 videoDescription,
//                 location,
//                 orientation,
//                 selectedAvatar,
//             } = req.body;
//             const title = req.headers['page-title'] || 'Untitled Project';

//             // Determine the feature based on the project title
//             const featureMap = {
//                 'Video Editor AI': 'videoEditor',
//                 'Video Restyling AI': 'videoRestyle',
//                 'Video Voicing': 'videoVoicing',
//                 'Lip Sync AI': 'lipSync',
//                 'Face Swap AI': 'faceSwap',
//                 '3D Video Modeling AI': '3dVideoModeling',
//                 'Add Avatar': 'myAvatar',
//             };
//             const feature = featureMap[title];

//             // Check if the user has enough credits for the feature
//             const user = await User.findById(userId);
//             const userCredit = user.credits.find(
//                 (credit) => credit.feature === feature
//             );
//             if (!userCredit || userCredit.credits <= 0) {
//                 return res.status(403).json({
//                     error: `You have exceeded the submit limit for ${title}. Please upgrade your subscription to submit more.`,
//                 });
//             }

//             // Deduct a credit
//             userCredit.credits -= 1;
//             await user.save();

//             const videoFiles = req.files['videoFiles']
//                 ? req.files['videoFiles'].map((file) => file.path)
//                 : [];
//             const pictureFiles = req.files['pictureFiles']
//                 ? req.files['pictureFiles'].map((file) => file.path)
//                 : [];
//             const audioFiles = req.files['audioFiles']
//                 ? req.files['audioFiles'].map((file) => file.path)
//                 : [];

//             const newProject = new Project({
//                 userId,
//                 title,
//                 videoFiles,
//                 videoLink,
//                 pictureFiles,
//                 audioFiles,
//                 videoDescription,
//                 location,
//                 orientation,
//                 avatar: selectedAvatar,
//                 status: 'Pending',
//             });

//             await newProject.save();
//             res.status(201).json({
//                 message: 'Project created successfully',
//                 projectId: newProject._id,
//                 remainingCredits: userCredit.credits, // Include remaining credits in the response
//             });
//         } catch (error) {
//             res.status(500).json({
//                 error: 'Error creating project: ' + error.message,
//             });
//         }
//     }
// );

// Set FFmpeg and FFprobe paths for Thumbnail settings
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// Function to generate a thumbnail from a video file
async function generateThumbnail(videoFile) {
    return new Promise((resolve, reject) => {
        const tempThumbnailPath = path.join(
            os.tmpdir(),
            `${path.basename(videoFile, path.extname(videoFile))}.png`
        );
        ffmpeg(videoFile)
            .on('end', () => {
                resolve(tempThumbnailPath);
            })
            .on('error', (err) => {
                reject(err);
            })
            .screenshots({
                timestamps: ['50%'],
                filename: path.basename(tempThumbnailPath),
                folder: path.dirname(tempThumbnailPath),
                size: '320x240',
            });
    });
}

// API to update Output History for user on video edit status
app.get('/api/video-status', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id; // Get the logged-in user's ID from the authenticated session
        const projects = await Project.find({ userId }).sort({ createdAt: -1 });

        const projectStatuses = await Promise.all(
            projects.map(async (project) => {
                let thumbnailUrl = null;
                if (project.videoFiles.length > 0) {
                    try {
                        const thumbnailPath = await generateThumbnail(
                            project.videoFiles[0]
                        );
                        const thumbnailData = fs.readFileSync(
                            thumbnailPath,
                            'base64'
                        );
                        thumbnailUrl = `data:image/png;base64,${thumbnailData}`;
                        fs.unlinkSync(thumbnailPath);
                    } catch (error) {
                        console.error(
                            `Error generating thumbnail for project ${project._id}:`,
                            error
                        );
                    }
                }

                return {
                    id: project._id,
                    title: project.title,
                    status: project.status,
                    comment:
                        project.statusHistory.length > 0
                            ? project.statusHistory[
                                  project.statusHistory.length - 1
                              ].comment
                            : '', // Get the latest comment
                    estimatedCompletionTime: project.estimatedCompletionTime,
                    createdAt: project.createdAt,
                    downloadLink:
                        project.status === 'Completed'
                            ? project.downloadLink
                            : null,
                    thumbnail: thumbnailUrl,
                };
            })
        );

        res.json(projectStatuses);
    } catch (error) {
        res.status(500).json({
            error: 'Error fetching video status: ' + error.message,
        });
    }
});

//admin api for dashboard
//gets all project
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find().populate('userId');
        res.json({ projects });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
//project reuploads after downloading and editing offline
app.post(
    '/api/projects/:id/reupload',
    downloadUpload.single('file'),
    async (req, res) => {
        try {
            const project = await Project.findById(req.params.id);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
            // Save the file path relative to the 'download' directory in the editedFile field
            project.editedFile = req.file.filename;
            project.downloadLink = `/downloads/${req.file.filename}`;
            await project.save();
            res.json({ project });
        } catch (error) {
            console.error('Failed to reupload file:', error);
            res.status(500).json({ error: 'Failed to reupload file' });
        }
    }
);

//deletes project by admin
app.delete('/api/projects/:id', async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});
//updating project sttus
app.post('/api/admin/update-project-status/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const { status, comment, estimatedCompletionTime } = req.body;

    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Update status and history
        project.status = status;
        project.statusHistory.push({
            status,
            comment,
            updatedAt: new Date(),
        });

        // Save estimated completion time
        project.estimatedCompletionTime = estimatedCompletionTime;

        await project.save();

        res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Failed to update status' });
    }
});
//get media routes
app.get('/api/admin/get-project-media/:projectId', async (req, res) => {
    const { projectId } = req.params;

    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(200).json({
            videoFiles: project.videoFiles,
            pictureFiles: project.pictureFiles,
            audioFiles: project.audioFiles,
        });
    } catch (error) {
        console.error('Error fetching project media:', error);
        res.status(500).json({ message: 'Failed to fetch project media' });
    }
});

//get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
// gets all user by id
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Delete user
app.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
/////////////////////////////////////////////////////////////////////////////////deletes output history for user
app.delete('/api/project/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        await Project.findByIdAndDelete(id);
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({
            error: 'Error deleting project: ' + error.message,
        });
    }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////// AI VISABILITY
let isdashboardVisibility = {
    videoEditor: true,
    videoRestyle: true,
    videoVoicing: true,
    lipSync: true,
    faceSwap: true,
    threeDVideoModeling: true,
    myAvatar: true,
}; // In-memory storage for simplicity
// Endpoint to set visibility
app.post('/api/toggle-dashboard-visibility', (req, res) => {
    const { cardId, isVisible } = req.body;

    if (!cardId || typeof isVisible !== 'boolean') {
        return res.status(400).send({ error: 'Invalid request data' });
    }

    // Update the visibility state
    isdashboardVisibility[cardId] = isVisible;

    console.log(`Updated visibility for ${cardId}: ${isVisible}`);

    // Respond with success
    res.status(200).send({ message: `Visibility updated for ${cardId}` });
});

// Endpoint to get visibility
app.get('/api/get-dashboard-visibility', (req, res) => {
    res.status(200).json({ isVisible: isdashboardVisibility });
});

///////////////////////////////////////////////////////////////////////////////////////////////////END OF AI VISABILITY
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////// set credit ADMIN daashboard
app.post('/set-credits', async (req, res) => {
    const { subscriptionPlan, credits } = req.body;

    try {
        // Find the subscription plan
        let plan = await SubscriptionPlan.findOne({ plan: subscriptionPlan });
        if (!plan) {
            // Create a new plan if it doesn't exist
            plan = new SubscriptionPlan({ plan: subscriptionPlan });
        }

        // Set the credits for the subscription plan
        plan.credits = credits;

        // Save the updated subscription plan
        await plan.save();

        res.status(200).json({ message: 'Credits successfully set' });
    } catch (error) {
        console.error('Error setting credits:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////UPDATE SUBSCRIPTION PLAN
app.put('/update-subscription/:userId', updateCreditsMiddleware, (req, res) => {
    // Here, the user has already been updated by the middleware
    res.status(200).json({
        message: 'Subscription plan updated successfully',
        user: req.updatedUser,
    });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.put(
    '/update-avatar/:id',
    upload.fields([
        { name: 'avatarImage', maxCount: 1 },
        { name: 'locationImages[office]', maxCount: 1 },
        { name: 'locationImages[street]', maxCount: 1 },
        { name: 'locationImages[forest]', maxCount: 1 },
        { name: 'locationImages[home]', maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const avatarId = req.params.id;
            const updatedData = {};

            if (req.files['avatarImage']) {
                updatedData.image = req.files['avatarImage'][0].path;
            }

            updatedData.locations = [];

            ['office', 'street', 'forest', 'home'].forEach((location) => {
                if (req.files[`locationImages[${location}]`]) {
                    updatedData.locations.push({
                        name: location,
                        image: req.files[`locationImages[${location}]`][0].path,
                    });
                }
            });

            const updatedAvatar = await Avatar.findByIdAndUpdate(
                avatarId,
                updatedData,
                { new: true }
            );

            if (!updatedAvatar) {
                return res.status(404).json({ error: 'Avatar not found' });
            }

            res.status(200).json(updatedAvatar);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);
app.get('/avatars/:id', async (req, res) => {
    try {
        const avatar = await Avatar.findById(req.params.id);
        if (!avatar) {
            return res.status(404).json({ error: 'Avatar not found' });
        }
        res.status(200).json(avatar);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch avatar' });
    }
});
// Route to fetch all avatars
app.get('/api/avatars', async (req, res) => {
    try {
        const avatars = await Avatar.find();
        res.status(200).json(avatars);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch avatars' });
    }
});
// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
