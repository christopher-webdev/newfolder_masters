const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
});

const avatarSchema = new mongoose.Schema({
    number: { type: Number, required: true, unique: true },
    image: { type: String, required: true },
    locations: { type: [locationSchema], required: true },
});

const Avatar = mongoose.model('Avatar', avatarSchema);

module.exports = Avatar;
