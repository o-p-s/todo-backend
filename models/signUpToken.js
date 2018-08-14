'use strict'
/**
 * Module Dependencies
 */

const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

let signUpTokenSchema = new Schema({
    userId: {
        type: String
    },
    signUpToken: {
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


mongoose.model('signUpToken', signUpTokenSchema);