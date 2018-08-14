const mongoose = require('mongoose')
const Schema = mongoose.Schema

const Request = new Schema({
  senderId: {
    type: String
  },
  senderName: {
    type: String
  },
  receiverId: {
    type: String
  },
  receiverName: {
    type: String
  },
  active:{
    type:Boolean,
    default:true
  },
  createdOn: {
    type: Date,
    default:Date.now()
  },
  modifiedOn: {
    type: Date,
    default:Date.now()
  }
})

module.exports = mongoose.model('Request', Request)
