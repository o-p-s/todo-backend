'use strict'
/**
 * Module Dependencies
 */

const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

let passwordResetTokenSchema = new Schema({
    userId: {
        type: String
    },
    passwordResetToken: {
        type: String
    },
    tokenSecret: {
        type: String
    },
    tokenValidationTime: {
        type: Date,
        default: Date.now()
    }
})


mongoose.model('passwordResetToken', passwordResetTokenSchema);