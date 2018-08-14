const mongoose = require('mongoose');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const check = require('../libs/checkLib')

const ListModel= mongoose.model('List');

let getUserLists=(req,res)=>{
    if(!check.isEmpty(req.query.userId)){
        ListModel.find({userId:req.query.userId})
        .skip(parseInt(req.query.skip)||0)
        .lean()
        .limit(10)
        .exec((err,result)=>{
            if(err){
                logger.error(err+'db error occurred','listController:getUserLists()',1)            
                res.status(500).send(response.generate(false,' databse error occurred',500,null))
            }
            else if(check.isEmpty(result)){
                logger.error('No lists found','listController:getUserLists()',1)
                res.status(404).send(response.generate(false,'No lists found',404,null))
            }
            else {
                logger.info('success','Lists were sent',1)
                res.status(200).send(response.generate(false,'Lists found',200,result))
            }
        })
    }else{
        logger.error('Invalid Request Parameters','listController:getUserLists()',1)
        res.status(400).send(response.generate(false,'Invalid Request Parameters',400,null))
    }
}
module.exports={
    getUserLists:getUserLists
}