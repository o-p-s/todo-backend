const mongoose = require('mongoose')
const Schema = mongoose.Schema
const time = require('../libs/timeLib')


const List = new Schema({
    userId:{
        default:'',
        type:String,
    },
    userName:{
        default:'',
        type:String,
    },
    listId: {
        default:'',
        unique:true,
        type: String
    },
    listName: {
        default:'',
        type: String
    },
    items:[
        {
            itemId:{
                type:String,
                default:''
            },
            itemName:{
                type:String,
                default:''
            },
            open:{
                type:Boolean,
                default:true,
            },
            subitems:[
                {
                    subitemId:{
                        type:String,
                        default:''
                    },
                    subitemName:{
                        type:String,
                        default:''
                    },
                    open:{
                        type:Boolean,
                        default:true,
                    },
                }
            ]
        }
    ],
    createdOn:{
        type:Date,
        default:time.now()
    },
    modifiedOn:{
        type:Date,
        default:time.now()
    }
  })
  
  module.exports = mongoose.model('List', List)