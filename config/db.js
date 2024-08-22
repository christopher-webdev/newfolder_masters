const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Local MongoDB URI
        await mongoose.connect('mongodb://localhost:27017/cluster1', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};
module.exports = connectDB;
