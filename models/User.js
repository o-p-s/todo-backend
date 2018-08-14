'use strict'
/**
 * Module Dependencies
 */
const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

let userSchema = new Schema({
  userId: {
    type: String,
    default: '',
    index: true,
    unique: true
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    default: 'passskdajakdjkadsj'
  },
  email: {
    type: String,
    default: ''
  },
  country:{
    type:String,
  },
  countryCode:{
    type:String
  },
  mobileNumber: {
    type: Number,
    default: 0
  },
  createdOn :{
    type:Date,
    default:""
  },
  verified:{
    type:Boolean,
    default:false
  },
  friends:[]
})


mongoose.model('User', userSchema);