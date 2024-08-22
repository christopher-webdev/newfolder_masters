const mongoose = require('mongoose');

const StatusHistorySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ['Pending', 'Declined', 'Processing', 'Completed'],
            required: true,
        },
        comment: {
            type: String, // Comment from the admin explaining the status change
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false } // Prevents automatic creation of _id field for subdocuments
);

const ProjectSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        videoFiles: [
            {
                type: String,
            },
        ],
        videoLink: [
            {
                type: String,
            },
        ],
        pictureFiles: [
            {
                type: String,
            },
        ],
        audioFiles: [
            {
                type: String,
            },
        ],
        videoDescription: {
            type: String,
        },
        location: {
            type: String,
            enum: ['Office', 'Street', 'Forest', 'Home'],
        },
        orientation: {
            type: String,
            enum: ['portrait', 'landscape'],
        },
        editedFile: {
            type: String, // Path to the edited file uploaded by admin
        },
        avatar: {
            type: String,
            enum: [
                'avatar1',
                'avatar2',
                'avatar3',
                'avatar4',
                'avatar5',
                'avatar6',
                'avatar7',
                'avatar8',
            ],
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        estimatedCompletionTime: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['Pending', 'Declined', 'Processing', 'Completed'],
            default: 'Pending',
        },
        statusHistory: [StatusHistorySchema], // Array to track status changes with comments
        thumbnail: [
            {
                type: String,
            },
        ],
        downloadLink: {
            type: String,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Project', ProjectSchema);
