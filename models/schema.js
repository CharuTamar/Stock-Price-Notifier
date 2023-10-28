const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userSchema = new schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    entryDate: {
        type: Date,
        default: Date.now
    }
})

let users = mongoose.model('users', userSchema);

module.exports = users;